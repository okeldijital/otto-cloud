import uuid
from typing import Dict, List, Optional, Set

from sqlalchemy.orm import Session

from models.ai import AIAuditLog
from models.artist import Artist
from models.release import Release
from models.track import Track
from models.work import Work
from schemas.ai_contracts import ContractExtractionV1
from schemas.ai_linking import EntitySuggestion
from schemas.ai_release_integration import (
    ContractSummary,
    MatchBlock,
    MatchedEntity,
    MissingFlag,
    NetworkEntities,
    ReleaseIntegrationPlanResponse,
    ReleaseRef,
    SuggestedAction,
)
from services.ai.linking.link_suggest_v1 import normalize_name, suggest_links
from services.ai.release_validation import build_release_validation_plan


def _extract_or_error(
    db: Session,
    org_id: uuid.UUID,
    contract_extract: Optional[ContractExtractionV1],
    extract_id: Optional[int],
) -> ContractExtractionV1:
    if contract_extract is not None:
        return contract_extract

    if extract_id is None:
        raise ValueError("missing_contract_extract")

    extract_run = (
        db.query(AIAuditLog)
        .filter(
            AIAuditLog.id == extract_id,
            AIAuditLog.organization_id == org_id,
            AIAuditLog.action == "contract_extraction",
        )
        .first()
    )
    if not extract_run:
        raise ValueError("extract_not_found")

    raise ValueError("extract_payload_unavailable")


def _release_entities(db: Session, org_id: uuid.UUID, release: Release) -> Dict[str, List]:
    artists: List[Artist] = []
    seen_artist_ids: Set[int] = set()

    if release.artist is not None and release.artist.organization_id == org_id:
        artists.append(release.artist)
        seen_artist_ids = seen_artist_ids | {release.artist.id}

    artist_ids = release.artist_ids if isinstance(release.artist_ids, list) else []
    if artist_ids:
        extra_artists = (
            db.query(Artist)
            .filter(Artist.organization_id == org_id, Artist.id.in_(artist_ids))
            .all()
        )
        for item in extra_artists:
            if item.id not in seen_artist_ids:
                artists.append(item)
                seen_artist_ids = seen_artist_ids | {item.id}

    tracks = (
        db.query(Track)
        .filter(Track.organization_id == org_id, Track.release_id == release.id)
        .all()
    )

    works: List[Work] = []
    seen_work_ids: Set[int] = set()
    for track in tracks:
        if track.work is not None and track.work.organization_id == org_id and track.work.id not in seen_work_ids:
            works.append(track.work)
            seen_work_ids = seen_work_ids | {track.work.id}

    return {
        "artists": artists,
        "tracks": tracks,
        "works": works,
    }


def _to_actions(rows: Dict[str, List[EntitySuggestion]]) -> List[SuggestedAction]:
    target_map = {
        "artists": "artist",
        "tracks": "track",
        "works": "work",
        "organizations": "organization",
        "parties": "individual",
    }
    actions: List[SuggestedAction] = []
    for bucket, target in target_map.items():
        for suggestion in rows.get(bucket, []):
            if suggestion.entity_id is None:
                continue
            actions.append(
                SuggestedAction(
                    action="link_candidate",
                    target=target,
                    candidate_id=str(suggestion.entity_id),
                    display_name=suggestion.display_name,
                    confidence=float(suggestion.confidence),
                    rationale=suggestion.rationale,
                )
            )
    return actions


def build_release_integration_plan(
    db: Session,
    org_id: uuid.UUID,
    release_id: int,
    contract_extract: Optional[ContractExtractionV1],
    extract_id: Optional[int] = None,
) -> ReleaseIntegrationPlanResponse:
    release = (
        db.query(Release)
        .filter(Release.id == release_id, Release.organization_id == org_id)
        .first()
    )
    if not release:
        raise ValueError("release_not_found")

    extraction = _extract_or_error(
        db=db,
        org_id=org_id,
        contract_extract=contract_extract,
        extract_id=extract_id,
    )

    entities = _release_entities(db, org_id, release)

    # Run existing planner components in read-only mode.
    link_response = suggest_links(db, str(org_id), extraction)
    validation_plan = build_release_validation_plan(
        db=db,
        org_id=org_id,
        release_id=release_id,
        contract_extract=extraction.model_dump(),
    )

    contract_artist_names = {
        normalize_name(name)
        for name in [*extraction.works_hints.artists, *[party.display_name for party in extraction.parties]]
        if normalize_name(name)
    }
    contract_track_names = {
        normalize_name(name)
        for name in extraction.works_hints.tracks
        if normalize_name(name)
    }
    contract_work_names = {
        normalize_name(name)
        for name in extraction.works_hints.releases
        if normalize_name(name)
    }

    release_artist_matches = [
        MatchedEntity(
            id=item.id,
            name=item.name,
            contract_match=normalize_name(item.name) in contract_artist_names,
        )
        for item in entities["artists"]
    ]
    release_track_matches = [
        MatchedEntity(
            id=item.id,
            name=item.title,
            contract_match=normalize_name(item.title) in contract_track_names,
        )
        for item in entities["tracks"]
    ]
    release_work_matches = [
        MatchedEntity(
            id=item.id,
            name=item.title,
            contract_match=normalize_name(item.title) in contract_work_names,
        )
        for item in entities["works"]
    ]

    network_entities = NetworkEntities(
        organizations=[
            MatchedEntity(
                id=int(item.entity_id) if str(item.entity_id).isdigit() else None,
                name=item.display_name,
                contract_match=True,
            )
            for item in link_response.suggestions.get("organizations", [])
            if item.entity_id is not None
        ],
        individuals=[
            MatchedEntity(
                id=int(item.entity_id) if str(item.entity_id).isdigit() else None,
                name=item.display_name,
                contract_match=True,
            )
            for item in link_response.suggestions.get("parties", [])
            if item.entity_id is not None and item.entity_type == "individual"
        ],
    )

    warnings = list(extraction.warnings)
    if abs(float(extraction.splits_total) - 100.0) > 0.001:
        warnings.append("Contract splits total does not equal 100.")

    missing_flags: List[MissingFlag] = []
    if contract_artist_names and not release_artist_matches:
        missing_flags.append(
            MissingFlag(
                scope="release",
                field="artists",
                message="Release has no primary artist but contract names one.",
            )
        )

    if contract_track_names and not release_track_matches:
        missing_flags.append(
            MissingFlag(
                scope="release",
                field="tracks",
                message="Contract references tracks but release has no track list.",
            )
        )

    if abs(float(extraction.splits_total) - 100.0) > 0.001:
        missing_flags.append(
            MissingFlag(
                scope="release",
                field="royalty_splits",
                message="Release royalty splits are inconsistent with contract split totals.",
            )
        )

    suggested_actions = _to_actions(link_response.suggestions)
    needs_review = bool(missing_flags) or bool(validation_plan["flags"]["needs_contract_review"])

    return ReleaseIntegrationPlanResponse(
        org_id=str(org_id),
        release=ReleaseRef(id=release.id, title=release.title),
        contract_summary=ContractSummary(
            contract_title=extraction.contract_title,
            parties=[party.display_name for party in extraction.parties],
            splits_total=float(extraction.splits_total),
            warnings=warnings,
        ),
        matches=MatchBlock(
            release_artists=release_artist_matches,
            release_tracks=release_track_matches,
            release_works=release_work_matches,
            network_entities=network_entities,
        ),
        missing_flags=missing_flags,
        suggested_actions=suggested_actions,
        needs_review=needs_review,
    )

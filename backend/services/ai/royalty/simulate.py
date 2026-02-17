import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from sqlalchemy.orm import Session

from models.contract_documents import AIContractDocument, AIContractWorkLink
from models.release import Release
from models.release_integration import AIReleaseIntegrationLink, AIReleaseIntegrationRun
from models.track import Track
from schemas.ai_royalty import ComputedSplit, ConflictItem, IntegrityBlock, RoyaltySimulationResponse

ROYALTY_VERSION = "royalty_sim_v1_deterministic"


def _load_release(db: Session, org_id: uuid.UUID, release_id: int) -> Release:
    release = (
        db.query(Release)
        .filter(Release.id == release_id, Release.organization_id == org_id)
        .first()
    )
    if not release:
        raise ValueError("release_not_found")
    return release


def _load_contract_document(
    db: Session,
    org_id: uuid.UUID,
    release_id: int,
    contract_document_id: Optional[int],
) -> Optional[AIContractDocument]:
    if contract_document_id is None:
        return (
            db.query(AIContractDocument)
            .filter(
                AIContractDocument.organization_id == org_id,
                AIContractDocument.release_id == release_id,
            )
            .order_by(AIContractDocument.id.desc())
            .first()
        )

    doc = (
        db.query(AIContractDocument)
        .filter(
            AIContractDocument.id == contract_document_id,
            AIContractDocument.organization_id == org_id,
            AIContractDocument.release_id == release_id,
        )
        .first()
    )
    if not doc:
        raise ValueError("contract_document_not_found")
    return doc


def _entity_splits_from_latest_run(
    db: Session,
    org_id: uuid.UUID,
    release_id: int,
) -> List[Dict]:
    run = (
        db.query(AIReleaseIntegrationRun)
        .filter(
            AIReleaseIntegrationRun.organization_id == org_id,
            AIReleaseIntegrationRun.release_id == release_id,
        )
        .order_by(AIReleaseIntegrationRun.id.desc())
        .first()
    )
    if not run:
        return []

    links = (
        db.query(AIReleaseIntegrationLink)
        .filter(
            AIReleaseIntegrationLink.organization_id == org_id,
            AIReleaseIntegrationLink.run_id == run.id,
            AIReleaseIntegrationLink.action == "attach",
            AIReleaseIntegrationLink.entity_type.in_(["artist", "work", "track", "organization", "individual"]),
        )
        .all()
    )

    items = []
    for link in links:
        items.append(
            {
                "party_display_name": link.display_name,
                "party_type": link.entity_type,
                "entity_id": link.entity_id,
                "source": "release_integration_link",
                "confidence": float(link.confidence or 0.0),
            }
        )
    return items


def _build_percent_splits(rows: List[Dict]) -> List[ComputedSplit]:
    if not rows:
        return []

    equal_pct = round(100.0 / len(rows), 6)
    splits: List[ComputedSplit] = []
    running = 0.0
    for idx, row in enumerate(rows):
        pct = equal_pct
        if idx == len(rows) - 1:
            pct = round(100.0 - running, 6)
        else:
            running += pct

        splits.append(
            ComputedSplit(
                party_display_name=row["party_display_name"],
                party_type=row["party_type"],
                percent=pct,
                source=row["source"],
                confidence=float(row["confidence"]),
            )
        )
    return splits


def _release_artist_ids(release: Release) -> Set[int]:
    ids: Set[int] = set()
    if release.artist_id:
        ids = ids | {release.artist_id}
    if isinstance(release.artist_ids, list):
        for item in release.artist_ids:
            try:
                ids = ids | {int(item)}
            except (TypeError, ValueError):
                pass
    return ids


def _collect_conflicts(
    release: Release,
    tracks: List[Track],
    contract_doc: Optional[AIContractDocument],
    split_rows: List[Dict],
) -> List[ConflictItem]:
    conflicts: List[ConflictItem] = []

    release_artist_ids = _release_artist_ids(release)
    linked_artist_ids = {
        int(row["entity_id"])
        for row in split_rows
        if row["party_type"] == "artist" and row.get("entity_id") is not None
    }
    unknown_artist_ids = sorted(linked_artist_ids - release_artist_ids)
    if unknown_artist_ids:
        conflicts.append(
            ConflictItem(
                type="artist_mismatch",
                message="Computed artist parties include artists not present on release roster.",
                entities=[str(x) for x in unknown_artist_ids],
            )
        )

    release_work_ids = {
        track.work_id
        for track in tracks
        if track.work_id is not None
    }
    linked_work_ids = {
        int(row["entity_id"])
        for row in split_rows
        if row["party_type"] == "work" and row.get("entity_id") is not None
    }
    unexpected_work_ids = sorted(linked_work_ids - release_work_ids)
    if unexpected_work_ids:
        conflicts.append(
            ConflictItem(
                type="work_scope_mismatch",
                message="Computed work parties include works not present in release track/work scope.",
                entities=[str(x) for x in unexpected_work_ids],
            )
        )

    if contract_doc is not None and contract_doc.work_links:
        doc_work_ids = {link.work_id for link in contract_doc.work_links}
        if release_work_ids and doc_work_ids and not doc_work_ids.issubset(release_work_ids):
            mismatches = sorted(doc_work_ids - release_work_ids)
            conflicts.append(
                ConflictItem(
                    type="contract_doc_work_mismatch",
                    message="Contract document links contain works outside release scope.",
                    entities=[str(x) for x in mismatches],
                )
            )

    return conflicts


def simulate_release_royalty(
    db: Session,
    org_id: uuid.UUID,
    release_id: int,
    contract_document_id: Optional[int] = None,
    assume_missing_parties_as_unknown: bool = True,
    gross_revenue: Optional[float] = None,
    units: Optional[int] = None,
    period_start: Optional[str] = None,
    period_end: Optional[str] = None,
) -> RoyaltySimulationResponse:
    release = _load_release(db=db, org_id=org_id, release_id=release_id)
    contract_doc = _load_contract_document(
        db=db,
        org_id=org_id,
        release_id=release_id,
        contract_document_id=contract_document_id,
    )

    tracks = (
        db.query(Track)
        .filter(Track.organization_id == org_id, Track.release_id == release.id)
        .all()
    )

    split_rows = _entity_splits_from_latest_run(db=db, org_id=org_id, release_id=release_id)

    missing_flags: List[str] = []
    warnings: List[str] = []

    if not tracks:
        missing_flags.append("release_has_no_tracks")

    tracks_missing_isrc = [track.id for track in tracks if not track.isrc_code]
    if tracks_missing_isrc:
        missing_flags.append("missing_track_isrc")

    if not split_rows:
        warnings.append("No AI release integration split candidates found for this release.")
        if assume_missing_parties_as_unknown:
            warnings.append("Missing parties treated as unknown for deterministic simulation.")

    computed_splits = _build_percent_splits(split_rows)
    splits_total = round(sum(item.percent for item in computed_splits), 6)

    total_equals_100 = abs(splits_total - 100.0) <= 0.001
    over_allocated = splits_total > 100.001
    under_allocated = splits_total < 99.999

    conflicts = _collect_conflicts(
        release=release,
        tracks=tracks,
        contract_doc=contract_doc,
        split_rows=split_rows,
    )

    gross = float(gross_revenue) if gross_revenue is not None else 0.0
    results = [
        {
            "party_display_name": item.party_display_name,
            "percent": item.percent,
            "amount": round((gross * item.percent) / 100.0, 6) if gross_revenue is not None else None,
            "rationale": item.source,
        }
        for item in computed_splits
    ]

    needs_review = (
        (not total_equals_100)
        or bool(conflicts)
        or bool(missing_flags)
        or bool(warnings)
    )

    return RoyaltySimulationResponse(
        status="ok",
        simulation_version=ROYALTY_VERSION,
        royalty_version=ROYALTY_VERSION,
        generated_at=datetime.now(timezone.utc).isoformat(),
        org_id=str(org_id),
        release_id=release.id,
        contract_document_id=contract_doc.id if contract_doc else None,
        inputs={
            "release_id": release.id,
            "contract_document_id": contract_doc.id if contract_doc else None,
            "mode": "simulate",
            "assume_missing_parties_as_unknown": assume_missing_parties_as_unknown,
            "gross_revenue": gross_revenue,
            "units": units,
            "period_start": period_start,
            "period_end": period_end,
        },
        computed_splits=computed_splits,
        results=results,
        splits_total=splits_total,
        integrity=IntegrityBlock(
            total_equals_100=total_equals_100,
            over_allocated=over_allocated,
            under_allocated=under_allocated,
        ),
        conflicts=conflicts,
        missing_flags=missing_flags,
        warnings=warnings,
        needs_review=needs_review,
        persisted=False,
        run_id=None,
    )

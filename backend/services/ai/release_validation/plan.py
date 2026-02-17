from typing import Any, Dict, List, Optional, Set, Tuple
import uuid

from sqlalchemy.orm import Session

from models.contract import Contract
from models.contract_intake_links import ContractIntakeReleaseLink
from models.release import Release
from models.work import Work


def _norm(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def _release_snapshot(release: Release) -> Dict[str, Any]:
    artist_items: List[Dict[str, Any]] = []
    if release.artist is not None:
        artist_items.append({"id": release.artist.id, "name": release.artist.name})

    track_items: List[Dict[str, Any]] = []
    work_seen: Set[int] = set()
    work_items: List[Dict[str, Any]] = []
    for track in release.tracks:
        track_items.append({"id": track.id, "name": track.title})
        if track.work is not None and track.work.id not in work_seen:
            work_seen = work_seen | {track.work.id}
            work_items.append({"id": track.work.id, "name": track.work.title})

    return {
        "release": {"id": release.id, "name": release.title},
        "artists": artist_items,
        "tracks": track_items,
        "works": work_items,
    }


def _resolve_contract(
    db: Session, org_id: uuid.UUID, release_id: int, contract_link_id: Optional[int], contract_id: Optional[int]
) -> Optional[Contract]:
    if contract_id is not None:
        return (
            db.query(Contract)
            .filter(Contract.id == contract_id, Contract.organization_id == org_id)
            .first()
        )

    if contract_link_id is None:
        return None

    link = (
        db.query(ContractIntakeReleaseLink)
        .filter(
            ContractIntakeReleaseLink.id == contract_link_id,
            ContractIntakeReleaseLink.organization_id == org_id,
            ContractIntakeReleaseLink.release_id == release_id,
        )
        .first()
    )
    if not link:
        return None

    # No contract FK exists in this link table yet; this keeps behavior read-only and safe.
    return None


def _contract_snapshot(contract: Optional[Contract]) -> Dict[str, Any]:
    if contract is None:
        return {
            "contract_id": None,
            "parties": [],
            "splits": [],
            "documents_count": 0,
        }

    parties = []
    for party in contract.parties:
        normalized_name = _norm(party.external_name)
        if not normalized_name and party.entity_id is not None:
            normalized_name = str(party.entity_id)
        parties.append(
            {
                "id": party.id,
                "role": party.role,
                "entity_type": party.entity_type,
                "entity_id": party.entity_id,
                "external_name": party.external_name,
                "normalized_name": normalized_name,
                "split_percent": float(party.split_percent) if party.split_percent is not None else None,
            }
        )

    splits = []
    for group in contract.split_groups:
        for split in group.splits:
            split_name = split.external_party_name
            if not split_name and split.party is not None:
                split_name = split.party.external_name or str(split.party.entity_id)
            splits.append(
                {
                    "group_id": group.id,
                    "group_name": group.group_name,
                    "party_id": split.party_id,
                    "party_name": split_name,
                    "normalized_name": _norm(split_name),
                    "percent": float(split.percent),
                }
            )

    return {
        "contract_id": contract.id,
        "parties": parties,
        "splits": splits,
        "documents_count": len(contract.documents),
    }


def _build_diff(
    release: Release, contract: Optional[Contract], release_snapshot: Dict[str, Any]
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    release_artist_ids = {item["id"] for item in release_snapshot["artists"]}
    release_track_ids = {item["id"] for item in release_snapshot["tracks"]}
    release_work_ids = {item["id"] for item in release_snapshot["works"]}

    contract_artist_ids: Set[int] = set()
    contract_track_ids: Set[int] = set()
    contract_work_ids: Set[int] = set()
    split_group_totals: List[Dict[str, Any]] = []
    missing_attachments = False

    if contract is not None:
        for asset in contract.assets:
            asset_type = (asset.asset_type or "").strip().lower()
            if asset_type == "artist":
                contract_artist_ids = contract_artist_ids | {asset.asset_id}
            elif asset_type == "track":
                contract_track_ids = contract_track_ids | {asset.asset_id}
            elif asset_type == "work":
                contract_work_ids = contract_work_ids | {asset.asset_id}

        for group in contract.split_groups:
            total = 0.0
            for split in group.splits:
                total += float(split.percent)
            split_group_totals.append(
                {
                    "group_id": group.id,
                    "group_name": group.group_name,
                    "total_percent": round(total, 3),
                    "is_mismatch": abs(total - 100.0) > 0.001,
                }
            )

        missing_attachments = len(contract.documents) == 0

    missing_artists = sorted(release_artist_ids - contract_artist_ids)
    missing_tracks = sorted(release_track_ids - contract_track_ids)
    missing_works = sorted(release_work_ids - contract_work_ids)
    mismatched_split_groups = [item for item in split_group_totals if item["is_mismatch"]]

    missing_entities = []
    if missing_artists:
        missing_entities.append("artists")
    if missing_tracks:
        missing_entities.append("tracks")
    if missing_works:
        missing_entities.append("works")

    needs_contract_review = (
        contract is None
        or bool(missing_entities)
        or bool(mismatched_split_groups)
        or missing_attachments
    )

    diff = {
        "missing_artists": missing_artists,
        "missing_tracks": missing_tracks,
        "missing_works": missing_works,
        "mismatched_split_totals": mismatched_split_groups,
        "missing_attachments": missing_attachments,
    }
    flags = {
        "needs_contract_review": needs_contract_review,
        "missing_entities": missing_entities,
    }
    return diff, flags


def build_release_validation_plan(
    db: Session,
    org_id: uuid.UUID,
    release_id: int,
    contract_link_id: Optional[int] = None,
    contract_id: Optional[int] = None,
) -> Dict[str, Any]:
    release = (
        db.query(Release)
        .filter(Release.id == release_id, Release.organization_id == org_id)
        .first()
    )
    if not release:
        raise ValueError("release_not_found")

    contract = _resolve_contract(db, org_id, release_id, contract_link_id, contract_id)
    release_snapshot = _release_snapshot(release)
    contract_snapshot = _contract_snapshot(contract)
    diff, flags = _build_diff(release, contract, release_snapshot)

    recommended_actions = [
        "Review missing entities and map contract assets to release metadata.",
        "Confirm contract split groups total 100% per group.",
        "Attach or verify source contract documents before persistence workflows.",
    ]
    if not flags["needs_contract_review"]:
        recommended_actions = ["No blocking issues detected in read-only validation plan."]

    return {
        "release_snapshot": release_snapshot,
        "contract_snapshot": contract_snapshot,
        "diff": diff,
        "flags": flags,
        "recommended_actions": recommended_actions,
    }

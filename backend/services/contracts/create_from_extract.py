import os
import random
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from config import settings
from models.contract import Contract, ContractDocument, ContractAsset
from models.contract_track_links import ContractTrackLink
from models.track import Track
from services.ai.extractors.contract_extractor_v1 import deterministic_extract
from services.ai.parsing.pdf_extract import extract_text_from_pdf

_ALLOWED_TYPES = {"Recording", "Publishing", "Remix", "Master", "Other"}
_ALLOWED_STATUS = {"Draft", "Active", "Expired"}


def _next_contract_number(db: Session, org_id) -> str:
    for _ in range(20):
        candidate = f"CTR-{random.randint(100000, 999999)}"
        exists = (
            db.query(Contract)
            .filter(Contract.organization_id == org_id, Contract.contract_number == candidate)
            .first()
        )
        if not exists:
            return candidate
    return f"CTR-{int(datetime.utcnow().timestamp())}"


def _parse_date(date_str):
    if date_str in (None, "", "null"):
        return None
    if isinstance(date_str, str):
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    return date_str


def _safe_title_from_filename(filename: str) -> str:
    base = os.path.splitext(os.path.basename(filename))[0]
    return (base or "Untitled Contract").strip()


def create_contract_from_extract(
    db: Session,
    *,
    org_id,
    user_id: int,
    file_name: str,
    file_content: bytes,
    payload: dict,
) -> dict:
    if not file_name.lower().endswith(".pdf") or not file_content:
        raise ValueError("invalid_file")

    if payload.get("confirm_non_destructive") is not True:
        raise ValueError("confirmation_required")

    contract_type = payload.get("contract_type") or "Other"
    contract_type = payload.get("type") or contract_type
    status = payload.get("status") or "Draft"
    if contract_type not in _ALLOWED_TYPES:
        raise ValueError("invalid_contract_type")
    if status not in _ALLOWED_STATUS:
        raise ValueError("invalid_status")

    parsed = extract_text_from_pdf(file_content)
    extraction = deterministic_extract(parsed["text"])
    extraction_payload = extraction.model_dump(mode="json")
    extraction_payload["contract_date"] = extraction_payload.get("effective_date")
    extraction_payload["expiration_date"] = extraction_payload.get("end_date")

    overrides = payload.get("user_overrides") or {}
    if not isinstance(overrides, dict):
        overrides = {}
    extracted_title = extraction.contract_title
    if extracted_title and extracted_title == "Governed Extraction (Deterministic V1)":
        extracted_title = None

    title = (
        payload.get("title")
        or overrides.get("title")
        or extracted_title
        or _safe_title_from_filename(file_name)
    ).strip()
    start_date = _parse_date(
        payload.get("start_date")
        or overrides.get("start_date")
        or extraction_payload.get("effective_date")
        or extraction_payload.get("start_date")
    )
    end_date = _parse_date(
        payload.get("end_date")
        or overrides.get("end_date")
        or extraction_payload.get("end_date")
    )

    raw_track_ids = payload.get("track_ids") or []
    if raw_track_ids is None:
        raw_track_ids = []
    if not isinstance(raw_track_ids, list):
        raise ValueError("invalid_track_ids")
    track_ids = []
    for item in raw_track_ids:
        try:
            track_ids.append(int(item))
        except Exception:
            raise ValueError("invalid_track_ids")

    valid_tracks = []
    if track_ids:
        valid_tracks = (
            db.query(Track)
            .filter(Track.organization_id == org_id, Track.id.in_(track_ids))
            .all()
        )
        if len(valid_tracks) != len(set(track_ids)):
            raise ValueError("track_not_found_or_forbidden")

    contract = Contract(
        contract_number=_next_contract_number(db, org_id),
        organization_id=org_id,
        title=title,
        status=status,
        type=contract_type,
        start_date=start_date,
        end_date=end_date,
        signed_date=start_date,
        created_by=user_id,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    contract_dir = Path(settings.UPLOAD_DIR) / "contracts" / str(contract.id)
    contract_dir.mkdir(parents=True, exist_ok=True)
    dest_path = contract_dir / file_name
    dest_path.write_bytes(file_content)

    document = ContractDocument(
        contract_id=contract.id,
        organization_id=org_id,
        file_path=str(dest_path).replace(settings.UPLOAD_DIR, "/uploads"),
        file_name=file_name,
        version=1,
        uploaded_by=user_id,
        checksum=parsed["sha256"],
        mime_type="application/pdf",
        size_bytes=len(file_content),
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    linked_tracks_count = 0
    if valid_tracks:
        for track in valid_tracks:
            existing_asset = (
                db.query(ContractAsset)
                .filter(
                    ContractAsset.organization_id == org_id,
                    ContractAsset.contract_id == contract.id,
                    ContractAsset.asset_type == "Track",
                    ContractAsset.asset_id == track.id,
                )
                .first()
            )
            if not existing_asset:
                db.add(
                    ContractAsset(
                        organization_id=org_id,
                        contract_id=contract.id,
                        asset_type="Track",
                        asset_id=track.id,
                        scope_type="INCLUSION",
                        notes="Linked during create_from_extract",
                    )
                )
            existing = (
                db.query(ContractTrackLink)
                .filter(
                    ContractTrackLink.organization_id == org_id,
                    ContractTrackLink.contract_id == contract.id,
                    ContractTrackLink.track_id == track.id,
                )
                .first()
            )
            if existing:
                continue
            db.add(
                ContractTrackLink(
                    organization_id=org_id,
                    contract_id=contract.id,
                    track_id=track.id,
                )
            )
            linked_tracks_count += 1
        db.commit()

    return {
        "status": "created",
        "contract_id": contract.id,
        "contract_document_id": document.id,
        "title": contract.title,
        "type": contract.type,
        "contract_status": contract.status,
        "start_date": contract.start_date.isoformat() if contract.start_date else None,
        "end_date": contract.end_date.isoformat() if contract.end_date else None,
        "pdf_asset_id": document.id,
        "linked_tracks_count": linked_tracks_count,
        "warnings": list(extraction_payload.get("warnings") or []),
        "extraction": extraction_payload,
    }

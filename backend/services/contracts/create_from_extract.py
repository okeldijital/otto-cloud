import os
import random
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from config import settings
from models.contract import Contract, ContractDocument
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

    contract_type = payload.get("contract_type") or "Other"
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
    extracted_title = extraction.contract_title
    if extracted_title and extracted_title == "Governed Extraction (Deterministic V1)":
        extracted_title = None

    title = (overrides.get("title") or extracted_title or _safe_title_from_filename(file_name)).strip()
    start_date = _parse_date(
        overrides.get("start_date") or extraction_payload.get("effective_date") or extraction_payload.get("start_date")
    )
    end_date = _parse_date(overrides.get("end_date") or extraction_payload.get("end_date"))

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

    return {
        "contract_id": contract.id,
        "title": contract.title,
        "type": contract.type,
        "status": contract.status,
        "start_date": contract.start_date.isoformat() if contract.start_date else None,
        "end_date": contract.end_date.isoformat() if contract.end_date else None,
        "pdf_asset_id": document.id,
        "extraction": extraction_payload,
    }

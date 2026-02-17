import hashlib
import json
import os
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from config import settings
from models.contract_wizard import AIContractDraft
from schemas.ai_contracts import ContractExtractionV1
from services.ai.extractors.contract_extractor_v1 import extract_contract_intelligence
from services.ai.parsing.pdf_extract import extract_text_from_pdf


def _serialize_extraction(extraction: ContractExtractionV1) -> dict:
    return extraction.model_dump(mode="json")


def _suggested_defaults(extraction: ContractExtractionV1) -> dict:
    return {
        "title": extraction.contract_title,
        "start_date": (extraction.effective_date or extraction.start_date).isoformat()
        if (extraction.effective_date or extraction.start_date)
        else None,
        "end_date": extraction.end_date.isoformat() if extraction.end_date else None,
    }


def create_contract_draft(
    db: Session,
    org_id,
    user_id: int,
    *,
    filename: str,
    content: bytes,
    source: str = "wizard",
) -> dict:
    if not filename or not filename.lower().endswith(".pdf"):
        raise ValueError("invalid_file")
    if not content:
        raise ValueError("empty_file")

    file_hash = hashlib.sha256(content).hexdigest()
    existing = (
        db.query(AIContractDraft)
        .filter(
            AIContractDraft.organization_id == org_id,
            AIContractDraft.file_hash == file_hash,
        )
        .first()
    )
    if existing:
        extraction = json.loads(existing.extraction_json)
        defaults = json.loads(existing.suggested_defaults_json)
        return {
            "status": "draft_ready",
            "draft_id": existing.id,
            "org_id": str(org_id),
            "extraction": extraction,
            "suggested_defaults": defaults,
            "pdf": {
                "document_id": existing.id,
                "filename": existing.file_name,
                "sha256": existing.file_hash,
                "size_bytes": existing.size_bytes,
            },
        }

    parsed = extract_text_from_pdf(content)
    extraction = extract_contract_intelligence(parsed["text"])
    extraction_payload = _serialize_extraction(extraction)
    defaults = _suggested_defaults(extraction)

    org_dir = Path(settings.UPLOAD_DIR) / "contracts" / "drafts" / str(org_id)
    org_dir.mkdir(parents=True, exist_ok=True)
    file_path = org_dir / f"{file_hash}.pdf"
    file_path.write_bytes(content)

    draft = AIContractDraft(
        id=uuid.uuid4().hex,
        organization_id=org_id,
        created_by=user_id,
        source=source,
        file_path=str(file_path),
        file_name=filename,
        file_hash=file_hash,
        size_bytes=len(content),
        extraction_json=json.dumps(extraction_payload, sort_keys=True),
        suggested_defaults_json=json.dumps(defaults, sort_keys=True),
    )
    db.add(draft)
    db.commit()

    return {
        "status": "draft_ready",
        "draft_id": draft.id,
        "org_id": str(org_id),
        "extraction": extraction_payload,
        "suggested_defaults": defaults,
        "pdf": {
            "document_id": draft.id,
            "filename": filename,
            "sha256": file_hash,
            "size_bytes": len(content),
        },
    }


def get_contract_draft(db: Session, org_id, draft_id: str) -> dict:
    draft = (
        db.query(AIContractDraft)
        .filter(AIContractDraft.id == draft_id, AIContractDraft.organization_id == org_id)
        .first()
    )
    if not draft:
        raise ValueError("draft_not_found")

    extraction = json.loads(draft.extraction_json)
    defaults = json.loads(draft.suggested_defaults_json)

    return {
        "status": "draft_ready",
        "draft_id": draft.id,
        "org_id": str(org_id),
        "extraction": extraction,
        "suggested_defaults": defaults,
        "editable_fields": {
            "title": defaults.get("title") or extraction.get("contract_title"),
            "contract_date": extraction.get("effective_date") or extraction.get("start_date"),
            "effective_date": extraction.get("effective_date") or extraction.get("start_date"),
            "expiration_date": extraction.get("end_date"),
            "territory": extraction.get("territory"),
            "notes": None,
        },
        "pdf": {
            "document_id": draft.id,
            "filename": draft.file_name,
            "sha256": draft.file_hash,
            "size_bytes": draft.size_bytes,
        },
    }

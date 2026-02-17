from datetime import datetime
from pathlib import Path
import shutil
import json
import random

from sqlalchemy.orm import Session

from config import settings
from models.contract import Contract, ContractDocument
from models.contract_wizard import AIContractDraft


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


def create_contract_from_draft(
    db: Session,
    *,
    org_id,
    user_id: int,
    draft_id: str,
    overrides: dict,
) -> dict:
    draft = (
        db.query(AIContractDraft)
        .filter(AIContractDraft.id == draft_id, AIContractDraft.organization_id == org_id)
        .first()
    )
    if not draft:
        raise ValueError("draft_not_found")

    existing_doc = (
        db.query(ContractDocument)
        .join(Contract, Contract.id == ContractDocument.contract_id)
        .filter(
            Contract.organization_id == org_id,
            ContractDocument.checksum == draft.file_hash,
        )
        .order_by(ContractDocument.id.asc())
        .first()
    )
    if existing_doc:
        existing_contract = (
            db.query(Contract)
            .filter(Contract.id == existing_doc.contract_id, Contract.organization_id == org_id)
            .first()
        )
        if existing_contract:
            return {
                "status": "created",
                "contract_id": existing_contract.id,
                "org_id": str(org_id),
                "title": existing_contract.title,
                "dates": {
                    "contract_date": existing_contract.signed_date.isoformat() if existing_contract.signed_date else None,
                    "effective_date": existing_contract.start_date.isoformat() if existing_contract.start_date else None,
                    "expiration_date": existing_contract.end_date.isoformat() if existing_contract.end_date else None,
                },
                "document_id": draft.id,
                "warnings": ["idempotent_existing_contract_reused"],
                "idempotent_hit": True,
            }

    extraction = json.loads(draft.extraction_json)
    defaults = json.loads(draft.suggested_defaults_json)

    title = (overrides.get("title") or defaults.get("title") or extraction.get("contract_title") or draft.file_name).strip()
    territory = overrides.get("territory") or extraction.get("territory")
    notes = overrides.get("notes")

    def parse_date(value):
        if value in (None, "", "null"):
            return None
        if isinstance(value, str):
            return datetime.strptime(value, "%Y-%m-%d").date()
        return value

    signed_date = parse_date(overrides.get("contract_date") or extraction.get("effective_date") or extraction.get("start_date"))
    start_date = parse_date(overrides.get("effective_date") or extraction.get("effective_date") or extraction.get("start_date"))
    end_date = parse_date(overrides.get("expiration_date") or extraction.get("end_date"))

    contract = Contract(
        contract_number=_next_contract_number(db, org_id),
        organization_id=org_id,
        title=title,
        status="Draft",
        type=extraction.get("contract_type") or "Recording",
        start_date=start_date,
        end_date=end_date,
        signed_date=signed_date,
        territory=territory,
        exclusivity=bool(extraction.get("exclusivity") or False),
        notes=notes,
        created_by=user_id,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    doc_rel_path = f"/uploads/contracts/{contract.id}/{draft.file_name}"
    contract_dir = Path(settings.UPLOAD_DIR) / "contracts" / str(contract.id)
    contract_dir.mkdir(parents=True, exist_ok=True)
    dest_path = contract_dir / draft.file_name
    if Path(draft.file_path).exists():
        shutil.copyfile(draft.file_path, dest_path)
    else:
        dest_path.write_bytes(b"")
    doc = ContractDocument(
        contract_id=contract.id,
        organization_id=org_id,
        file_path=doc_rel_path,
        file_name=draft.file_name,
        version=1,
        uploaded_by=user_id,
        checksum=draft.file_hash,
        mime_type="application/pdf",
        size_bytes=draft.size_bytes,
    )
    db.add(doc)
    db.commit()

    return {
        "status": "created",
        "contract_id": contract.id,
        "org_id": str(org_id),
        "title": contract.title,
        "dates": {
            "contract_date": contract.signed_date.isoformat() if contract.signed_date else None,
            "effective_date": contract.start_date.isoformat() if contract.start_date else None,
            "expiration_date": contract.end_date.isoformat() if contract.end_date else None,
        },
        "document_id": draft.id,
        "warnings": [],
        "idempotent_hit": False,
    }

import hashlib
from pathlib import Path
import uuid
from typing import Any, Dict, Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from config import settings
from models.contract_documents import AIContractDocument, AIContractWorkLink
from models.release import Release
from models.user import User
from schemas.ai_contracts import ContractExtractionV1
from schemas.ai_release_integration import ReleaseIntegrationPlanResponse
from services.ai.extractors.contract_extractor_v1 import extract_contract_intelligence
from services.ai.parsing.pdf_extract import extract_text_from_pdf
from services.ai.release_integration import (
    attach_release_integration_plan,
    build_release_integration_plan,
)


def _storage_path(org_id: uuid.UUID, file_hash: str) -> Path:
    base = Path(settings.STORAGE_ROOT) / "contracts" / str(org_id)
    base.mkdir(parents=True, exist_ok=True)
    return base / f"{file_hash}.pdf"


def _extract_contract(payload: bytes) -> ContractExtractionV1:
    parsed = extract_text_from_pdf(payload)
    extracted = extract_contract_intelligence(parsed["text"])
    return extracted


def _resolve_existing_document(
    db: Session,
    org_id: uuid.UUID,
    release_id: int,
    file_hash: str,
) -> Optional[AIContractDocument]:
    return (
        db.query(AIContractDocument)
        .filter(
            AIContractDocument.organization_id == org_id,
            AIContractDocument.release_id == release_id,
            AIContractDocument.file_hash == file_hash,
        )
        .first()
    )


def ingest_contract_pdf(
    db: Session,
    org_id: uuid.UUID,
    release_id: int,
    file: UploadFile,
    user: User,
    contract_id: Optional[int] = None,
) -> Dict[str, Any]:
    release = (
        db.query(Release)
        .filter(Release.id == release_id, Release.organization_id == org_id)
        .first()
    )
    if not release:
        raise ValueError("release_not_found")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise ValueError("invalid_file_type")

    payload = file.file.read()
    if not payload:
        raise ValueError("empty_file")

    file_hash = hashlib.sha256(payload).hexdigest()
    destination = _storage_path(org_id, file_hash)
    if not destination.exists():
        destination.write_bytes(payload)

    existing_document = _resolve_existing_document(
        db=db,
        org_id=org_id,
        release_id=release_id,
        file_hash=file_hash,
    )

    extraction = _extract_contract(payload)
    plan_model = build_release_integration_plan(
        db=db,
        org_id=org_id,
        release_id=release_id,
        contract_extract=extraction,
        extract_id=None,
    )

    if isinstance(plan_model, ReleaseIntegrationPlanResponse):
        plan = plan_model
    else:
        plan = ReleaseIntegrationPlanResponse.model_validate(plan_model)

    attach_result = attach_release_integration_plan(
        db=db,
        org_id=org_id,
        user_id=user.id,
        release_id=release_id,
        wizard_plan=plan,
        contract_id=contract_id,
        contract_extract=extraction,
        reviewed_mismatches=True,
    )

    doc_created = 0
    if existing_document is None:
        document = AIContractDocument(
            organization_id=org_id,
            release_id=release_id,
            file_path=str(destination),
            file_hash=file_hash,
            uploaded_by=user.id,
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        contract_document_id = document.id
        doc_created = 1
    else:
        contract_document_id = existing_document.id

    work_links_created = 0
    seen_work_ids = set()
    for work in plan.matches.release_works:
        if work.id is None:
            continue
        if work.id in seen_work_ids:
            continue
        seen_work_ids = seen_work_ids | {work.id}

        existing_link = (
            db.query(AIContractWorkLink)
            .filter(
                AIContractWorkLink.organization_id == org_id,
                AIContractWorkLink.contract_document_id == contract_document_id,
                AIContractWorkLink.work_id == work.id,
            )
            .first()
        )
        if existing_link:
            continue

        db.add(
            AIContractWorkLink(
                organization_id=org_id,
                contract_document_id=contract_document_id,
                work_id=work.id,
                confidence=1.0 if work.contract_match else 0.65,
                match_strategy="exact" if work.contract_match else "normalized",
            )
        )
        work_links_created += 1

    db.commit()

    warnings = list(plan.contract_summary.warnings)
    if existing_document is not None:
        warnings.append("idempotent_document_reused")

    return {
        "release_id": release_id,
        "contract_document_id": contract_document_id,
        "run_id": attach_result["run_id"],
        "matches": plan.matches.model_dump(mode="json"),
        "missing_flags": [item.model_dump(mode="json") for item in plan.missing_flags],
        "warnings": warnings,
        "attached_counts": attach_result["attached_counts"],
        "ingest_counts": {
            "documents_created": doc_created,
            "work_links_created": work_links_created,
        },
    }

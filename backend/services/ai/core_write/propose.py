import os
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from config import settings
from models.contract import Contract, ContractDocument, ContractParty
from schemas.ai_contracts import ContractExtractionV1
from schemas.ai_core_write import AICoreWriteProposal
from services.ai.extractors.contract_extractor_v1 import extract_contract_intelligence
from services.ai.linking.link_suggest_v1 import suggest_links
from services.ai.parsing.pdf_extract import extract_text_from_pdf


def _doc_disk_path(file_path: str) -> str:
    if file_path.startswith("/uploads/"):
        relative = file_path.replace("/uploads/", "", 1)
        return str(Path(settings.UPLOAD_DIR) / relative)
    return file_path


def _load_extraction_from_document(
    db: Session,
    org_id,
    contract_id: int,
    contract_document_id: Optional[int],
) -> Optional[ContractExtractionV1]:
    if not contract_document_id:
        return None
    doc = (
        db.query(ContractDocument)
        .filter(
            ContractDocument.id == contract_document_id,
            ContractDocument.contract_id == contract_id,
            ContractDocument.organization_id == org_id,
        )
        .first()
    )
    if not doc:
        return None
    disk_path = _doc_disk_path(doc.file_path)
    if not os.path.exists(disk_path):
        return None
    payload = Path(disk_path).read_bytes()
    parsed = extract_text_from_pdf(payload)
    return extract_contract_intelligence(parsed["text"])


def build_core_write_proposals(
    db: Session,
    org_id,
    contract_id: int,
    release_id: Optional[int] = None,
    contract_document_id: Optional[int] = None,
    contract_extract: Optional[ContractExtractionV1] = None,
) -> Dict:
    contract = (
        db.query(Contract)
        .filter(Contract.id == contract_id, Contract.organization_id == org_id)
        .first()
    )
    if not contract:
        raise ValueError("contract_not_found")

    extraction = contract_extract or _load_extraction_from_document(
        db=db,
        org_id=org_id,
        contract_id=contract_id,
        contract_document_id=contract_document_id,
    )

    proposals: List[AICoreWriteProposal] = []

    if extraction is not None:
        if not contract.territory and extraction.territory:
            proposals.append(
                AICoreWriteProposal(
                    entity_type="contract",
                    entity_id=contract.id,
                    operation="patch",
                    patch={"fields": {"territory": extraction.territory}},
                    safe_defaults=[{"field": "territory", "new_value": extraction.territory}],
                    conflicts=[],
                    requires_user_review=True,
                )
            )
        elif contract.territory and extraction.territory and contract.territory != extraction.territory:
            proposals.append(
                AICoreWriteProposal(
                    entity_type="contract",
                    entity_id=contract.id,
                    operation="patch",
                    patch={"fields": {"territory": extraction.territory}},
                    safe_defaults=[],
                    conflicts=[{"field": "territory", "existing": contract.territory, "proposed": extraction.territory}],
                    requires_user_review=True,
                )
            )

        existing_external = {
            (p.external_name or "").strip().lower()
            for p in db.query(ContractParty)
            .filter(ContractParty.contract_id == contract.id, ContractParty.organization_id == org_id)
            .all()
            if p.external_name
        }
        for party in extraction.parties:
            display = (party.display_name or "").strip()
            if not display:
                continue
            if display.lower() in existing_external:
                continue
            proposals.append(
                AICoreWriteProposal(
                    entity_type="contract_party",
                    entity_id=None,
                    operation="create",
                    patch={
                        "contract_id": contract.id,
                        "entity_type": "External",
                        "external_name": display,
                        "role": (
                            party.role.value
                            if hasattr(party.role, "value")
                            else (party.role if party.role else "Other")
                        ),
                        "split_percent": None,
                    },
                    conflicts=[],
                    safe_defaults=[{"field": "external_name", "new_value": display}],
                    requires_user_review=True,
                )
            )

        links = suggest_links(db, str(org_id), extraction)
        for suggestion in links.suggestions.get("organizations", []):
            if suggestion.entity_id is None:
                proposals.append(
                    AICoreWriteProposal(
                        entity_type="organization",
                        entity_id=None,
                        operation="create",
                        patch={"name": suggestion.display_name, "org_type": "Other"},
                        conflicts=[],
                        safe_defaults=[{"field": "name", "new_value": suggestion.display_name}],
                        requires_user_review=True,
                    )
                )
        for suggestion in links.suggestions.get("parties", []):
            if suggestion.entity_type != "individual" or suggestion.entity_id is not None:
                continue
            proposals.append(
                AICoreWriteProposal(
                    entity_type="individual",
                    entity_id=None,
                    operation="create",
                    patch={"first_name": suggestion.display_name, "last_name": "", "role": "Other"},
                    conflicts=[],
                    safe_defaults=[{"field": "first_name", "new_value": suggestion.display_name}],
                    requires_user_review=True,
                )
            )

    requires_review = True
    return {
        "contract": contract,
        "release_id": release_id,
        "contract_document_id": contract_document_id,
        "extraction": extraction,
        "proposals": proposals,
        "requires_user_review": requires_review,
    }

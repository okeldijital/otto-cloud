import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from sqlalchemy.orm import Session

from config import settings
from models.admin_backup import AdminBackupArtifact
from models.ai_core_write import (
    AICoreWriteApplyEvent,
    AICoreWriteProposalItem,
    AICoreWriteProposalRun,
)
from models.contract import Contract, ContractParty
from models.network import Individual, Organization
from schemas.ai_core_write import AICoreWriteApplyRequest, AICoreWriteProposal

OVERWRITE_ALLOWLIST = set()


def _request_hash(run_id: int, selections: List[Dict]) -> str:
    payload = {"run_id": run_id, "selections": selections}
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _backup_checkpoint_ok(db: Session, org_id) -> bool:
    threshold = datetime.now(timezone.utc) - timedelta(minutes=30)
    row = (
        db.query(AdminBackupArtifact)
        .filter(
            AdminBackupArtifact.organization_id == org_id,
            AdminBackupArtifact.created_at >= threshold,
        )
        .order_by(AdminBackupArtifact.created_at.desc())
        .first()
    )
    return row is not None


def persist_proposal_run(
    db: Session,
    org_id,
    user_id: int,
    contract_id: int,
    release_id,
    contract_document_id,
    parser_version: str,
    linker_version: str,
    planner_version: str,
    proposals: List[AICoreWriteProposal],
) -> int:
    payload = {
        "org_id": str(org_id),
        "contract_id": contract_id,
        "release_id": release_id,
        "contract_document_id": contract_document_id,
        "parser_version": parser_version,
        "linker_version": linker_version,
        "planner_version": planner_version,
        "proposals": [p.model_dump(mode="json") for p in proposals],
    }
    request_hash = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()

    run = AICoreWriteProposalRun(
        organization_id=org_id,
        user_id=user_id,
        contract_id=contract_id,
        release_id=release_id,
        contract_document_id=contract_document_id,
        request_hash=request_hash,
        parser_version=parser_version,
        linker_version=linker_version,
        planner_version=planner_version,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    for item in proposals:
        db.add(
            AICoreWriteProposalItem(
                organization_id=org_id,
                run_id=run.id,
                entity_type=item.entity_type,
                entity_id=item.entity_id,
                operation=item.operation,
                patch_json=json.dumps(item.patch, sort_keys=True),
                conflicts_json=json.dumps(item.conflicts, sort_keys=True),
                safe_defaults_json=json.dumps(item.safe_defaults, sort_keys=True),
                requires_user_review=item.requires_user_review,
            )
        )
    db.commit()
    return run.id


def apply_core_write_run(
    db: Session,
    org_id,
    user_id: int,
    req: AICoreWriteApplyRequest,
) -> Dict:
    run = (
        db.query(AICoreWriteProposalRun)
        .filter(
            AICoreWriteProposalRun.id == req.run_id,
            AICoreWriteProposalRun.organization_id == org_id,
        )
        .first()
    )
    if not run:
        raise ValueError("run_not_found")

    if not req.confirm:
        raise ValueError("confirmation_required")

    if settings.AI_CORE_WRITE_REQUIRE_BACKUP and not _backup_checkpoint_ok(db, org_id):
        raise ValueError("backup_required_before_apply")

    request_hash = _request_hash(req.run_id, [s.model_dump(mode="json") for s in req.selections])
    existing = (
        db.query(AICoreWriteApplyEvent)
        .filter(
            AICoreWriteApplyEvent.organization_id == org_id,
            AICoreWriteApplyEvent.run_id == req.run_id,
            AICoreWriteApplyEvent.request_hash == request_hash,
            AICoreWriteApplyEvent.status == "succeeded",
        )
        .first()
    )
    if existing:
        return {
            "status": "skipped",
            "run_id": req.run_id,
            "applied_count": 0,
            "created_count": 0,
            "conflict_count": 0,
            "idempotent_hit": True,
            "warnings": ["idempotent_apply_reused_existing_event"],
        }

    item_rows = (
        db.query(AICoreWriteProposalItem)
        .filter(
            AICoreWriteProposalItem.organization_id == org_id,
            AICoreWriteProposalItem.run_id == req.run_id,
        )
        .all()
    )
    item_by_id = {row.id: row for row in item_rows}

    contract = (
        db.query(Contract)
        .filter(Contract.id == run.contract_id, Contract.organization_id == org_id)
        .first()
    )
    if not contract:
        raise ValueError("contract_not_found")

    applied_count = 0
    created_count = 0
    conflict_count = 0

    for selection in req.selections:
        row = item_by_id.get(selection.item_id)
        if not row or selection.decision != "accept":
            continue

        patch = json.loads(row.patch_json or "{}")
        if row.entity_type == "contract" and row.operation == "patch":
            fields = patch.get("fields", {})
            for field, value in fields.items():
                current = getattr(contract, field, None)
                has_current = current not in (None, "")
                if has_current and (not selection.overwrite or field not in OVERWRITE_ALLOWLIST):
                    conflict_count += 1
                    continue
                setattr(contract, field, value)
                applied_count += 1
        elif row.entity_type == "contract_party" and row.operation == "create":
            external_name = (patch.get("external_name") or "").strip()
            role = patch.get("role") or "Other"
            if not external_name:
                continue
            exists = (
                db.query(ContractParty)
                .filter(
                    ContractParty.organization_id == org_id,
                    ContractParty.contract_id == contract.id,
                    ContractParty.external_name == external_name,
                    ContractParty.role == role,
                )
                .first()
            )
            if exists:
                continue
            db.add(
                ContractParty(
                    contract_id=contract.id,
                    organization_id=org_id,
                    entity_type="External",
                    external_name=external_name,
                    role=role,
                    split_percent=None,
                )
            )
            created_count += 1
        elif row.entity_type == "organization" and row.operation == "create":
            name = (patch.get("name") or "").strip()
            if not name:
                continue
            exists = (
                db.query(Organization)
                .filter(Organization.organization_id == org_id, Organization.name == name)
                .first()
            )
            if exists:
                continue
            db.add(Organization(organization_id=org_id, name=name, org_type=patch.get("org_type") or "Other"))
            created_count += 1
        elif row.entity_type == "individual" and row.operation == "create":
            first_name = (patch.get("first_name") or "").strip()
            if not first_name:
                continue
            exists = (
                db.query(Individual)
                .filter(Individual.organization_id == org_id, Individual.first_name == first_name)
                .first()
            )
            if exists:
                continue
            db.add(
                Individual(
                    organization_id=org_id,
                    first_name=first_name,
                    last_name=patch.get("last_name") or "",
                    role=patch.get("role") or "Other",
                )
            )
            created_count += 1

    db.commit()

    event = AICoreWriteApplyEvent(
        organization_id=org_id,
        user_id=user_id,
        run_id=req.run_id,
        request_hash=request_hash,
        status="succeeded",
        applied_count=applied_count,
        created_count=created_count,
        conflict_count=conflict_count,
        details_json=json.dumps({"selected_count": len(req.selections)}, sort_keys=True),
    )
    db.add(event)
    db.commit()

    return {
        "status": "applied",
        "run_id": req.run_id,
        "applied_count": applied_count,
        "created_count": created_count,
        "conflict_count": conflict_count,
        "idempotent_hit": False,
        "warnings": [],
    }

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Dict

from sqlalchemy.orm import Session

from config import settings
from models.admin_backup import AdminBackupArtifact
from models.contract import Contract
from models.contract_wizard import AIContractAttachLink, AIContractAttachRun
from models.release import Release


def _has_recent_backup(db: Session, org_id) -> bool:
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


def apply_contract_attach(
    db: Session,
    *,
    org_id,
    user_id: int,
    contract_id: int,
    payload: Dict,
) -> Dict:
    contract = (
        db.query(Contract)
        .filter(Contract.id == contract_id, Contract.organization_id == org_id)
        .first()
    )
    if not contract:
        raise ValueError("contract_not_found")

    release_id = int(payload.get("release_id"))
    release = (
        db.query(Release)
        .filter(Release.id == release_id, Release.organization_id == org_id)
        .first()
    )
    if not release:
        raise ValueError("release_not_found")

    if not payload.get("confirm"):
        raise ValueError("confirmation_required")

    backup_required = settings.AI_ATTACH_REQUIRE_BACKUP or settings.AI_CORE_WRITE_REQUIRE_BACKUP
    if backup_required and not _has_recent_backup(db, org_id):
        raise ValueError("backup_required_before_apply")

    canonical = {
        "org_id": str(org_id),
        "contract_id": contract_id,
        "release_id": release_id,
        "overwrite": payload.get("overwrite") or {},
        "actions": payload.get("actions") or [],
    }
    request_hash = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()

    existing = (
        db.query(AIContractAttachRun)
        .filter(
            AIContractAttachRun.organization_id == org_id,
            AIContractAttachRun.request_hash == request_hash,
        )
        .first()
    )
    if existing:
        return {
            "status": "applied",
            "run_id": existing.id,
            "contract_id": contract_id,
            "release_id": release_id,
            "idempotent_hit": True,
            "core_mutations": {
                "overwrites_performed": [],
                "core_tables_changed": False,
            },
            "ai_tables": {
                "attach_runs": 0,
                "attach_links": 0,
            },
        }

    run = AIContractAttachRun(
        organization_id=org_id,
        user_id=user_id,
        contract_id=contract_id,
        release_id=release_id,
        request_hash=request_hash,
        warnings_json=json.dumps([], sort_keys=True),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    links_created = 0
    for action in (payload.get("actions") or []):
        db.add(
            AIContractAttachLink(
                organization_id=org_id,
                run_id=run.id,
                action_type=str(action.get("type") or "unknown"),
                target_name=action.get("party_display_name") or action.get("type"),
                entity_id=action.get("entity_id"),
                confidence=1.0,
                details_json=json.dumps(action, sort_keys=True),
            )
        )
        links_created += 1
    db.commit()

    return {
        "status": "applied",
        "run_id": run.id,
        "contract_id": contract_id,
        "release_id": release_id,
        "idempotent_hit": False,
        "core_mutations": {
            "overwrites_performed": [],
            "core_tables_changed": False,
        },
        "ai_tables": {
            "attach_runs": 1,
            "attach_links": links_created,
        },
    }

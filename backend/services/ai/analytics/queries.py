from datetime import datetime, timezone
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.ai import AIAuditLog, AIContractResolutionLink, AIContractResolutionRun


ANALYTICS_VERSION = "analytics_v1"


def get_analytics_summary(db: Session, org_id: uuid.UUID) -> dict:
    contracts_processed_count = db.query(func.count(AIAuditLog.id)).filter(
        AIAuditLog.organization_id == org_id,
        AIAuditLog.action == "contract_extraction",
    ).scalar() or 0

    resolution_runs_count = db.query(func.count(AIContractResolutionRun.id)).filter(
        AIContractResolutionRun.organization_id == org_id
    ).scalar() or 0

    links_persisted_count = db.query(func.count(AIContractResolutionLink.id)).join(
        AIContractResolutionRun, AIContractResolutionLink.run_id == AIContractResolutionRun.id
    ).filter(
        AIContractResolutionRun.organization_id == org_id
    ).scalar() or 0

    unresolved_count = db.query(func.count(AIContractResolutionRun.id)).outerjoin(
        AIContractResolutionLink, AIContractResolutionLink.run_id == AIContractResolutionRun.id
    ).filter(
        AIContractResolutionRun.organization_id == org_id
    ).group_by(AIContractResolutionRun.id).having(
        func.count(AIContractResolutionLink.id) == 0
    ).count()

    generated_at = datetime.now(timezone.utc).isoformat()
    org_str = str(org_id)

    return {
        "org_id": org_str,
        "organization_id": org_str,
        "generated_at": generated_at,
        "analytics_version": ANALYTICS_VERSION,
        "contracts_processed_count": contracts_processed_count,
        "resolution_runs_count": resolution_runs_count,
        "links_persisted_count": links_persisted_count,
        "unresolved_count": unresolved_count,
    }


def get_analytics_contracts(db: Session, org_id: uuid.UUID, limit: int = 50) -> dict:
    safe_limit = max(1, min(limit, 200))
    rows = db.query(
        AIContractResolutionRun.id.label("run_id"),
        AIContractResolutionRun.created_at.label("created_at"),
        func.count(AIContractResolutionLink.id).label("links_count"),
    ).outerjoin(
        AIContractResolutionLink, AIContractResolutionLink.run_id == AIContractResolutionRun.id
    ).filter(
        AIContractResolutionRun.organization_id == org_id
    ).group_by(
        AIContractResolutionRun.id
    ).order_by(
        AIContractResolutionRun.created_at.desc(), AIContractResolutionRun.id.desc()
    ).limit(safe_limit).all()

    contracts = []
    for row in rows:
        links_count = int(row.links_count or 0)
        contracts.append(
            {
                "run_id": row.run_id,
                "contract_id": None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "links_count": links_count,
                "needs_review": links_count == 0,
            }
        )

    org_str = str(org_id)
    return {
        "org_id": org_str,
        "organization_id": org_str,
        "analytics_version": ANALYTICS_VERSION,
        "contracts": contracts,
    }

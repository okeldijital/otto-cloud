from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from typing import List, Dict, Any, Optional
from uuid import UUID

from database import get_db
from dependencies import get_current_user, get_current_organization_id
from models.contract import Contract
from models.works_admin import WorksAdmin
from models.work import Work
from services.status_quo import compute_contract_status, compute_work_admin_status, compute_overall_status
from utils.audit import audit_service

router = APIRouter(
    tags=["Status Quo"],
)

@router.get("/admin-of-works/status-quo")
def get_status_quo_dashboard(
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None, # 'contract' or 'work'
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    from models.governance import StatusQuoItem
    from models.contract import Contract
    from models.work import Work
    from models.artist import Artist
    from models.release import Release

    # Fetch unified items (only unresolved)
    query = db.query(StatusQuoItem).filter(
        StatusQuoItem.organization_id == org_id,
        StatusQuoItem.resolved_at == None
    )
    
    if type_filter:
        query = query.filter(StatusQuoItem.entity_type == type_filter)
    
    # Severity mapping for filtering
    if status_filter:
        sev_map = {"RED": "critical", "AMBER": "warn", "GREEN": "info"}
        target_sev = sev_map.get(status_filter)
        if target_sev:
            query = query.filter(StatusQuoItem.severity == target_sev)

    items = query.all()

    contracts_info = []
    works_info = []
    other_info = [] # For things like Artist records if they appear in Dashboard V2
    
    for item in items:
        status_label = "RED" if item.severity == "critical" else "AMBER" if item.severity == "warn" else "GREEN"
        
        # Try to find a nice title
        title = f"{item.entity_type} #{item.entity_id}"
        if item.entity_type == "contract":
            c = db.query(Contract).filter(Contract.id == item.entity_id).first()
            if c: title = c.title
        elif item.entity_type == "work":
            w = db.query(Work).filter(Work.id == item.entity_id).first()
            if w: title = w.title
        elif item.entity_type == "artist":
            a = db.query(Artist).filter(Artist.id == item.entity_id).first()
            if a: title = a.name
        elif item.entity_type == "release":
            r = db.query(Release).filter(Release.id == item.entity_id).first()
            if r: title = r.title

        info = {
            "id": str(item.entity_id),
            "title": title,
            "type": item.entity_type,
            "status_quo": {
                "status": status_label,
                "reasons": [item.summary]
            }
        }
        
        if item.entity_type == "contract":
            contracts_info.append(info)
        elif item.entity_type == "work":
            info["work_id"] = item.entity_id
            works_info.append(info)
        else:
            other_info.append(info)

    # Note: Dashboard currently only renders contracts and works in its split view,
    # but the 'Aggregated View' can take them all.
    aggregated = contracts_info + works_info + other_info

    red_count = len([x for x in aggregated if x['status_quo']['status'] == "RED"])
    amber_count = len([x for x in aggregated if x['status_quo']['status'] == "AMBER"])
    
    summary = {
        "overall_status": "RED" if red_count > 0 else "AMBER" if amber_count > 0 else "GREEN",
        "red_contracts": len([c for c in contracts_info if c['status_quo']['status'] == "RED"]),
        "red_works": len([w for w in works_info if w['status_quo']['status'] == "RED"]),
        "counts": {
            "red": red_count,
            "amber": amber_count,
            "green": 0, # Since we only fetch unresolved, green is not meaningful here or we can assume others
            "total": len(aggregated)
        }
    }
    
    return {
        "summary": summary,
        "contracts": contracts_info,
        "works": works_info,
        "other": other_info,
        "aggregated": aggregated,
        "alerts": {
            "missing_signed_pdf": [c for c in contracts_info if c['status_quo']['status'] == "RED"],
            "missing_registration_proof": [w for w in works_info if w['status_quo']['status'] == "RED"]
        }
    }

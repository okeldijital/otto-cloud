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
    # 1. Fetch all contracts and compute status
    contracts = db.query(Contract).options(
        selectinload(Contract.documents)
    ).filter(Contract.organization_id == org_id).all()
    
    contracts_info = []
    for c in contracts:
        if type_filter and type_filter != "contract":
            break
        sq = compute_contract_status(c, c.documents)
        if status_filter and sq['status'] != status_filter:
            continue
        contracts_info.append({
            "id": str(c.id),
            "title": c.title,
            "type": "contract",
            "status_quo": sq
        })
        
    # 2. Fetch all works_admin and compute status
    works_admins = db.query(WorksAdmin).options(
        selectinload(WorksAdmin.documents)
    ).filter(WorksAdmin.organization_id == org_id).all()
    
    works_info = []
    for wa in works_admins:
        if type_filter and type_filter != "work":
            break
        work = db.query(Work).filter(Work.id == wa.work_id).first()
        sq = compute_work_admin_status(wa, wa.documents, work)
        if status_filter and sq['status'] != status_filter:
            continue
        works_info.append({
            "id": str(wa.id),
            "title": work.title if work else "Unknown",
            "type": "work",
            "status_quo": sq
        })
        
    # 3. Overall summary
    summary = compute_overall_status(contracts_info, works_info)
    
    # 4. Filter lists for "RED" items for quick display
    missing_docs = [c for c in contracts_info if c['status_quo']['status'] == "RED"]
    missing_reg = [w for w in works_info if w['status_quo']['status'] == "RED"]
    
    audit_service.log(db, "VIEW", "StatusQuoDashboard", 0, current_user.id, organization_id=org_id)
    
    return {
        "summary": summary,
        "contracts": contracts_info,
        "works": works_info,
        "alerts": {
            "missing_signed_pdf": missing_docs,
            "missing_registration_proof": missing_reg
        }
    }

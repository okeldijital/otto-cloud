from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from database import get_db
from dependencies import get_current_active_user, get_current_organization_id
from models.user import User
from models.governance import StatusQuoItem
from schemas.office_status_quo import StatusQuoItem as StatusQuoItemSchema
from services.governance_service import recompute_status_quo, resolve_status_quo_item
from core.audit import log_update

router = APIRouter()

def _require_office_user(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role not in ("admin", "staff") and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="office_access_required")
    return current_user

@router.get("/office/status-quo", response_model=List[StatusQuoItemSchema])
def list_status_quo(
    entity_type: Optional[str] = None,
    issue_type: Optional[str] = None,
    severity: Optional[str] = None,
    include_resolved: bool = False,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    query = db.query(StatusQuoItem).filter(StatusQuoItem.organization_id == org_id)
    
    if entity_type:
        query = query.filter(StatusQuoItem.entity_type == entity_type)
    if issue_type:
        query = query.filter(StatusQuoItem.issue_type == issue_type)
    if severity:
        query = query.filter(StatusQuoItem.severity == severity)
    if not include_resolved:
        query = query.filter(StatusQuoItem.resolved_at == None)
        
    return query.order_by(StatusQuoItem.created_at.desc()).all()

@router.post("/office/status-quo/recompute")
def trigger_recompute(
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    """
    Trigger a full recomputation of governance gaps.
    """
    count = recompute_status_quo(db, org_id, current_user.id)
    return {"message": "Recomputation complete", "items_found": count}

@router.post("/office/status-quo/{item_id}/resolve")
def resolve_item(
    item_id: int,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    item = db.query(StatusQuoItem).filter(
        StatusQuoItem.id == item_id,
        StatusQuoItem.organization_id == org_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item_not_found")
    
    if item.resolved_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="item_already_resolved")
        
    resolve_status_quo_item(db, item, current_user.id, note)
    db.commit()
    
    log_update(
        db,
        "status_quo_item",
        item.id,
        current_user.id,
        org_id,
        changes={"resolved": True, "note": note},
        entity_name=f"{item.issue_type} for {item.entity_type}#{item.entity_id}"
    )
    
    return {"message": "Item resolved"}

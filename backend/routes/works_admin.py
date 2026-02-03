from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from uuid import UUID
import os
import shutil

from database import get_db
from dependencies import get_current_user, get_current_organization_id
from repositories.works_admin_repository import works_admin_repository
from models.works_admin import WorksAdmin, WorksAdminDocument
from models.work import Work
from schemas.works_admin import (
    WorksAdminResponse,
    WorksAdminCreate,
    WorksAdminUpdate,
)
from models.contract import Contract, ContractAsset
from services.status_quo import compute_work_admin_status, compute_contract_status, compute_relationship_status
from config import settings
from utils.audit import audit_service

router = APIRouter(
    tags=["Works Administration"],
    responses={404: {"description": "Not found"}},
)


def inject_work_status(admin: Optional[WorksAdmin], db: Session, org_id: UUID) -> Optional[WorksAdmin]:
    if admin:
        work = db.query(Work).filter(Work.id == admin.work_id).first()
        admin.status_quo = compute_work_admin_status(admin, admin.documents, work)
        
        # Find linked contracts
        linked_assets = db.query(ContractAsset).filter(
            ContractAsset.asset_id == admin.work_id,
            ContractAsset.asset_type == "Work",
            ContractAsset.organization_id == org_id
        ).all()
        
        linked_contracts = []
        for la in linked_assets:
            contract = db.query(Contract).filter(Contract.id == la.contract_id).first()
            if contract:
                c_sq = compute_contract_status(contract, contract.documents)
                rel_sq = compute_relationship_status(c_sq['status'], admin.status_quo['status'])
                linked_contracts.append({
                    "contract_id": str(contract.id),
                    "title": contract.title,
                    "contract_status": contract.status,
                    "relationship_status": rel_sq
                })
        admin.linked_contracts = linked_contracts
    return admin


@router.get("/works-admin", response_model=List[WorksAdminResponse])
def list_all_works_admin(
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    admins = works_admin_repository.get_all_for_org(db, org_id)
    # Also ensure all works in catalog have an admin record
    all_works = db.query(Work).all() # Should ideally filter by org_id if works are scoped
    # For now, we only show already existing admin records
    
    results = []
    for admin in admins:
        results.append(inject_work_status(admin, db, org_id))
    
    audit_service.log(db, "VIEW_LIST", "WorksAdmin", 0, current_user.id, organization_id=org_id)
    return results


@router.get("/works-admin/{work_id}", response_model=WorksAdminResponse)
def get_work_admin(
    work_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    admin = works_admin_repository.get_by_work(db, work_id, org_id)
    if not admin:
        # Check if work exists
        work = db.query(Work).filter(Work.id == work_id).first()
        if not work:
            raise HTTPException(status_code=404, detail="Work not found in catalog")
        
        # Auto-create admin record if missing
        admin = works_admin_repository.create_admin(
            db, 
            {"work_id": work_id, "registration_status": "Unknown"},
            org_id,
            current_user.id
        )
    
    audit_service.log(db, "VIEW", "WorksAdmin", admin.id, current_user.id, organization_id=org_id)
    return inject_work_status(admin, db, org_id)


@router.patch("/works-admin/{admin_id}", response_model=WorksAdminResponse)
def update_work_admin(
    admin_id: UUID,
    admin_data: WorksAdminUpdate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    admin = works_admin_repository.get(db, admin_id, org_id)
    if not admin:
        raise HTTPException(status_code=404, detail="WorksAdmin record not found")
    
    updated = works_admin_repository.update(db, admin, admin_data.model_dump(exclude_unset=True))
    audit_service.log(db, "UPDATE", "WorksAdmin", admin_id, current_user.id, changes=admin_data.model_dump(exclude_unset=True), organization_id=org_id)
    return inject_work_status(updated, db, org_id)


@router.post("/works-admin/{admin_id}/documents", response_model=WorksAdminResponse)
async def upload_admin_document(
    admin_id: UUID,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    admin = works_admin_repository.get(db, admin_id, org_id)
    if not admin:
        raise HTTPException(status_code=404, detail="WorksAdmin record not found")

    # Save file
    admin_dir = os.path.join(settings.UPLOAD_DIR, "works_admin", str(admin_id))
    os.makedirs(admin_dir, exist_ok=True)
    dest_path = os.path.join(admin_dir, file.filename)
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    works_admin_repository.add_document(
        db,
        admin_id,
        org_id,
        {
            "doc_type": doc_type,
            "file_path": dest_path.replace(settings.UPLOAD_DIR, "/uploads"),
            "file_name": file.filename,
            "uploaded_by": current_user.id,
            "mime_type": file.content_type or "application/pdf"
        },
    )
    
    audit_service.log(db, "UPLOAD", "WorksAdminDocument", admin_id, current_user.id, changes={"document": file.filename}, organization_id=org_id)
    return inject_work_status(works_admin_repository.get_with_details(db, admin_id, org_id), db, org_id)


@router.get("/works-admin/{admin_id}/documents/{doc_id}/download")
def download_admin_document(
    admin_id: UUID,
    doc_id: UUID,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    doc = db.query(WorksAdminDocument).filter(
        WorksAdminDocument.id == doc_id, 
        WorksAdminDocument.works_admin_id == admin_id, 
        WorksAdminDocument.organization_id == org_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    real_path = doc.file_path.replace("/uploads", settings.UPLOAD_DIR)
    if not os.path.isfile(real_path):
        raise HTTPException(status_code=404, detail="File missing on disk")
    
    audit_service.log(db, "DOWNLOAD", "WorksAdminDocument", admin_id, current_user.id, changes={"document": str(doc_id)}, organization_id=org_id)
    return FileResponse(real_path, filename=doc.file_name)


@router.delete("/works-admin/{admin_id}/documents/{doc_id}", response_model=WorksAdminResponse)
def delete_admin_document(
    admin_id: UUID,
    doc_id: UUID,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    doc = db.query(WorksAdminDocument).filter(
        WorksAdminDocument.id == doc_id, 
        WorksAdminDocument.works_admin_id == admin_id, 
        WorksAdminDocument.organization_id == org_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Optional: Delete file from disk
    real_path = doc.file_path.replace("/uploads", settings.UPLOAD_DIR)
    if os.path.isfile(real_path):
        os.remove(real_path)
        
    db.delete(doc)
    db.commit()
    
    audit_service.log(db, "DELETE", "WorksAdminDocument", admin_id, current_user.id, changes={"document_id": str(doc_id)}, organization_id=org_id)
    return inject_work_status(works_admin_repository.get_with_details(db, admin_id, org_id), db, org_id)

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from uuid import UUID
import os
import shutil

from database import get_db
from dependencies import get_current_user, get_current_organization_id
from repositories.contract_repository import contract_repository
from schemas.contract import (
    ContractResponse,
    ContractCreate,
    ContractUpdate,
    ContractPartyCreate,
    ContractAssetCreate,
    ContractSplitGroupCreate,
    ContractSplitCreate,
)
from models.contract import Contract, ContractDocument, ContractParty, ContractAsset, ContractSplitGroup, ContractSplit
from models.artist import Artist
from models.release import Release
from models.track import Track
from models.work import Work
from models.publisher import Publisher
from models.label import Label
from config import settings
from utils.audit import audit_service
from services.status_quo import compute_contract_status

router = APIRouter(
    tags=["Contracts"],
    responses={404: {"description": "Not found"}},
)


def save_upload_file(contract_id: UUID, file: UploadFile) -> str:
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS or ext not in ["pdf", "doc", "docx", "png", "jpg", "jpeg"]:
        raise HTTPException(status_code=400, detail="Unsupported file type; PDF preferred.")

    contract_dir = os.path.join(settings.UPLOAD_DIR, "contracts", str(contract_id))
    os.makedirs(contract_dir, exist_ok=True)
    dest_path = os.path.join(contract_dir, file.filename)
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return dest_path


def _entity_org_id(obj):
    return getattr(obj, "organization_id", None)


def assert_same_org(entity_type: str, entity_id: int, org_id: UUID, db: Session):
    model_map = {
        "Artist": Artist,
        "Label": Label,
        "Publisher": Publisher,
        "Release": Release,
        "Track": Track,
        "Work": Work,
    }
    model = model_map.get(entity_type)
    if not model:
        return
    record = db.query(model).filter(model.id == entity_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="linked_entity_not_found")
    rec_org = _entity_org_id(record)
    if rec_org is not None and rec_org != org_id:
        raise HTTPException(status_code=400, detail="cross_org_link_forbidden")


def inject_status_quo(contract: Optional[Contract]) -> Optional[Contract]:
    if contract:
        contract.status_quo = compute_contract_status(contract, contract.documents)
    return contract


@router.get("/contracts")
def list_contracts(
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contracts = contract_repository.get_all_filtered(db, org_id, status_filter, type_filter)
    rows = []

    def split_summary(contract: Contract) -> Dict[str, str]:
        summary = {}
        for group in contract.split_groups or []:
            total = sum(float(s.percent or 0) for s in (group.splits or []))
            label = f"{total:.0f}%"
            summary[group.group_type or group.group_name or "GROUP"] = label
        return summary

    for c in contracts:
        status_quo = compute_contract_status(c, c.documents or [])
        rows.append({
            "id": str(c.id),
            "title": c.title,
            "type": c.type,
            "status": c.status,
            "start_date": c.start_date,
            "end_date": c.end_date,
            "signed_date": getattr(c, "signed_date", None),
            "parties_count": len(c.parties or []),
            "assets_count": len(c.assets or []),
            "documents_count": len(c.documents or []),
            "status_quo": status_quo,
            "split_summary": split_summary(c),
        })

    audit_service.log(db, "VIEW_LIST", "contract", 0, current_user.id, organization_id=org_id)
    return rows


@router.post("/contracts", status_code=status.HTTP_201_CREATED, response_model=ContractResponse)
async def create_contract(
    title: str = Form(...),
    contract_number: str = Form(...),
    status_value: str = Form("Draft"),
    type: str = Form(None),
    start_date: str = Form(None),
    end_date: str = Form(None),
    signed_date: str = Form(None),
    territory: str = Form(None),
    exclusivity: bool = Form(False),
    notes: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    # Create contract record
    def parse_date(value: Optional[str]):
        if value in (None, "", "null"):
            return None
        try:
            from datetime import datetime
            return datetime.strptime(value, "%Y-%m-%d").date()
        except Exception:
            return None

    payload = {
        "title": title,
        "contract_number": contract_number,
        "status": status_value,
        "type": type,
        "start_date": parse_date(start_date),
        "end_date": parse_date(end_date),
        "signed_date": parse_date(signed_date),
        "territory": territory,
        "exclusivity": exclusivity,
        "notes": notes,
    }
    contract = contract_repository.create_contract(db, payload, org_id, current_user.id)

    # Save document if provided
    if file:
        saved_path = save_upload_file(contract.id, file)
        contract_repository.add_document(
            db,
            contract.id,
            org_id,
            {"file_path": saved_path.replace(settings.UPLOAD_DIR, "/uploads"), "file_name": file.filename, "uploaded_by": current_user.id},
        )
    else:
        # Two-step creation allowed; remains Draft until document attached
        if status_value == "Active":
            raise HTTPException(status_code=400, detail="A PDF document is required before activating a contract.")

    audit_service.log(db, "CREATE", "Contract", contract.id, current_user.id, changes=payload, organization_id=org_id)
    if file:
        audit_service.log(db, "UPLOAD", "ContractDocument", contract.id, current_user.id, changes={"document": file.filename}, organization_id=org_id)

    return inject_status_quo(contract_repository.get_with_details(db, contract.id, org_id))


@router.get("/contracts/{contract_id}", response_model=ContractResponse)
def get_contract(
    contract_id: UUID,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get_with_details(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    audit_service.log(db, "VIEW", "Contract", contract.id, current_user.id, organization_id=org_id)
    return inject_status_quo(contract)


@router.patch("/contracts/{contract_id}", response_model=ContractResponse)
def update_contract(
    contract_id: UUID,
    contract_data: ContractUpdate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Enforce Active requires at least one document
    if contract_data.status == "Active":
        docs = db.query(ContractDocument).filter(ContractDocument.contract_id == contract_id).count()
        if docs == 0:
            raise HTTPException(status_code=400, detail="A PDF document is required before activating a contract.")

    updated = contract_repository.update(db, contract, contract_data.model_dump(exclude_unset=True))
    audit_service.log(db, "UPDATE", "Contract", contract.id, current_user.id, changes=contract_data.model_dump(exclude_unset=True), organization_id=org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id))


@router.delete("/contracts/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(
    contract_id: UUID,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract_repository.delete(db, contract_id, org_id)
    audit_service.log(db, "DELETE", "Contract", contract_id, current_user.id, organization_id=org_id)
    return None


# Parties
@router.post("/contracts/{contract_id}/parties", response_model=ContractResponse)
def add_party(
    contract_id: UUID,
    party_data: ContractPartyCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    # Cross-org guard for system entities
    if party_data.entity_id and party_data.entity_type and party_data.entity_type != "External":
        assert_same_org(party_data.entity_type, party_data.entity_id, org_id, db)
    contract_repository.add_party(db, contract_id, org_id, party_data.model_dump())
    audit_service.log(db, "UPDATE", "ContractParty", contract_id, current_user.id, changes={"add_party": party_data.model_dump()}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id))


@router.delete("/contracts/{contract_id}/parties/{party_id}", response_model=ContractResponse)
def remove_party(
    contract_id: UUID,
    party_id: UUID,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    party = db.query(ContractParty).filter(ContractParty.id == party_id, ContractParty.contract_id == contract_id, ContractParty.organization_id == org_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    db.delete(party)
    db.commit()
    audit_service.log(db, "UPDATE", "ContractParty", contract_id, current_user.id, changes={"remove_party": str(party_id)}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id))


# Assets
@router.post("/contracts/{contract_id}/assets", response_model=ContractResponse)
def add_asset(
    contract_id: UUID,
    asset_data: ContractAssetCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    assert_same_org(asset_data.asset_type.capitalize(), asset_data.asset_id, org_id, db)
    contract_repository.add_asset(db, contract_id, org_id, asset_data.model_dump())
    audit_service.log(db, "UPDATE", "ContractAsset", contract_id, current_user.id, changes={"add_asset": asset_data.model_dump()}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id))


@router.delete("/contracts/{contract_id}/assets/{asset_id}", response_model=ContractResponse)
def remove_asset(
    contract_id: UUID,
    asset_id: UUID,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    asset = db.query(ContractAsset).filter(ContractAsset.id == asset_id, ContractAsset.contract_id == contract_id, ContractAsset.organization_id == org_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(asset)
    db.commit()
    audit_service.log(db, "UPDATE", "ContractAsset", contract_id, current_user.id, changes={"remove_asset": str(asset_id)}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id))


# Documents
@router.post("/contracts/{contract_id}/documents", response_model=ContractResponse)
async def upload_document(
    contract_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    saved_path = save_upload_file(contract_id, file)
    contract_repository.add_document(
        db,
        contract_id,
        org_id,
        {"file_path": saved_path.replace(settings.UPLOAD_DIR, "/uploads"), "file_name": file.filename, "uploaded_by": current_user.id},
    )
    audit_service.log(db, "UPLOAD", "ContractDocument", contract_id, current_user.id, changes={"document": file.filename}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id))


@router.get("/contracts/{contract_id}/documents/{doc_id}/download")
def download_document(
    contract_id: UUID,
    doc_id: UUID,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    doc = db.query(ContractDocument).filter(ContractDocument.id == doc_id, ContractDocument.contract_id == contract_id, ContractDocument.organization_id == org_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    real_path = doc.file_path.replace("/uploads", settings.UPLOAD_DIR)
    if not os.path.isfile(real_path):
        raise HTTPException(status_code=404, detail="File missing on disk")
    audit_service.log(db, "DOWNLOAD", "ContractDocument", contract_id, current_user.id, changes={"document": str(doc_id)}, organization_id=org_id)
    return FileResponse(real_path, filename=doc.file_name, media_type="application/pdf")


@router.get("/contracts/{contract_id}/documents/{doc_id}/preview")
def preview_document(
    contract_id: UUID,
    doc_id: UUID,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    # same as download but let browser preview
    return download_document(contract_id, doc_id, db, org_id, current_user)


# Split groups
@router.post("/contracts/{contract_id}/split-groups", response_model=ContractResponse)
def add_split_group(
    contract_id: UUID,
    group_data: ContractSplitGroupCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    contract = contract_repository.get(db, contract_id, org_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract_repository.add_split_group(db, contract_id, org_id, group_data.model_dump())
    audit_service.log(db, "UPDATE", "ContractSplitGroup", contract_id, current_user.id, changes={"add_split_group": group_data.model_dump()}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id))


@router.delete("/contracts/{contract_id}/split-groups/{group_id}", response_model=ContractResponse)
def remove_split_group(
    contract_id: UUID,
    group_id: UUID,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    group = db.query(ContractSplitGroup).filter(ContractSplitGroup.id == group_id, ContractSplitGroup.contract_id == contract_id, ContractSplitGroup.organization_id == org_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Split group not found")
    db.delete(group)
    db.commit()
    audit_service.log(db, "UPDATE", "ContractSplitGroup", contract_id, current_user.id, changes={"remove_split_group": str(group_id)}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id))


# Splits
@router.post("/contracts/{contract_id}/split-groups/{group_id}/splits", response_model=ContractResponse)
def add_split(
    contract_id: UUID,
    group_id: UUID,
    split_data: ContractSplitCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    group = db.query(ContractSplitGroup).filter(ContractSplitGroup.id == group_id, ContractSplitGroup.contract_id == contract_id, ContractSplitGroup.organization_id == org_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Split group not found")
    contract_repository.add_split(db, group_id, org_id, split_data.model_dump())
    audit_service.log(db, "UPDATE", "ContractSplit", contract_id, current_user.id, changes={"add_split": split_data.model_dump()}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id))


@router.delete("/contracts/{contract_id}/split-groups/{group_id}/splits/{split_id}", response_model=ContractResponse)
def remove_split(
    contract_id: UUID,
    group_id: UUID,
    split_id: UUID,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user=Depends(get_current_user),
):
    split = db.query(ContractSplit).join(ContractSplitGroup).filter(
        ContractSplit.id == split_id,
        ContractSplit.group_id == group_id,
        ContractSplitGroup.contract_id == contract_id,
        ContractSplit.organization_id == org_id
    ).first()
    if not split:
        raise HTTPException(status_code=404, detail="Split not found")
    db.delete(split)
    db.commit()
    audit_service.log(db, "UPDATE", "ContractSplit", contract_id, current_user.id, changes={"remove_split": str(split_id)}, organization_id=org_id)
    contract_repository.get_with_details(db, contract_id, org_id)
    return inject_status_quo(contract_repository.get_with_details(db, contract_id, org_id))

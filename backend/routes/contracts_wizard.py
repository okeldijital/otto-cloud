from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.contract_wizard import ContractAttachApplyRequest, ContractAttachPlanRequest
from services.ai.contract_attach import apply_contract_attach, build_contract_attach_plan
from services.ai.contract_wizard import create_contract_draft, get_contract_draft

router = APIRouter(tags=["Contracts Wizard"])


def ensure_contract_wizard_enabled():
    if not settings.AI_ENABLED or not settings.AI_CONTRACT_WIZARD_ENABLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI module disabled")


def ensure_contract_attach_plan_enabled():
    if not settings.AI_ENABLED or not settings.AI_CONTRACT_ATTACH_PLAN_ENABLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI module disabled")


def ensure_contract_attach_apply_enabled():
    if not settings.AI_ENABLED or not settings.AI_CONTRACT_ATTACH_APPLY_ENABLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI module disabled")


@router.post("/contracts/drafts", dependencies=[Depends(ensure_contract_wizard_enabled)])
async def create_draft_endpoint(
    file: UploadFile = File(...),
    source: str = Form("wizard"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        content = await file.read()
        return create_contract_draft(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            filename=file.filename,
            content=content,
            source=source,
        )
    except ValueError as exc:
        msg = str(exc)
        if msg in {"invalid_file", "empty_file"}:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid file")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)


@router.get("/contracts/drafts/{draft_id}", dependencies=[Depends(ensure_contract_wizard_enabled)])
async def get_draft_endpoint(
    draft_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return get_contract_draft(
            db=db,
            org_id=current_user.organization_id,
            draft_id=draft_id,
        )
    except ValueError as exc:
        if str(exc) == "draft_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


@router.post(
    "/contracts/{contract_id}/attach/plan",
    dependencies=[Depends(ensure_contract_attach_plan_enabled)],
)
async def contract_attach_plan_endpoint(
    contract_id: int,
    req: ContractAttachPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return build_contract_attach_plan(
            db=db,
            org_id=current_user.organization_id,
            contract_id=contract_id,
            release_id=req.release_id,
        )
    except ValueError as exc:
        msg = str(exc)
        if msg in {"contract_not_found", "release_not_found"}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)


@router.post(
    "/contracts/{contract_id}/attach/apply",
    dependencies=[Depends(ensure_contract_attach_apply_enabled)],
)
async def contract_attach_apply_endpoint(
    contract_id: int,
    req: ContractAttachApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return apply_contract_attach(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            contract_id=contract_id,
            payload=req.model_dump(mode="json"),
        )
    except ValueError as exc:
        msg = str(exc)
        if msg in {"contract_not_found", "release_not_found"}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
        if msg == "confirmation_required":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="confirmation required")
        if msg == "backup_required_before_apply":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="backup required before apply")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_user
from models.ai_core_write import AICoreWriteProposalItem
from models.user import User
from schemas.ai_core_write import (
    AICoreWriteApplyRequest,
    AICoreWriteApplyResponse,
    AICoreWriteHealthResponse,
    AICoreWriteProposeRequest,
    AICoreWriteProposeResponse,
)
from services.ai.core_write.apply import apply_core_write_run, persist_proposal_run
from services.ai.core_write.propose import build_core_write_proposals

router = APIRouter()


def ensure_ai_core_write_enabled():
    if not settings.AI_ENABLED or not settings.AI_CORE_WRITE_ENABLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI module disabled")


def ensure_ai_core_write_apply_enabled():
    if (
        not settings.AI_ENABLED
        or not settings.AI_CORE_WRITE_ENABLED
        or not settings.AI_CORE_WRITE_APPLY_ENABLED
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI module disabled")


@router.get("/health", response_model=AICoreWriteHealthResponse)
async def core_write_health():
    return AICoreWriteHealthResponse(
        enabled_flags={
            "AI_ENABLED": settings.AI_ENABLED,
            "AI_CORE_WRITE_ENABLED": settings.AI_CORE_WRITE_ENABLED,
            "AI_CORE_WRITE_APPLY_ENABLED": settings.AI_CORE_WRITE_APPLY_ENABLED,
            "AI_CORE_WRITE_REQUIRE_BACKUP": settings.AI_CORE_WRITE_REQUIRE_BACKUP,
        },
        version="core_write_v1",
    )


@router.post(
    "/propose",
    response_model=AICoreWriteProposeResponse,
    dependencies=[Depends(ensure_ai_core_write_enabled)],
)
async def core_write_propose(
    req: AICoreWriteProposeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = build_core_write_proposals(
            db=db,
            org_id=current_user.organization_id,
            contract_id=req.contract_id,
            release_id=req.release_id,
            contract_document_id=req.contract_document_id,
            contract_extract=req.contract_extract,
        )
        extraction = result.get("extraction")
        run_id = persist_proposal_run(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            contract_id=req.contract_id,
            release_id=req.release_id,
            contract_document_id=req.contract_document_id,
            parser_version=(extraction.parser_version if extraction else "none"),
            linker_version="link_suggest_v1.0.0",
            planner_version="core_write_v1",
            proposals=result["proposals"],
        )
        item_id_rows = (
            db.query(AICoreWriteProposalItem)
            .filter_by(organization_id=current_user.organization_id, run_id=run_id)
            .order_by(AICoreWriteProposalItem.id.asc())
            .all()
        )
        proposals = []
        for idx, proposal in enumerate(result["proposals"]):
            dump = proposal.model_dump(mode="json")
            dump["item_id"] = item_id_rows[idx].id if idx < len(item_id_rows) else None
            proposals.append(dump)
        return AICoreWriteProposeResponse(
            run_id=run_id,
            proposals=proposals,
            requires_user_review=result["requires_user_review"],
        )
    except ValueError as exc:
        msg = str(exc)
        if msg == "contract_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)


@router.post(
    "/apply",
    response_model=AICoreWriteApplyResponse,
    dependencies=[Depends(ensure_ai_core_write_apply_enabled)],
)
async def core_write_apply(
    req: AICoreWriteApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = apply_core_write_run(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            req=req,
        )
        return AICoreWriteApplyResponse(**result)
    except ValueError as exc:
        msg = str(exc)
        if msg == "confirmation_required":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="confirmation required")
        if msg == "backup_required_before_apply":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="backup required before apply")
        if msg in {"run_not_found", "contract_not_found"}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)

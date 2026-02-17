from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.ai_release_validation import (
    ReleaseValidationPlanRequest,
    ReleaseValidationPlanResponse,
)
from services.ai.release_validation import build_release_validation_plan

router = APIRouter()


def ensure_ai_release_validation_enabled():
    if not settings.AI_ENABLED or not settings.AI_RELEASE_VALIDATION_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI module disabled",
        )


@router.get("/health")
async def release_validation_health():
    return {
        "status": "ok",
        "flags": {
            "AI_ENABLED": settings.AI_ENABLED,
            "AI_RELEASE_VALIDATION_ENABLED": settings.AI_RELEASE_VALIDATION_ENABLED,
        },
    }


@router.post(
    "/plan",
    response_model=ReleaseValidationPlanResponse,
    dependencies=[Depends(ensure_ai_release_validation_enabled)],
)
async def release_validation_plan(
    req: ReleaseValidationPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        validation_plan = build_release_validation_plan(
            db=db,
            org_id=current_user.organization_id,
            release_id=req.release_id,
            contract_link_id=req.contract_link_id,
            contract_id=req.contract_id,
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

    return ReleaseValidationPlanResponse(
        org_id=str(current_user.organization_id),
        release_id=req.release_id,
        validation_plan=validation_plan,
    )

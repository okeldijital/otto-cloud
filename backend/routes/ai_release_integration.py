from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.ai_release_integration import (
    ReleaseIntegrationPlanRequest,
    ReleaseIntegrationPlanResponse,
)
from services.ai.release_integration import build_release_integration_plan

router = APIRouter()


def ensure_ai_release_integration_plan_enabled():
    if (
        not settings.AI_ENABLED
        or not settings.AI_CONTRACT_INTEL_ENABLED
        or not settings.AI_CONTRACT_INTAKE_ENABLED
        or not settings.AI_RELEASE_VALIDATION_ENABLED
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI module disabled",
        )


@router.get("/health")
async def release_integration_health():
    return {
        "enabled_flags": {
            "AI_ENABLED": settings.AI_ENABLED,
            "AI_CONTRACT_INTEL_ENABLED": settings.AI_CONTRACT_INTEL_ENABLED,
            "AI_CONTRACT_INTAKE_ENABLED": settings.AI_CONTRACT_INTAKE_ENABLED,
            "AI_RELEASE_VALIDATION_ENABLED": settings.AI_RELEASE_VALIDATION_ENABLED,
        },
        "version": "release_integration_v1",
    }


@router.post(
    "/plan",
    response_model=ReleaseIntegrationPlanResponse,
    dependencies=[Depends(ensure_ai_release_integration_plan_enabled)],
)
async def release_integration_plan(
    req: ReleaseIntegrationPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return build_release_integration_plan(
            db=db,
            org_id=current_user.organization_id,
            release_id=req.release_id,
            contract_extract=req.contract_extract,
            extract_id=req.extract_id,
        )
    except ValueError as exc:
        msg = str(exc)
        if msg == "release_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
        if msg == "missing_contract_extract":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="contract_extract is required when extract_id is not provided",
            )
        if msg == "extract_not_found":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="extract_id was not found for this organization",
            )
        if msg == "extract_payload_unavailable":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="extract_id exists but payload is unavailable; provide contract_extract",
            )
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)

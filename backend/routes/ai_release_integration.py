from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.ai_release_integration import (
    ReleaseIntegrationAttachRequest,
    ReleaseIntegrationAttachResponse,
    ReleaseIntegrationPlanRequest,
    ReleaseIntegrationPlanResponse,
)
from services.ai.audit import log_ai_request
from services.ai.release_integration import (
    attach_release_integration_plan,
    build_release_integration_plan,
)

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


def ensure_ai_release_integration_attach_enabled():
    if (
        not settings.AI_ENABLED
        or not settings.AI_CONTRACT_INTEL_ENABLED
        or not settings.AI_CONTRACT_INTAKE_ENABLED
        or not settings.AI_RELEASE_VALIDATION_ENABLED
        or not settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED
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
            "AI_RELEASE_INTEGRATION_ATTACH_ENABLED": settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED,
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


@router.post(
    "/attach",
    response_model=ReleaseIntegrationAttachResponse,
    dependencies=[Depends(ensure_ai_release_integration_attach_enabled)],
)
async def release_integration_attach(
    req: ReleaseIntegrationAttachRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = attach_release_integration_plan(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            release_id=req.release_id,
            wizard_plan=req.wizard_plan,
            contract_id=req.contract_id,
            contract_extract=req.contract_extract,
            extract_id=req.extract_id,
            reviewed_mismatches=req.reviewed_mismatches,
        )
        log_ai_request(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            action="release_integration_attach",
            message=f"release={req.release_id}|run={result['run_id']}",
            tool="release_integration_attach",
            parser_version=req.wizard_plan.integration_version,
        )
        return ReleaseIntegrationAttachResponse(
            run_id=result["run_id"],
            attached_counts=result["attached_counts"],
            needs_review=result["needs_review"],
            warnings=result["warnings"],
        )
    except ValueError as exc:
        msg = str(exc)
        if msg == "release_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
        if msg in {
            "extract_not_found",
            "wizard_plan_release_mismatch",
            "wizard_plan_org_mismatch",
            "review_confirmation_required",
        }:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.ai_release_mapping import ReleaseMapPlanRequest, ReleaseMapPlanResponse
from services.ai.release_mapping.map_plan_v1 import build_release_map_plan

router = APIRouter()


def ensure_ai_release_mapping_enabled():
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


@router.post(
    "/map_plan",
    response_model=ReleaseMapPlanResponse,
    dependencies=[Depends(ensure_ai_release_mapping_enabled)],
)
async def release_map_plan(
    req: ReleaseMapPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return build_release_map_plan(
            db=db,
            org_id=current_user.organization_id,
            release_id=req.release_id,
            extract_v2=req.extract_v2,
        )
    except ValueError as exc:
        if str(exc) == "release_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_user
from models.user import User
from services.ai.release_integration import attach_resolution_run_to_release

router = APIRouter()


class ReleaseAttachRequest(BaseModel):
    run_id: int
    release_id: int


class ReleaseAttachResponse(BaseModel):
    status: str
    org_id: str
    run_id: int
    release_id: int
    link_id: int


def ensure_ai_release_integration_enabled():
    if (
        not settings.AI_ENABLED
        or not settings.AI_CONTRACT_INTEL_ENABLED
        or not settings.AI_CONTRACT_RESOLVE_ENABLED
        or not settings.AI_RELEASE_INTEGRATION_ENABLED
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI module disabled",
        )


@router.post(
    "/attach",
    response_model=ReleaseAttachResponse,
    dependencies=[Depends(ensure_ai_release_integration_enabled)],
)
async def release_attach(
    req: ReleaseAttachRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        link = attach_resolution_run_to_release(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            run_id=req.run_id,
            release_id=req.release_id,
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

    return ReleaseAttachResponse(
        status="attached",
        org_id=str(current_user.organization_id),
        run_id=link.resolution_run_id,
        release_id=link.release_id,
        link_id=link.id,
    )


@router.get(
    "/attach",
    dependencies=[Depends(ensure_ai_release_integration_enabled)],
)
async def release_attach_get_parity():
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_user
from models.user import User
from services.ai.analytics import get_analytics_contracts, get_analytics_summary

router = APIRouter()


def ensure_ai_analytics_enabled():
    if not settings.AI_ENABLED or not settings.AI_CONTRACT_INTEL_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI module disabled",
        )


@router.get("/summary", dependencies=[Depends(ensure_ai_analytics_enabled)])
async def analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_analytics_summary(db, current_user.organization_id)


@router.get("/contracts", dependencies=[Depends(ensure_ai_analytics_enabled)])
async def analytics_contracts(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_analytics_contracts(db, current_user.organization_id, limit=limit)

import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_user
from models.ai_royalty import AIRoyaltySimulationRun
from models.user import User
from schemas.ai_royalty import RoyaltySimulationRequest, RoyaltySimulationResponse
from services.ai.royalty import ROYALTY_VERSION, simulate_release_royalty

router = APIRouter()


def ensure_ai_royalty_enabled():
    if not settings.AI_ENABLED or not settings.AI_ROYALTY_ENABLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI module disabled")


@router.get("/health")
async def royalty_health():
    return {
        "enabled_flags": {
            "AI_ENABLED": settings.AI_ENABLED,
            "AI_ROYALTY_ENABLED": settings.AI_ROYALTY_ENABLED,
            "AI_ROYALTY_PERSIST_ENABLED": settings.AI_ROYALTY_PERSIST_ENABLED,
        },
        "version": ROYALTY_VERSION,
    }


@router.post(
    "/simulate",
    response_model=RoyaltySimulationResponse,
    dependencies=[Depends(ensure_ai_royalty_enabled)],
)
async def royalty_simulate(
    req: RoyaltySimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        response = simulate_release_royalty(
            db=db,
            org_id=current_user.organization_id,
            release_id=req.release_id,
            contract_document_id=req.contract_document_id,
            assume_missing_parties_as_unknown=req.assume_missing_parties_as_unknown,
            gross_revenue=req.gross_revenue,
            units=req.units,
            period_start=req.period_start,
            period_end=req.period_end,
        )
    except ValueError as exc:
        if str(exc) in {"release_not_found", "contract_document_not_found"}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    if not settings.AI_ROYALTY_PERSIST_ENABLED or not req.persist_result:
        return response

    request_payload = {
        "org_id": str(current_user.organization_id),
        "release_id": req.release_id,
        "contract_document_id": req.contract_document_id,
        "mode": req.mode,
        "assume_missing_parties_as_unknown": req.assume_missing_parties_as_unknown,
        "gross_revenue": req.gross_revenue,
        "units": req.units,
        "period_start": req.period_start,
        "period_end": req.period_end,
        "computed_splits": [item.model_dump(mode="json") for item in response.computed_splits],
        "splits_total": response.splits_total,
    }
    request_hash = hashlib.sha256(
        json.dumps(request_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()

    existing = (
        db.query(AIRoyaltySimulationRun)
        .filter(
            AIRoyaltySimulationRun.organization_id == current_user.organization_id,
            AIRoyaltySimulationRun.release_id == req.release_id,
            AIRoyaltySimulationRun.request_hash == request_hash,
        )
        .first()
    )

    if existing:
        response.persisted = True
        response.run_id = existing.id
        response.idempotent_hit = True
        return response

    run = AIRoyaltySimulationRun(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        release_id=req.release_id,
        contract_document_id=response.contract_document_id,
        request_hash=request_hash,
        royalty_version=response.royalty_version,
        splits_total=response.splits_total,
        integrity_total_equals_100=response.integrity.total_equals_100,
        integrity_over_allocated=response.integrity.over_allocated,
        integrity_under_allocated=response.integrity.under_allocated,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    response.persisted = True
    response.run_id = run.id
    response.idempotent_hit = False
    return response

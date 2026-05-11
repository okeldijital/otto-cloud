import os
from fastapi import APIRouter, Request, Header, HTTPException
from typing import Optional
from services.billing.stripe_service import handle_webhook, create_checkout_session

router = APIRouter(tags=["Billing"])


from dependencies import get_current_active_user, get_current_organization_id
from models.user import User
from uuid import UUID
from fastapi import Depends
from database import get_db
from sqlalchemy.orm import Session

@router.post("/billing/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature")
):
    """
    Handle Stripe webhook events.
    """
    payload = await request.body()
    result = handle_webhook(payload, stripe_signature or "")
    return result

@router.get("/billing/info")
async def get_billing_info(
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get billing info for organization.
    """
    from models.subscription import Subscription
    from models.plan import Plan
    from models.usage import Usage
    from datetime import datetime

    sub = db.query(Subscription).filter(
        Subscription.organization_id == org_id,
        Subscription.status == "active"
    ).first()

    plan = None
    if sub:
        plan_obj = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        if plan_obj:
            plan = {
                "name": plan_obj.name,
                "job_limit": plan_obj.job_limit,
                "price": float(plan_obj.price) if plan_obj.price else None
            }

    period = datetime.utcnow().strftime("%Y-%m")
    usage = db.query(Usage).filter(
        Usage.organization_id == org_id,
        Usage.metric == "jobs",
        Usage.period == period
    ).first()

    limit = 100 if not plan else plan["job_limit"]

    return {
        "success": True,
        "data": {
            "plan": plan,
            "usage": {
                "jobs": usage.value if usage else 0,
                "limit": limit
            }
        }
    }


@router.post("/billing/checkout")
async def create_checkout(
    request: Request,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create Stripe checkout session.
    """
    body = await request.json()
    plan_id = body.get("plan_id", "pro")

    plan_map = {
        "pro": {"name": "Pro", "id": 2},
        "enterprise": {"name": "Enterprise", "id": 3},
    }

    plan_info = plan_map.get(plan_id, plan_map["pro"])
    
    base_app_url = os.getenv("BASE_APP_URL", "https://otto-cloud.okeldijital.com")
    success_url = f"{base_app_url}/#/billing?success=true"
    cancel_url = f"{base_app_url}/#/billing?cancelled=true"

    result = create_checkout_session(
        org_id=str(org_id),
        plan_id=str(plan_info["id"]),
        success_url=success_url,
        cancel_url=cancel_url
    )

    if "error" in result:
        raise HTTPException(detail=result["error"], status_code=400)

    return result
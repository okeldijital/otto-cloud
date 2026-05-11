from fastapi import APIRouter, Request

router = APIRouter(tags=["Usage"])


def get_auth_headers(request: Request) -> tuple[str, str]:
    user_id = request.headers.get("x-user-id", "1")
    org_id = request.headers.get("x-org-id", "00000000-0000-0000-0000-000000000001")
    return user_id, org_id


@router.get("/usage")
async def get_usage(request: Request):
    """
    Get current usage for organization.
    """
    from database import get_db
    from models.usage import Usage
    from models.subscription import Subscription
    from models.plan import Plan
    from datetime import datetime
    from uuid import UUID

    user_id_str, org_id_str = get_auth_headers(request)
    org_id = UUID(org_id_str)

    db = next(get_db())
    period = datetime.utcnow().strftime("%Y-%m")

    usage = db.query(Usage).filter(
        Usage.organization_id == org_id,
        Usage.metric == "jobs",
        Usage.period == period
    ).first()

    sub = db.query(Subscription).filter(
        Subscription.organization_id == org_id,
        Subscription.status == "active"
    ).first()

    job_limit = 100
    plan_name = "free"

    if sub:
        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        if plan:
            job_limit = plan.job_limit
            plan_name = plan.name

    return {
        "success": True,
        "data": {
            "jobsUsed": usage.value if usage else 0,
            "jobLimit": job_limit,
            "plan": plan_name
        }
    }
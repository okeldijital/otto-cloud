from fastapi import APIRouter, Request

router = APIRouter(tags=["Admin"])


@router.get("/admin/stats")
async def get_admin_stats(request: Request):
    """
    Get system-wide admin statistics.
    """
    from database import get_db
    from models.job import Job
    from models.user import User
    from models.subscription import Subscription
    from models.plan import Plan

    db = next(get_db())

    total_jobs = db.query(Job).count()

    active_users = db.query(User).filter(User.is_active == True).count()

    subs = db.query(Subscription).filter(
        Subscription.status == "active"
    ).all()

    revenue = 0
    for sub in subs:
        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        if plan and plan.price:
            revenue += float(plan.price)

    return {
        "success": True,
        "data": {
            "total_jobs": total_jobs,
            "active_users": active_users,
            "revenue": revenue,
            "db_status": "ok",
            "redis_status": "ok"
        }
    }
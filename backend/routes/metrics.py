from fastapi import APIRouter, Request

router = APIRouter(tags=["Metrics"])


def get_auth_headers(request: Request) -> tuple[str, str]:
    user_id = request.headers.get("x-user-id", "1")
    org_id = request.headers.get("x-org-id", "00000000-0000-0000-0000-000000000001")
    return user_id, org_id


@router.get("/admin/metrics")
async def get_metrics(request: Request):
    """
    Get system metrics.
    """
    from database import get_db
    from services.metrics_service import get_metrics_summary

    db = next(get_db())

    metrics = get_metrics_summary(db)

    return {
        "success": True,
        "data": {
            "totalJobs": metrics["total_jobs"],
            "failedJobs": metrics["failed_jobs_30d"],
            "avgDuration": round(metrics["avg_duration_ms"], 2),
            "jobsPerOrg": metrics["jobs_per_org"]
        }
    }
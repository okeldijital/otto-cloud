from typing import Dict, Any, List
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func


def get_total_jobs(db: Session) -> int:
    """Get total job count."""
    from models.job import Job
    return db.query(Job).count()


def get_jobs_per_org(db: Session) -> List[Dict[str, Any]]:
    """Get job counts grouped by organization."""
    from models.job import Job
    results = db.query(
        Job.organization_id,
        func.count(Job.id).label("job_count")
    ).group_by(Job.organization_id).all()

    return [
        {"org_id": str(r.organization_id), "count": r.job_count}
        for r in results
    ]


def get_failed_jobs(
    db: Session,
    since: datetime = None,
    org_id: UUID = None
) -> int:
    """Get count of failed jobs."""
    from models.job import Job

    query = db.query(Job).filter(Job.status == "failed")

    if since:
        query = query.filter(Job.created_at >= since)

    if org_id:
        query = query.filter(Job.organization_id == org_id)

    return query.count()


def get_avg_duration(
    db: Session,
    since: datetime = None,
    org_id: UUID = None
) -> float:
    """Get average job duration in milliseconds."""
    from models.job import Job

    query = db.query(Job).filter(Job.status == "completed")

    if since:
        query = query.filter(Job.created_at >= since)

    if org_id:
        query = query.filter(Job.organization_id == org_id)

    jobs = query.all()

    if not jobs:
        return 0.0

    total_ms = 0
    for job in jobs:
        if job.created_at and job.updated_at:
            duration = (job.updated_at - job.created_at).total_seconds() * 1000
            total_ms += duration

    return total_ms / len(jobs)


def get_metrics_summary(db: Session) -> Dict[str, Any]:
    """Get overall metrics summary."""
    now = datetime.utcnow()
    since_24h = now - timedelta(hours=24)
    since_30d = now - timedelta(days=30)

    return {
        "total_jobs": get_total_jobs(db),
        "jobs_per_org": get_jobs_per_org(db),
        "failed_jobs_24h": get_failed_jobs(db, since=since_24h),
        "failed_jobs_30d": get_failed_jobs(db, since=since_30d),
        "avg_duration_ms": get_avg_duration(db),
    }
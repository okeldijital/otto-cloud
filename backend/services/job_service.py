from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from repositories.job_repository import JobRepository
from datetime import datetime


def get_current_period() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def estimate_tokens(input: Dict[str, Any]) -> int:
    """Estimate tokens from input payload."""
    import json
    payload = input.get("payload", {})
    content = json.dumps(payload)
    return len(content) // 4


MAX_JOBS_PER_MINUTE = 60
MAX_CONCURRENT_JOBS = 10


def check_rate_limit(db: Session, organization_id: UUID) -> tuple[bool, str]:
    """Check if org has exceeded rate limits."""
    from models.job import Job
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    minute_ago = now - timedelta(minutes=1)

    recent_jobs = db.query(Job).filter(
        Job.organization_id == organization_id,
        Job.created_at >= minute_ago
    ).count()

    if recent_jobs >= MAX_JOBS_PER_MINUTE:
        return False, f"Rate limit exceeded: max {MAX_JOBS_PER_MINUTE} jobs per minute"

    running_jobs = db.query(Job).filter(
        Job.organization_id == organization_id,
        Job.status == "running"
    ).count()

    if running_jobs >= MAX_CONCURRENT_JOBS:
        return False, f"Rate limit exceeded: max {MAX_CONCURRENT_JOBS} concurrent jobs"

    return True, ""


def check_plan_limit(db: Session, organization_id: UUID, default_limit: int = 100) -> tuple[bool, str]:
    """Check if org has exceeded plan job limit. Returns (allowed, error_message)."""
    from models.organization import Organization
    from models.subscription import Subscription
    from models.plan import Plan
    from models.usage import Usage

    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if org and not org.is_active:
        return False, "Organization is suspended"

    allowed, error = check_rate_limit(db, organization_id)
    if not allowed:
        return False, error

    period = get_current_period()

    sub = db.query(Subscription).filter(
        Subscription.organization_id == organization_id,
        Subscription.status == "active"
    ).first()

    if sub:
        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        limit = plan.job_limit if plan else default_limit
    else:
        limit = default_limit

    usage = db.query(Usage).filter(
        Usage.organization_id == organization_id,
        Usage.metric == "jobs",
        Usage.period == period
    ).first()

    current_usage = usage.value if usage else 0

    if current_usage >= limit:
        return False, f"Plan limit exceeded ({current_usage}/{limit})"

    return True, ""


def create_job(db: Session, input: Dict[str, Any], organization_id: UUID, user_id: int) -> Dict[str, Any]:
    allowed, error = check_plan_limit(db, organization_id)
    if not allowed:
        raise ValueError(error)

    repo = JobRepository()
    job = repo.create_job(db, input, organization_id, user_id)

    period = get_current_period()
    from models.usage import Usage
    estimated_tokens = estimate_tokens(input)

    existing = db.query(Usage).filter(
        Usage.organization_id == organization_id,
        Usage.metric == "jobs",
        Usage.period == period
    ).first()

    if existing:
        existing.value += 1
        existing.tokens_used += estimated_tokens
    else:
        usage = Usage(
            organization_id=organization_id,
            metric="jobs",
            value=1,
            tokens_used=estimated_tokens,
            period=period
        )
        db.add(usage)
    db.commit()

    return {
        "id": str(job.id),
        "status": job.status,
        "input": job.input,
    }


def execute_job(job_id: UUID, organization_id: UUID) -> Dict[str, Any]:
    from database import SessionLocal
    import time

    repo = JobRepository()
    db = SessionLocal()
    start_time = time.time()

    try:
        job = repo.update_job_status(db, job_id, "running", organization_id)
        if not job:
            from services.logging.logger import log_job_event
            log_job_event(str(job_id), 0, str(organization_id), "failed", error="Job not found")
            return {"error": "Job not found"}

        input_data = job.input
        task = input_data.get("task")
        payload = input_data.get("payload", {})

        try:
            result = {"task": task, "processed": True, "payload": payload}
            repo.complete_job(db, job_id, result, organization_id)
            duration_ms = (time.time() - start_time) * 1000
            from services.logging.logger import log_job_event
            log_job_event(str(job_id), job.user_id, str(organization_id), "completed", duration_ms=duration_ms)
            return {"success": True, "result": result}
        except Exception as e:
            repo.fail_job(db, job_id, str(e), organization_id)
            duration_ms = (time.time() - start_time) * 1000
            from services.logging.logger import log_job_event
            log_job_event(str(job_id), job.user_id, str(organization_id), "failed", error=str(e), duration_ms=duration_ms)
            return {"success": False, "error": str(e)}
    finally:
        db.close()


def get_job_status(db: Session, job_id: UUID, organization_id: UUID) -> Optional[Dict[str, Any]]:
    repo = JobRepository()
    job = repo.get_job(db, job_id, organization_id)
    if not job:
        return None

    return {
        "id": str(job.id),
        "status": job.status,
        "output": job.output,
        "error": job.error,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
    }
import structlog
import logging
import sys

logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)

logger = structlog.get_logger()


def log_job_event(
    job_id: str,
    user_id: int,
    org_id: str,
    status: str,
    message: str = "",
    error: str = None,
    duration_ms: float = None
):
    """Log structured job event."""
    context = {
        "job_id": job_id,
        "user_id": str(user_id),
        "org_id": str(org_id),
        "status": status,
    }
    if message:
        context["message"] = message
    if error:
        context["error"] = error
    if duration_ms is not None:
        context["duration_ms"] = round(duration_ms, 2)

    if status == "failed":
        logger.error("job_event", **context)
    elif status == "completed":
        logger.info("job_event", **context)
    else:
        logger.info("job_event", **context)
import os
from redis import Redis
from rq import Queue

def get_redis_connection() -> Redis:
    """Get Redis connection from environment or defaults."""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    return Redis.from_url(redis_url)


def get_job_queue() -> Queue:
    """Get RQ queue for job execution."""
    redis_conn = get_redis_connection()
    return Queue("otto-jobs", connection=redis_conn)


default_queue = get_job_queue()
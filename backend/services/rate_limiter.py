import os
from typing import Callable
from functools import wraps
from fastapi import HTTPException, Request
import redis
import time

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

try:
    redis_client = redis.from_url(REDIS_URL)
    redis_client.ping()
except Exception:
    redis_client = None


RATE_LIMITS = {
    "user": {"requests": 100, "window": 60},
    "org": {"requests": 500, "window": 60},
}


def get_rate_limit_key(prefix: str, id: str) -> str:
    return f"rate_limit:{prefix}:{id}"


def check_rate_limit(id_type: str, id: str) -> tuple[bool, int]:
    if not redis_client:
        return True, 0

    key = get_rate_limit_key(id_type, id)
    limit = RATE_LIMITS.get(id_type, {})

    now = time.time()
    window = limit.get("window", 60)
    max_requests = limit.get("requests", 100)

    try:
        request_count = redis_client.get(key)
        if request_count is None:
            redis_client.setex(key, window, 1)
            return True, max_requests

        count = int(request_count)
        if count >= max_requests:
            return False, max_requests - count

        redis_client.incr(key)
        return True, max_requests - count
    except Exception:
        return True, 0


def rate_limit_dependency(request: Request):
    """FastAPI dependency for rate limiting."""
    user_id = request.headers.get("x-user-id", "")
    org_id = request.headers.get("x-org-id", "")

    if user_id:
        allowed, remaining = check_rate_limit("user", user_id)
        if not allowed:
            raise HTTPException(
                detail={"error": "Rate limit exceeded", "type": "user"},
                status_code=429
            )

    if org_id:
        allowed, remaining = check_rate_limit("org", org_id)
        if not allowed:
            raise HTTPException(
                detail={"error": "Rate limit exceeded", "type": "org"},
                status_code=429
            )

    return True
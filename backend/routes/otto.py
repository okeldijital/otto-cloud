from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Any, Optional
from uuid import UUID

from services.rate_limiter import check_rate_limit
from services.validation import validate_input_size, parse_json_safely

router = APIRouter(tags=["Otto"])


class OttoRunRequest(BaseModel):
    input: Any


class OttoRunResponse(BaseModel):
    success: bool
    data: Any
    error: Optional[str] = None


class OttoAsyncResponse(BaseModel):
    success: bool
    data: dict


def get_auth_headers(request: Request) -> tuple[str, str]:
    user_id = request.headers.get("x-user-id", "1")
    org_id = request.headers.get("x-org-id", "00000000-0000-0000-0000-000000000001")
    return user_id, org_id


def check_rate_limits(request: Request):
    user_id, org_id = get_auth_headers(request)

    if user_id:
        allowed, _ = check_rate_limit("user", user_id)
        if not allowed:
            raise HTTPException(
                detail={"error": "Rate limit exceeded", "type": "user"},
                status_code=429
            )

    if org_id:
        allowed, _ = check_rate_limit("org", org_id)
        if not allowed:
            raise HTTPException(
                detail={"error": "Rate limit exceeded", "type": "org"},
                status_code=429
            )


@router.post("/otto/run", response_model=OttoRunResponse)
async def run_otto(request: Request, body: OttoRunRequest):
    """
    Execute Otto AI with provided input.
    """
    validate_input_size(request)
    check_rate_limits(request)

    try:
        return OttoRunResponse(
            success=True,
            data={"message": "Otto execution not yet implemented", "input": body.input}
        )
    except Exception as e:
        return OttoRunResponse(
            success=False,
            data=None,
            error=str(e)
        )


@router.post("/otto/run-async", response_model=OttoAsyncResponse)
async def run_otto_async(request: Request, body: OttoRunRequest):
    """
    Execute Otto AI asynchronously - creates job and enqueues for background processing.
    """
    from database import get_db
    from services.job_service import create_job
    from job_queue.connection import default_queue
    from rq.job import Job

    validate_input_size(request)
    check_rate_limits(request)

    user_id_str, org_id_str = get_auth_headers(request)
    user_id = int(user_id_str)
    org_id = UUID(org_id_str)

    db = next(get_db())

    try:
        job = create_job(db, body.input, org_id, user_id)
        job_id = UUID(job["id"])

        job_enqueued = default_queue.enqueue(
            "services.job_service.execute_job",
            job_id,
            org_id,
            job_timeout="10m",
            retry=3,
            retry_intervals=[60, 300, 900]
        )

        return OttoAsyncResponse(
            success=True,
            data={
                "jobId": job["id"],
                "status": job["status"]
            }
        )
    except Exception as e:
        return OttoAsyncResponse(
            success=False,
            data={"error": str(e)}
        )


@router.get("/otto/job/{id}", response_model=OttoRunResponse)
async def get_job(request: Request, id: str):
    """
    Get job status by ID.
    """
    from database import get_db
    from services.job_service import get_job_status

    check_rate_limits(request)

    user_id_str, org_id_str = get_auth_headers(request)
    org_id = UUID(org_id_str)

    db = next(get_db())

    try:
        uuid_id = UUID(id)
        job = get_job_status(db, uuid_id, org_id)

        if not job:
            return OttoRunResponse(
                success=False,
                data=None,
                error="Job not found"
            )

        return OttoRunResponse(
            success=True,
            data={
                "status": job["status"],
                "output": job["output"],
                "error": job["error"]
            }
        )
    except Exception as e:
        return OttoRunResponse(
            success=False,
            data=None,
            error=str(e)
        )
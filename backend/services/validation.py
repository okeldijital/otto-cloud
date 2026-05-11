import json
from typing import Any
from fastapi import Request, HTTPException


MAX_INPUT_SIZE = 1024 * 1024
MAX_STRING_LENGTH = 10000
MAX_DEPTH = 10


def validate_input_size(request: Request) -> None:
    if request.headers.get("content-length"):
        size = int(request.headers["content-length"])
        if size > MAX_INPUT_SIZE:
            raise HTTPException(
                detail={"error": "Request too large", "max_size": MAX_INPUT_SIZE},
                status_code=413
            )


def sanitize_value(value: Any, depth: int = 0) -> Any:
    if depth > MAX_DEPTH:
        return None

    if isinstance(value, str):
        return value[:MAX_STRING_LENGTH] if len(value) > MAX_STRING_LENGTH else value

    if isinstance(value, dict):
        return {k: sanitize_value(v, depth + 1) for k, v in value.items()}

    if isinstance(value, list):
        return [sanitize_value(item, depth + 1) for item in value[:1000]]

    return value


def sanitize_input(data: dict) -> dict:
    return sanitize_value(data)


def validate_request(request: Request) -> dict:
    validate_input_size(request)
    return request


def parse_json_safely(body: bytes) -> dict:
    try:
        data = json.loads(body)
        if not isinstance(data, dict):
            raise HTTPException(
                detail={"error": "Invalid JSON: expected object"},
                status_code=400
            )
        return sanitize_input(data)
    except json.JSONDecodeError:
        raise HTTPException(
            detail={"error": "Invalid JSON"},
            status_code=400
        )
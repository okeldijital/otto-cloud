import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.user import User
from routes.auth import get_current_admin_user
from services.admin.scc.runtime import (
    active_org_for_user,
    build_db_inventory,
    database_writable,
    get_alembic_current,
    get_alembic_head,
    get_last_backup_timestamp,
    get_org_name,
    list_orgs,
    option_by_db_id,
    redact_database_url,
    set_active_org_for_user,
    validate_sqlite_candidate,
    write_active_db_pointer,
)

router = APIRouter()


class SCCDBSwitchRequest(BaseModel):
    db_id: str
    confirm: bool = False


class SCCDBSwitchPathRequest(BaseModel):
    db_path: str
    confirm: bool = False
    confirm_external: bool = False


class SCCOrgSwitchRequest(BaseModel):
    organization_id: str
    confirm: bool = False


def _ai_flags() -> Dict[str, bool]:
    return {
        key: bool(getattr(settings, key))
        for key in dir(settings)
        if key.startswith("AI_") and isinstance(getattr(settings, key), bool)
    }


@router.get("/admin/scc/health")
async def scc_health(request: Request):
    return {
        "status": "ok",
        "backend_connected": True,
        "backend_base_url": str(request.base_url).rstrip("/"),
        "env": settings.APP_ENV,
        "build": settings.APP_VERSION,
        "server_time": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/admin/scc/runtime")
async def scc_runtime(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    org_id = active_org_for_user(current_user)
    sqlite_path = None
    if settings.DATABASE_URL.startswith("sqlite:///"):
        sqlite_path = settings.DATABASE_URL.replace("sqlite:///", "")

    return {
        "database_url": redact_database_url(settings.DATABASE_URL),
        "sqlite_path": sqlite_path,
        "db_writable": database_writable(settings.DATABASE_URL),
        "app_data_dir": settings.APP_DATA_DIR,
        "storage_root": settings.STORAGE_ROOT,
        "active_db_pointer_file": settings.ACTIVE_DB_POINTER_FILE,
        "alembic_current": get_alembic_current(settings.DATABASE_URL),
        "alembic_head": get_alembic_head(),
        "org_mode": "multi",
        "active_org_id": str(org_id),
        "active_org_name": get_org_name(db, org_id),
        "last_backup_timestamp": get_last_backup_timestamp(db, org_id),
        "ai_flags": _ai_flags(),
    }


@router.get("/admin/scc/db/inventory")
async def scc_db_inventory(current_user: User = Depends(get_current_admin_user)):
    app_data_dir = Path(settings.APP_DATA_DIR).expanduser().resolve()
    pointer_file = Path(settings.ACTIVE_DB_POINTER_FILE).expanduser().resolve()
    return build_db_inventory(
        app_data_dir=app_data_dir,
        current_database_url=settings.DATABASE_URL,
        pointer_file=pointer_file,
    )


@router.post("/admin/scc/db/switch")
async def scc_db_switch(
    payload: SCCDBSwitchRequest,
    current_user: User = Depends(get_current_admin_user),
):
    if payload.confirm is not True:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="confirmation required")

    app_data_dir = Path(settings.APP_DATA_DIR).expanduser().resolve()
    pointer_file = Path(settings.ACTIVE_DB_POINTER_FILE).expanduser().resolve()
    inventory = build_db_inventory(
        app_data_dir=app_data_dir,
        current_database_url=settings.DATABASE_URL,
        pointer_file=pointer_file,
    )
    option = option_by_db_id(inventory, payload.db_id)
    if option is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="db_id not found in inventory")
    if not option.get("is_sqlite") or not option.get("is_readable"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid sqlite file")

    candidate, err = validate_sqlite_candidate(option["db_path"])
    if err or candidate is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid sqlite file")

    write_active_db_pointer(sqlite_path=candidate, updated_by=current_user.email)
    return {
        "status": "ok",
        "version": "scc_db_switch_v1.1",
        "active": {
            "db_id": payload.db_id,
            "db_path": str(candidate),
            "source": "pointer",
            "requires_restart": True,
        },
    }


@router.post("/admin/scc/db/switch_path")
async def scc_db_switch_path(
    payload: SCCDBSwitchPathRequest,
    current_user: User = Depends(get_current_admin_user),
):
    if payload.confirm is not True:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="confirmation required")

    candidate, err = validate_sqlite_candidate(payload.db_path)
    if err or candidate is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid sqlite file")

    app_data_dir = Path(settings.APP_DATA_DIR).expanduser().resolve()
    in_app_data = app_data_dir in candidate.parents
    if not in_app_data and payload.confirm_external is not True:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="confirm_external required for path outside app_data_dir",
        )

    write_active_db_pointer(sqlite_path=candidate, updated_by=current_user.email)
    return {
        "status": "ok",
        "version": "scc_db_switch_v1.1",
        "active": {
            "db_id": None,
            "db_path": str(candidate),
            "source": "pointer",
            "requires_restart": True,
        },
    }


@router.get("/admin/scc/orgs")
async def scc_orgs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    rows = list_orgs(db)
    active_org_id = active_org_for_user(current_user)
    return {
        "active_org_id": str(active_org_id),
        "active_org_name": get_org_name(db, active_org_id),
        "organizations": [
            {
                "organization_id": str(row.organization_id),
                "name": row.name,
                "type": row.org_type,
            }
            for row in rows
        ],
    }


@router.post("/admin/scc/orgs/switch")
async def scc_org_switch(
    payload: SCCOrgSwitchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    if payload.confirm is not True:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="confirmation required")

    try:
        org_uuid = uuid.UUID(payload.organization_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid organization_id")

    if not get_org_name(db, org_uuid):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    set_active_org_for_user(user_id=current_user.id, organization_id=org_uuid)
    return {
        "status": "switched",
        "active_org_id": str(org_uuid),
        "active_org_name": get_org_name(db, org_uuid),
        "session_scoped": True,
    }

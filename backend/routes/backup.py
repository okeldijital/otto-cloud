import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.admin_backup import AdminBackupArtifact
from models.user import User
from routes.auth import get_current_admin_user
from services.admin_backup.service import (
    create_manual_backup,
    delete_backup,
    list_backups,
    restore_backup,
    upload_backup,
)

router = APIRouter()


class BackupUploadResponse(BaseModel):
    status: str
    backup_id: int
    filename: str
    size_bytes: int
    sha256: str
    created_at: str
    organization_id: str


class BackupListItem(BaseModel):
    id: int
    filename: str
    size_bytes: int
    sha256: str
    backup_kind: str
    is_pre_restore_snapshot: bool
    created_at: str
    organization_id: str


class BackupRestoreRequest(BaseModel):
    backup_id: int


class BackupRestoreResponse(BaseModel):
    status: str
    backup_id: int
    pre_restore_snapshot_id: int
    restored_at: str
    organization_id: str
    warnings: List[str]


def _iso(value: Optional[datetime]) -> str:
    if value is None:
        return datetime.now(timezone.utc).isoformat()
    return value.astimezone(timezone.utc).isoformat()


def _artifact_to_item(row: AdminBackupArtifact) -> BackupListItem:
    return BackupListItem(
        id=row.id,
        filename=row.filename,
        size_bytes=row.size_bytes,
        sha256=row.sha256,
        backup_kind=row.backup_kind,
        is_pre_restore_snapshot=row.is_pre_restore_snapshot,
        created_at=_iso(row.created_at),
        organization_id=str(row.organization_id),
    )


@router.get("/admin/backups", response_model=dict)
async def admin_list_backups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    rows = list_backups(db=db, org_id=current_user.organization_id)
    return {"backups": [_artifact_to_item(row).model_dump(mode="json") for row in rows]}


@router.post("/admin/backups", response_model=BackupUploadResponse)
async def admin_create_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    row = create_manual_backup(db=db, org_id=current_user.organization_id, user_id=current_user.id)
    return BackupUploadResponse(
        status="uploaded",
        backup_id=row.id,
        filename=row.filename,
        size_bytes=row.size_bytes,
        sha256=row.sha256,
        created_at=_iso(row.created_at),
        organization_id=str(row.organization_id),
    )


@router.post("/admin/backups/upload", response_model=BackupUploadResponse)
async def admin_upload_backup(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    try:
        if not file.filename:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Missing filename")
        content = await file.read()
        row = upload_backup(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            filename=file.filename,
            data=content,
            max_size_bytes=settings.MAX_UPLOAD_SIZE,
        )
        return BackupUploadResponse(
            status="uploaded",
            backup_id=row.id,
            filename=row.filename,
            size_bytes=row.size_bytes,
            sha256=row.sha256,
            created_at=_iso(row.created_at),
            organization_id=str(row.organization_id),
        )
    except OverflowError:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Backup upload too large")
    except ValueError as exc:
        code = str(exc)
        if code == "invalid_extension":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only .zip files are accepted")
        if code == "invalid_zip_signature":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid zip signature")
        if code == "zip_slip_detected":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Zip contains unsafe paths")
        if code == "empty_zip":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Zip archive is empty")
        if code.startswith("unknown_backup_structure"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown backup structure")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=code)


@router.post("/admin/backups/restore", response_model=BackupRestoreResponse)
async def admin_restore_backup(
    payload: BackupRestoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    try:
        result = restore_backup(
            db=db,
            org_id=current_user.organization_id,
            user_id=current_user.id,
            backup_id=payload.backup_id,
        )
        return BackupRestoreResponse(**result)
    except ValueError as exc:
        code = str(exc)
        if code == "backup_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup not found")
        if code in {"checksum_mismatch", "zip_slip_detected", "empty_zip", "missing_database_in_backup"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=code)
        if code.startswith("unknown_backup_structure"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unknown_backup_structure")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=code)


@router.get("/admin/backups/download/{backup_id}")
async def admin_download_backup(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    row = (
        db.query(AdminBackupArtifact)
        .filter(
            AdminBackupArtifact.id == backup_id,
            AdminBackupArtifact.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup not found")

    path = Path(row.file_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup file missing")
    return FileResponse(path=str(path), filename=row.filename, media_type="application/zip")


@router.delete("/admin/backups/{backup_id}")
async def admin_delete_backup(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    try:
        delete_backup(db=db, org_id=current_user.organization_id, backup_id=backup_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup not found")

"""Backup and restore functionality for Otto."""
import os
import shutil
import zipfile
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class BackupRequest(BaseModel):
    """Request for backup creation."""
    pass


class BackupResponse(BaseModel):
    """Response for backup creation."""
    success: bool
    message: str
    backup_path: Optional[str] = None
    timestamp: str


class RestoreRequest(BaseModel):
    """Request for restore operation."""
    backup_path: str


class RestoreResponse(BaseModel):
    """Response for restore operation."""
    success: bool
    message: str


def get_backup_dir() -> Path:
    """Get or create backup directory."""
    backup_dir = Path(settings.STORAGE_ROOT) / ".backups"
    backup_dir.mkdir(exist_ok=True, parents=True)
    return backup_dir


@router.post("/api/backup", response_model=BackupResponse)
async def create_backup():
    """Create a backup of database and storage."""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = get_backup_dir()
        backup_file = backup_dir / f"otto_backup_{timestamp}.zip"
        
        # Create zip file
        with zipfile.ZipFile(backup_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add database file
            db_path = Path(settings.DATABASE_URL.replace('sqlite:///', ''))
            if db_path.exists():
                zipf.write(db_path, arcname='otto.db')
                logger.info(f"Added database to backup: {db_path}")
            
            # Add storage directory
            storage_path = Path(settings.STORAGE_ROOT)
            if storage_path.exists():
                for file_path in storage_path.rglob('*'):
                    if file_path.is_file():
                        arcname = file_path.relative_to(storage_path.parent)
                        zipf.write(file_path, arcname=arcname)
                logger.info(f"Added storage directory to backup")
            
            # Add import logs if they exist
            import_logs_path = Path(settings.IMPORT_LOGS_ROOT)
            if import_logs_path.exists():
                for file_path in import_logs_path.rglob('*'):
                    if file_path.is_file():
                        arcname = file_path.relative_to(import_logs_path.parent)
                        zipf.write(file_path, arcname=arcname)
                logger.info(f"Added import logs to backup")
        
        logger.info(f"✅ Backup created: {backup_file}")
        return BackupResponse(
            success=True,
            message=f"Backup created successfully",
            backup_path=str(backup_file),
            timestamp=timestamp
        )
    except Exception as e:
        logger.error(f"❌ Backup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/restore", response_model=RestoreResponse)
async def restore_backup(request: RestoreRequest, background_tasks: BackgroundTasks):
    """Restore from a backup file."""
    try:
        backup_path = Path(request.backup_path)
        
        if not backup_path.exists():
            raise HTTPException(status_code=404, detail="Backup file not found")
        
        if not backup_path.suffix == '.zip':
            raise HTTPException(status_code=400, detail="Invalid backup format")
        
        # Create a timestamped backup of current state before restoring
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        app_data_parent = Path(settings.DATABASE_URL.replace('sqlite:///', '')).parent.parent
        pre_restore_backup = app_data_parent / f"pre_restore_backup_{timestamp}"
        
        # Copy current state
        if (app_data_parent / "otto.db").exists():
            shutil.copy2(app_data_parent / "otto.db", pre_restore_backup / "otto.db")
        
        logger.info(f"Created safety backup at {pre_restore_backup}")
        
        # Extract backup to temporary location first
        temp_extract = app_data_parent / f".restore_tmp_{timestamp}"
        with zipfile.ZipFile(backup_path, 'r') as zipf:
            zipf.extractall(temp_extract)
        
        # Move extracted files to actual locations
        if (temp_extract / "otto.db").exists():
            shutil.copy2(temp_extract / "otto.db", app_data_parent / "otto.db")
        
        if (temp_extract / "storage").exists():
            storage_path = Path(settings.STORAGE_ROOT)
            shutil.rmtree(storage_path, ignore_errors=True)
            shutil.copytree(temp_extract / "storage", storage_path)
        
        # Clean up
        shutil.rmtree(temp_extract, ignore_errors=True)
        
        logger.info(f"✅ Restore completed successfully")
        return RestoreResponse(
            success=True,
            message="Restore completed successfully"
        )
    except Exception as e:
        logger.error(f"❌ Restore failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/backups")
async def list_backups():
    """List available backups."""
    try:
        backup_dir = get_backup_dir()
        backups = []
        
        if backup_dir.exists():
            for backup_file in sorted(backup_dir.glob("*.zip"), reverse=True):
                stat = backup_file.stat()
                backups.append({
                    "name": backup_file.name,
                    "path": str(backup_file),
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        return {"backups": backups}
    except Exception as e:
        logger.error(f"Error listing backups: {e}")
        raise HTTPException(status_code=500, detail=str(e))

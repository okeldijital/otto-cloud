"""Backup and restore functionality for Otto."""
import os
import shutil
import zipfile
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, HTTPException, BackgroundTasks, File, UploadFile, Depends
from pydantic import BaseModel

from config import settings
from dependencies import get_current_active_user
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


class BackupInfo(BaseModel):
    """Information about a backup file."""
    id: str
    name: str
    path: str
    size: int
    created: str


class BackupResponse(BaseModel):
    """Response for backup creation."""
    success: bool
    message: str
    backup: Optional[BackupInfo] = None
    timestamp: str


class RestoreResponse(BaseModel):
    """Response for restore operation."""
    success: bool
    message: str


def get_backup_dir() -> Path:
    """Get or create backup directory."""
    backup_dir = Path(settings.STORAGE_ROOT) / ".backups"
    backup_dir.mkdir(exist_ok=True, parents=True)
    return backup_dir


@router.get("/admin/backups", response_model=dict)
async def list_backups(current_user: User = Depends(get_current_active_user)):
    """List available backups."""
    try:
        backup_dir = get_backup_dir()
        backups: List[BackupInfo] = []
        
        if backup_dir.exists():
            for backup_file in sorted(backup_dir.glob("*.zip"), reverse=True):
                stat = backup_file.stat()
                backups.append(BackupInfo(
                    id=backup_file.stem,  # filename without extension
                    name=backup_file.name,
                    path=str(backup_file),
                    size=stat.st_size,
                    created=datetime.fromtimestamp(stat.st_mtime).isoformat()
                ))
        
        return {"backups": [b.dict() for b in backups]}
    except Exception as e:
        logger.error(f"Error listing backups: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/backups", response_model=BackupResponse)
async def create_backup(current_user: User = Depends(get_current_active_user)):
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
                    if file_path.is_file() and '.backups' not in file_path.parts:
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
        
        stat = backup_file.stat()
        backup_info = BackupInfo(
            id=backup_file.stem,
            name=backup_file.name,
            path=str(backup_file),
            size=stat.st_size,
            created=datetime.fromtimestamp(stat.st_mtime).isoformat()
        )
        
        logger.info(f"✅ Backup created: {backup_file}")
        return BackupResponse(
            success=True,
            message=f"Backup created successfully",
            backup=backup_info,
            timestamp=timestamp
        )
    except Exception as e:
        logger.error(f"❌ Backup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/backups/upload", response_model=BackupResponse)
async def upload_backup(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a backup zip file."""
    try:
        # Validate file is a zip
        if not file.filename or not file.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="File must be a .zip file")
        
        # Validate filename format (optional but recommended)
        if not file.filename.startswith('otto_backup_'):
            logger.warning(f"Uploaded backup has non-standard name: {file.filename}")
        
        backup_dir = get_backup_dir()
        backup_path = backup_dir / file.filename
        
        # Check if file already exists
        if backup_path.exists():
            raise HTTPException(
                status_code=409, 
                detail=f"Backup file '{file.filename}' already exists"
            )
        
        # Save uploaded file
        with open(backup_path, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        # Validate it's a valid zip file
        try:
            with zipfile.ZipFile(backup_path, 'r') as zipf:
                # Check if it contains expected files
                namelist = zipf.namelist()
                if 'otto.db' not in namelist:
                    logger.warning(f"Uploaded backup does not contain otto.db")
        except zipfile.BadZipFile:
            backup_path.unlink()  # Delete invalid file
            raise HTTPException(status_code=400, detail="Invalid zip file")
        
        stat = backup_path.stat()
        backup_info = BackupInfo(
            id=backup_path.stem,
            name=backup_path.name,
            path=str(backup_path),
            size=stat.st_size,
            created=datetime.fromtimestamp(stat.st_mtime).isoformat()
        )
        
        logger.info(f"✅ Backup uploaded: {backup_path}")
        return BackupResponse(
            success=True,
            message=f"Backup uploaded successfully",
            backup=backup_info,
            timestamp=datetime.now().strftime("%Y%m%d_%H%M%S")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Backup upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/backups/{backup_id}/restore", response_model=RestoreResponse)
async def restore_backup(
    backup_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """Restore from a backup file."""
    try:
        backup_dir = get_backup_dir()
        
        # Find backup file by ID (stem)
        backup_path = None
        for candidate in backup_dir.glob(f"{backup_id}.zip"):
            backup_path = candidate
            break
        
        if not backup_path or not backup_path.exists():
            raise HTTPException(status_code=404, detail=f"Backup '{backup_id}' not found")
        
        # Create a timestamped backup of current state before restoring
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        db_path = Path(settings.DATABASE_URL.replace('sqlite:///', ''))
        app_data_parent = db_path.parent
        pre_restore_backup_dir = backup_dir / f"pre_restore_{timestamp}"
        pre_restore_backup_dir.mkdir(exist_ok=True)
        
        # Copy current database
        if db_path.exists():
            shutil.copy2(db_path, pre_restore_backup_dir / db_path.name)
            logger.info(f"Created safety backup at {pre_restore_backup_dir}")
        
        # CRITICAL: Close all database connections to unlock the file
        try:
            from database import engine
            engine.dispose()  # Close all connections in the pool
            logger.info("Closed all database connections")
        except Exception as e:
            logger.warning(f"Error closing connections: {e}")
        
        # Extract backup to temporary location first
        temp_extract = app_data_parent / f".restore_tmp_{timestamp}"
        temp_extract.mkdir(exist_ok=True)
        
        try:
            with zipfile.ZipFile(backup_path, 'r') as zipf:
                zipf.extractall(temp_extract)
            
            # Find the database file in the backup (support both naming conventions)
            restored_db = None
            for db_name in ["otto.sqlite", "otto.db"]:
                candidate = temp_extract / db_name
                if candidate.exists():
                    restored_db = candidate
                    logger.info(f"Found database file: {db_name}")
                    break
            
            if not restored_db:
                raise HTTPException(
                    status_code=400,
                    detail="Backup does not contain a valid database file (otto.sqlite or otto.db)"
                )
            
            # Restore database (atomic copy)
            shutil.copy2(restored_db, db_path)
            logger.info(f"Restored database from {restored_db.name} to {db_path}")
            
            # Restore storage directory
            storage_path = Path(settings.STORAGE_ROOT)
            temp_storage = temp_extract / "storage"
            if temp_storage.exists():
                # Backup current storage
                if storage_path.exists():
                    shutil.move(str(storage_path), str(pre_restore_backup_dir / "storage"))
                shutil.copytree(temp_storage, storage_path)
                logger.info(f"Restored storage directory")
            
            # Restore import logs
            import_logs_path = Path(settings.IMPORT_LOGS_ROOT)
            temp_import_logs = temp_extract / "import_logs"
            if temp_import_logs.exists():
                if import_logs_path.exists():
                    shutil.move(str(import_logs_path), str(pre_restore_backup_dir / "import_logs"))
                shutil.copytree(temp_import_logs, import_logs_path)
                logger.info(f"Restored import logs")
            
            logger.info(f"✅ Restore completed successfully from {backup_path.name}")
            return RestoreResponse(
                success=True,
                message=f"Restore completed from {backup_path.name}. Pre-restore backup saved to {pre_restore_backup_dir.name}. Please restart the application to see changes."
            )
        finally:
            # Clean up temp directory
            if temp_extract.exists():
                shutil.rmtree(temp_extract, ignore_errors=True)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Restore failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

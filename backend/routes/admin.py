from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from pathlib import Path
from pydantic import BaseModel

from database import get_db
from models.user import User as UserModel
from models import Artist, Release, Track, Contract, Work, AuditLog
from routes.auth import get_current_admin_user
from utils.backup import create_backup, list_backups, restore_backup, BACKUP_DIR
from utils.activity import log_activity
from utils.scheduler import get_current_frequency, update_schedule

router = APIRouter()

@router.post("/backup")
def run_backup(
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Trigger a manual backup (Admin only)"""
    try:
        backup_file = create_backup()
        log_activity(db, current_user.id, "run_backup", "system", 0, backup_file)
        return {"status": "success", "file": backup_file}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/backups")
def get_backups(
    current_user: UserModel = Depends(get_current_admin_user)
):
    """List all available backups (Admin only)"""
    return list_backups()

@router.post("/restore/{filename}")
def run_restore(
    filename: str,
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Restore from a backup (Admin only)"""
    try:
        success = restore_backup(filename)
        if success:
            log_activity(db, current_user.id, "restore_backup", "system", 0, filename)
            return {"status": "success", "message": "Restore completed. Please restart the server."}
        else:
            raise HTTPException(status_code=404, detail="Backup file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/backup/download/{filename}")
def download_backup(
    filename: str,
    current_user: UserModel = Depends(get_current_admin_user)
):
    """Download a specific backup file"""
    file_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/zip'
    )

@router.post("/backup/upload")
def upload_backup(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Upload a backup file"""
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed")
    
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        
    file_path = os.path.join(BACKUP_DIR, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        log_activity(db, current_user.id, "upload_backup", "system", 0, file.filename)
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not upload file: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not upload file: {str(e)}")

class ScheduleUpdate(BaseModel):
    frequency: str

@router.get("/backup/schedule")
def get_backup_schedule(
    current_user: UserModel = Depends(get_current_admin_user)
):
    """Get current auto-backup schedule"""
    return {"frequency": get_current_frequency()}

@router.post("/backup/schedule")
def set_backup_schedule(
    schedule: ScheduleUpdate,
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update auto-backup schedule"""
    if schedule.frequency not in ['daily', 'weekly', 'monthly']:
        raise HTTPException(status_code=400, detail="Invalid frequency. Must be 'daily', 'weekly', or 'monthly'")
    
    update_schedule(schedule.frequency)
    log_activity(db, current_user.id, "update_schedule", "system", 0, schedule.frequency)
    return {"status": "success", "frequency": schedule.frequency}

@router.get("/stats")
def get_system_stats(
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get counts of all entities in the system"""
    return {
        "artists": db.query(Artist).count(),
        "releases": db.query(Release).count(),
        "tracks": db.query(Track).count(),
        "works": db.query(Work).count(),
        "contracts": db.query(Contract).count(),
        "users": db.query(UserModel).count()
    }

@router.get("/audit-logs")
def get_system_logs(
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get latest audit logs"""
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()

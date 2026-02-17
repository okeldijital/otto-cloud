from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from database import get_db
from models.user import User as UserModel
from models import Artist, Release, Track, Contract, Work, AuditLog
from routes.auth import get_current_admin_user
from utils.scheduler import get_current_frequency, update_schedule

router = APIRouter()

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

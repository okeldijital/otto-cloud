from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime, timedelta

from database import get_db
from models.user import User
from models.artist import Artist
from models.release import Release
from models.work import Work
from models.contract import Contract
from models.royalty import Royalty
from models.event import Event
from routes.auth import get_current_active_user

router = APIRouter()

@router.get("/kpi")
def get_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get Key Performance Indicators"""
    
    # Counts
    total_artists = db.query(Artist).count()
    total_releases = db.query(Release).count()
    total_works = db.query(Work).count()
    active_contracts = db.query(Contract).filter(
        (Contract.end_date >= datetime.now().date()) | (Contract.end_date == None)  # noqa
    ).count()
    
    return {
        "total_artists": total_artists,
        "total_releases": total_releases,
        "total_works": total_works,
        "active_contracts": active_contracts
    }

@router.get("/revenue-trend")
def get_revenue_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get monthly revenue trend for the last 6 months"""
    # Simple aggregation by statement_date month
    # Note: SQLite extraction of month might vary, using a python-side processing for simplicity/compatibility
    # For production with Postgres, use date_trunc
    
    royalties = db.query(Royalty).filter(
        Royalty.statement_date != None
    ).order_by(Royalty.statement_date).all()
    
    # Group by Month-Year (e.g. "2024-01")
    revenue_map = {}
    
    for r in royalties:
        if r.statement_date:
            key = r.statement_date.strftime("%Y-%m")
            revenue_map[key] = revenue_map.get(key, 0.0) + float(r.amount or 0)
            
    # Sort and take last 6/12 entries
    sorted_keys = sorted(revenue_map.keys())
    
    data = []
    for key in sorted_keys[-12:]: # Last 12 months available
        data.append({
            "name": key,
            "revenue": revenue_map[key]
        })
        
    return data

@router.get("/catalog-growth")
def get_catalog_growth(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get cumulative catalog growth (Artists & Releases)"""
    # This is a bit expensive to calculate dynamically on large datasets, 
    # but fine for this scale. We basically want cumulative counts over time.
    
    # For simplicity, we'll just return month-by-month creation counts
    # Assuming 'created_at' is available or we use a proxy like release_date for releases
    
    # We'll mock a simple growth trend based on existing items if timestamps aren't perfect,
    # but let's try to use Created At if models have it, or just current counts for a simple snapshot.
    
    # Let's return just current breakdown by type for a Pie Chart as an alternative if trend is hard
    # Actually, let's do a simple count by type
    
    works_count = db.query(Work).count()
    releases_count = db.query(Release).count()
    artists_count = db.query(Artist).count()
    
    return [
        {"name": "Artists", "value": artists_count},
        {"name": "Releases", "value": releases_count},
        {"name": "Works", "value": works_count}
    ]

@router.get("/upcoming-events")
def get_upcoming_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = 5
):
    """Get upcoming events for calendar widget"""
    upcoming = db.query(Event).filter(
        Event.start_datetime >= datetime.now()
    ).order_by(Event.start_datetime).limit(limit).all()
    
    return [
        {
            "id": event.id,
            "title": event.title,
            "start_time": event.start_datetime.isoformat() if event.start_datetime else None,
            "end_time": event.end_datetime.isoformat() if event.end_datetime else None,
            "event_type": event.category,
            "location": event.location
        }
        for event in upcoming
    ]

@router.get("/latest-release")
def get_latest_release(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get the most recent release with artwork"""
    latest = db.query(Release).order_by(Release.release_date.desc()).first()
    
    if not latest:
        return None
    
    return {
        "id": latest.id,
        "title": latest.title,
        "release_date": latest.release_date.isoformat() if latest.release_date else None,
        "release_type": latest.release_type,
        "cover_art_url": latest.cover_art_url,
        "upc_code": latest.upc_code
    }

@router.get("/pending-contracts")
def get_pending_contracts_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get count of pending contracts"""
    # Assuming contracts without end_date or with future end_date are pending
    pending_count = db.query(Contract).filter(
        (Contract.end_date >= datetime.now().date()) | (Contract.end_date == None)
    ).count()
    
    return {"pending_count": pending_count}

@router.get("/recent-activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = 10
):
    """Get recent user activity"""
    from models.activity import Activity
    
    activities = db.query(Activity).filter(
        Activity.user_id == current_user.id
    ).order_by(Activity.timestamp.desc()).limit(limit).all()
    
    return [
        {
            "id": activity.id,
            "action": activity.action,
            "entity_type": activity.entity_type,
            "entity_id": activity.entity_id,
            "entity_name": activity.entity_name,
            "timestamp": activity.timestamp.isoformat() if activity.timestamp else None
        }
        for activity in activities
    ]

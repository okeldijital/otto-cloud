from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from models.event import Event as EventModel
from schemas.event import Event, EventCreate, EventUpdate
from routes.auth import get_current_active_user
from utils.activity import log_activity

router = APIRouter()


@router.get("/", response_model=List[Event])
def list_events(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all events"""
    events = db.query(EventModel).offset(skip).limit(limit).all()
    return events


@router.post("/", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new event"""
    db_event = EventModel(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    log_activity(db, current_user.id, "created", "event", db_event.id, db_event.title)
    
    return db_event


@router.get("/{event_id}", response_model=Event)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific event by ID"""
    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.put("/{event_id}", response_model=Event)
def update_event(
    event_id: int,
    event_update: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an event"""
    db_event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = event_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_event, field, value)
    
    db.commit()
    db.refresh(db_event)
    
    log_activity(db, current_user.id, "updated", "event", db_event.id, db_event.title)
    
    return db_event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an event"""
    db_event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_title = db_event.title
    db.delete(db_event)
    db.commit()
    
    log_activity(db, current_user.id, "deleted", "event", event_id, event_title)
    
    return None

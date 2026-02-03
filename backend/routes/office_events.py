from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from database import get_db
from dependencies import get_current_active_user, get_current_organization_id
from models.user import User
from models.event import Event
from core.audit import log_create, log_delete, log_update
from schemas.office_events import OfficeEvent, OfficeEventCreate, OfficeEventUpdate

router = APIRouter()

EVENT_TYPES = [
    "Release",
    "Contract Milestone",
    "Registration",
    "Deadline",
    "Meeting",
    "Reminder",
    "Other",
]

EVENT_STATUSES = [
    "Planned",
    "Completed",
    "Cancelled",
]


def _require_office_user(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role not in ("admin", "staff") and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Office access requires admin or staff role")
    return current_user


def _to_office_event(event: Event) -> OfficeEvent:
    return OfficeEvent(
        id=event.id,
        organization_id=str(event.organization_id),
        title=event.title,
        description=event.description,
        event_type=event.event_type or event.category or "Other",
        status=event.status or "Planned",
        start_datetime=event.start_datetime,
        end_datetime=event.end_datetime,
        all_day=event.all_day,
        linked_entity_type=event.related_entity_type,
        linked_entity_id=event.related_entity_id,
        created_by=event.created_by,
        created_at=event.created_at,
        updated_at=event.updated_at,
        is_deleted=event.is_deleted,
    )


@router.get("/office/events", response_model=List[OfficeEvent])
def list_office_events(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    linked_entity_type: Optional[str] = None,
    linked_entity_id: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    query = db.query(Event).filter(
        Event.organization_id == org_id,
        Event.is_deleted == False,  # noqa: E712
    )

    if date_from:
        query = query.filter(Event.start_datetime >= date_from)
    if date_to:
        query = query.filter(Event.start_datetime <= date_to)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    if status:
        if status == "Overdue":
            now = datetime.utcnow()
            query = query.filter(
                Event.status != "Completed",
                Event.start_datetime < now,
            )
        else:
            query = query.filter(Event.status == status)
    if linked_entity_type:
        query = query.filter(Event.related_entity_type == linked_entity_type)
    if linked_entity_id is not None:
        query = query.filter(Event.related_entity_id == linked_entity_id)

    events = query.order_by(Event.start_datetime.asc()).all()
    return [_to_office_event(event) for event in events]


@router.post("/office/events", response_model=OfficeEvent, status_code=status.HTTP_201_CREATED)
def create_office_event(
    payload: OfficeEventCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    if payload.event_type not in EVENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid event_type")
    if payload.status and payload.status not in EVENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")

    db_event = Event(
        organization_id=org_id,
        title=payload.title,
        description=payload.description,
        event_type=payload.event_type,
        status=payload.status or "Planned",
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        all_day=payload.all_day or False,
        related_entity_type=payload.linked_entity_type,
        related_entity_id=payload.linked_entity_id,
        created_by=current_user.id,
        is_deleted=False,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    log_create(
        db,
        "event",
        db_event.id,
        current_user.id,
        org_id,
        changes={"title": db_event.title, "event_type": db_event.event_type},
        entity_name=db_event.title,
    )

    return _to_office_event(db_event)


@router.get("/office/events/{event_id}", response_model=OfficeEvent)
def get_office_event(
    event_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.organization_id == org_id,
        Event.is_deleted == False,  # noqa: E712
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return _to_office_event(event)


@router.put("/office/events/{event_id}", response_model=OfficeEvent)
def update_office_event(
    event_id: int,
    payload: OfficeEventUpdate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.organization_id == org_id,
        Event.is_deleted == False,  # noqa: E712
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "event_type" in update_data and update_data["event_type"] not in EVENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid event_type")
    if "status" in update_data and update_data["status"] not in EVENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")

    for field, value in update_data.items():
        if field == "linked_entity_type":
            setattr(event, "related_entity_type", value)
        elif field == "linked_entity_id":
            setattr(event, "related_entity_id", value)
        else:
            setattr(event, field, value)

    db.commit()
    db.refresh(event)

    log_update(
        db,
        "event",
        event.id,
        current_user.id,
        org_id,
        changes={"title": event.title, "event_type": event.event_type, "status": event.status},
        entity_name=event.title,
    )

    return _to_office_event(event)


@router.delete("/office/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_office_event(
    event_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_office_user),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.organization_id == org_id,
        Event.is_deleted == False,  # noqa: E712
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.is_deleted = True
    db.commit()

    log_delete(
        db,
        "event",
        event.id,
        current_user.id,
        org_id,
        changes={"title": event.title},
        entity_name=event.title,
    )

    return None

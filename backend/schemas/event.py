from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    all_day: Optional[bool] = False
    category: Optional[str] = None
    color: Optional[str] = None
    location: Optional[str] = None
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None
    reminder_minutes: Optional[int] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    created_by: Optional[int] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    all_day: Optional[bool] = None
    category: Optional[str] = None
    color: Optional[str] = None
    location: Optional[str] = None
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None
    reminder_minutes: Optional[int] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None


class Event(EventBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

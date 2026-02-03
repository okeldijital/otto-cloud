from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class OfficeEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str
    status: Optional[str] = "Planned"
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    all_day: Optional[bool] = False
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[int] = None


class OfficeEventCreate(OfficeEventBase):
    pass


class OfficeEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    status: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    all_day: Optional[bool] = None
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[int] = None


class OfficeEvent(OfficeEventBase):
    id: int
    organization_id: str
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_deleted: bool

    model_config = ConfigDict(from_attributes=True)

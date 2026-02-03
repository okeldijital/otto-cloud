from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class OfficeTaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    assigned_to_user_id: Optional[int] = None
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[int] = None


class OfficeTaskCreate(OfficeTaskBase):
    pass


class OfficeTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_to_user_id: Optional[int] = None
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[int] = None


class OfficeTask(OfficeTaskBase):
    id: int
    organization_id: str
    created_by_user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_deleted: bool
    
    source_type: Optional[str] = None
    source_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

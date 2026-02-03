from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class WorkBase(BaseModel):
    work_id: Optional[str] = None
    title: str
    iswc_code: Optional[str] = None
    composers: Optional[list] = None
    composers_text: Optional[str] = None
    arrangers: Optional[list] = None
    arrangers_text: Optional[str] = None
    publisher_id: Optional[int] = None
    pro_id: Optional[int] = None


class WorkCreate(WorkBase):
    pass


class WorkUpdate(BaseModel):
    title: Optional[str] = None
    iswc_code: Optional[str] = None
    composers: Optional[list] = None
    composers_text: Optional[str] = None
    arrangers: Optional[list] = None
    arrangers_text: Optional[str] = None
    publisher_id: Optional[int] = None
    pro_id: Optional[int] = None


class Work(WorkBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

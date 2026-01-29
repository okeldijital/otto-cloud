from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LabelBase(BaseModel):
    label_id: Optional[str] = None
    name: str
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    artist_ids: Optional[list] = None


class LabelCreate(LabelBase):
    pass


class LabelUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    artist_ids: Optional[list] = None


class Label(LabelBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

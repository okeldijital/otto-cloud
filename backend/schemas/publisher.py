from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class PublisherBase(BaseModel):
    publisher_id: Optional[str] = None
    name: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    rights_type: Optional[str] = None
    artist_ids: Optional[list] = None


class PublisherCreate(PublisherBase):
    pass


class PublisherUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    rights_type: Optional[str] = None
    artist_ids: Optional[list] = None


class Publisher(PublisherBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

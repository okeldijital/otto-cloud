from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class OfficeNoteLinkBase(BaseModel):
    entity_type: str
    entity_id: int


class OfficeNoteLinkCreate(OfficeNoteLinkBase):
    pass


class OfficeNoteLink(OfficeNoteLinkBase):
    id: int
    organization_id: str
    note_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OfficeNoteBase(BaseModel):
    title: Optional[str] = None
    body: str
    tags: Optional[str] = None


class OfficeNoteCreate(OfficeNoteBase):
    pass


class OfficeNoteUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    tags: Optional[str] = None


class OfficeNote(OfficeNoteBase):
    id: int
    organization_id: str
    created_by_user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    links: List[OfficeNoteLink] = []

    model_config = ConfigDict(from_attributes=True)

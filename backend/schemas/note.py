from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NoteBase(BaseModel):
    title: str
    content: Optional[str] = None
    content_markdown: Optional[str] = None
    tags: Optional[list] = None
    category: Optional[str] = None
    color: Optional[str] = None
    pinned: Optional[bool] = False
    attachments: Optional[list] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    created_by: Optional[int] = None


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    content_markdown: Optional[str] = None
    tags: Optional[list] = None
    category: Optional[str] = None
    color: Optional[str] = None
    pinned: Optional[bool] = None
    attachments: Optional[list] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None


class Note(NoteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

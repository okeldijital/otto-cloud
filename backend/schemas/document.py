from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class DocumentBase(BaseModel):
    filename: str
    original_filename: str
    file_path: str
    file_type: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    version: Optional[int] = 1
    parent_document_id: Optional[int] = None
    organization_id: Optional[str] = None
    checksum: Optional[str] = None
    is_deleted: Optional[bool] = False
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list] = None
    category: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    uploaded_by: Optional[int] = None


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    filename: Optional[str] = None
    original_filename: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    version: Optional[int] = None
    parent_document_id: Optional[int] = None
    organization_id: Optional[str] = None
    checksum: Optional[str] = None
    is_deleted: Optional[bool] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list] = None
    category: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    uploaded_by: Optional[int] = None


class Document(DocumentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

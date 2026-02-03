from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class OfficeDocumentLinkBase(BaseModel):
    entity_type: str
    entity_id: int


class OfficeDocumentLinkCreate(OfficeDocumentLinkBase):
    pass


class OfficeDocumentLink(OfficeDocumentLinkBase):
    id: int
    organization_id: str
    document_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OfficeDocumentBase(BaseModel):
    doc_type: str
    title: Optional[str] = None
    description: Optional[str] = None


class OfficeDocumentUpdate(BaseModel):
    doc_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None


class OfficeDocument(OfficeDocumentBase):
    id: int
    organization_id: str
    storage_path: str
    storage_filename: str
    original_filename: str
    mime_type: Optional[str] = None
    file_size_bytes: int
    checksum: Optional[str] = None
    uploaded_by_user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    links: List[OfficeDocumentLink] = []

    model_config = ConfigDict(from_attributes=True)

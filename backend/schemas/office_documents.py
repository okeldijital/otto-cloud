from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class OfficeDocument(BaseModel):
    id: int
    organization_id: str
    title: Optional[str] = None
    doc_type: Optional[str] = None
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    storage_path: str
    storage_filename: str
    checksum: Optional[str] = None
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[int] = None
    notes: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_deleted: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)

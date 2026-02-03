from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import date, datetime
from schemas.contract import StatusQuoResponse


class WorksAdminDocumentBase(BaseModel):
    doc_type: str
    file_path: str
    file_name: str
    mime_type: Optional[str] = "application/pdf"
    size_bytes: Optional[int] = None
    checksum: Optional[str] = None
    uploaded_by: Optional[int] = None
    uploaded_at: Optional[datetime] = None


class WorksAdminDocumentResponse(WorksAdminDocumentBase):
    id: UUID
    works_admin_id: UUID
    organization_id: UUID
    model_config = ConfigDict(from_attributes=True)


class WorksAdminBase(BaseModel):
    registration_status: str = "Unknown"
    registered_with: Optional[str] = None
    registration_date: Optional[date] = None
    registration_reference: Optional[str] = None
    notes: Optional[str] = None


class WorksAdminCreate(WorksAdminBase):
    work_id: int


class WorksAdminUpdate(BaseModel):
    registration_status: Optional[str] = None
    registered_with: Optional[str] = None
    registration_date: Optional[date] = None
    registration_reference: Optional[str] = None
    notes: Optional[str] = None


class WorksAdminResponse(WorksAdminBase):
    id: UUID
    work_id: int
    organization_id: UUID
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    documents: List[WorksAdminDocumentResponse] = []
    status_quo: Optional[StatusQuoResponse] = None
    linked_contracts: List[Dict[str, Any]] = []
    
    model_config = ConfigDict(from_attributes=True)

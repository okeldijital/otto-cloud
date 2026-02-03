from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime


class ReportDefinitionBase(BaseModel):
    name: str
    description: Optional[str] = None
    report_type: str
    config: Dict[str, Any]


class ReportDefinitionCreate(ReportDefinitionBase):
    pass


class ReportDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    report_type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class ReportDefinition(ReportDefinitionBase):
    id: int
    organization_id: str
    created_by_user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReportRunCreate(BaseModel):
    report_type: str
    parameters: Dict[str, Any] = {}
    definition_id: Optional[int] = None


class ReportRun(BaseModel):
    id: int
    organization_id: str
    report_definition_id: Optional[int] = None
    status: str
    requested_by_user_id: int
    parameters: Dict[str, Any]
    row_count: Optional[int] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReportArtifact(BaseModel):
    id: int
    organization_id: str
    report_run_id: int
    format: str
    storage_path: str
    filename: str
    mime_type: str
    file_size_bytes: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportRunWithArtifacts(BaseModel):
    run: ReportRun
    artifacts: List[ReportArtifact]

from pydantic import BaseModel, Field, UUID4, ConfigDict
from uuid import UUID
from typing import List, Optional, Any, Dict, Union

class ContractBulkExtractRequest(BaseModel):
    contract_document_ids: List[int]
    mode: str = "v2_conservative"
    require_org_scope: bool = True

class ExtractData(BaseModel):
    version: str
    data: Dict[str, Any]

class BulkExtractResult(BaseModel):
    contract_document_id: int
    filename: Optional[str] = None
    status: str
    extract: Optional[ExtractData] = None
    error: Optional[Dict[str, Any]] = None

class BulkExtractResponse(BaseModel):
    version: str = "bulk_extract_v1"
    status: str
    job_id: str
    org_id: UUID
    results: Optional[List[BulkExtractResult]] = None
    warnings: List[str] = []
    poll_url: Optional[str] = None
    progress: Optional[Dict[str, int]] = None

class JobStatusResponse(BaseModel):
    status: str
    job_id: str
    org_id: UUID
    progress: Optional[Dict[str, int]] = None
    results: List[BulkExtractResult] = []

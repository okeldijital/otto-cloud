from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime


class StatusQuoResponse(BaseModel):
    status: str
    reasons: List[str] = []

class ContractBase(BaseModel):
    title: str
    contract_number: str
    status: str = "Draft"
    type: Optional[str] = None
    territory: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    signed_date: Optional[date] = None
    exclusivity: Optional[bool] = False
    notes: Optional[str] = None


class ContractCreate(ContractBase):
    pass


class ContractUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    territory: Optional[str] = None
    type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    signed_date: Optional[date] = None
    exclusivity: Optional[bool] = None
    notes: Optional[str] = None
    royalty_description: Optional[str] = None
    advances_amount: Optional[float] = None
    advances_currency: Optional[str] = None
    recoupment_notes: Optional[str] = None
    status_quo_override: Optional[str] = None
    contract_number: Optional[str] = None


class ContractPartyBase(BaseModel):
    entity_type: str
    entity_id: Optional[int] = None
    external_name: Optional[str] = None
    role: str
    split_percent: Optional[float] = None
    notes: Optional[str] = None


class ContractPartyCreate(ContractPartyBase):
    pass


class ContractPartyResponse(ContractPartyBase):
    id: UUID
    contract_id: UUID
    organization_id: UUID
    model_config = ConfigDict(from_attributes=True)


class ContractAssetBase(BaseModel):
    asset_type: str
    asset_id: int
    scope_type: str = "INCLUSION"
    notes: Optional[str] = None


class ContractAssetCreate(ContractAssetBase):
    pass


class ContractAssetResponse(ContractAssetBase):
    id: UUID
    contract_id: UUID
    organization_id: UUID
    model_config = ConfigDict(from_attributes=True)


class ContractDocumentBase(BaseModel):
    file_path: str
    file_name: str
    version: int = 1
    uploaded_by: Optional[int] = None
    uploaded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ContractDocumentResponse(ContractDocumentBase):
    id: UUID
    contract_id: UUID
    organization_id: UUID

    model_config = ConfigDict(from_attributes=True)


class ContractSplitBase(BaseModel):
    party_id: Optional[UUID] = None
    external_party_name: Optional[str] = None
    percent: float
    notes: Optional[str] = None


class ContractSplitCreate(ContractSplitBase):
    pass


class ContractSplitResponse(ContractSplitBase):
    id: UUID
    group_id: UUID
    organization_id: UUID
    model_config = ConfigDict(from_attributes=True)


class ContractSplitGroupBase(BaseModel):
    group_name: str
    group_type: Optional[str] = None
    notes: Optional[str] = None


class ContractSplitGroupCreate(ContractSplitGroupBase):
    pass


class ContractSplitGroupResponse(ContractSplitGroupBase):
    id: UUID
    contract_id: UUID
    organization_id: UUID
    splits: List[ContractSplitResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ContractResponse(ContractBase):
    id: UUID
    organization_id: UUID
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    royalty_description: Optional[str] = None
    advances_amount: Optional[float] = None
    advances_currency: str = "USD"
    recoupment_notes: Optional[str] = None

    parties: List[ContractPartyResponse] = []
    assets: List[ContractAssetResponse] = []
    documents: List[ContractDocumentResponse] = []
    split_groups: List[ContractSplitGroupResponse] = []
    status_quo: Optional[StatusQuoResponse] = None
    status_quo_override: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ContractDraftOverridePayload(BaseModel):
    title: Optional[str] = None
    contract_date: Optional[str] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    territory: Optional[str] = None
    notes: Optional[str] = None


class ContractCreateFromDraftRequest(BaseModel):
    draft_id: str
    overrides: ContractDraftOverridePayload = Field(default_factory=ContractDraftOverridePayload)


class ContractAttachPlanRequest(BaseModel):
    release_id: int


class ContractAttachApplyAction(BaseModel):
    type: str
    release_id: Optional[int] = None
    party_display_name: Optional[str] = None
    entity_id: Optional[int] = None


class ContractAttachApplyRequest(BaseModel):
    release_id: int
    confirm: bool = False
    overwrite: Dict[str, bool] = Field(default_factory=dict)
    actions: List[ContractAttachApplyAction] = Field(default_factory=list)


class ContractAttachApplyResponse(BaseModel):
    status: str = "applied"
    run_id: int
    contract_id: int
    release_id: int
    idempotent_hit: bool = False
    core_mutations: Dict[str, Any] = Field(default_factory=dict)
    ai_tables: Dict[str, Any] = Field(default_factory=dict)

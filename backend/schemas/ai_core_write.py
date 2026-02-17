from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from schemas.ai_contracts import ContractExtractionV1


class AICoreWriteHealthResponse(BaseModel):
    enabled_flags: Dict[str, bool]
    version: str


class AICoreWriteProposeRequest(BaseModel):
    contract_id: int
    release_id: Optional[int] = None
    contract_document_id: Optional[int] = None
    contract_extract: Optional[ContractExtractionV1] = None


class AICoreWriteProposal(BaseModel):
    item_id: Optional[int] = None
    entity_type: Literal["contract", "contract_party", "organization", "individual", "contract_document_link"]
    entity_id: Optional[int] = None
    operation: Literal["create", "patch"]
    patch: Dict[str, Any] = Field(default_factory=dict)
    conflicts: List[Dict[str, Any]] = Field(default_factory=list)
    safe_defaults: List[Dict[str, Any]] = Field(default_factory=list)
    requires_user_review: bool = True


class AICoreWriteProposeResponse(BaseModel):
    run_id: int
    proposals: List[AICoreWriteProposal] = Field(default_factory=list)
    requires_user_review: bool = True


class AICoreWriteSelection(BaseModel):
    item_id: int
    decision: Literal["accept", "ignore"] = "accept"
    overwrite: bool = False


class AICoreWriteApplyRequest(BaseModel):
    run_id: int
    confirm: bool = False
    selections: List[AICoreWriteSelection] = Field(default_factory=list)


class AICoreWriteApplyResponse(BaseModel):
    status: Literal["applied", "skipped"] = "applied"
    run_id: int
    applied_count: int = 0
    created_count: int = 0
    conflict_count: int = 0
    idempotent_hit: bool = False
    warnings: List[str] = Field(default_factory=list)

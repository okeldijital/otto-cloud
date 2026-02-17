from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class RoyaltySimulationRequest(BaseModel):
    release_id: int
    contract_document_id: Optional[int] = None
    mode: Literal["simulate"] = "simulate"
    assume_missing_parties_as_unknown: bool = True
    gross_revenue: Optional[float] = None
    units: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    persist_result: bool = True


class ComputedSplit(BaseModel):
    party_display_name: str
    party_type: str
    percent: float
    source: str
    confidence: float


class IntegrityBlock(BaseModel):
    total_equals_100: bool
    over_allocated: bool
    under_allocated: bool


class ConflictItem(BaseModel):
    type: str
    message: str
    entities: List[str] = Field(default_factory=list)


class RoyaltySimulationResponse(BaseModel):
    status: str = "ok"
    simulation_version: str
    royalty_version: str
    generated_at: str
    org_id: str
    release_id: int
    contract_document_id: Optional[int] = None
    inputs: dict = Field(default_factory=dict)
    computed_splits: List[ComputedSplit] = Field(default_factory=list)
    results: List[dict] = Field(default_factory=list)
    splits_total: float = 0.0
    integrity: IntegrityBlock
    conflicts: List[ConflictItem] = Field(default_factory=list)
    missing_flags: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    needs_review: bool = True
    persisted: bool = False
    run_id: Optional[int] = None
    idempotent_hit: bool = False

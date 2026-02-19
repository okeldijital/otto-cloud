from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


ContractStatus = Literal["draft", "active", "expired", "archived"]
ContractType = Literal["recording", "publishing", "license", "other", "unknown"]
StatusQuo = Literal["red", "amber", "green"]

CompletenessReasonCode = Literal[
    "missing_documents",
    "missing_tracks",
    "missing_parties",
    "missing_effective_date",
    "missing_territory",
    "missing_term",
]


class CompletenessReason(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: CompletenessReasonCode
    message: str
    weight: int = Field(ge=0, le=100)


class CompletenessSignals(BaseModel):
    model_config = ConfigDict(extra="forbid")

    documents: int = Field(ge=0)
    tracks: int = Field(ge=0)
    parties: int = Field(ge=0)
    effective_date: bool
    end_date_known: bool
    territory: bool
    term_present: bool


class ContractCompleteness(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal["v1"] = "v1"
    score: int = Field(ge=0, le=100)
    status_quo: StatusQuo
    color: StatusQuo = "red"
    missing: List[str] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)
    reasons: List[CompletenessReason]
    signals: CompletenessSignals


class ContractCounts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    documents: int = Field(ge=0)
    tracks: int = Field(ge=0)
    parties: int = Field(ge=0)


class PartyMemberPreview(BaseModel):
    id: int
    name: str


class PartyPreview(BaseModel):
    party_type: Optional[str] = None
    entity_id: Optional[int] = None
    artist_id: Optional[int] = None
    kind: Optional[str] = "solo"
    role: Optional[str] = None
    name: str = ""
    display: str = ""
    member_preview: List[PartyMemberPreview] = Field(default_factory=list)


class PartiesSummary(BaseModel):
    count: int = 0
    items: List[PartyPreview] = Field(default_factory=list)


class ContractListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    org_id: UUID
    status: ContractStatus
    title: str
    type: ContractType
    territory: Optional[str] = None
    effective_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    end_date_specified: bool
    created_at: datetime
    updated_at: datetime

    counts: ContractCounts
    completeness: ContractCompleteness
    dates: Optional[dict] = None
    parties_summary: Optional[PartiesSummary] = None


class PageMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    limit: int = Field(ge=1, le=200)
    offset: int = Field(ge=0)
    total: int = Field(ge=0)


class ContractsListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contracts: List[ContractListItem] = Field(default_factory=list)
    counts: dict = Field(default_factory=dict)
    meta: dict = Field(default_factory=dict)
    items: List[ContractListItem]
    page: PageMeta
    total: Optional[int] = None

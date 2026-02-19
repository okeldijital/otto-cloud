from __future__ import annotations

from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from schemas.contracts_list import ContractCompleteness


class PersistExtractDates(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contract_date: Optional[str] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    end_date: Optional[str] = None
    end_date_specified: bool


class PersistKeyTerms(BaseModel):
    model_config = ConfigDict(extra="forbid")

    territory: Optional[str] = None
    governing_law: Optional[str] = None
    term_text: Optional[str] = None
    renewal_text: Optional[str] = None


class PersistExtract(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    type: Literal["recording", "publishing", "license", "other", "unknown"] = "unknown"
    dates: PersistExtractDates
    key_terms: PersistKeyTerms = Field(default_factory=PersistKeyTerms)


class CreateFromExtractRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confirm_non_destructive: bool
    idempotency_key: str = Field(min_length=8, max_length=256)

    extract_version: Literal["v2"] = "v2"
    extract: PersistExtract

    track_ids: List[int] = Field(default_factory=list)

    create_parties: bool = False
    party_links: List[dict] = Field(default_factory=list)


class ContractOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    org_id: UUID
    status: Literal["draft", "active", "expired", "archived"]
    title: str
    type: Literal["recording", "publishing", "license", "other", "unknown"]
    territory: Optional[str] = None
    effective_date: Optional[str] = None
    end_date: Optional[str] = None
    end_date_specified: bool
    created_at: str
    updated_at: str
    overview: Optional[dict] = None


class CreateLinksOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    documents_created: int = Field(ge=0)
    tracks_linked: int = Field(ge=0)
    parties_linked: int = Field(ge=0)


class CreateFromExtractResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"] = "ok"
    created: bool
    idempotent_hit: bool = False
    org_id: UUID
    contract: ContractOut
    contract_id: Optional[int] = None
    links: CreateLinksOut
    document: Optional[dict] = None
    linked_tracks_count: Optional[int] = None
    warnings: List[str] = Field(default_factory=list)
    completeness: ContractCompleteness

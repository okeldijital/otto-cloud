from __future__ import annotations

from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ParserInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    llm_used: bool
    parser_version: str
    confidence: float = Field(ge=0.0, le=1.0)


class ExtractDates(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contract_date: Optional[str] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    end_date: Optional[str] = None
    end_date_specified: bool


class ExtractParty(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    display_name: Optional[str] = None
    role: Optional[str] = None
    entity_hint: Optional[Literal["artist", "organization", "individual", "unknown"]] = "unknown"
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: Optional[str] = None


class ExtractTrack(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    version: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class ExtractSplit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: Literal["master", "publishing", "neighboring", "other"]
    percent: float = Field(ge=0.0, le=100.0)
    party_name: str
    role: Optional[str] = None
    notes: Optional[str] = None
    evidence: Optional[str] = None


class ExtractKeyTerms(BaseModel):
    model_config = ConfigDict(extra="forbid")

    territory: Optional[str] = None
    governing_law: Optional[str] = None
    term_text: Optional[str] = None
    renewal_text: Optional[str] = None


class ContractExtractV2Data(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    type: Literal["recording", "publishing", "license", "other", "unknown"] = "unknown"
    dates: ExtractDates
    parties: List[ExtractParty] = Field(default_factory=list)
    tracks: List[ExtractTrack] = Field(default_factory=list)
    splits: List[ExtractSplit] = Field(default_factory=list)
    key_terms: ExtractKeyTerms = Field(default_factory=ExtractKeyTerms)
    warnings: List[str] = Field(default_factory=list)


class ContractExtractV2(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal["v2"] = "v2"
    parser: ParserInfo
    data: ContractExtractV2Data
    legacy_v1: Optional[dict] = None


class BulkExtractError(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    hint: Optional[str] = None
    error_id: Optional[str] = None


class BulkExtractResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # v1.1 bulk UI contract fields
    file_id: Optional[str] = None
    filename: Optional[str] = None
    ok: Optional[bool] = None

    # legacy fields (kept for compatibility)
    client_file_id: str
    sha256: str
    status: Literal["ok", "error"]
    extract: Optional[ContractExtractV2] = None
    warnings: List[str] = Field(default_factory=list)
    error: Optional[BulkExtractError] = None


class ExtractBulkResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal["bulk_extract_v1"] = "bulk_extract_v1"
    org_id: UUID
    batch_id: Optional[str] = None
    status: Optional[Literal["ok"]] = "ok"
    results: List[BulkExtractResult]

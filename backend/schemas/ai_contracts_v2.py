from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class PartyV2(BaseModel):
    display_name: str
    role: Literal["artist", "label", "remixer", "producer", "publisher", "other", "unknown"] = "unknown"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence: List[str] = Field(default_factory=list)


class SplitV2(BaseModel):
    split_type: Literal["master", "publishing", "other"] = "other"
    percent: float = Field(default=0.0, ge=0.0, le=100.0)
    party_ref: Optional[int] = None
    party_name: Optional[str] = None
    notes: Optional[str] = None
    evidence: List[str] = Field(default_factory=list)


class TrackMentionV2(BaseModel):
    title: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence: List[str] = Field(default_factory=list)


class TermV2(BaseModel):
    term_type: Literal[
        "territory",
        "exclusivity",
        "grant_of_rights",
        "termination",
        "deliverables",
        "royalty",
        "credit",
        "other",
    ] = "other"
    summary: str
    evidence: List[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ExtractionSourceV2(BaseModel):
    filename: str
    file_sha256: str
    page_count: Optional[int] = None


class ContractExtractV2(BaseModel):
    contract_title: str
    parser_version: str
    raw_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)

    effective_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    end_date_note: Optional[str] = None

    parties: List[PartyV2] = Field(default_factory=list)
    splits: List[SplitV2] = Field(default_factory=list)
    splits_total: Optional[float] = None

    tracks_mentioned: List[TrackMentionV2] = Field(default_factory=list)
    terms: List[TermV2] = Field(default_factory=list)

    source: ExtractionSourceV2

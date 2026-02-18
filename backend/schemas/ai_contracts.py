from pydantic import BaseModel, Field, AliasChoices
from typing import List, Optional
from enum import Enum
from datetime import date


class SplitTypeV1(str, Enum):
    MASTER = "MASTER"
    PUBLISHING = "PUBLISHING"
    PRODUCER = "PRODUCER"
    OTHER = "OTHER"


class ContractSplitV1(BaseModel):
    split_type: SplitTypeV1
    party_name: str
    party_role: Optional[str] = None
    percent: float = Field(..., ge=0, le=100)
    scope: Optional[str] = None
    notes: Optional[str] = None


class PartyRoleV1(str, Enum):
    LICENSOR = "Licensor"
    LICENSEE = "Licensee"
    PRODUCER = "Producer"
    ARTIST = "Artist"
    LABEL = "Label"
    PUBLISHER = "Publisher"
    OTHER = "Other"


class ContractPartyV1(BaseModel):
    display_name: str = Field(validation_alias=AliasChoices("display_name", "name"))
    role: Optional[str] = None
    aka: Optional[str] = None
    source: Optional[str] = None
    is_external: bool = True
    confidence: float = Field(default=1.0, ge=0, le=1)
    source_span: Optional[str] = None


class WorksHintsV1(BaseModel):
    artists: List[str] = []
    tracks: List[str] = []
    releases: List[str] = []


class ContractPartyV2(BaseModel):
    name: Optional[str] = None
    display_name: str
    role: Optional[str] = None
    confidence: float = 0.0
    source: Optional[str] = None


class ContractSplitV2(BaseModel):
    scope: str = "MASTER"
    percent: float
    party_display_name: Optional[str] = None
    party_role: Optional[str] = None
    notes: Optional[str] = None
    confidence: float = 0.0


class ContractDatesV2(BaseModel):
    contract_date: Optional[str] = None
    effective_date: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    expiration_date: Optional[str] = None
    end_date_specified: bool = False
    source: Optional[str] = None


class ContractTermsV2(BaseModel):
    term_min_years: Optional[int] = None
    auto_renew_years: Optional[int] = None
    reversion_years: Optional[int] = None
    term_text: Optional[str] = None
    grant_of_rights: Optional[str] = None
    territory: Optional[str] = None
    exclusivity: Optional[str] = None
    term_summary: Optional[str] = None
    renewal: Optional[str] = None
    reversion: Optional[str] = None
    governing_law: Optional[str] = None
    delivery: Optional[str] = None
    royalty_basis: Optional[str] = None
    notes: List[str] = []


class ContractWorksHintsV2(BaseModel):
    artists: List[str] = []
    tracks: List[str] = []
    releases: List[str] = []
    works: List[str] = []


class ContractIntelV2(BaseModel):
    contract_title: str
    contract_type: Optional[str] = None
    dates: ContractDatesV2
    parties: List[ContractPartyV2] = []
    splits: List[ContractSplitV2] = []
    splits_total: float = 0.0
    works_hints: ContractWorksHintsV2 = Field(default_factory=ContractWorksHintsV2)
    terms: ContractTermsV2 = Field(default_factory=ContractTermsV2)
    parser_version: str
    raw_confidence: float = 0.0
    warnings: List[str] = []


class ContractExtractionV1(BaseModel):
    # v1 fields (backward compatibility)
    contract_title: Optional[str] = None
    contract_id: Optional[str] = None
    contract_date: Optional[date] = None
    effective_date: Optional[date] = None
    start_date: Optional[date] = None
    expiration_date: Optional[date] = None
    end_date: Optional[date] = None
    territory: Optional[str] = None
    exclusivity: Optional[bool] = None
    parties: List[ContractPartyV1] = []
    tracks: List[str] = []
    splits: List[ContractSplitV1] = []
    royalties: List[ContractSplitV1] = []
    splits_total: float = 0.0
    works_hints: WorksHintsV1 = Field(default_factory=WorksHintsV1)
    raw_confidence: Optional[float] = Field(default=0.0, ge=0, le=1)
    warnings: List[str] = []
    parser_version: str = "deterministic_v1"

    # v2 fields
    contract_type: Optional[str] = None
    dates: ContractDatesV2 = Field(default_factory=ContractDatesV2)
    terms: ContractTermsV2 = Field(default_factory=ContractTermsV2)
    key_terms: List[dict] = []


class MatchProposalV1(BaseModel):
    entity_id: int
    label: str
    confidence: float
    reason: str


class ResolveRequestV1(BaseModel):
    extraction: Optional[ContractExtractionV1] = None
    contract_id: Optional[str] = None


class ResolvedContractProposalV1(BaseModel):
    proposed_artist_ids: List[MatchProposalV1] = []
    proposed_track_ids: List[MatchProposalV1] = []
    proposed_release_ids: List[MatchProposalV1] = []
    proposed_network_entity_ids: List[MatchProposalV1] = []
    needs_review: bool = True

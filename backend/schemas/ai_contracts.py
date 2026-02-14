from pydantic import BaseModel, Field
from typing import List, Optional, Dict
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
    display_name: str
    role: PartyRoleV1
    is_external: bool = True
    confidence: float = Field(default=1.0, ge=0, le=1)
    source_span: Optional[str] = None

class WorksHintsV1(BaseModel):
    artists: List[str] = []
    tracks: List[str] = []
    releases: List[str] = []

class ContractExtractionV1(BaseModel):
    contract_title: Optional[str] = None
    contract_id: Optional[str] = None
    effective_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    territory: Optional[str] = None
    exclusivity: Optional[bool] = None
    parties: List[ContractPartyV1] = []
    splits: List[ContractSplitV1] = []
    splits_total: float = 0.0
    works_hints: WorksHintsV1 = Field(default_factory=WorksHintsV1)
    raw_confidence: Optional[float] = Field(default=0.0, ge=0, le=1)
    warnings: List[str] = []
    parser_version: str = "deterministic_v1"

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

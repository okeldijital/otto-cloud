from typing import List, Literal, Optional

from pydantic import BaseModel, Field


MatchStrategy = Literal[
    "exact",
    "normalized_exact",
    "contains",
    "token_overlap",
    "heuristic_partial",
]


class MapPlanPartyV2(BaseModel):
    display_name: str
    role: Optional[str] = None
    confidence: float = 0.0


class MapPlanSplitV2(BaseModel):
    split_type: Optional[str] = None
    party_display_name: Optional[str] = None
    percent: float = 0.0
    basis: Optional[str] = None
    notes: Optional[str] = None


class MapPlanTrackV2(BaseModel):
    title: str
    artist: Optional[str] = None
    confidence: float = 0.0


class MapPlanTermV2(BaseModel):
    term_type: str
    text: str


class MapPlanExtractV2(BaseModel):
    contract_title: Optional[str] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    expiration_label: Optional[str] = None
    parties: List[MapPlanPartyV2] = Field(default_factory=list)
    splits: List[MapPlanSplitV2] = Field(default_factory=list)
    terms: List[MapPlanTermV2] = Field(default_factory=list)
    tracks: List[MapPlanTrackV2] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    raw_confidence: float = 0.0
    parser_version: Optional[str] = None


class ReleaseMapPlanRequest(BaseModel):
    release_id: int
    extract_v2: MapPlanExtractV2


class MatchedEntityRef(BaseModel):
    entity_type: Literal["artist", "organization", "individual", "track", "work"]
    id: int
    display_name: str


class ArtistMatch(BaseModel):
    extract_name: str
    matched_entity: MatchedEntityRef
    confidence: float
    strategy: MatchStrategy


class OrganizationMatch(BaseModel):
    extract_name: str
    matched_entity: MatchedEntityRef
    confidence: float
    strategy: MatchStrategy


class IndividualMatch(BaseModel):
    extract_name: str
    matched_entity: MatchedEntityRef
    confidence: float
    strategy: MatchStrategy


class TrackMatch(BaseModel):
    extract_title: str
    matched_entity: MatchedEntityRef
    confidence: float
    strategy: MatchStrategy


class WorkMatch(BaseModel):
    extract_title: str
    matched_entity: MatchedEntityRef
    confidence: float
    strategy: MatchStrategy


class MapMatches(BaseModel):
    artists: List[ArtistMatch] = Field(default_factory=list)
    organizations: List[OrganizationMatch] = Field(default_factory=list)
    individuals: List[IndividualMatch] = Field(default_factory=list)
    tracks: List[TrackMatch] = Field(default_factory=list)
    works: List[WorkMatch] = Field(default_factory=list)


class MapMissing(BaseModel):
    artists: List[str] = Field(default_factory=list)
    organizations: List[str] = Field(default_factory=list)
    individuals: List[str] = Field(default_factory=list)
    tracks: List[str] = Field(default_factory=list)
    works: List[str] = Field(default_factory=list)


class ReleaseRef(BaseModel):
    id: int
    title: str


class ReleaseMapPlanResponse(BaseModel):
    status: Literal["ok"] = "ok"
    mapping_version: Literal["map_plan_v1"] = "map_plan_v1"
    org_id: str
    release: ReleaseRef
    matches: MapMatches
    missing: MapMissing
    release_validation_flags: List[str] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)
    needs_review: bool = True

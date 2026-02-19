from typing import List, Literal, Optional

from pydantic import BaseModel, Field


MatchStrategy = Literal[
    "exact",
    "normalized_exact",
    "contains",
    "token_overlap",
    "heuristic_partial",
]


class TrackMapExtractTrack(BaseModel):
    raw_mention: str
    normalized_title: Optional[str] = None
    version_hint: Optional[str] = None
    confidence: float = 0.0


class TrackMapExtractV2(BaseModel):
    contract_title: Optional[str] = None
    tracks: List[TrackMapExtractTrack] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class TrackMapPlanRequest(BaseModel):
    contract_extract_v2: TrackMapExtractV2
    track_ids_hint: List[int] = Field(default_factory=list)
    max_results: int = Field(default=20, ge=1, le=200)


class TrackRef(BaseModel):
    id: int
    title: str
    artist_display: Optional[str] = None


class TrackCandidateMatch(BaseModel):
    track: TrackRef
    confidence: float
    strategy: MatchStrategy


class TrackCandidateBundle(BaseModel):
    extract_track: TrackMapExtractTrack
    matches: List[TrackCandidateMatch] = Field(default_factory=list)
    needs_review: bool = True


class TrackMapPlanResponse(BaseModel):
    status: Literal["ok"] = "ok"
    org_id: str
    mapping_version: Literal["track_map_v1"] = "track_map_v1"
    candidates: List[TrackCandidateBundle] = Field(default_factory=list)
    missing_tracks: List[str] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)
    release_validation_flags: List[str] = Field(default_factory=list)

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from schemas.ai_contracts import ContractExtractionV1


class ReleaseIntegrationPlanRequest(BaseModel):
    release_id: int
    contract_extract: Optional[ContractExtractionV1] = None
    extract_id: Optional[int] = None
    mode: Literal["readonly"] = "readonly"


class ReleaseRef(BaseModel):
    id: int
    title: str


class ContractSummary(BaseModel):
    contract_title: Optional[str] = None
    parties: List[str] = Field(default_factory=list)
    splits_total: float = 0.0
    warnings: List[str] = Field(default_factory=list)


class MatchedEntity(BaseModel):
    id: Optional[int] = None
    name: str
    contract_match: bool = False


class NetworkEntities(BaseModel):
    organizations: List[MatchedEntity] = Field(default_factory=list)
    individuals: List[MatchedEntity] = Field(default_factory=list)


class MatchBlock(BaseModel):
    release_artists: List[MatchedEntity] = Field(default_factory=list)
    release_tracks: List[MatchedEntity] = Field(default_factory=list)
    release_works: List[MatchedEntity] = Field(default_factory=list)
    network_entities: NetworkEntities


class MissingFlag(BaseModel):
    scope: str
    field: str
    message: str


class SuggestedAction(BaseModel):
    action: Literal["link_candidate"]
    target: Literal["artist", "track", "work", "organization", "individual"]
    candidate_id: str
    display_name: str
    confidence: float
    rationale: str


class ReleaseIntegrationPlanResponse(BaseModel):
    integration_version: str = "release_integration_v1"
    org_id: str
    release: ReleaseRef
    contract_summary: ContractSummary
    matches: MatchBlock
    missing_flags: List[MissingFlag] = Field(default_factory=list)
    suggested_actions: List[SuggestedAction] = Field(default_factory=list)
    needs_review: bool = True

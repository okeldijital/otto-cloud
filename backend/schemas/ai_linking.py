from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict
from schemas.ai_contracts import ContractExtractionV1

class EntitySuggestion(BaseModel):
    entity_type: Literal["artist", "individual", "party", "organization", "track", "work"]
    entity_id: Optional[str] = None
    display_name: str
    confidence: float
    match_strategy: Literal["exact", "normalized", "fuzzy", "alias", "contains", "initials"]
    rationale: str
    fields_matched: List[str]

class ContractLinkSuggestRequestV1(BaseModel):
    extraction: ContractExtractionV1

class ContractLinkSuggestResponseV1(BaseModel):
    linker_version: str = "link_suggest_v1.0.0"
    org_id: str
    suggestions: Dict[str, List[EntitySuggestion]] = {}
    warnings: List[str] = []
    needs_review: bool = True


class LinkDecision(BaseModel):
    entity_type: str
    entity_id: Optional[int] = None
    display_name: str # The name from the contract or chosen alias
    action: Literal["link", "ignore"]
    confidence: Optional[int] = None
    rationale: Optional[str] = None


class AIResolutionRequestV1(BaseModel):
    contract_hash: str
    extractor_version: str
    linker_version: str
    decisions: List[LinkDecision]


class AIResolutionResponseV1(BaseModel):
    status: str = "persisted"
    run_id: int

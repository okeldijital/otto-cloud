from typing import List, Literal, Optional

from pydantic import BaseModel, Field

PartyEntityType = Literal["artist", "organization", "individual", "external"]


class PartyRowInput(BaseModel):
    role: str
    entity_type: PartyEntityType
    entity_id: Optional[int] = None
    display_name: str
    split_percent: Optional[float] = None
    notes: Optional[str] = None


class SavePartiesRequest(BaseModel):
    contract_id: int
    confirm_non_destructive: bool = Field(default=False)
    parties: List[PartyRowInput]


class SavePartiesResponse(BaseModel):
    status: Literal["ok"]
    contract_id: int
    parties_saved_count: int

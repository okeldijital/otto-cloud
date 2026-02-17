from typing import Any, Dict, Optional

from pydantic import BaseModel


class ReleaseValidationPlanRequest(BaseModel):
    release_id: int
    contract_link_id: Optional[int] = None
    contract_id: Optional[int] = None
    contract_extract: Optional[Dict[str, Any]] = None


class ReleaseValidationPlanResponse(BaseModel):
    org_id: str
    release_id: int
    validation_plan: Dict[str, Any]

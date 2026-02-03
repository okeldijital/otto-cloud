from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class StatusQuoItemBase(BaseModel):
    entity_type: str
    entity_id: int
    issue_type: str
    severity: str
    summary: str
    details_json: Optional[str] = None

class StatusQuoItem(StatusQuoItemBase):
    id: int
    organization_id: UUID
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_user_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class PROBase(BaseModel):
    pro_id: Optional[str] = None
    name: str
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    territory: Optional[str] = None


class PROCreate(PROBase):
    pass


class PROUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    territory: Optional[str] = None


class PRO(PROBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

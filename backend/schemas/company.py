from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DistributorBase(BaseModel):
    name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None

class DistributorCreate(DistributorBase):
    pass

class DistributorUpdate(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None

class Distributor(DistributorBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

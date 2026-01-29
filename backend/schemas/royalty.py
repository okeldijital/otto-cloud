from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class RoyaltyBase(BaseModel):
    royalty_id: Optional[str] = None
    artist_id: Optional[int] = None
    work_id: Optional[int] = None
    track_id: Optional[int] = None
    source: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = "USD"
    statement_date: Optional[date] = None
    fees: Optional[Decimal] = None
    advances: Optional[Decimal] = None


class RoyaltyCreate(RoyaltyBase):
    pass


class RoyaltyUpdate(BaseModel):
    artist_id: Optional[int] = None
    work_id: Optional[int] = None
    track_id: Optional[int] = None
    source: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    statement_date: Optional[date] = None
    fees: Optional[Decimal] = None
    advances: Optional[Decimal] = None


class Royalty(RoyaltyBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

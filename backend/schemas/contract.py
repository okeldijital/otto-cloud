from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class ContractBase(BaseModel):
    contract_id: Optional[str] = None
    artist_id: Optional[int] = None
    label_id: Optional[int] = None
    publisher_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    royalty_rate: Optional[Decimal] = None
    terms: Optional[str] = None
    file_path: Optional[str] = None
    title: Optional[str] = None
    status: Optional[str] = None
    is_template: Optional[bool] = False


class ContractCreate(ContractBase):
    pass


class ContractUpdate(BaseModel):
    artist_id: Optional[int] = None
    label_id: Optional[int] = None
    publisher_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    royalty_rate: Optional[Decimal] = None
    terms: Optional[str] = None
    file_path: Optional[str] = None
    title: Optional[str] = None
    status: Optional[str] = None
    is_template: Optional[bool] = None


class Contract(ContractBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

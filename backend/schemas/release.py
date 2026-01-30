from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class ReleaseBase(BaseModel):
    release_id: Optional[str] = None
    title: str
    catalog_number: Optional[str] = None
    upc_code: Optional[str] = None
    release_date: Optional[date] = None
    release_type: Optional[str] = None
    cover_art_url: Optional[str] = None
    label_id: Optional[int] = None
    artist_id: Optional[int] = None
    artist_ids: Optional[List[int]] = None
    distributor_id: Optional[int] = None


class ReleaseCreate(ReleaseBase):
    pass


class ReleaseUpdate(BaseModel):
    title: Optional[str] = None
    catalog_number: Optional[str] = None
    upc_code: Optional[str] = None
    release_date: Optional[date] = None
    release_type: Optional[str] = None
    cover_art_url: Optional[str] = None
    label_id: Optional[int] = None
    artist_id: Optional[int] = None
    artist_ids: Optional[list[int]] = None
    distributor_id: Optional[int] = None


class Release(ReleaseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

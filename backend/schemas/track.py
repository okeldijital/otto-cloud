from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime, date, time
from uuid import UUID


class TrackBase(BaseModel):
    track_id: Optional[str] = None
    title: str
    duration: Optional[time] = None
    genre: Optional[str] = None
    release_date: Optional[date] = None
    isrc_code: Optional[str] = None
    streaming_link: Optional[str] = None
    artist_ids: Optional[list] = None
    file_location: Optional[str] = None
    release_id: Optional[int] = None
    work_id: Optional[int] = None
    organization_id: Optional[UUID] = None
    credits: Optional[list[dict]] = None
    secondary_release_ids: Optional[list[int]] = None



class TrackCreate(TrackBase):
    duration: time
    isrc_code: str


class TrackUpdate(BaseModel):
    title: Optional[str] = None
    duration: Optional[time] = None
    genre: Optional[str] = None
    release_date: Optional[date] = None
    isrc_code: Optional[str] = None
    streaming_link: Optional[str] = None
    artist_ids: Optional[list] = None
    file_location: Optional[str] = None
    release_id: Optional[int] = None
    work_id: Optional[int] = None
    organization_id: Optional[UUID] = None
    credits: Optional[list[dict]] = None
    secondary_release_ids: Optional[list[int]] = None


class Track(TrackBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TrackByIdsRequest(BaseModel):
    ids: list[int]


class TrackLite(BaseModel):
    id: int
    title: str


class TrackByIdsResponse(BaseModel):
    items: list[TrackLite]

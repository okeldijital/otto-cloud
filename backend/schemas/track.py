from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, time


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


class TrackCreate(TrackBase):
    pass


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


class Track(TrackBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

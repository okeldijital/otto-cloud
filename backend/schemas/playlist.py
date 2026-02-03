from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class PlaylistBase(BaseModel):
    playlist_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    track_ids: Optional[list] = None
    is_public: Optional[bool] = False
    share_link: Optional[str] = None
    play_count: Optional[int] = 0
    created_by: Optional[int] = None


class PlaylistCreate(PlaylistBase):
    pass


class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    track_ids: Optional[list] = None
    is_public: Optional[bool] = None
    share_link: Optional[str] = None
    play_count: Optional[int] = None


class Playlist(PlaylistBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

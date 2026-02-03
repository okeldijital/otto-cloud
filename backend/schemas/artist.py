from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ArtistBase(BaseModel):
    artist_id: Optional[str] = None
    name: str
    aka: Optional[str] = None  # Stage name / alias
    nationality: Optional[str] = None
    id_number: Optional[str] = None
    ipi_number: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    physical_address: Optional[str] = None
    banking_details: Optional[dict] = None
    profile_image_url: Optional[str] = None
    streaming_links: Optional[dict] = None
    social_media: Optional[dict] = None
    label_id: Optional[int] = None
    publisher_id: Optional[int] = None
    pro_id: Optional[int] = None


class ArtistCreate(ArtistBase):
    pass


class ArtistUpdate(BaseModel):
    name: Optional[str] = None
    aka: Optional[str] = None
    nationality: Optional[str] = None
    id_number: Optional[str] = None
    ipi_number: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    physical_address: Optional[str] = None
    banking_details: Optional[dict] = None
    profile_image_url: Optional[str] = None
    streaming_links: Optional[dict] = None
    social_media: Optional[dict] = None
    label_id: Optional[int] = None
    publisher_id: Optional[int] = None
    pro_id: Optional[int] = None


class Artist(ArtistBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


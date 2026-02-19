from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class ArtistMemberPreview(BaseModel):
    """Lightweight member preview for group artists."""
    id: int
    name: str
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ArtistBase(BaseModel):
    artist_id: Optional[str] = None
    name: str
    aka: Optional[str] = None  # Stage name / alias
    artist_kind: Optional[str] = "solo"  # solo | group
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
    member_ids: Optional[List[int]] = None  # For group creation


class ArtistUpdate(BaseModel):
    name: Optional[str] = None
    aka: Optional[str] = None
    artist_kind: Optional[str] = None  # solo | group
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
    member_ids: Optional[List[int]] = None  # For group membership update


class Artist(ArtistBase):
    id: int
    display_name: Optional[str] = None  # Computed property
    members: Optional[List[ArtistMemberPreview]] = None  # Group members
    member_count: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

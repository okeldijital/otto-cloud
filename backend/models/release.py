from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Text, JSON, Uuid, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Release(Base):
    """Release/Album model"""
    __tablename__ = "releases"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=True, index=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    release_id = Column(String(50), unique=True, index=True)  # M2KR0001, etc.
    title = Column(String(255), nullable=False, index=True)
    catalog_number = Column(String(50), unique=True, index=True)
    upc_code = Column(String(50), unique=True)  # Universal Product Code
    release_date = Column(Date)
    release_type = Column(String(50))  # Album, EP, Single
    cover_art_url = Column(String(500))
    
    # Foreign Keys
    label_id = Column(Integer, ForeignKey("labels.id"))
    artist_id = Column(Integer, ForeignKey("artists.id"))
    artist_ids = Column(JSON)  # Support multiple artists
    credits = Column(JSON)  # Array of {contact_id, role}
    distributor_id = Column(Integer, ForeignKey("organizations.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    label = relationship("Label", back_populates="releases")
    artist = relationship("Artist", back_populates="releases")
    distributor = relationship("Organization", back_populates="releases")
    tracks = relationship("Track", back_populates="release", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Release {self.title}>"

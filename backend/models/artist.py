from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, JSON, Uuid, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Artist(Base):
    """Artist/Songwriter model"""
    __tablename__ = "artists"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, nullable=True, index=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    artist_id = Column(String(50), unique=True, index=True)  # ART001, ART002, etc.
    name = Column(String(255), nullable=False, index=True)
    aka = Column(String(255))  # Stage name / alias
    nationality = Column(String(100))
    id_number = Column(String(100))  # National ID
    ipi_number = Column(String(50))  # Interested Parties Information number
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    physical_address = Column(Text)
    banking_details = Column(JSON)  # Encrypted/JSON {bank_name, account_number, etc.}
    profile_image_url = Column(String(500))
    streaming_links = Column(JSON)  # {spotify: url, apple_music: url, etc.}
    social_media = Column(JSON)  # {instagram: "@artist", twitter: "@artist", etc.}
    
    # Foreign Keys
    label_id = Column(Integer, ForeignKey("labels.id"))
    publisher_id = Column(Integer, ForeignKey("publishers.id"))
    pro_id = Column(Integer, ForeignKey("pros.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    label = relationship("Label", back_populates="artists")
    publisher = relationship("Publisher", back_populates="artists")
    pro = relationship("PRO", back_populates="artists")
    royalties = relationship("Royalty", back_populates="artist")
    releases = relationship("Release", back_populates="artist")
    
    @property
    def display_name(self):
        """Returns AKA (Stage Name) if set, otherwise real name"""
        return self.aka if self.aka else self.name

    def __repr__(self):
        return f"<Artist {self.display_name}>"

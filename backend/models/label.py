from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Label(Base):
    """Record Label model"""
    __tablename__ = "labels"
    
    id = Column(Integer, primary_key=True, index=True)
    label_id = Column(String(50), unique=True, index=True)  # LBL001, LBL002, etc.
    name = Column(String(255), nullable=False, index=True, unique=True)
    address = Column(Text)
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    website = Column(String(255))
    logo_url = Column(String(255))
    contact_person = Column(String(255))
    artist_ids = Column(JSON)  # Array of artist IDs
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    artists = relationship("Artist", back_populates="label")
    releases = relationship("Release", back_populates="label")
    
    def __repr__(self):
        return f"<Label {self.name}>"

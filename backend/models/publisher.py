from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Publisher(Base):
    """Music Publisher model"""
    __tablename__ = "publishers"
    
    id = Column(Integer, primary_key=True, index=True)
    publisher_id = Column(String(50), unique=True, index=True)  # PUB001, PUB002, etc.
    name = Column(String(255), nullable=False, index=True)
    address = Column(Text)
    contact_person = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    rights_type = Column(String(100))  # e.g., "Mechanical", "Synchronization", "Both"
    artist_ids = Column(JSON)  # Array of artist IDs
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    artists = relationship("Artist", back_populates="publisher")
    works = relationship("Work", back_populates="publisher")
    
    def __repr__(self):
        return f"<Publisher {self.name}>"

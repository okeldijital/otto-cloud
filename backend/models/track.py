from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Time, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Track(Base):
    """Track/Recording model"""
    __tablename__ = "tracks"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, nullable=True, index=True)
    track_id = Column(String(50), unique=True, index=True)  # TRK001, TRK002, etc.
    title = Column(String(255), nullable=False, index=True, unique=True)
    duration = Column(Time)  # Track length
    genre = Column(String(100), index=True)
    release_date = Column(Date)
    isrc_code = Column(String(50), unique=True)  # International Standard Recording Code
    streaming_link = Column(String(500))
    artist_ids = Column(JSON)  # Array of artist IDs (can have multiple artists)
    credits = Column(JSON)  # Array of {contact_id, role}
    file_location = Column(String(500))  # Path to audio file
    
    # Foreign Keys
    # Foreign Keys
    release_id = Column(Integer, ForeignKey("releases.id"))
    work_id = Column(Integer, ForeignKey("works.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    release = relationship("Release", back_populates="tracks")
    work = relationship("Work", back_populates="tracks")
    royalties = relationship("Royalty", back_populates="track", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Track {self.title}>"

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Playlist(Base):
    """Playlist model for music sharing (Reprtoir feature)"""
    __tablename__ = "playlists"
    
    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(String(50), unique=True, index=True)  # PLY001, PLY002, etc.
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    track_ids = Column(JSON)  # Array of track IDs in order
    
    # Sharing
    is_public = Column(Boolean, default=False)
    share_link = Column(String(255), unique=True)
    play_count = Column(Integer, default=0)
    
    # User tracking
    created_by = Column(Integer, ForeignKey("users.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User")
    
    def __repr__(self):
        return f"<Playlist {self.name}>"

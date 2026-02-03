from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, JSON, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Note(Base):
    """Note-taking model"""
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    content = Column(Text)  # Rich text HTML content
    content_markdown = Column(Text)  # Markdown version
    
    # Organization
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    tags = Column(JSON)  # Array of tags
    category = Column(String(100), index=True)
    color = Column(String(20))  # For color-coding
    pinned = Column(Boolean, default=False, index=True)
    
    # Attachments
    attachments = Column(JSON)  # Array of document IDs
    
    # Relations to other entities (optional)
    related_entity_type = Column(String(50))  # artist, track, contract, etc.
    related_entity_id = Column(Integer)
    
    # User tracking
    created_by = Column(Integer, ForeignKey("users.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User")
    
    def __repr__(self):
        return f"<Note {self.title}>"

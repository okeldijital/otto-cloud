from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON, Uuid, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Work(Base):
    """Musical Work/Composition model"""
    __tablename__ = "works"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, nullable=True, index=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    work_id = Column(String(50), unique=True, index=True)  # WKS001, WKS002, etc.
    title = Column(String(255), nullable=False, index=True, unique=True)
    iswc_code = Column(String(50))  # International Standard Musical Work Code
    composers = Column(JSON)  # Array of composer artist IDs
    composers_text = Column(Text)  # Text representation: "ART001, ART002"
    arrangers = Column(JSON)  # Array of arranger artist IDs
    arrangers_text = Column(Text)  # Text representation: "ART003"
    
    # Foreign Keys
    # Foreign Keys
    publisher_id = Column(Integer, ForeignKey("publishers.id"))
    pro_id = Column(Integer, ForeignKey("pros.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tracks = relationship("Track", back_populates="work")
    publisher = relationship("Publisher", back_populates="works")
    pro = relationship("PRO", back_populates="works")
    royalties = relationship("Royalty", back_populates="work")
    
    def __repr__(self):
        return f"<Work {self.title}>"

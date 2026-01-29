from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # "created", "updated", "deleted"
    entity_type = Column(String, nullable=False)  # "artist", "release", "contract", etc.
    entity_id = Column(Integer, nullable=False)
    entity_name = Column(String)  # For display purposes
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    user = relationship("User", back_populates="activities")

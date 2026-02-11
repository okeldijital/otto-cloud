from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class PRO(Base):
    """Performing Rights Organization model"""
    __tablename__ = "pros"
    
    id = Column(Integer, primary_key=True, index=True)
    pro_id = Column(String(50), unique=True, index=True)  # PRO001, PRO002, etc.
    name = Column(String(255), nullable=False, index=True, unique=True)
    address = Column(Text)
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    website = Column(String(255))
    territory = Column(String(100))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    artists = relationship("Artist", back_populates="pro")
    works = relationship("Work", back_populates="pro")
    
    def __repr__(self):
        return f"<PRO {self.name}>"

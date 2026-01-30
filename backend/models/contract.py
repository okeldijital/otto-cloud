from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Numeric, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Contract(Base):
    """Contract model"""
    __tablename__ = "contracts"
    
    id = Column(Integer, primary_key=True, index=True)
    # Foreign Keys
    artist_id = Column(Integer, ForeignKey("artists.id"))
    label_id = Column(Integer, ForeignKey("labels.id"))
    publisher_id = Column(Integer, ForeignKey("publishers.id"))
    
    # JSON Arrays for Multiple Relationships
    artist_ids = Column(JSON)
    work_ids = Column(JSON)
    release_ids = Column(JSON)
    contact_ids = Column(JSON)  # External contacts included in contract
    
    start_date = Column(Date)
    end_date = Column(Date, index=True)  # For expiration alerts
    file_path = Column(String(500))  # URL or file path to contract document
    status = Column(String(50), default="Active") # Draft, Partially Signed, Active, Expired, Terminated
    title = Column(String(255)) # Friendly name e.g. "360 Deal 2024"
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    artist = relationship("Artist", back_populates="contracts")
    label = relationship("Label", back_populates="contracts")
    publisher = relationship("Publisher", back_populates="contracts")
    
    def __repr__(self):
        return f"<Contract {self.contract_id}>"

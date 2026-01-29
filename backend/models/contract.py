from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Numeric, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Contract(Base):
    """Contract model"""
    __tablename__ = "contracts"
    
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(String(50), unique=True, index=True)  # CONT001, CONT002, etc.
    
    # Foreign Keys
    artist_id = Column(Integer, ForeignKey("artists.id"))
    label_id = Column(Integer, ForeignKey("labels.id"))
    publisher_id = Column(Integer, ForeignKey("publishers.id"))
    
    start_date = Column(Date)
    end_date = Column(Date, index=True)  # For expiration alerts
    royalty_rate = Column(Numeric(5, 2))  # Percentage: 15.50 means 15.5%
    terms = Column(Text)  # Contract terms and conditions
    file_path = Column(String(500))  # URL or file path to contract document
    status = Column(String(50), default="Active") # Draft, Active, Expired, Terminated
    title = Column(String(255)) # Friendly name e.g. "360 Deal 2024"
    is_template = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    artist = relationship("Artist", back_populates="contracts")
    label = relationship("Label", back_populates="contracts")
    publisher = relationship("Publisher", back_populates="contracts")
    
    def __repr__(self):
        return f"<Contract {self.contract_id}>"

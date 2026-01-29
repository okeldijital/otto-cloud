from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Royalty(Base):
    """Royalty Statement model"""
    __tablename__ = "royalties"
    
    id = Column(Integer, primary_key=True, index=True)
    royalty_id = Column(String(50), unique=True, index=True)  # ROY001, ROY002, etc.
    
    # Foreign Keys
    artist_id = Column(Integer, ForeignKey("artists.id"))
    work_id = Column(Integer, ForeignKey("works.id"))
    track_id = Column(Integer, ForeignKey("tracks.id"))
    
    source = Column(String(100), index=True)  # e.g., "Spotify", "Apple Music", "PRO"
    amount = Column(Numeric(15, 2))  # Royalty amount
    currency = Column(String(3), default="USD")  # ISO currency code
    statement_date = Column(Date, index=True)
    fees = Column(Numeric(15, 2))  # Deductions/fees
    advances = Column(Numeric(15, 2))  # Advance payments to deduct
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    artist = relationship("Artist", back_populates="royalties")
    work = relationship("Work", back_populates="royalties")
    track = relationship("Track", back_populates="royalties")
    
    def __repr__(self):
        return f"<Royalty {self.royalty_id} - {self.amount} {self.currency}>"

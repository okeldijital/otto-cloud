from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Company(Base):
    """Company model (formerly Distributor)"""
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(100), index=True) # Distributor, Publisher, Label, etc.
    website = Column(String(255))
    address = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    contacts = relationship("Contact", back_populates="company", cascade="all, delete-orphan")
    releases = relationship("Release", back_populates="distributor") # Keep for backward compat or update Release model
    
    def __repr__(self):
        return f"<Company {self.name}>"

class Contact(Base):
    """Contact model"""
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255), index=True)
    phone = Column(String(50))
    role = Column(String(100)) # e.g. "Distribution Manager"
    
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="contacts")
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __repr__(self):
        return f"<Contact {self.full_name}>"

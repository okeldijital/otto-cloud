from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy import Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base, SafeUuid


class AuditLog(Base):
    """Audit Log for tracking all operations"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Action details
    action = Column(String(50), index=True)  # CREATE, UPDATE, DELETE, VIEW
    entity_type = Column(String(50), index=True)  # artist, track, contract, etc.
    entity_id = Column(Integer)
    entity_uuid = Column(Integer, index=True, nullable=True) # For legacy UUID entities, now Integer
    entity_name = Column(String(255))  # For quick reference
    organization_id = Column(SafeUuid, index=True, nullable=True)
    
    # Changes
    changes = Column(JSON)  # Before/after values for updates
    
    # User and context
    user_id = Column(Integer, ForeignKey("users.id"))
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(String(500))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<AuditLog {self.action} {self.entity_type} #{self.entity_id}>"

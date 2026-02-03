from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class StatusQuoItem(Base):
    __tablename__ = "status_quo_items"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True) # artist, work, track, release, contract
    entity_id = Column(Integer, nullable=False, index=True)
    issue_type = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), nullable=False) # info, warn, critical
    summary = Column(String(255), nullable=False)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationship to user who resolved it
    resolved_by = relationship("User", foreign_keys=[resolved_by_user_id])

    def __repr__(self):
        return f"<StatusQuoItem {self.issue_type} for {self.entity_type}#{self.entity_id}>"

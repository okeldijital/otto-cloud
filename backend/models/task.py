from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Uuid, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        UniqueConstraint("organization_id", "source_type", "source_id", name="uq_task_org_source"),
    )

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    status = Column(String, default="todo")  # todo, in_progress, blocked, done
    priority = Column(String, default="medium")  # low, medium, high
    due_date = Column(DateTime, nullable=True)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    linked_entity_type = Column(String(50), nullable=True)
    linked_entity_id = Column(Integer, nullable=True)
    
    # Status Quo / External Source fields
    source_type = Column(String(50), nullable=True, index=True) # e.g., "STATUS_QUO"
    source_id = Column(Integer, nullable=True, index=True)

    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id], back_populates="tasks")
    created_by = relationship("User", foreign_keys=[created_by_user_id])

    def __repr__(self):
        return f"<Task {self.title}>"

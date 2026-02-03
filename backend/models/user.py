from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """User model for authentication and authorization"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    avatar_url = Column(String(500))  # User profile image
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(String(50), default="member")
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
        
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    # Relationships
    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="assigned_to", foreign_keys="Task.assigned_to_user_id")
    
    def __repr__(self):
        return f"<User {self.email}>"

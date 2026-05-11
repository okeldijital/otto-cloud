from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base, SafeUuid


class Organization(Base):
    """Simple Organization model"""
    __tablename__ = "organizations_simple"

    id = Column(SafeUuid, primary_key=True, default=func.gen_random_uuid())
    name = Column(String(255), nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
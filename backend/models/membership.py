from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Membership(Base):
    """User-Organization membership model"""
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    role = Column(String(50), nullable=False, default="member")

    def __repr__(self):
        return f"<Membership user_id={self.user_id} org_id={self.organization_id} role={self.role}>"
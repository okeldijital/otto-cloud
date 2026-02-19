from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Index
from sqlalchemy.sql import func
from database import Base, SafeUuid


class ArtistMembership(Base):
    """Join table linking group artists to their individual members."""
    __tablename__ = "artist_memberships"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("artists.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(Integer, ForeignKey("artists.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(SafeUuid, nullable=True, index=True)
    role = Column(String(100), nullable=True)  # e.g. "vocalist", "producer"
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('ix_membership_group_member', 'group_id', 'member_id', unique=True),
        Index('ix_membership_org_group', 'organization_id', 'group_id'),
    )

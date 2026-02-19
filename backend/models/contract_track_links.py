from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.sql import func

from database import Base, SafeUuid


class ContractTrackLink(Base):
    __tablename__ = "contract_track_links"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "contract_id",
            "track_id",
            name="uq_contract_track_link_org_contract_track",
        ),
    )

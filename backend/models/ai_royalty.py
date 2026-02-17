from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from database import Base, SafeUuid


class AIRoyaltySimulationRun(Base):
    __tablename__ = "ai_royalty_simulation_runs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    release_id = Column(Integer, nullable=False, index=True)
    contract_document_id = Column(Integer, nullable=True, index=True)
    request_hash = Column(String(64), nullable=False)
    royalty_version = Column(String(50), nullable=False)
    splits_total = Column(Float, nullable=False, default=0.0)
    integrity_total_equals_100 = Column(Boolean, nullable=False, default=False)
    integrity_over_allocated = Column(Boolean, nullable=False, default=False)
    integrity_under_allocated = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "release_id",
            "request_hash",
            name="uq_ai_royalty_run_org_release_hash",
        ),
    )

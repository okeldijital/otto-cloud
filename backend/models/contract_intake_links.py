from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base, SafeUuid


class ContractIntakeReleaseLink(Base):
    """Links an AI contract resolution run to a release without mutating core tables."""
    __tablename__ = "contract_intake_release_links"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    resolution_run_id = Column(
        Integer, ForeignKey("ai_contract_resolution_runs.id"), nullable=False, index=True
    )
    release_id = Column(Integer, ForeignKey("releases.id"), nullable=False, index=True)
    linked_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    run = relationship("AIContractResolutionRun")
    release = relationship("Release")

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "resolution_run_id",
            "release_id",
            name="uq_contract_intake_release_link_org_run_release",
        ),
    )

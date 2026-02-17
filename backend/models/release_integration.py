from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base, SafeUuid


class AIReleaseIntegrationRun(Base):
    __tablename__ = "ai_release_integration_runs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    release_id = Column(Integer, nullable=False, index=True)
    contract_id = Column(Integer, nullable=True, index=True)
    request_hash = Column(String(64), nullable=False)
    planner_version = Column(String(50), nullable=False, default="release_integration_v1")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    links = relationship("AIReleaseIntegrationLink", back_populates="run", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "release_id",
            "request_hash",
            name="uq_ai_release_integration_run_org_release_hash",
        ),
    )


class AIReleaseIntegrationLink(Base):
    __tablename__ = "ai_release_integration_links"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    run_id = Column(Integer, ForeignKey("ai_release_integration_runs.id"), nullable=False, index=True)
    entity_type = Column(String(32), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    display_name = Column(String(255), nullable=False)
    action = Column(String(32), nullable=False, index=True)
    confidence = Column(Float, nullable=True)
    match_strategy = Column(String(20), nullable=False, default="normalized")
    rationale = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    run = relationship("AIReleaseIntegrationRun", back_populates="links")

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "run_id",
            "entity_type",
            "entity_id",
            "action",
            name="uq_ai_release_integration_link_org_run_entity_action",
        ),
    )

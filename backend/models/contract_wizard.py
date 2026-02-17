from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from database import Base, SafeUuid


class AIContractDraft(Base):
    __tablename__ = "ai_contract_drafts"

    id = Column(String(64), primary_key=True, index=True)  # UUID hex
    organization_id = Column(SafeUuid, nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    source = Column(String(32), nullable=True, default="wizard")
    file_path = Column(String(1000), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)
    size_bytes = Column(Integer, nullable=False)
    extraction_json = Column(Text, nullable=False)
    suggested_defaults_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "file_hash",
            name="uq_ai_contract_drafts_org_hash",
        ),
    )


class AIContractAttachRun(Base):
    __tablename__ = "ai_contract_attach_runs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    contract_id = Column(Integer, nullable=False, index=True)
    release_id = Column(Integer, nullable=False, index=True)
    request_hash = Column(String(64), nullable=False, index=True)
    warnings_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "request_hash",
            name="uq_ai_contract_attach_runs_org_reqhash",
        ),
    )


class AIContractAttachLink(Base):
    __tablename__ = "ai_contract_attach_links"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    run_id = Column(Integer, ForeignKey("ai_contract_attach_runs.id"), nullable=False, index=True)
    action_type = Column(String(64), nullable=False, index=True)
    target_name = Column(String(255), nullable=True)
    entity_id = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=False, default=0.0)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

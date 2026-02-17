from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from database import Base, SafeUuid


class AICoreWriteProposalRun(Base):
    __tablename__ = "ai_core_write_proposal_runs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    contract_id = Column(Integer, nullable=False, index=True)
    release_id = Column(Integer, nullable=True, index=True)
    contract_document_id = Column(Integer, nullable=True, index=True)
    request_hash = Column(String(64), nullable=False, index=True)
    parser_version = Column(String(64), nullable=True)
    linker_version = Column(String(64), nullable=True)
    planner_version = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class AICoreWriteProposalItem(Base):
    __tablename__ = "ai_core_write_proposal_items"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    run_id = Column(Integer, ForeignKey("ai_core_write_proposal_runs.id"), nullable=False, index=True)
    entity_type = Column(String(64), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    operation = Column(String(16), nullable=False, index=True)  # create|patch
    patch_json = Column(Text, nullable=False)
    conflicts_json = Column(Text, nullable=True)
    safe_defaults_json = Column(Text, nullable=True)
    requires_user_review = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class AICoreWriteApplyEvent(Base):
    __tablename__ = "ai_core_write_apply_events"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    run_id = Column(Integer, ForeignKey("ai_core_write_proposal_runs.id"), nullable=False, index=True)
    request_hash = Column(String(64), nullable=False, index=True)
    status = Column(String(16), nullable=False, index=True)  # succeeded|failed|skipped
    applied_count = Column(Integer, nullable=False, default=0)
    created_count = Column(Integer, nullable=False, default=0)
    conflict_count = Column(Integer, nullable=False, default=0)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

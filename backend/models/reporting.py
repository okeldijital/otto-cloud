from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.sql import func
from database import Base


class ReportDefinition(Base):
    __tablename__ = "report_definitions"
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_report_definitions_org_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    report_type = Column(String(100), nullable=False, index=True)
    config_json = Column(Text, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ReportRun(Base):
    __tablename__ = "report_runs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    report_definition_id = Column(Integer, ForeignKey("report_definitions.id"), nullable=True, index=True)
    status = Column(String(50), nullable=False, index=True)
    requested_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parameters_json = Column(Text, nullable=False)
    row_count = Column(Integer, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ReportArtifact(Base):
    __tablename__ = "report_artifacts"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    report_run_id = Column(Integer, ForeignKey("report_runs.id"), nullable=False, index=True)
    format = Column(String(10), nullable=False)
    storage_path = Column(String(500), nullable=False)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

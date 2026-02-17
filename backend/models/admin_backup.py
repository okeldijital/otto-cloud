from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from database import Base, SafeUuid


class AdminBackupArtifact(Base):
    __tablename__ = "admin_backup_artifacts"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    backup_kind = Column(String(32), nullable=False, default="uploaded", index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(1000), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False, index=True)
    is_pre_restore_snapshot = Column(Boolean, nullable=False, default=False, index=True)
    source_backup_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "sha256",
            name="uq_admin_backup_artifact_org_sha256",
        ),
    )


class AdminRestoreAudit(Base):
    __tablename__ = "admin_restore_audit"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    backup_id = Column(Integer, nullable=False, index=True)
    pre_restore_snapshot_id = Column(Integer, nullable=True, index=True)
    request_hash = Column(String(64), nullable=False, index=True)
    result = Column(String(16), nullable=False, index=True)
    error_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

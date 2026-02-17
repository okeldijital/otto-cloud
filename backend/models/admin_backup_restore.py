from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from database import Base, SafeUuid


class AdminBackupRestoreEvent(Base):
    __tablename__ = "admin_backup_restore_events"

    id = Column(Integer, primary_key=True, index=True)
    backup_id = Column(Integer, nullable=False, index=True)
    snapshot_backup_id = Column(Integer, nullable=True, index=True)
    initiator_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    initiator_org_id = Column(SafeUuid, nullable=False, index=True)
    status = Column(String(16), nullable=False, index=True)
    error = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

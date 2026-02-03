import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Integer, Uuid, Date, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class WorksAdmin(Base):
    """Works Administration / Proof of Registration"""
    __tablename__ = "works_admin"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(Uuid(as_uuid=True), nullable=False)
    
    work_id = Column(Integer, ForeignKey("works.id"), nullable=False)
    
    registration_status = Column(String(50), default="Unknown", nullable=False) # Unknown, Submitted, Registered, Rejected
    registered_with = Column(String(255), nullable=True) # PRO/publisher/registry name
    registration_date = Column(Date, nullable=True)
    registration_reference = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_by = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    work = relationship("Work", backref="admin_record")
    documents = relationship("WorksAdminDocument", back_populates="works_admin", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_works_admin_org_work', 'organization_id', 'work_id', unique=True),
    )


class WorksAdminDocument(Base):
    """Documents for Works Administration proof"""
    __tablename__ = "works_admin_documents"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    works_admin_id = Column(Uuid(as_uuid=True), ForeignKey("works_admin.id"), nullable=False)
    
    doc_type = Column(String(100), nullable=False) # RegistrationProof, SplitsSheet, etc.
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), default="application/pdf")
    size_bytes = Column(Integer, nullable=True)
    checksum = Column(String(64), nullable=True)
    
    uploaded_by = Column(Integer)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    works_admin = relationship("WorksAdmin", back_populates="documents")

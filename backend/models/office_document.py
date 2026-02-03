from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, BigInteger, UniqueConstraint, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class OfficeDocument(Base):
    __tablename__ = "office_documents"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    doc_type = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    storage_path = Column(String(500), nullable=False)
    storage_filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=True)
    file_size_bytes = Column(BigInteger, nullable=False)
    checksum = Column(String(64), nullable=True)
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    links = relationship("OfficeDocumentLink", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<OfficeDocument {self.id}>"


class OfficeDocumentLink(Base):
    __tablename__ = "office_document_links"
    __table_args__ = (
        UniqueConstraint("document_id", "entity_type", "entity_id", name="uq_office_document_links_document_entity"),
    )

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("office_documents.id"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("OfficeDocument", back_populates="links")

    def __repr__(self):
        return f"<OfficeDocumentLink {self.document_id}:{self.entity_type}:{self.entity_id}>"

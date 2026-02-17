from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base, SafeUuid


class AIContractDocument(Base):
    __tablename__ = "ai_contract_documents"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    release_id = Column(Integer, nullable=False, index=True)
    file_path = Column(String(1000), nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    work_links = relationship("AIContractWorkLink", back_populates="contract_document", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "release_id",
            "file_hash",
            name="uq_ai_contract_document_org_release_hash",
        ),
    )


class AIContractWorkLink(Base):
    __tablename__ = "ai_contract_work_links"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    contract_document_id = Column(
        Integer,
        ForeignKey("ai_contract_documents.id"),
        nullable=False,
        index=True,
    )
    work_id = Column(Integer, nullable=False, index=True)
    confidence = Column(Float, nullable=False, default=0.0)
    match_strategy = Column(String(20), nullable=False, default="normalized")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    contract_document = relationship("AIContractDocument", back_populates="work_links")

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "contract_document_id",
            "work_id",
            name="uq_ai_contract_work_link_org_doc_work",
        ),
    )

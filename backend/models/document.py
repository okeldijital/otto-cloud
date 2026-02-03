from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, BigInteger, JSON, Boolean, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Document(Base):
    """Document Management model"""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), index=True)  # pdf, docx, xlsx, jpg, mp3, etc.
    mime_type = Column(String(100))
    file_size = Column(BigInteger)  # Size in bytes
    version = Column(Integer, default=1)
    parent_document_id = Column(Integer, ForeignKey("documents.id"))  # For versioning

    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    checksum = Column(String(64))
    is_deleted = Column(Boolean, nullable=False, default=False)
    
    # Metadata
    title = Column(String(255))
    description = Column(Text)
    tags = Column(JSON)  # Array of tags
    category = Column(String(100), index=True)
    
    # Relations to other entities (optional)
    related_entity_type = Column(String(50))  # artist, track, contract, etc.
    related_entity_id = Column(Integer)
    
    # User tracking
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    parent_document = relationship("Document", remote_side=[id], backref="versions")
    uploader = relationship("User")
    
    def __repr__(self):
        return f"<Document {self.filename}>"

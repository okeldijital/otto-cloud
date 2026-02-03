from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class OfficeNote(Base):
    __tablename__ = "office_notes"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    body = Column(Text, nullable=False)
    tags = Column(String(255), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    links = relationship("OfficeNoteLink", back_populates="note", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<OfficeNote {self.id}>"


class OfficeNoteLink(Base):
    __tablename__ = "office_note_links"
    __table_args__ = (
        UniqueConstraint("note_id", "entity_type", "entity_id", name="uq_office_note_links_note_entity"),
    )

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    note_id = Column(Integer, ForeignKey("office_notes.id"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    note = relationship("OfficeNote", back_populates="links")

    def __repr__(self):
        return f"<OfficeNoteLink {self.note_id}:{self.entity_type}:{self.entity_id}>"

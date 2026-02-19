from sqlalchemy.orm import Session
from models.document import Document
from uuid import UUID

def create_document(
    db: Session,
    filename: str,  # Logic: unique filename
    original_filename: str,
    file_path: str,
    file_type: str,
    mime_type: str,
    file_size: int,
    organization_id: UUID,  # Can be UUID or SafeUuid (int) depending on context
    uploaded_by: int,
    category: str = "contract",
    title: str = None
) -> Document:
    """
    Create and persist a Document record.
    Moved here to respect governance rules on AI routes performing direct DB writes.
    """
    doc = Document(
        filename=filename,
        original_filename=original_filename,
        file_path=file_path,
        file_type=file_type,
        mime_type=mime_type,
        file_size=file_size,
        organization_id=organization_id,
        uploaded_by=uploaded_by,
        category=category,
        title=title or original_filename
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import uuid4, UUID
import os
import hashlib

from database import get_db
from dependencies import get_current_active_user, get_current_organization_id
from models.user import User
from models.task import Task
from models.contract import Contract
from models.office_document import OfficeDocument, OfficeDocumentLink
from models.office_note import OfficeNote
from config import settings
from core.audit import log_create, log_delete, log_download, log_update, log_link, log_unlink
from schemas.office_documents_v2 import (
    OfficeDocument as OfficeDocumentSchema,
    OfficeDocumentUpdate,
    OfficeDocumentLink as OfficeDocumentLinkSchema,
    OfficeDocumentLinkCreate,
)

router = APIRouter()

DOC_TYPES = [
    "contract",
    "registration_proof",
    "invoice",
    "report",
    "other",
]

ENTITY_TYPES = ["artist", "track", "release", "work", "contract", "task", "note"]


def _require_viewer(current_user: User = Depends(get_current_active_user)) -> User:
    return current_user


def _require_editor(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role not in ("admin", "staff") and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="documents_editor_required")
    return current_user


def _require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="documents_admin_required")
    return current_user


def _sanitize_filename(filename: str) -> str:
    return os.path.basename(filename).replace("\x00", "")


def _save_upload(org_id: UUID, file: UploadFile) -> tuple[str, str, int, Optional[str]]:
    original_name = _sanitize_filename(file.filename or "document")
    ext = original_name.split(".")[-1].lower() if "." in original_name else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="file_extension_not_allowed")

    storage_dir = os.path.join(settings.UPLOAD_DIR, "office_documents", str(org_id))
    os.makedirs(storage_dir, exist_ok=True)

    storage_filename = f"{uuid4()}_{original_name}"
    dest_path = os.path.join(storage_dir, storage_filename)

    checksum = hashlib.sha256()
    try:
        with open(dest_path, "wb") as buffer:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                checksum.update(chunk)
                buffer.write(chunk)
    finally:
        file.file.close()

    file_size = os.path.getsize(dest_path)
    storage_path = dest_path.replace(settings.UPLOAD_DIR, "/uploads")
    return storage_path, storage_filename, file_size, checksum.hexdigest()


def _to_doc(doc: OfficeDocument) -> OfficeDocumentSchema:
    return OfficeDocumentSchema(
        id=doc.id,
        organization_id=str(doc.organization_id),
        doc_type=doc.doc_type,
        title=doc.title,
        description=doc.description,
        storage_path=doc.storage_path,
        storage_filename=doc.storage_filename,
        original_filename=doc.original_filename,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        checksum=doc.checksum,
        uploaded_by_user_id=doc.uploaded_by_user_id,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        links=[OfficeDocumentLinkSchema.model_validate(link) for link in doc.links],
    )


def _validate_link_entity(db: Session, org_id: UUID, entity_type: str, entity_id: int) -> None:
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="invalid_entity_type")
    if entity_type == "task":
        task = db.query(Task).filter(Task.id == entity_id).first()
        if not task or task.organization_id != org_id:
            raise HTTPException(status_code=400, detail="cross_org_link_forbidden")
    if entity_type == "contract":
        contract = db.query(Contract).filter(Contract.id == entity_id).first()
        if not contract or contract.organization_id != org_id:
            raise HTTPException(status_code=400, detail="cross_org_link_forbidden")
    if entity_type == "note":
        note = db.query(OfficeNote).filter(OfficeNote.id == entity_id).first()
        if not note or note.organization_id != org_id:
            raise HTTPException(status_code=400, detail="cross_org_link_forbidden")


@router.get("/office/documents", response_model=List[OfficeDocumentSchema])
def list_office_documents(
    q: Optional[str] = None,
    doc_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    query = db.query(OfficeDocument).filter(OfficeDocument.organization_id == org_id)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(OfficeDocument.title.ilike(like), OfficeDocument.original_filename.ilike(like)))
    if doc_type:
        query = query.filter(OfficeDocument.doc_type == doc_type)
    if entity_type and entity_id is not None:
        query = query.join(OfficeDocumentLink).filter(
            OfficeDocumentLink.entity_type == entity_type,
            OfficeDocumentLink.entity_id == entity_id,
        )
    documents = query.order_by(OfficeDocument.created_at.desc()).all()
    return [_to_doc(doc) for doc in documents]


@router.post("/office/documents", response_model=OfficeDocumentSchema, status_code=status.HTTP_201_CREATED)
async def upload_office_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    if doc_type not in DOC_TYPES:
        raise HTTPException(status_code=400, detail="invalid_doc_type")

    storage_path, storage_filename, file_size, checksum = _save_upload(org_id, file)
    db_document = OfficeDocument(
        organization_id=org_id,
        doc_type=doc_type,
        title=title,
        description=description,
        storage_path=storage_path,
        storage_filename=storage_filename,
        original_filename=_sanitize_filename(file.filename or storage_filename),
        mime_type=file.content_type or "application/octet-stream",
        file_size_bytes=file_size,
        checksum=checksum,
        uploaded_by_user_id=current_user.id,
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    log_create(
        db,
        "document",
        db_document.id,
        current_user.id,
        org_id,
        changes={"document": db_document.original_filename, "doc_type": doc_type},
        entity_name=title or db_document.original_filename,
    )

    return _to_doc(db_document)


@router.get("/office/documents/{document_id}", response_model=OfficeDocumentSchema)
def get_office_document(
    document_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    doc = db.query(OfficeDocument).filter(
        OfficeDocument.id == document_id,
        OfficeDocument.organization_id == org_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return _to_doc(doc)


@router.patch("/office/documents/{document_id}", response_model=OfficeDocumentSchema)
def update_office_document(
    document_id: int,
    payload: OfficeDocumentUpdate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    doc = db.query(OfficeDocument).filter(
        OfficeDocument.id == document_id,
        OfficeDocument.organization_id == org_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    before = {"title": doc.title, "description": doc.description, "doc_type": doc.doc_type}
    update_data = payload.model_dump(exclude_unset=True)
    if "doc_type" in update_data and update_data["doc_type"] not in DOC_TYPES:
        raise HTTPException(status_code=400, detail="invalid_doc_type")
    for field, value in update_data.items():
        setattr(doc, field, value)
    db.commit()
    db.refresh(doc)

    after = {"title": doc.title, "description": doc.description, "doc_type": doc.doc_type}
    log_update(
        db,
        "document",
        doc.id,
        current_user.id,
        org_id,
        changes={"before": before, "after": after},
        entity_name=doc.title or doc.original_filename,
    )

    return _to_doc(doc)


@router.delete("/office/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_office_document(
    document_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_admin),
):
    doc = db.query(OfficeDocument).filter(
        OfficeDocument.id == document_id,
        OfficeDocument.organization_id == org_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc_title = doc.title
    db.delete(doc)
    db.commit()

    log_delete(
        db,
        "document",
        document_id,
        current_user.id,
        org_id,
        changes={"document": doc.original_filename},
        entity_name=doc_title or doc.original_filename,
    )

    return None


def _resolve_file_path(doc: OfficeDocument) -> str:
    return doc.storage_path.replace("/uploads", settings.UPLOAD_DIR)


@router.get("/office/documents/{document_id}/download")
def download_office_document(
    document_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    doc = db.query(OfficeDocument).filter(
        OfficeDocument.id == document_id,
        OfficeDocument.organization_id == org_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    real_path = _resolve_file_path(doc)
    if not os.path.isfile(real_path):
        raise HTTPException(status_code=404, detail="File missing on disk")

    log_download(
        db,
        "document",
        doc.id,
        current_user.id,
        org_id,
        changes={"document": doc.original_filename},
        entity_name=doc.title or doc.original_filename,
    )

    return FileResponse(real_path, filename=doc.original_filename, media_type=doc.mime_type)


@router.get("/office/documents/{document_id}/preview")
def preview_office_document(
    document_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    doc = db.query(OfficeDocument).filter(
        OfficeDocument.id == document_id,
        OfficeDocument.organization_id == org_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    real_path = _resolve_file_path(doc)
    if not os.path.isfile(real_path):
        raise HTTPException(status_code=404, detail="File missing on disk")

    return FileResponse(real_path, filename=doc.original_filename, media_type=doc.mime_type)


@router.post("/office/documents/{document_id}/links", response_model=OfficeDocumentLinkSchema, status_code=status.HTTP_201_CREATED)
def link_office_document(
    document_id: int,
    payload: OfficeDocumentLinkCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    doc = db.query(OfficeDocument).filter(
        OfficeDocument.id == document_id,
        OfficeDocument.organization_id == org_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    _validate_link_entity(db, org_id, payload.entity_type, payload.entity_id)

    existing = db.query(OfficeDocumentLink).filter(
        OfficeDocumentLink.document_id == document_id,
        OfficeDocumentLink.entity_type == payload.entity_type,
        OfficeDocumentLink.entity_id == payload.entity_id,
    ).first()
    if existing:
        return OfficeDocumentLinkSchema.model_validate(existing)

    link = OfficeDocumentLink(
        organization_id=org_id,
        document_id=document_id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    log_link(
        db,
        "document",
        document_id,
        current_user.id,
        org_id,
        changes={"entity_type": payload.entity_type, "entity_id": payload.entity_id},
        entity_name=doc.title or doc.original_filename,
    )

    return OfficeDocumentLinkSchema.model_validate(link)


@router.delete("/office/documents/{document_id}/links", status_code=status.HTTP_204_NO_CONTENT)
def unlink_office_document(
    document_id: int,
    payload: OfficeDocumentLinkCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    link = db.query(OfficeDocumentLink).filter(
        OfficeDocumentLink.document_id == document_id,
        OfficeDocumentLink.entity_type == payload.entity_type,
        OfficeDocumentLink.entity_id == payload.entity_id,
        OfficeDocumentLink.organization_id == org_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    db.delete(link)
    db.commit()

    log_unlink(
        db,
        "document",
        document_id,
        current_user.id,
        org_id,
        changes={"entity_type": payload.entity_type, "entity_id": payload.entity_id},
        entity_name=f"Document {document_id}",
    )

    return None

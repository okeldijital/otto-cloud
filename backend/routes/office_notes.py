from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import UUID

from database import get_db
from dependencies import get_current_active_user, get_current_organization_id
from models.user import User
from models.task import Task
from models.contract import Contract
from models.office_note import OfficeNote, OfficeNoteLink
from core.audit import log_create, log_delete, log_update, log_link, log_unlink
from schemas.office_notes import (
    OfficeNote as OfficeNoteSchema,
    OfficeNoteCreate,
    OfficeNoteUpdate,
    OfficeNoteLink as OfficeNoteLinkSchema,
    OfficeNoteLinkCreate,
)

router = APIRouter()

ENTITY_TYPES = ["artist", "track", "release", "work", "contract", "task"]


def _require_viewer(current_user: User = Depends(get_current_active_user)) -> User:
    return current_user


def _require_editor(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role not in ("admin", "staff") and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="notes_editor_required")
    return current_user


def _require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="notes_admin_required")
    return current_user


def _to_note(note: OfficeNote) -> OfficeNoteSchema:
    return OfficeNoteSchema(
        id=note.id,
        organization_id=str(note.organization_id),
        title=note.title,
        body=note.body,
        tags=note.tags,
        created_by_user_id=note.created_by_user_id,
        created_at=note.created_at,
        updated_at=note.updated_at,
        links=[OfficeNoteLinkSchema.model_validate(link) for link in note.links],
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


@router.get("/office/notes", response_model=List[OfficeNoteSchema])
def list_office_notes(
    q: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    query = db.query(OfficeNote).filter(OfficeNote.organization_id == org_id)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(OfficeNote.title.ilike(like), OfficeNote.body.ilike(like)))
    if entity_type and entity_id is not None:
        query = query.join(OfficeNoteLink).filter(
            OfficeNoteLink.entity_type == entity_type,
            OfficeNoteLink.entity_id == entity_id,
        )
    notes = query.order_by(OfficeNote.created_at.desc()).all()
    return [_to_note(note) for note in notes]


@router.post("/office/notes", response_model=OfficeNoteSchema, status_code=status.HTTP_201_CREATED)
def create_office_note(
    payload: OfficeNoteCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    if not payload.body:
        raise HTTPException(status_code=400, detail="body_required")
    note = OfficeNote(
        organization_id=org_id,
        title=payload.title,
        body=payload.body,
        tags=payload.tags,
        created_by_user_id=current_user.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_create(
        db,
        "note",
        note.id,
        current_user.id,
        org_id,
        changes={"title": note.title, "body": note.body},
        entity_name=note.title or f"Note {note.id}",
    )

    return _to_note(note)


@router.get("/office/notes/{note_id}", response_model=OfficeNoteSchema)
def get_office_note(
    note_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_viewer),
):
    note = db.query(OfficeNote).filter(
        OfficeNote.id == note_id,
        OfficeNote.organization_id == org_id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return _to_note(note)


@router.patch("/office/notes/{note_id}", response_model=OfficeNoteSchema)
def update_office_note(
    note_id: int,
    payload: OfficeNoteUpdate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    note = db.query(OfficeNote).filter(
        OfficeNote.id == note_id,
        OfficeNote.organization_id == org_id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    before = {"title": note.title, "body": note.body, "tags": note.tags}
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(note, field, value)
    db.commit()
    db.refresh(note)

    after = {"title": note.title, "body": note.body, "tags": note.tags}
    log_update(
        db,
        "note",
        note.id,
        current_user.id,
        org_id,
        changes={"before": before, "after": after},
        entity_name=note.title or f"Note {note.id}",
    )

    return _to_note(note)


@router.delete("/office/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_office_note(
    note_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_admin),
):
    note = db.query(OfficeNote).filter(
        OfficeNote.id == note_id,
        OfficeNote.organization_id == org_id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note_title = note.title
    db.delete(note)
    db.commit()

    log_delete(
        db,
        "note",
        note_id,
        current_user.id,
        org_id,
        changes={"title": note_title},
        entity_name=note_title or f"Note {note_id}",
    )

    return None


@router.post("/office/notes/{note_id}/links", response_model=OfficeNoteLinkSchema, status_code=status.HTTP_201_CREATED)
def link_office_note(
    note_id: int,
    payload: OfficeNoteLinkCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    note = db.query(OfficeNote).filter(
        OfficeNote.id == note_id,
        OfficeNote.organization_id == org_id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    _validate_link_entity(db, org_id, payload.entity_type, payload.entity_id)

    existing = db.query(OfficeNoteLink).filter(
        OfficeNoteLink.note_id == note_id,
        OfficeNoteLink.entity_type == payload.entity_type,
        OfficeNoteLink.entity_id == payload.entity_id,
    ).first()
    if existing:
        return OfficeNoteLinkSchema.model_validate(existing)

    link = OfficeNoteLink(
        organization_id=org_id,
        note_id=note_id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    log_link(
        db,
        "note",
        note_id,
        current_user.id,
        org_id,
        changes={"entity_type": payload.entity_type, "entity_id": payload.entity_id},
        entity_name=note.title or f"Note {note_id}",
    )

    return OfficeNoteLinkSchema.model_validate(link)


@router.delete("/office/notes/{note_id}/links", status_code=status.HTTP_204_NO_CONTENT)
def unlink_office_note(
    note_id: int,
    payload: OfficeNoteLinkCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(_require_editor),
):
    link = db.query(OfficeNoteLink).filter(
        OfficeNoteLink.note_id == note_id,
        OfficeNoteLink.entity_type == payload.entity_type,
        OfficeNoteLink.entity_id == payload.entity_id,
        OfficeNoteLink.organization_id == org_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    db.delete(link)
    db.commit()

    log_unlink(
        db,
        "note",
        note_id,
        current_user.id,
        org_id,
        changes={"entity_type": payload.entity_type, "entity_id": payload.entity_id},
        entity_name=f"Note {note_id}",
    )

    return None

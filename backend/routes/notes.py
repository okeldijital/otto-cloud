from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from database import get_db
from models.user import User
from models.note import Note as NoteModel
from schemas.note import Note, NoteCreate, NoteUpdate
from dependencies import get_current_active_user, get_current_organization_id
from utils.activity import log_activity

router = APIRouter()


@router.get("", response_model=List[Note])
def list_notes(
    q: Optional[str] = None,
    tag: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """List all notes scoped to organization"""
    query = db.query(NoteModel).filter(
        NoteModel.organization_id == org_id,
        NoteModel.is_deleted == False
    )
    
    if q:
        query = query.filter(NoteModel.title.ilike(f"%{q}%"))
    if tag:
        # Assuming tags is a JSON array
        query = query.filter(NoteModel.tags.contains([tag]))
    if category:
        query = query.filter(NoteModel.category == category)
        
    notes = query.order_by(NoteModel.pinned.desc(), NoteModel.updated_at.desc()).offset(skip).limit(limit).all()
    return notes


@router.post("", response_model=Note, status_code=status.HTTP_201_CREATED)
def create_note(
    note: NoteCreate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new note within organization"""
    db_note = NoteModel(**note.model_dump(exclude={"organization_id", "created_by"}))
    db_note.organization_id = org_id
    db_note.created_by = current_user.id
    
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    
    log_activity(db, current_user.id, "created", "note", db_note.id, db_note.title)
    
    return db_note


@router.get("/{note_id}", response_model=Note)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific note by ID, scoped to organization"""
    note = db.query(NoteModel).filter(
        NoteModel.id == note_id,
        NoteModel.organization_id == org_id,
        NoteModel.is_deleted == False
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}", response_model=Note)
def update_note(
    note_id: int,
    note_update: NoteUpdate,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Update a note within organization"""
    db_note = db.query(NoteModel).filter(
        NoteModel.id == note_id,
        NoteModel.organization_id == org_id,
        NoteModel.is_deleted == False
    ).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_data = note_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_note, field, value)
    
    db.commit()
    db.refresh(db_note)
    
    log_activity(db, current_user.id, "updated", "note", db_note.id, db_note.title)
    
    return db_note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    org_id: UUID = Depends(get_current_organization_id),
    current_user: User = Depends(get_current_active_user)
):
    """Soft-delete a note within organization"""
    db_note = db.query(NoteModel).filter(
        NoteModel.id == note_id,
        NoteModel.organization_id == org_id,
        NoteModel.is_deleted == False
    ).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db_note.is_deleted = True
    db.commit()
    
    log_activity(db, current_user.id, "deleted", "note", note_id, db_note.title)
    
    return None

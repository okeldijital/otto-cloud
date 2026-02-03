from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from models.note import Note as NoteModel
from schemas.note import Note, NoteCreate, NoteUpdate
from dependencies import get_current_active_user
from utils.activity import log_activity

router = APIRouter()


@router.get("", response_model=List[Note])
def list_notes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all notes"""
    notes = db.query(NoteModel).offset(skip).limit(limit).all()
    return notes


@router.post("", response_model=Note, status_code=status.HTTP_201_CREATED)
def create_note(
    note: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new note"""
    db_note = NoteModel(**note.model_dump())
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
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific note by ID"""
    note = db.query(NoteModel).filter(NoteModel.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}", response_model=Note)
def update_note(
    note_id: int,
    note_update: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a note"""
    db_note = db.query(NoteModel).filter(NoteModel.id == note_id).first()
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
    current_user: User = Depends(get_current_active_user)
):
    """Delete a note"""
    db_note = db.query(NoteModel).filter(NoteModel.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note_title = db_note.title
    try:
        db.delete(db_note)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Could not delete note: {str(e)}")
    
    log_activity(db, current_user.id, "deleted", "note", note_id, note_title)
    
    return None

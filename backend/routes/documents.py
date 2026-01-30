from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from models.document import Document as DocumentModel
from schemas.document import Document, DocumentCreate, DocumentUpdate
from dependencies import get_current_active_user
from fastapi import File, UploadFile
import shutil
import os
from config import settings
import uuid
from utils.activity import log_activity

router = APIRouter()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a file to the server"""
    # Create valid filename
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File extension not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # Generate unique filename to avoid collisions
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
        
    # Return file info
    return {
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_path": f"/uploads/{unique_filename}",
        "file_size": os.path.getsize(file_path),
        "content_type": file.content_type
    }


@router.get("/", response_model=List[Document])
def list_documents(
    skip: int = 0,
    limit: int = 100,
    category: str = None,
    entity_type: str = None,
    entity_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all documents with optional filtering"""
    query = db.query(DocumentModel)
    
    if category:
        query = query.filter(DocumentModel.category == category)
    if entity_type:
        query = query.filter(DocumentModel.related_entity_type == entity_type)
    if entity_id:
        query = query.filter(DocumentModel.related_entity_id == entity_id)
        
    documents = query.offset(skip).limit(limit).all()
    return documents


@router.post("/", response_model=Document, status_code=status.HTTP_201_CREATED)
def create_document(
    document: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new document"""
    db_document = DocumentModel(**document.model_dump())
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    log_activity(db, current_user.id, "created", "document", db_document.id, db_document.title)
    
    return db_document


@router.get("/{document_id}", response_model=Document)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific document by ID"""
    document = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.put("/{document_id}", response_model=Document)
def update_document(
    document_id: int,
    document_update: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a document"""
    db_document = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_data = document_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_document, field, value)
    
    db.commit()
    db.refresh(db_document)
    
    log_activity(db, current_user.id, "updated", "document", db_document.id, db_document.title)
    
    return db_document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a document"""
    db_document = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc_title = db_document.title
    db.delete(db_document)
    db.commit()
    
    log_activity(db, current_user.id, "deleted", "document", document_id, doc_title)
    
    return None

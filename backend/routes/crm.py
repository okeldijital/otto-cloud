from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from models.crm import Company as CompanyModel, Contact as ContactModel
from schemas.crm import Company, CompanyCreate, CompanyUpdate, Contact, ContactCreate, ContactUpdate
from routes.auth import get_current_active_user

router = APIRouter()

# ==================== COMPANIES ====================

@router.get("/companies", response_model=List[Company])
def list_companies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all companies"""
    return db.query(CompanyModel).offset(skip).limit(limit).all()

@router.post("/companies", response_model=Company, status_code=status.HTTP_201_CREATED)
def create_company(
    company: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new company"""
    db_company = CompanyModel(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@router.get("/companies/{company_id}", response_model=Company)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific company by ID"""
    company = db.query(CompanyModel).filter(CompanyModel.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.put("/companies/{company_id}", response_model=Company)
def update_company(
    company_id: int,
    company_update: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a company"""
    db_company = db.query(CompanyModel).filter(CompanyModel.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    update_data = company_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_company, field, value)
    
    db.commit()
    db.refresh(db_company)
    return db_company

@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a company"""
    db_company = db.query(CompanyModel).filter(CompanyModel.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    db.delete(db_company)
    db.commit()
    return None

# ==================== CONTACTS ====================

@router.get("/contacts", response_model=List[Contact])
def list_contacts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all contacts"""
    return db.query(ContactModel).offset(skip).limit(limit).all()

@router.post("/contacts", response_model=Contact, status_code=status.HTTP_201_CREATED)
def create_contact(
    contact: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new contact"""
    db_contact = ContactModel(**contact.model_dump())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.get("/contacts/{contact_id}", response_model=Contact)
def get_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific contact by ID"""
    contact = db.query(ContactModel).filter(ContactModel.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@router.put("/contacts/{contact_id}", response_model=Contact)
def update_contact(
    contact_id: int,
    contact_update: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a contact"""
    db_contact = db.query(ContactModel).filter(ContactModel.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = contact_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_contact, field, value)
    
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a contact"""
    db_contact = db.query(ContactModel).filter(ContactModel.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    db.delete(db_contact)
    db.commit()
    return None

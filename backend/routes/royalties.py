from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from models.royalty import Royalty as RoyaltyModel
from schemas.royalty import Royalty, RoyaltyCreate, RoyaltyUpdate
from dependencies import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[Royalty])
def list_royalties(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all royalties"""
    royalties = db.query(RoyaltyModel).offset(skip).limit(limit).all()
    return royalties


@router.post("/", response_model=Royalty, status_code=status.HTTP_201_CREATED)
def create_royalty(
    royalty: RoyaltyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new royalty"""
    db_royalty = RoyaltyModel(**royalty.model_dump())
    db.add(db_royalty)
    db.commit()
    db.refresh(db_royalty)
    return db_royalty


@router.get("/{royalty_id}", response_model=Royalty)
def get_royalty(
    royalty_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific royalty by ID"""
    royalty = db.query(RoyaltyModel).filter(RoyaltyModel.id == royalty_id).first()
    if not royalty:
        raise HTTPException(status_code=404, detail="Royalty not found")
    return royalty


@router.put("/{royalty_id}", response_model=Royalty)
def update_royalty(
    royalty_id: int,
    royalty_update: RoyaltyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a royalty"""
    db_royalty = db.query(RoyaltyModel).filter(RoyaltyModel.id == royalty_id).first()
    if not db_royalty:
        raise HTTPException(status_code=404, detail="Royalty not found")
    
    update_data = royalty_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_royalty, field, value)
    
    db.commit()
    db.refresh(db_royalty)
    return db_royalty


@router.delete("/{royalty_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_royalty(
    royalty_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a royalty"""
    db_royalty = db.query(RoyaltyModel).filter(RoyaltyModel.id == royalty_id).first()
    if not db_royalty:
        raise HTTPException(status_code=404, detail="Royalty not found")
    
    db.delete(db_royalty)
    db.commit()
    return None

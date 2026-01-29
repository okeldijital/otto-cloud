from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User as UserModel
from schemas.user import User, UserCreate, UserUpdate
from routes.auth import get_current_admin_user, get_password_hash
from utils.activity import log_activity

router = APIRouter()

@router.get("/", response_model=List[User])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_admin_user)
):
    """List all users (Admin only)"""
    users = db.query(UserModel).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_admin_user)
):
    """Create a new user (Admin only)"""
    db_user = db.query(UserModel).filter(UserModel.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    hashed_password = get_password_hash(user_in.password)
    db_user = UserModel(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        is_active=user_in.is_active,
        role=user_in.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    log_activity(db, current_user.id, "created", "user", db_user.id, db_user.email)
    
    return db_user

@router.get("/{user_id}", response_model=User)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_admin_user)
):
    """Get user details (Admin only)"""
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=User)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_admin_user)
):
    """Update user details (Admin only)"""
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    elif "password" in update_data:
        update_data.pop("password")
        
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    
    log_activity(db, current_user.id, "updated", "user", db_user.id, db_user.email)
    
    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_admin_user)
):
    """Deactivate or delete user (Admin only)"""
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if trying to delete oneself
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    user_email = db_user.email
    db.delete(db_user)
    db.commit()
    
    log_activity(db, current_user.id, "deleted", "user", user_id, user_email)
    
    return None

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.user import User
from models.contract import Contract as ContractModel
from schemas.contract import Contract, ContractCreate, ContractUpdate
from routes.auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[Contract])
def list_contracts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all contracts"""
    contracts = db.query(ContractModel).offset(skip).limit(limit).all()
    return contracts


@router.post("/", response_model=Contract, status_code=status.HTTP_201_CREATED)
def create_contract(
    contract: ContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new contract"""
    db_contract = ContractModel(**contract.model_dump())
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract


@router.get("/{contract_id}", response_model=Contract)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific contract by ID"""
    contract = db.query(ContractModel).filter(ContractModel.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract


@router.put("/{contract_id}", response_model=Contract)
def update_contract(
    contract_id: int,
    contract_update: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a contract"""
    db_contract = db.query(ContractModel).filter(ContractModel.id == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    update_data = contract_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_contract, field, value)
    
    db.commit()
    db.refresh(db_contract)
    return db_contract


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a contract"""
    db_contract = db.query(ContractModel).filter(ContractModel.id == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    db.delete(db_contract)
    db.commit()
    return None

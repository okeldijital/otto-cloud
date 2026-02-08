from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any
from sqlalchemy import or_

from database import get_db
from models.user import User
from models.network import (
    Organization as OrganizationModel, 
    Individual as IndividualModel,
    Platform as PlatformModel,
    NetworkRelationship as RelationshipModel
)
from schemas.network import (
    Organization, OrganizationCreate, OrganizationUpdate,
    Individual, IndividualCreate, IndividualUpdate,
    Platform, PlatformCreate, PlatformUpdate,
    NetworkRelationship, NetworkRelationshipCreate, NetworkRelationshipUpdate,
    NetworkHealthSnapshot
)
from dependencies import get_current_active_user

router = APIRouter(prefix="/network", tags=["Network"])

# ==================== Health & Summary ====================

@router.get("/health", response_model=NetworkHealthSnapshot)
def get_network_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Network Health Snapshot: Active relationships, missing contracts, expired agreements"""
    # For now, return mock/placeholder numbers based on counts
    active_rel_count = db.query(RelationshipModel).count()
    
    # In a real scenario, we'd check against Contract model
    # Placeholder for logic
    return {
        "active_relationships": active_rel_count,
        "missing_contracts": 5, # Placeholder
        "expired_agreements": 2  # Placeholder
    }

# ==================== All Contacts (Unified) ====================

@router.get("/all", response_model=List[Any])
def list_all_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Unified list of People + Orgs + Platforms"""
    orgs = db.query(OrganizationModel).all()
    individuals = db.query(IndividualModel).all()
    platforms = db.query(PlatformModel).all()
    
    # Format for unified view
    result = []
    for o in orgs:
        result.append({**Organization.model_validate(o).model_dump(), "item_type": "Organization"})
    for i in individuals:
        result.append({**Individual.model_validate(i).model_dump(), "item_type": "Individual"})
    for p in platforms:
        result.append({**Platform.model_validate(p).model_dump(), "item_type": "Platform"})
        
    return result

# ==================== Organizations ====================

@router.get("/organizations", response_model=List[Organization])
def list_organizations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(OrganizationModel).offset(skip).limit(limit).all()

@router.post("/organizations", response_model=Organization, status_code=status.HTTP_201_CREATED)
def create_organization(
    org: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_org = OrganizationModel(**org.model_dump())
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

@router.get("/organizations/{org_id}", response_model=Organization)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    org = db.query(OrganizationModel).filter(OrganizationModel.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@router.delete("/organizations/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    org = db.query(OrganizationModel).filter(OrganizationModel.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    db.delete(org)
    db.commit()
    return None

# ==================== Individuals ====================

@router.get("/individuals", response_model=List[Individual])
def list_individuals(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(IndividualModel).offset(skip).limit(limit).all()

@router.post("/individuals", response_model=Individual, status_code=status.HTTP_201_CREATED)
def create_individual(
    ind: IndividualCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_ind = IndividualModel(**ind.model_dump())
    db.add(db_ind)
    db.commit()
    db.refresh(db_ind)
    return db_ind

@router.get("/individuals/{individual_id}", response_model=Individual)
def get_individual(
    individual_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    ind = db.query(IndividualModel).filter(IndividualModel.id == individual_id).first()
    if not ind:
        raise HTTPException(status_code=404, detail="Individual not found")
    return ind

@router.delete("/individuals/{individual_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_individual(
    individual_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    ind = db.query(IndividualModel).filter(IndividualModel.id == individual_id).first()
    if not ind:
        raise HTTPException(status_code=404, detail="Individual not found")
    db.delete(ind)
    db.commit()
    return None

# ==================== Platforms ====================

@router.get("/platforms", response_model=List[Platform])
def list_platforms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(PlatformModel).all()

@router.post("/platforms", response_model=Platform)
def create_platform(
    platform: PlatformCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_platform = PlatformModel(**platform.model_dump())
    db.add(db_platform)
    db.commit()
    db.refresh(db_platform)
    return db_platform

@router.get("/platforms/{platform_id}", response_model=Platform)
def get_platform(
    platform_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    platform = db.query(PlatformModel).filter(PlatformModel.id == platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    return platform

@router.delete("/platforms/{platform_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_platform(
    platform_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    platform = db.query(PlatformModel).filter(PlatformModel.id == platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    db.delete(platform)
    db.commit()
    return None

# ==================== Relationships ====================

@router.get("/relationships", response_model=List[NetworkRelationship])
def list_relationships(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(RelationshipModel).all()

@router.post("/relationships", response_model=NetworkRelationship)
def create_relationship(
    rel: NetworkRelationshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_rel = RelationshipModel(**rel.model_dump())
    db.add(db_rel)
    db.commit()
    db.refresh(db_rel)
    return db_rel

# ==================== Legacy Compatibility (Redirects/Aliases) ====================
# Note: We keep /api/companies and /api/contacts active but pointing to the same models.
# The router for /api is usually handled in main.py. 
# We can create a legacy router or just mount this one twice.

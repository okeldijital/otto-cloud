from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class OrganizationType(str, Enum):
    DISTRIBUTOR = "Distributor"
    PUBLISHER = "Publisher"
    PRO = "PRO"
    LEGAL = "Legal"
    ACCOUNTING = "Accounting"
    STUDIO = "Studio"
    LABEL = "Label"
    OTHER = "Other"

class IndividualRelationshipStrength(str, Enum):
    CORE = "Core"
    REGULAR = "Regular"
    AD_HOC = "Ad-hoc"

class PlatformType(str, Enum):
    DISTRIBUTION = "Distribution"
    RIGHTS_COLLECTION = "Rights Collection"
    ANALYTICS = "Analytics"
    PAYMENTS = "Payments"
    SOCIAL = "Social"
    OTHER = "Other"

# Organization (Formerly Company)
class OrganizationBase(BaseModel):
    name: str
    org_type: Optional[str] = "Other"
    website: Optional[str] = None
    address: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(OrganizationBase):
    name: Optional[str] = None

class Organization(OrganizationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# Individual (Formerly Contact)
class IndividualBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    relationship_strength: Optional[str] = "Regular"
    image_url: Optional[str] = None

class IndividualCreate(IndividualBase):
    pass

class IndividualUpdate(IndividualBase):
    pass

class Individual(IndividualBase):
    id: int
    organizations: List[Organization] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Platform
class PlatformBase(BaseModel):
    name: str
    platform_type: Optional[str] = "Other"
    portal_url: Optional[str] = None
    account_reference: Optional[str] = None
    territory_coverage: Optional[str] = None

class PlatformCreate(PlatformBase):
    pass

class PlatformUpdate(PlatformBase):
    name: Optional[str] = None

class Platform(PlatformBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Relationship
class NetworkRelationshipBase(BaseModel):
    relationship_type: str
    source_type: str
    source_id: int
    target_type: str
    target_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None

class NetworkRelationshipCreate(NetworkRelationshipBase):
    pass

class NetworkRelationshipUpdate(NetworkRelationshipBase):
    relationship_type: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[int] = None
    target_type: Optional[str] = None
    target_id: Optional[int] = None

class NetworkRelationship(NetworkRelationshipBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Health Snapshot
class NetworkHealthSnapshot(BaseModel):
    active_relationships: int
    missing_contracts: int
    expired_agreements: int

# Aliases for backward compatibility in existing code
Contact = Individual
ContactCreate = IndividualCreate
ContactUpdate = IndividualUpdate
Company = Organization
CompanyCreate = OrganizationCreate
CompanyUpdate = OrganizationUpdate

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, Enum, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base, SafeUuid
import enum

# Helper table for Multi-affiliation: one person -> many orgs
individual_organizations = Table(
    'individual_organizations',
    Base.metadata,
    Column('individual_id', Integer, ForeignKey('individuals.id'), primary_key=True),
    Column('organization_id', Integer, ForeignKey('organizations.id'), primary_key=True)
)

class OrganizationType(str, enum.Enum):
    DISTRIBUTOR = "Distributor"
    PUBLISHER = "Publisher"
    PRO = "PRO"
    LEGAL = "Legal"
    ACCOUNTING = "Accounting"
    STUDIO = "Studio"
    LABEL = "Label"
    OTHER = "Other"

class IndividualRelationshipStrength(str, enum.Enum):
    CORE = "Core"
    REGULAR = "Regular"
    AD_HOC = "Ad-hoc"

class PlatformType(str, enum.Enum):
    DISTRIBUTION = "Distribution"
    RIGHTS_COLLECTION = "Rights Collection"
    ANALYTICS = "Analytics"
    PAYMENTS = "Payments"
    SOCIAL = "Social"
    OTHER = "Other"

class Organization(Base):
    """Organization model (formerly Company)"""
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    org_type = Column(String(100), index=True) # Distributor, Publisher, etc.
    website = Column(String(255))
    address = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    individuals = relationship("Individual", secondary=individual_organizations, back_populates="organizations")
    
    # Backwards compatibility or future links
    releases = relationship("Release", back_populates="distributor") 

    def __repr__(self):
        return f"<Organization {self.name}>"

class Individual(Base):
    """Individual model (formerly Contact)"""
    __tablename__ = "individuals"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(SafeUuid, nullable=False, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255), index=True)
    phone = Column(String(50))
    role = Column(String(100)) # Producer, Engineer, Composer, etc.
    relationship_strength = Column(String(50), default="Regular") # Core, Regular, Ad-hoc
    image_url = Column(String(500))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organizations = relationship("Organization", secondary=individual_organizations, back_populates="individuals")
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __repr__(self):
        return f"<Individual {self.full_name}>"

class Platform(Base):
    """Platform model (New for Network V1)"""
    __tablename__ = "platforms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    platform_type = Column(String(100), index=True) # Distribution, Rights Collection, etc.
    portal_url = Column(String(255))
    account_reference = Column(String(255))
    territory_coverage = Column(Text) # Metadata
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Platform {self.name}>"

class NetworkRelationship(Base):
    """Intelligence layer linking entities"""
    __tablename__ = "network_relationships"
    
    id = Column(Integer, primary_key=True, index=True)
    relationship_type = Column(String(100)) # signed_to, released_via, registered_with, governs
    
    # Generic linking might be hard with standard SQL relationships without polymorphic setup.
    # For V1, we can use explicit link columns or a generic target.
    # Given the requirements, let's keep it simple for now if possible.
    
    source_type = Column(String(50)) # 'individual', 'organization', 'platform', 'artist', 'work'
    source_id = Column(Integer)
    
    target_type = Column(String(50)) # 'individual', 'organization', 'platform', 'artist', 'work'
    target_id = Column(Integer)
    
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Relationship {self.relationship_type}>"

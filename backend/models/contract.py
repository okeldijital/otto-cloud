import uuid
from sqlalchemy import Column, String, Boolean, Date, DateTime, Numeric, Text, ForeignKey, CheckConstraint, Index, Integer, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_number = Column(String(50), nullable=False)
    organization_id = Column(Uuid(as_uuid=True), nullable=False)

    title = Column(String(255), nullable=False)
    status = Column(String(50), default="Draft", nullable=False) # Draft, Active, Expired, Terminated
    type = Column(String(50)) # Recording, Publishing, etc.
    start_date = Column(Date)
    end_date = Column(Date)
    signed_date = Column(Date)
    territory = Column(String(255))
    exclusivity = Column(Boolean, default=False)
    notes = Column(Text)

    royalty_description = Column(Text)
    advances_amount = Column(Numeric(10, 2))
    advances_currency = Column(String(3), default="USD")
    recoupment_notes = Column(Text)

    created_by = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    parties = relationship("ContractParty", back_populates="contract", cascade="all, delete-orphan")
    assets = relationship("ContractAsset", back_populates="contract", cascade="all, delete-orphan")
    documents = relationship("ContractDocument", back_populates="contract", cascade="all, delete-orphan")
    split_groups = relationship("ContractSplitGroup", back_populates="contract", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_contracts_org_number', 'organization_id', 'contract_number', unique=True),
        Index('ix_contracts_organization_id', 'organization_id'),
    )


class ContractParty(Base):
    __tablename__ = "contract_parties"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(Uuid(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    organization_id = Column(Uuid(as_uuid=True), nullable=False)

    entity_type = Column(String(50), nullable=False)  # Artist, Label, Publisher, External
    entity_id = Column(Integer, nullable=True)
    external_name = Column(String(255), nullable=True)

    role = Column(String(100), nullable=False)
    split_percent = Column(Numeric(6, 3))
    notes = Column(Text)

    contract = relationship("Contract", back_populates="parties")
    splits = relationship("ContractSplit", back_populates="party", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint('(entity_id IS NOT NULL) OR (external_name IS NOT NULL)', name='check_party_entity_or_name'),
        Index('ix_contract_parties_org_contract', 'organization_id', 'contract_id'),
    )


class ContractAsset(Base):
    __tablename__ = "contract_assets"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(Uuid(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    organization_id = Column(Uuid(as_uuid=True), nullable=False)

    asset_type = Column(String(50), nullable=False)  # Work, Track, Release
    asset_id = Column(Integer, nullable=False)
    scope_type = Column(String(50), default="INCLUSION")
    notes = Column(Text)

    contract = relationship("Contract", back_populates="assets")

    __table_args__ = (
        Index('ix_contract_assets_org_contract', 'organization_id', 'contract_id'),
    )


class ContractDocument(Base):
    __tablename__ = "contract_documents"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(Uuid(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    organization_id = Column(Uuid(as_uuid=True), nullable=False)

    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    version = Column(Integer, nullable=False, default=1)

    uploaded_by = Column(Integer)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    checksum = Column(String(64), nullable=True)
    mime_type = Column(String(100), default="application/pdf")
    size_bytes = Column(Integer, nullable=True)

    contract = relationship("Contract", back_populates="documents")

    __table_args__ = (
        Index('ix_contract_documents_org_contract', 'organization_id', 'contract_id'),
        Index('ix_contract_documents_unique_version', 'contract_id', 'version', unique=True),
    )


class ContractSplitGroup(Base):
    __tablename__ = "contract_split_groups"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(Uuid(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    organization_id = Column(Uuid(as_uuid=True), nullable=False)

    group_name = Column(String(100), nullable=False)
    group_type = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    contract = relationship("Contract", back_populates="split_groups")
    splits = relationship("ContractSplit", back_populates="group", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_contract_split_groups_org_contract', 'organization_id', 'contract_id'),
    )


class ContractSplit(Base):
    __tablename__ = "contract_splits"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(Uuid(as_uuid=True), ForeignKey("contract_split_groups.id"), nullable=False)
    organization_id = Column(Uuid(as_uuid=True), nullable=False)
    party_id = Column(Uuid(as_uuid=True), ForeignKey("contract_parties.id"), nullable=True)
    external_party_name = Column(String(255))
    percent = Column(Numeric(6, 3), nullable=False)
    notes = Column(Text)

    group = relationship("ContractSplitGroup", back_populates="splits")
    party = relationship("ContractParty", back_populates="splits")

    __table_args__ = (
        CheckConstraint('(party_id IS NOT NULL) OR (external_party_name IS NOT NULL)', name='check_split_party_or_name'),
        Index('ix_contract_splits_org_group', 'organization_id', 'group_id'),
    )

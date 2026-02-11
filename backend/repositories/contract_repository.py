from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from models.contract import (
    Contract,
    ContractParty,
    ContractAsset,
    ContractDocument,
    ContractSplitGroup,
    ContractSplit,
)
from repositories.base import BaseRepository


class ContractRepository(BaseRepository[Contract]):
    def __init__(self):
        super().__init__(Contract)

    def get_all_filtered(self, db: Session, organization_id: int, status: Optional[str] = None, type: Optional[str] = None) -> List[Contract]:
        query = db.query(Contract).options(
            selectinload(Contract.parties),
            selectinload(Contract.assets),
            selectinload(Contract.documents),
            selectinload(Contract.split_groups).selectinload(ContractSplitGroup.splits)
        ).filter(Contract.organization_id == organization_id)
        if status:
            query = query.filter(Contract.status == status)
        if type:
            query = query.filter(Contract.type == type)
        return query.order_by(Contract.created_at.desc().nullslast()).all()

    def get_with_details(self, db: Session, contract_id: int, organization_id: int) -> Optional[Contract]:
        return (
            db.query(Contract)
            .options(
                selectinload(Contract.parties),
                selectinload(Contract.assets),
                selectinload(Contract.documents),
                selectinload(Contract.split_groups).selectinload(ContractSplitGroup.splits)
            )
            .filter(Contract.id == contract_id, Contract.organization_id == organization_id)
            .first()
        )

    def create_contract(self, db: Session, data: dict, organization_id: int, created_by: int):
        data["organization_id"] = organization_id
        data["created_by"] = created_by
        contract = Contract(**data)
        db.add(contract)
        db.commit()
        db.refresh(contract)
        return contract

    def add_party(self, db: Session, contract_id: int, organization_id: int, party_data: dict) -> ContractParty:
        party_data["contract_id"] = contract_id
        party_data["organization_id"] = organization_id
        party = ContractParty(**party_data)
        db.add(party)
        db.commit()
        db.refresh(party)
        return party

    def add_asset(self, db: Session, contract_id: int, organization_id: int, asset_data: dict) -> ContractAsset:
        asset_data["contract_id"] = contract_id
        asset_data["organization_id"] = organization_id
        asset = ContractAsset(**asset_data)
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset

    def add_document(self, db: Session, contract_id: int, organization_id: int, doc_data: dict) -> ContractDocument:
        doc_data["contract_id"] = contract_id
        doc_data["organization_id"] = organization_id
        existing = db.query(func.max(ContractDocument.version)).filter(ContractDocument.contract_id == contract_id).scalar()
        doc_data["version"] = (existing or 0) + 1
        doc = ContractDocument(**doc_data)
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    def add_split_group(self, db: Session, contract_id: int, organization_id: int, group_data: dict) -> ContractSplitGroup:
        group_data["contract_id"] = contract_id
        group_data["organization_id"] = organization_id
        group = ContractSplitGroup(**group_data)
        db.add(group)
        db.commit()
        db.refresh(group)
        return group

    def add_split(self, db: Session, group_id: int, organization_id: int, split_data: dict) -> ContractSplit:
        split_data["group_id"] = group_id
        split_data["organization_id"] = organization_id
        split = ContractSplit(**split_data)
        db.add(split)
        db.commit()
        db.refresh(split)
        return split


contract_repository = ContractRepository()

from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from models.works_admin import WorksAdmin, WorksAdminDocument
from repositories.base import BaseRepository


class WorksAdminRepository(BaseRepository[WorksAdmin]):
    def __init__(self):
        super().__init__(WorksAdmin)

    def get_by_work(self, db: Session, work_id: int, organization_id: UUID) -> Optional[WorksAdmin]:
        return db.query(WorksAdmin).options(
            selectinload(WorksAdmin.documents),
            selectinload(WorksAdmin.work)
        ).filter(
            WorksAdmin.work_id == work_id,
            WorksAdmin.organization_id == organization_id
        ).first()

    def get_with_details(self, db: Session, admin_id: UUID, organization_id: UUID) -> Optional[WorksAdmin]:
        return db.query(WorksAdmin).options(
            selectinload(WorksAdmin.documents),
            selectinload(WorksAdmin.work)
        ).filter(
            WorksAdmin.id == admin_id,
            WorksAdmin.organization_id == organization_id
        ).first()

    def get_all_for_org(self, db: Session, organization_id: UUID) -> List[WorksAdmin]:
        return db.query(WorksAdmin).options(
            selectinload(WorksAdmin.documents),
            selectinload(WorksAdmin.work)
        ).filter(
            WorksAdmin.organization_id == organization_id
        ).all()

    def create_admin(self, db: Session, data: dict, organization_id: UUID, created_by: int) -> WorksAdmin:
        data["organization_id"] = organization_id
        data["created_by"] = created_by
        admin = WorksAdmin(**data)
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin

    def add_document(self, db: Session, admin_id: UUID, organization_id: UUID, doc_data: dict) -> WorksAdminDocument:
        doc_data["works_admin_id"] = admin_id
        doc_data["organization_id"] = organization_id
        doc = WorksAdminDocument(**doc_data)
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc


works_admin_repository = WorksAdminRepository()

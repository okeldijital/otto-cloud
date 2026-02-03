from typing import Generic, TypeVar, Type, List, Optional, Any, Union, Dict
from sqlalchemy.orm import Session
from fastapi.encoders import jsonable_encoder
from database import Base
from uuid import UUID

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: Any, organization_id: UUID) -> Optional[ModelType]:
        """
        Get a single record by ID, strictly scoped to the organization.
        """
        return db.query(self.model).filter(
            self.model.id == id,
            self.model.organization_id == organization_id
        ).first()

    def get_all(
        self, 
        db: Session, 
        organization_id: UUID, 
        skip: int = 0, 
        limit: int = 100,
        filters: Dict = None
    ) -> List[ModelType]:
        """
        Get all records for an organization.
        """
        query = db.query(self.model).filter(self.model.organization_id == organization_id)
        
        if filters:
            for attr, value in filters.items():
                if hasattr(self.model, attr) and value is not None:
                    query = query.filter(getattr(self.model, attr) == value)
        
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: Union[Dict, Any], organization_id: UUID, created_by: UUID = None) -> ModelType:
        """
        Create a new record, automatically setting organization_id.
        """
        obj_data = jsonable_encoder(obj_in)
        obj_data["organization_id"] = organization_id
        if created_by and hasattr(self.model, "created_by"):
            obj_data["created_by"] = created_by
            
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, 
        db: Session, 
        db_obj: ModelType, 
        obj_in: Union[Dict, Any]
    ) -> ModelType:
        """
        Update a record. db_obj must already be validated for org scope.
        """
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
            
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
                
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: Any, organization_id: UUID) -> Optional[ModelType]:
        """
        Delete a record, strictly scoped.
        """
        obj = self.get(db, id, organization_id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj

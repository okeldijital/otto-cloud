from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any
from models.track import Track
from models.royalty import Royalty
from models.contract import ContractAsset
from models.governance import StatusQuoItem
from datetime import datetime

class TrackRepository:
    @staticmethod
    def get_all(db: Session, organization_id: Any = None, skip: int = 0, limit: int = 100) -> List[Track]:
        query = db.query(Track)
        if organization_id:
            query = query.filter(Track.organization_id == organization_id)
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, track_id: int, organization_id: Any = None) -> Optional[Track]:
        query = db.query(Track).filter(Track.id == track_id)
        if organization_id:
            query = query.filter(Track.organization_id == organization_id)
        return query.first()

    @staticmethod
    def create(db: Session, obj_in: Dict[str, Any], organization_id: Any = None) -> Track:
        data = obj_in.copy()
        if organization_id:
            data["organization_id"] = organization_id
            
        # Auto-generate track_id if missing
        if not data.get("track_id"):
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            data["track_id"] = f"TRK-{timestamp}"

        db_obj = Track(**data)
        db.add(db_obj)
        try:
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            db.rollback()
            raise e

    @staticmethod
    def update(db: Session, db_obj: Track, obj_in: Dict[str, Any]) -> Track:
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        
        try:
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            db.rollback()
            raise e

    @staticmethod
    def delete(db: Session, track_id: int, organization_id: Any = None) -> bool:
        track = TrackRepository.get_by_id(db, track_id, organization_id)
        if not track:
            return False
            
        # Cleanup related records that might not have formal FK constraints or cascade
        # 1. Royalties (should have FK but let's be safe)
        db.query(Royalty).filter(Royalty.track_id == track_id).delete()
        
        # 2. Contract Assets (Polymorphic links)
        db.query(ContractAsset).filter(
            ContractAsset.asset_id == track_id,
            ContractAsset.asset_type == "Track"
        ).delete()
        
        # 3. Status Quo Items
        db.query(StatusQuoItem).filter(
            StatusQuoItem.entity_id == track_id,
            StatusQuoItem.entity_type == "Track"
        ).delete()

        db.delete(track)
        try:
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise e

# Instantiate
track_repository = TrackRepository()

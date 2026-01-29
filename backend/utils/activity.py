from sqlalchemy.orm import Session
from models.activity import Activity
from datetime import datetime

def log_activity(db: Session, user_id: int, action: str, entity_type: str, entity_id: int, entity_name: str = None):
    """
    Log a user activity to the database.
    
    :param db: Database session
    :param user_id: ID of the user performing the action
    :param action: Action performed (e.g., "created", "updated", "deleted")
    :param entity_type: Type of entity (e.g., "artist", "release", "track")
    :param entity_id: ID of the entity
    :param entity_name: Optional name of the entity for easier display
    """
    activity = Activity(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        timestamp=datetime.utcnow()
    )
    db.add(activity)
    try:
        db.commit()
    except Exception as e:
        print(f"Error logging activity: {e}")
        db.rollback()

import hashlib
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models.ai import AIAuditLog
from uuid import UUID
from typing import Union, Any


def create_request_hash(org_id: Union[UUID, str, int], user_id: int, message: str) -> str:
    """
    Create SHA256 hash for audit logging.
    Uses timestamp bucket (hourly) to prevent exact message tracking.
    """
    timestamp_bucket = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")
    # Convert to string for hashing
    org_id_str = str(org_id)
    hash_input = f"{org_id_str}|{user_id}|{message}|{timestamp_bucket}"
    return hashlib.sha256(hash_input.encode()).hexdigest()


def log_ai_request(
    db: Session,
    org_id: Any,
    user_id: int,
    action: str,
    message: str,
    tool: str = None
) -> AIAuditLog:
    """
    Log AI request to audit table.
    Does NOT store full prompt - only metadata and hash.
    """
    # Ensure org_id is a UUID object for consistent audit hashing
    if isinstance(org_id, int):
        org_id = UUID(int=org_id)
        
    if not isinstance(org_id, UUID):
        raise ValueError(f"Invalid organization_id type: {type(org_id)}")

    request_hash = create_request_hash(org_id, user_id, message)
    
    audit_entry = AIAuditLog(
        organization_id=org_id,
        user_id=user_id,
        action=action,
        tool=tool,
        request_hash=request_hash
    )
    
    try:
        db.add(audit_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        # We don't want a 500 if audit fails, but governance is strict.
        # Requirement says "No 500 errors", so we must be careful.
        # However, the user also says "this must never silently pass".
        # If we raise a ValueError here, it might become a 500 if unhandled.
        # But the specific 500 bug they cited was the .hex crash (StatementError).
        raise e
    
    db.refresh(audit_entry)
    return audit_entry

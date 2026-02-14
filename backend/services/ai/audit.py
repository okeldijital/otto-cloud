import hashlib
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models.ai import AIAuditLog
from uuid import UUID
from typing import Union


def create_request_hash(org_id: Union[UUID, str], user_id: int, message: str) -> str:
    """
    Create SHA256 hash for audit logging.
    Uses timestamp bucket (hourly) to prevent exact message tracking.
    """
    timestamp_bucket = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")
    # Convert UUID to string if needed
    org_id_str = str(org_id) if isinstance(org_id, UUID) else org_id
    hash_input = f"{org_id_str}|{user_id}|{message}|{timestamp_bucket}"
    return hashlib.sha256(hash_input.encode()).hexdigest()


def log_ai_request(
    db: Session,
    org_id: Union[UUID, str],
    user_id: int,
    action: str,
    message: str,
    tool: str = None
) -> AIAuditLog:
    """
    Log AI request to audit table.
    Does NOT store full prompt - only metadata and hash.
    """
    request_hash = create_request_hash(org_id, user_id, message)
    
    audit_entry = AIAuditLog(
        organization_id=org_id,
        user_id=user_id,
        action=action,
        tool=tool,
        request_hash=request_hash
    )
    
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    
    return audit_entry

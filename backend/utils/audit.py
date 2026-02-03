from sqlalchemy.orm import Session
from models.audit_log import AuditLog
from fastapi import Request
from uuid import UUID
from typing import Union, Any
from fastapi.encoders import jsonable_encoder

class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Union[int, UUID],
        user_id: int,
        changes: dict = None,
        request: Request = None,
        entity_name: str = None,
        organization_id: Union[str, UUID, None] = None,
    ):
        """
        Log an action to the audit/audit_logs table.
        """
        audit_entry = AuditLog(
            action=action,
            entity_type=entity_type,
            user_id=user_id,
            changes=jsonable_encoder(changes) if changes is not None else None,
            entity_name=entity_name
        )

        if isinstance(entity_id, int):
            audit_entry.entity_id = entity_id
        elif isinstance(entity_id, UUID):
            audit_entry.entity_uuid = entity_id
        
        if request:
            audit_entry.user_agent = request.headers.get("user-agent")
            audit_entry.ip_address = request.client.host if request.client else None
            
        if organization_id and hasattr(audit_entry, "organization_id"):
            audit_entry.organization_id = organization_id

        db.add(audit_entry)
        db.commit() # Audit logs should be committed immediately usually, or part of txn? 
        # Ideally part of txn, but if main txn fails, we might want audit failure? 
        # Standard: Commit with main logic. But here we force commit for visibility.
        # Actually, let's just add to session and let caller commit? 
        # No, audit logs are often "side effects".
        # I'll leave it as add+commit for now to ensure it's written.
        
audit_service = AuditService()

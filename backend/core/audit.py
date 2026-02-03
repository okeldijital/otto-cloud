from typing import Optional, Union
from uuid import UUID
from sqlalchemy.orm import Session

from utils.audit import audit_service


def log_create(
    db: Session,
    entity_type: str,
    entity_id: Union[int, UUID],
    user_id: int,
    organization_id: Union[str, UUID],
    changes: Optional[dict] = None,
    entity_name: Optional[str] = None,
) -> None:
    audit_service.log(
        db,
        "UPLOAD",
        entity_type,
        entity_id,
        user_id,
        changes=changes,
        entity_name=entity_name,
        organization_id=organization_id,
    )


def log_delete(
    db: Session,
    entity_type: str,
    entity_id: Union[int, UUID],
    user_id: int,
    organization_id: Union[str, UUID],
    changes: Optional[dict] = None,
    entity_name: Optional[str] = None,
) -> None:
    audit_service.log(
        db,
        "DELETE",
        entity_type,
        entity_id,
        user_id,
        changes=changes,
        entity_name=entity_name,
        organization_id=organization_id,
    )


def log_download(
    db: Session,
    entity_type: str,
    entity_id: Union[int, UUID],
    user_id: int,
    organization_id: Union[str, UUID],
    changes: Optional[dict] = None,
    entity_name: Optional[str] = None,
) -> None:
    audit_service.log(
        db,
        "DOWNLOAD",
        entity_type,
        entity_id,
        user_id,
        changes=changes,
        entity_name=entity_name,
        organization_id=organization_id,
    )


def log_update(
    db: Session,
    entity_type: str,
    entity_id: Union[int, UUID],
    user_id: int,
    organization_id: Union[str, UUID],
    changes: Optional[dict] = None,
    entity_name: Optional[str] = None,
) -> None:
    audit_service.log(
        db,
        "UPDATE",
        entity_type,
        entity_id,
        user_id,
        changes=changes,
        entity_name=entity_name,
        organization_id=organization_id,
    )


def log_link(
    db: Session,
    entity_type: str,
    entity_id: Union[int, UUID],
    user_id: int,
    organization_id: Union[str, UUID],
    changes: Optional[dict] = None,
    entity_name: Optional[str] = None,
) -> None:
    audit_service.log(
        db,
        "LINK",
        entity_type,
        entity_id,
        user_id,
        changes=changes,
        entity_name=entity_name,
        organization_id=organization_id,
    )


def log_unlink(
    db: Session,
    entity_type: str,
    entity_id: Union[int, UUID],
    user_id: int,
    organization_id: Union[str, UUID],
    changes: Optional[dict] = None,
    entity_name: Optional[str] = None,
) -> None:
    audit_service.log(
        db,
        "UNLINK",
        entity_type,
        entity_id,
        user_id,
        changes=changes,
        entity_name=entity_name,
        organization_id=organization_id,
    )

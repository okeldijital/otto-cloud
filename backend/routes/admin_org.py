from fastapi import APIRouter, Request, HTTPException

router = APIRouter(tags=["Admin"])


def get_auth_headers(request: Request) -> tuple[str, str]:
    user_id = request.headers.get("x-user-id", "1")
    org_id = request.headers.get("x-org-id", "00000000-0000-0000-0000-000000000001")
    return user_id, org_id


@router.post("/admin/org/{org_id}/suspend")
async def suspend_organization(request: Request, org_id: str):
    """
    Suspend an organization - prevents job execution.
    """
    from uuid import UUID
    from database import get_db
    from models.organization import Organization

    user_id_str, _ = get_auth_headers(request)

    db = next(get_db())

    org_uuid = UUID(org_id)
    org = db.query(Organization).filter(Organization.id == org_uuid).first()

    if not org:
        raise HTTPException(detail="Organization not found", status_code=404)

    org.is_active = False
    db.commit()

    return {"success": True, "message": f"Organization {org_id} suspended"}


@router.post("/admin/org/{org_id}/activate")
async def activate_organization(request: Request, org_id: str):
    """
    Reactivate a suspended organization.
    """
    from uuid import UUID
    from database import get_db
    from models.organization import Organization

    user_id_str, _ = get_auth_headers(request)

    db = next(get_db())

    org_uuid = UUID(org_id)
    org = db.query(Organization).filter(Organization.id == org_uuid).first()

    if not org:
        raise HTTPException(detail="Organization not found", status_code=404)

    org.is_active = True
    db.commit()

    return {"success": True, "message": f"Organization {org_id} activated"}
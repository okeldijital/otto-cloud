from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import Optional
from config import settings
from uuid import UUID
from database import get_db
from models.user import User
from schemas.token import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)

import uuid
DEV_ORG_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
):
    # Desktop Authentication Bypass
    if settings.AUTH_DISABLED:
        user = db.query(User).filter(User.email == "admin@otto.com").first()
        if not user:
            # Create default admin for desktop if missing
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
            user = User(
                email="admin@otto.com",
                hashed_password=pwd_context.hash("admin"),
                full_name="System Admin",
                is_active=True,
                is_superuser=True,
                role="admin",
                organization_id=DEV_ORG_ID,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        return user

    # Standard JWT Authentication
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        id: int = payload.get("id")
        if email is None or id is None:
            raise credentials_exception
        token_data = TokenData(email=email, id=id)
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == token_data.id).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

from fastapi import Header

from typing import Annotated

async def get_current_organization_id(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> uuid.UUID:
    """
    Strictly extracts Organization ID from the authenticated user.
    This ensures that users can only access data belonging to their organization.
    """
    return current_user.organization_id

# ----------------------------------------------------------------
def get_node_role() -> str:
    """
    Get current node role strictly from env var.
    Env var OTTO_NODE_ROLE is injected by Electron.
    Default is 'hub' if not set (safe default).
    """
    import os
    env_role = os.getenv("OTTO_NODE_ROLE")
    if env_role:
        return env_role.lower()
    
    # NO fallback to config file. Backend is stateless/Env-driven regarding role.
    return "hub"

async def require_hub_role():
    """Dependency to enforce HUB role only."""
    role = get_node_role()
    if role != "hub":
        raise HTTPException(
            status_code=403, 
            detail={"code": "hub_only", "message": "This action requires HUB role."}
        )

async def require_spoke_role():
    """Dependency to enforce SPOKE role only."""
    role = get_node_role()
    if role != "spoke":
        raise HTTPException(
            status_code=403, 
            detail={"code": "spoke_only", "message": "This action requires SPOKE role."}
        )

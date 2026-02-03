import pytest
from sqlalchemy import create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import CHAR
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from main import app
from database import Base, get_db
from routes.auth import get_current_active_user
from dependencies import get_current_user, get_current_organization_id
from uuid import uuid4, UUID
from fastapi import Request
from uuid import uuid4
import models  # Import package to trigger __init__
from models.user import User
from models.artist import Artist
from models.release import Release
from models.work import Work
from models.track import Track
from models.track import Track
# from models.distributor import Distributor # Removed
from models.label import Label
from models.label import Label
from models.publisher import Publisher
from sqlalchemy.pool import StaticPool

# Setup in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def override_dependencies(db_session):
    """Override FastAPI dependencies"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_user():
        return User(id=1, email="test@example.com", is_active=True, role="admin")

    def override_get_current_active_user():
        return User(id=1, email="test@example.com", is_active=True, role="admin")

    fixed_org = uuid4()

    def override_org(request: Request = None):
        if request:
            hdr = request.headers.get("X-Organization-ID")
            if hdr:
                try:
                    return UUID(hdr)
                except Exception:
                    pass
        return fixed_org

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_organization_id] = override_org
    yield
    app.dependency_overrides = {}

@pytest.fixture(scope="function")
def client(override_dependencies):
    """Create a TestClient instance with overrides applied"""
    return TestClient(app)

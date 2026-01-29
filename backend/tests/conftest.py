import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from main import app
from database import Base, get_db
from routes.auth import get_current_active_user
import models  # Import package to trigger __init__
from models.contract import Contract
from models.user import User
from models.artist import Artist
from models.release import Release
from models.work import Work
from models.track import Track
from models.distributor import Distributor
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

@pytest.fixture(scope="module")
def client():
    """Create a TestClient instance"""
    return TestClient(app)

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

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = override_get_current_user
    yield
    app.dependency_overrides = {}

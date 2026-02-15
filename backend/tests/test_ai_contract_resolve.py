import sys
import os
import pytest
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Adjust path to find backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import Base, get_db
from config import settings
from dependencies import get_current_user
import models
from models.ai import AIContractResolutionRun, AIContractResolutionLink
from models.user import User

# Configure test database
TEST_DB_FILE = "./test_ai_resolve.db"

@pytest.fixture(scope="module")
def engine():
    if os.path.exists(TEST_DB_FILE):
        try: os.remove(TEST_DB_FILE)
        except: pass
    
    db_url = f"sqlite:///{TEST_DB_FILE}"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    
    if os.path.exists(TEST_DB_FILE):
        try: os.remove(TEST_DB_FILE)
        except: pass

@pytest.fixture
def db(engine):
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def get_test_user(db, email, org_id):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password="...",
            full_name=f"User {email}",
            organization_id=org_id,
            role="admin",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def test_resolve_fails_when_disabled(client, db, monkeypatch):
    """Confirm 404 when AI_CONTRACT_RESOLVE_ENABLED is false"""
    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_RESOLVE_ENABLED", False)
    
    # Use integer-based UUIDs for SQLite compatibility in OTTO V1
    org_id = uuid.UUID(int=1001)
    user = get_test_user(db, "user_disabled@example.com", org_id)
    app.dependency_overrides[get_current_user] = lambda: user
    
    payload = {
        "contract_hash": "abc",
        "extractor_version": "v1",
        "linker_version": "v1",
        "decisions": []
    }
    
    response = client.post("/api/ai/contracts/resolve", json=payload)
    assert response.status_code == 404

def test_resolve_persists_correctly(client, db, monkeypatch):
    """Confirm resolve persists run and links to new tables only"""
    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_RESOLVE_ENABLED", True)
    
    org_id = uuid.UUID(int=1002)
    user = get_test_user(db, "user_a@example.com", org_id)
    app.dependency_overrides[get_current_user] = lambda: user
    
    payload = {
        "contract_hash": "hash_123",
        "extractor_version": "ext_v1",
        "linker_version": "link_v1",
        "decisions": [
            {
                "entity_type": "artist",
                "entity_id": 1,
                "display_name": "Artist A",
                "action": "link",
                "confidence": 90,
                "rationale": "Matched name"
            }
        ]
    }
    
    response = client.post("/api/ai/contracts/resolve", json=payload)
    assert response.status_code == 200
    data = response.json()
    run_id = data["run_id"]
    
    run = db.query(AIContractResolutionRun).filter(AIContractResolutionRun.id == run_id).first()
    assert run.organization_id == org_id
    assert run.contract_hash == "hash_123"

def test_resolve_cross_org_isolation(client, db, monkeypatch):
    """Confirm persistence respects the authenticated user's organization"""
    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_RESOLVE_ENABLED", True)
    
    org_id = uuid.UUID(int=1003)
    user = get_test_user(db, "user_b@example.com", org_id)
    app.dependency_overrides[get_current_user] = lambda: user
    
    payload = {
        "contract_hash": "hash_B",
        "extractor_version": "v1",
        "linker_version": "v1",
        "decisions": []
    }
    
    response = client.post("/api/ai/contracts/resolve", json=payload)
    assert response.status_code == 200
    run_id = response.json()["run_id"]
    
    run = db.query(AIContractResolutionRun).filter(AIContractResolutionRun.id == run_id).first()
    assert run.organization_id == org_id

def test_resolve_get_returns_404_even_when_enabled(client, db, monkeypatch):
    """Confirm GET /resolve returns 404 even when enabled (parity check)"""
    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_RESOLVE_ENABLED", True)
    
    org_id = uuid.UUID(int=1004)
    user = get_test_user(db, "user_get@example.com", org_id)
    app.dependency_overrides[get_current_user] = lambda: user
    
    response = client.get("/api/ai/contracts/resolve")
    assert response.status_code == 404

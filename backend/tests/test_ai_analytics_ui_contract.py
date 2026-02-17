import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.user import User


TEST_DB_FILE = "./test_ai_analytics_ui_contract.db"


@pytest.fixture(scope="module")
def engine():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)


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


def upsert_user(db, email: str, org_id: uuid.UUID):
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            email=email,
            hashed_password="...",
            full_name="Analytics UI Contract User",
            organization_id=org_id,
            role="admin",
            is_active=True,
        )
        db.add(user)
    else:
        user.organization_id = org_id
    db.commit()
    db.refresh(user)
    return user


def test_analytics_ui_contract_disabled_returns_404_but_health_200(client, db, monkeypatch):
    monkeypatch.setattr("config.settings.AI_ENABLED", False)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", False)

    user = upsert_user(db, "analytics_ui_disabled@example.com", uuid.UUID(int=9101))
    app.dependency_overrides[get_current_user] = lambda: user

    health_resp = client.get("/api/ai/health")
    assert health_resp.status_code == 200

    assert client.get("/api/ai/analytics/overview").status_code == 404
    assert client.get("/api/ai/analytics/contracts").status_code == 404
    assert client.get("/api/ai/analytics/catalog").status_code == 404


def test_analytics_ui_contract_enabled_returns_200(client, db, monkeypatch):
    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)

    user = upsert_user(db, "analytics_ui_enabled@example.com", uuid.UUID(int=9102))
    app.dependency_overrides[get_current_user] = lambda: user

    assert client.get("/api/ai/health").status_code == 200
    assert client.get("/api/ai/analytics/overview").status_code == 200
    assert client.get("/api/ai/analytics/contracts").status_code == 200
    assert client.get("/api/ai/analytics/catalog").status_code == 200

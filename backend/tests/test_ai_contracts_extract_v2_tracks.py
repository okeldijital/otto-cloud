import os
import sys
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.user import User

TEST_DB_FILE = "./test_ai_contracts_extract_v2_tracks.db"
FIXTURE = Path(__file__).resolve().parent / "fixtures" / "contracts" / "black_motion_abangoma.pdf"


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


def _upsert_user(db):
    email = "extract.v2.tracks@example.com"
    row = db.query(User).filter(User.email == email).first()
    if not row:
        row = User(
            email=email,
            hashed_password="...",
            full_name=email,
            organization_id=uuid.UUID(int=14001),
            role="admin",
            is_active=True,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def test_extract_v2_tracks_and_missing_end_date(client, db, monkeypatch):
    if not FIXTURE.exists():
        pytest.skip("fixture missing")

    user = _upsert_user(db)
    app.dependency_overrides[get_current_user] = lambda: user

    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)

    with open(FIXTURE, "rb") as fh:
        response = client.post(
            "/api/ai/contracts/extract",
            files={"file": ("black_motion_abangoma.pdf", fh.read(), "application/pdf")},
        )

    assert response.status_code == 200
    body = response.json()
    assert body.get("version") == "v2"
    data = body.get("data") or {}
    assert isinstance(data.get("tracks"), list)
    assert "dates" in data
    assert data["dates"].get("end_date_specified") is False

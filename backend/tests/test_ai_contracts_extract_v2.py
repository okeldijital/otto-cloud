import os
import sys
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.user import User

TEST_DB_FILE = "./test_ai_contracts_extract_v2.db"
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


def _upsert_user(db, email: str, org_id: uuid.UUID):
    row = db.query(User).filter(User.email == email).first()
    if not row:
        row = User(
            email=email,
            hashed_password="...",
            full_name=email,
            organization_id=org_id,
            role="admin",
            is_active=True,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def _count_core_tables(db):
    counts = {}
    for table in ["artists", "tracks", "works", "releases", "organizations", "individuals", "contracts"]:
        try:
            counts[table] = db.execute(text(f"select count(*) from {table}")).scalar() or 0
        except Exception:
            counts[table] = None
    return counts


def test_extract_v2_returns_versioned_payload(client, db, monkeypatch):
    if not FIXTURE.exists():
        pytest.skip("fixture missing")

    user = _upsert_user(db, "extract.v2@example.com", uuid.UUID(int=11001))
    app.dependency_overrides[get_current_user] = lambda: user

    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_EXTRACT_V2_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_LLM_ENABLED", False, raising=False)
    monkeypatch.setattr(settings, "AI_LLM_EXTRACT_ENABLED", False, raising=False)

    before = _count_core_tables(db)

    with open(FIXTURE, "rb") as fh:
        response = client.post(
            "/api/ai/contracts/extract",
            files={"file": ("black_motion_abangoma.pdf", fh.read(), "application/pdf")},
        )

    assert response.status_code == 200
    body = response.json()
    assert body.get("version") == "v2"
    data = body.get("data") or {}
    assert "parties" in data
    assert "splits" in data
    assert "tracks_mentioned" in data
    assert "terms" in data
    assert "end_date_note" in data

    after = _count_core_tables(db)
    assert before == after


def test_extract_v2_malformed_pdf_returns_422_not_500(client, db, monkeypatch):
    user = _upsert_user(db, "extract.v2.bad@example.com", uuid.UUID(int=11002))
    app.dependency_overrides[get_current_user] = lambda: user

    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)

    response = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("broken.pdf", b"not actually pdf", "application/pdf")},
    )

    assert response.status_code == 422
    assert response.status_code != 500


def test_extract_v2_org_scope_no_cross_leakage(client, db, monkeypatch):
    user_a = _upsert_user(db, "extract.v2.orga@example.com", uuid.UUID(int=11003))
    _upsert_user(db, "ORG_B_SENTINEL_USER@example.com", uuid.UUID(int=11004))
    app.dependency_overrides[get_current_user] = lambda: user_a

    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)

    response = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("x.pdf", b"%PDF-1.4 sample", "application/pdf")},
    )
    # This input can still be rejected if parser cannot read it, but should not leak org B tokens.
    blob = str(response.json())
    assert "ORG_B_SENTINEL_USER" not in blob


def test_extract_v2_requires_auth_when_enabled(client, monkeypatch):
    monkeypatch.setattr(settings, "AUTH_DISABLED", False, raising=False)
    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)

    response = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("x.pdf", b"%PDF-1.4 sample", "application/pdf")},
    )
    assert response.status_code == 401

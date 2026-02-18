import os
import sys
import uuid

import pytest
import PyPDF2
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.user import User

TEST_DB_FILE = "./test_contract_wizard_extract_prefill.db"


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
    else:
        row.organization_id = org_id
        db.commit()
        db.refresh(row)
    return row


def _valid_pdf_bytes() -> bytes:
    writer = PyPDF2.PdfWriter()
    writer.add_blank_page(width=300, height=200)
    from io import BytesIO

    buf = BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_extract_prefill_happy_path(client, db, monkeypatch):
    org_a = uuid.UUID(int=9971)
    user_a = _upsert_user(db, "extract.prefill.a@example.com", org_a)
    app.dependency_overrides[get_current_user] = lambda: user_a
    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)

    response = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("KAARGO M2KR Remix Agreement.pdf", _valid_pdf_bytes(), "application/pdf")},
    )
    assert response.status_code == 200
    payload = response.json()
    body = payload.get("data") if payload.get("version") == "v2" else payload
    assert body.get("contract_title")
    assert body.get("parser_version")
    assert "warnings" in body
    assert "raw_confidence" in body
    assert "parties" in body
    assert "splits" in body


def test_extract_prefill_non_pdf_returns_422(client, db, monkeypatch):
    org_a = uuid.UUID(int=9972)
    user_a = _upsert_user(db, "extract.prefill.nonpdf@example.com", org_a)
    app.dependency_overrides[get_current_user] = lambda: user_a
    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)

    response = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("not_pdf.txt", b"plain text", "text/plain")},
    )
    assert response.status_code == 422
    detail = response.json().get("detail")
    if isinstance(detail, dict):
        assert detail.get("detail") == "pdf_parse_failed"
    else:
        assert detail == "pdf_parse_failed"


def test_extract_prefill_malformed_pdf_returns_422_not_500(client, db, monkeypatch):
    org_a = uuid.UUID(int=9973)
    user_a = _upsert_user(db, "extract.prefill.badpdf@example.com", org_a)
    app.dependency_overrides[get_current_user] = lambda: user_a
    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)

    response = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("broken.pdf", b"not actually a valid pdf stream", "application/pdf")},
    )
    assert response.status_code == 422
    assert response.status_code != 500


def test_extract_prefill_auth_required_when_auth_enabled(client, db, monkeypatch):
    monkeypatch.setattr(settings, "AUTH_DISABLED", False, raising=False)
    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)

    response = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("x.pdf", b"%PDF-1.4 sample", "application/pdf")},
    )
    assert response.status_code == 401


def test_extract_prefill_org_no_cross_leakage(client, db, monkeypatch):
    org_a = uuid.UUID(int=9974)
    org_b = uuid.UUID(int=9975)
    token = "ORG_B_EXTRACT_SENTINEL"
    user_a = _upsert_user(db, "extract.prefill.orga@example.com", org_a)
    _upsert_user(db, f"{token.lower()}@example.com", org_b)
    app.dependency_overrides[get_current_user] = lambda: user_a
    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)

    response = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("org_scope.pdf", _valid_pdf_bytes(), "application/pdf")},
    )
    assert response.status_code == 200
    blob = str(response.json())
    assert token not in blob

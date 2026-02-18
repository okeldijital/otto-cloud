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
from services.ai.llm.errors import LLMRequestError

TEST_DB_FILE = "./test_ai_contracts_extract_llm_hybrid.db"


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


def _valid_pdf_bytes() -> bytes:
    writer = PyPDF2.PdfWriter()
    writer.add_blank_page(width=300, height=200)
    from io import BytesIO

    buf = BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_extract_llm_hybrid_success(client, db, monkeypatch):
    org = uuid.UUID(int=9101)
    user = _upsert_user(db, "llm.hybrid@example.com", org)
    app.dependency_overrides[get_current_user] = lambda: user

    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_LLM_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_LLM_API_KEY", "test-key", raising=False)

    def fake_llm_extract_contract(text, filename, settings, trace_id, system_prompt=None, user_prompt=None):
        return {
            "json": {
                "contract_title": "Black Motion Remix Agreement",
                "effective_date": "2023-07-27",
                "start_date": "2023-07-27",
                "end_date": None,
                "end_date_note": "no end date specified",
                "parties": [
                    {"display_name": "BLACK MOTION", "role": "remixer", "confidence": 0.9, "evidence": ["header"]},
                    {"display_name": "M2KR Records", "role": "label", "confidence": 0.8, "evidence": ["header"]},
                ],
                "splits": [
                    {"split_type": "master", "percent": 30, "party_name": "BLACK MOTION", "notes": "rate", "evidence": ["30%"]}
                ],
                "tracks_mentioned": [{"title": "ABANGOMA", "confidence": 0.8, "evidence": ["title line"]}],
                "terms": [{"term_type": "territory", "summary": "Worldwide", "confidence": 0.8, "evidence": ["territory clause"]}],
                "source": {"filename": "BLACK MOTION MADALA KUNENE ABANGOMA.pdf", "file_sha256": "abc", "page_count": 1},
                "raw_confidence": 0.83,
                "warnings": [],
            }
        }

    monkeypatch.setattr("services.ai.extractors.contract_extractor_v2.llm_extract_contract", fake_llm_extract_contract)

    resp = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("BLACK MOTION MADALA KUNENE ABANGOMA.pdf", _valid_pdf_bytes(), "application/pdf")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("version") == "v2"
    data = body.get("data") or {}
    assert str(data.get("parser_version", "")).startswith("llm_v2:")
    assert len(data.get("parties") or []) >= 1
    assert data.get("start_date") == "2023-07-27"
    assert data.get("tracks_mentioned")
    assert any((t.get("term_type") == "territory" and "Worldwide" in t.get("summary", "")) for t in (data.get("terms") or []))


def test_extract_llm_hybrid_fallback_on_llm_error(client, db, monkeypatch):
    org = uuid.UUID(int=9102)
    user = _upsert_user(db, "llm.fallback@example.com", org)
    app.dependency_overrides[get_current_user] = lambda: user

    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_LLM_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_LLM_API_KEY", "test-key", raising=False)

    def fake_llm_raise(text, filename, settings, trace_id, system_prompt=None, user_prompt=None):
        raise LLMRequestError("boom")

    monkeypatch.setattr("services.ai.extractors.contract_extractor_v2.llm_extract_contract", fake_llm_raise)

    resp = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("flow.pdf", _valid_pdf_bytes(), "application/pdf")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("version") == "v2"
    data = body.get("data") or {}
    assert data.get("parser_version") == "deterministic_v2"
    assert "llm_failed_fallback_deterministic" in (data.get("warnings") or [])
    assert resp.status_code != 500

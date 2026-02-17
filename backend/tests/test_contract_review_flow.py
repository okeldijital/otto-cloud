import hashlib
import io
import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.ai import AIContractResolutionLink, AIContractResolutionRun
from models.user import User


TEST_DB_FILE = "./test_contract_review_flow.db"


def _make_pdf_bytes(text: str) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(72, 750, text)
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


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
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password="...",
            full_name=email,
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


def _first_decision_from_suggestions(link_data: dict, extraction_data: dict):
    suggestions = link_data.get("suggestions") or {}
    for rows in suggestions.values():
        if rows:
            item = rows[0]
            return {
                "entity_type": item.get("entity_type", "party"),
                "entity_id": int(item["entity_id"]) if item.get("entity_id") else None,
                "display_name": item.get("display_name", "Unknown Party"),
                "action": "link",
                "confidence": int(float(item.get("confidence", 1.0)) * 100),
                "rationale": item.get("rationale", "contract_review_flow_test"),
            }

    fallback_name = "Unknown Party"
    splits = extraction_data.get("splits") or []
    if splits and isinstance(splits[0], dict):
        fallback_name = splits[0].get("party_name") or fallback_name
    return {
        "entity_type": "party",
        "entity_id": None,
        "display_name": fallback_name,
        "action": "link",
        "confidence": 80,
        "rationale": "fallback",
    }


def test_contract_review_flow_extract_link_resolve_and_org_isolation(client, db, monkeypatch):
    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_RESOLVE_ENABLED", True)

    org_a = uuid.UUID(int=70001)
    org_b = uuid.UUID(int=70002)
    user_a = _upsert_user(db, "review_flow_a@example.com", org_a)
    user_b = _upsert_user(db, "review_flow_b@example.com", org_b)

    app.dependency_overrides[get_current_user] = lambda: user_a
    pdf_bytes = _make_pdf_bytes("Contract review flow test document with 50% split")
    contract_hash = hashlib.sha256(pdf_bytes).hexdigest()

    extract_response = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("review.pdf", pdf_bytes, "application/pdf")},
    )
    assert extract_response.status_code == 200
    extraction_data = extract_response.json()

    link_response = client.post("/api/ai/contracts/link_suggest", json={"extraction": extraction_data})
    assert link_response.status_code == 200
    link_data_a = link_response.json()

    decision = _first_decision_from_suggestions(link_data_a, extraction_data)
    resolve_payload = {
        "contract_hash": contract_hash,
        "extractor_version": extraction_data.get("parser_version", "deterministic_v1"),
        "linker_version": link_data_a.get("linker_version", "link_suggest_v1.0.0"),
        "decisions": [decision],
    }
    resolve_response = client.post("/api/ai/contracts/resolve", json=resolve_payload)
    assert resolve_response.status_code == 200
    run_id_a = resolve_response.json()["run_id"]

    run_a = db.query(AIContractResolutionRun).filter(AIContractResolutionRun.id == run_id_a).first()
    assert run_a is not None
    assert run_a.organization_id == org_a
    assert db.query(AIContractResolutionRun).filter(AIContractResolutionRun.organization_id == org_a).count() == 1
    assert (
        db.query(AIContractResolutionLink)
        .join(AIContractResolutionRun, AIContractResolutionLink.run_id == AIContractResolutionRun.id)
        .filter(AIContractResolutionRun.organization_id == org_a)
        .count()
        >= 1
    )

    app.dependency_overrides[get_current_user] = lambda: user_b
    link_response_b = client.post("/api/ai/contracts/link_suggest", json={"extraction": extraction_data})
    assert link_response_b.status_code == 200
    assert link_response_b.json().get("org_id") == str(org_b)

    resolve_payload_b = {
        **resolve_payload,
        "contract_hash": f"{contract_hash}_org_b",
    }
    resolve_response_b = client.post("/api/ai/contracts/resolve", json=resolve_payload_b)
    assert resolve_response_b.status_code == 200
    run_id_b = resolve_response_b.json()["run_id"]

    run_b = db.query(AIContractResolutionRun).filter(AIContractResolutionRun.id == run_id_b).first()
    assert run_b is not None
    assert run_b.organization_id == org_b
    assert db.query(AIContractResolutionRun).filter(AIContractResolutionRun.organization_id == org_a).count() == 1
    assert db.query(AIContractResolutionRun).filter(AIContractResolutionRun.organization_id == org_b).count() == 1

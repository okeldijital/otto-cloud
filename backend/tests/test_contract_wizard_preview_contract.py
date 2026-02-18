import os
import sys
import uuid

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

TEST_DB_FILE = "./test_contract_wizard_preview_contract.db"


def _pdf_bytes() -> bytes:
    writer = PyPDF2.PdfWriter()
    writer.add_blank_page(width=300, height=200)
    from io import BytesIO

    buf = BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_contract_wizard_preview_contract_shape(monkeypatch):
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(
        email="preview.contract@example.com",
        hashed_password="...",
        full_name="Preview",
        organization_id=uuid.UUID(int=8801),
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user

    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_LLM_EXTRACT_ENABLED", False, raising=False)

    with TestClient(app) as client:
        resp = client.post(
            "/api/ai/contracts/extract",
            files={"file": ("preview.pdf", _pdf_bytes(), "application/pdf")},
        )

    assert resp.status_code == 200
    body = resp.json()
    parties = body.get("parties") or []
    warnings = body.get("warnings") or []

    assert (len(parties) >= 1) or ("no_parties_detected" in warnings)
    if not (body.get("dates") or {}).get("end_date_specified", False):
        assert "no_end_date_specified" in warnings

    splits = body.get("splits") or []
    if parties and splits:
        assert any((s.get("party_display_name") or s.get("party_name")) for s in splits)

    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

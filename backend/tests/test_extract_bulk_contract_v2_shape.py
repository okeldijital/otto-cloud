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

TEST_DB_FILE = "./test_extract_bulk_contract_v2_shape.db"
FIXTURE = Path(__file__).resolve().parent / "fixtures" / "contracts" / "black_motion_abangoma.pdf"


def test_extract_bulk_v2_shape(monkeypatch):
    if not FIXTURE.exists():
        pytest.skip("fixture missing")
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(
        email="bulk.v2.shape@example.com",
        hashed_password="x",
        full_name="Bulk V2 Shape",
        organization_id=uuid.UUID(int=19201),
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)

    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user

    with TestClient(app) as client:
        with open(FIXTURE, "rb") as fh:
            res = client.post(
                "/api/ai/contracts/extract_bulk",
                files=[("files", ("shape.pdf", fh.read(), "application/pdf"))],
                headers={"X-Organization-ID": str(user.organization_id)},
            )

    assert res.status_code == 200
    payload = res.json()
    assert payload["status"] == "ok"
    assert isinstance(payload.get("results"), list) and len(payload["results"]) == 1
    row = payload["results"][0]
    assert "filename" in row
    assert "ok" in row
    assert "warnings" in row
    if row.get("ok"):
        data = row["extract"]["data"]
        assert isinstance(data.get("parties"), list)
        assert isinstance(data.get("tracks"), list)
        assert isinstance(data.get("splits"), list)
        assert isinstance(data.get("key_terms"), dict)
        dates = data.get("dates") or {}
        assert "contract_date" in dates
        assert "effective_date" in dates
        assert "expiration_date" in dates

    app.dependency_overrides.clear()
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

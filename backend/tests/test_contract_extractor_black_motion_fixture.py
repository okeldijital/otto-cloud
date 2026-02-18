import os
import sys
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.user import User

TEST_DB_FILE = "./test_contract_extractor_black_motion_fixture.db"
FIXTURE = Path(__file__).parent / "fixtures" / "contracts" / "black_motion_abangoma.pdf"


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


def test_black_motion_fixture_extract_regression(monkeypatch):
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = _upsert_user(db, "black.motion.fixture@example.com", uuid.UUID(int=9911))

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
        with FIXTURE.open("rb") as fh:
            resp = client.post(
                "/api/ai/contracts/extract",
                files={"file": ("black_motion_abangoma.pdf", fh, "application/pdf")},
            )

    assert resp.status_code == 200
    payload = resp.json()
    body = payload.get("data") if payload.get("version") == "v2" else payload

    parties = body.get("parties") or []
    by_role = {str(p.get("role", "")).lower(): p for p in parties}

    label = by_role.get("label")
    assert label and "m2kr" in (label.get("display_name") or "").lower()

    remix = by_role.get("remixer") or by_role.get("remix artist")
    assert remix and "spirit motion" in (remix.get("display_name") or "").lower()

    tracks = body.get("tracks_mentioned") or body.get("tracks") or []
    if tracks and isinstance(tracks[0], dict):
        track_values = [t.get("title", "") for t in tracks]
    else:
        track_values = tracks
    tracks_blob = " | ".join(track_values).lower()
    assert "abangoma cave mix" in tracks_blob
    assert "abangoma drum effect mix" in tracks_blob

    royalties = body.get("royalties") or body.get("splits") or []
    assert any(
        float(r.get("percent") or 0) == 30.0 and (
            "spirit motion" in ((r.get("party_name") or "").lower())
            or "spirit motion" in ((r.get("party_display_name") or "").lower())
            or (
                isinstance(r.get("party_ref"), int)
                and r["party_ref"] < len(parties)
                and "spirit motion" in (parties[r["party_ref"]].get("display_name", "").lower())
            )
        )
        for r in royalties
    )

    warnings = body.get("warnings") or []
    assert "no_end_date_specified" in warnings

    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

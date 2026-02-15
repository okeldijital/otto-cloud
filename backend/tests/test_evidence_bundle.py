import sys
import os
import json
import uuid
import pytest
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
from models.track import Track
from models.artist import Artist
from models.ai import AIAuditLog

def test_generate_evidence(tmp_path, monkeypatch):
    """
    Evidence bundle test MUST NOT touch the production DB.
    Uses tmp_path + dependency overrides to force the app onto an isolated, writable SQLite DB.
    Clears dependency_overrides at the end to avoid cross-test leakage.
    """
    db_file = tmp_path / "evidence_isolated.sqlite"
    sql_url = f"sqlite:///{db_file}"

    monkeypatch.setenv("OTTO_APP_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("OTTO_DB_PATH", str(db_file))

    engine = create_engine(sql_url, connect_args={"check_same_thread": False})
    IsolatedSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = IsolatedSessionLocal()
        try:
            yield db
        finally:
            db.close()

    org_a = uuid.UUID(int=42)
    org_b = uuid.UUID(int=999)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: type(
        "User",
        (),
        {"id": 1, "organization_id": org_a, "email": "admin@otto.com"},
    )

    settings.AI_ENABLED = True
    settings.AI_CONTRACT_INTEL_ENABLED = True
    settings.AUTH_DISABLED = True

    client = TestClient(app)
    db = IsolatedSessionLocal()
    try:
        db.add(Artist(name="Artist Alpha (Org A)", organization_id=org_a))
        db.add(Track(title="Track Alpha (Org A)", organization_id=org_a))
        db.add(Artist(name="Secret Artist (Org B)", organization_id=org_b))
        db.add(Track(title="Secret Track (Org B)", organization_id=org_b))
        db.commit()

        payload = {
            "extraction": {
                "contract_title": "Evidence Verification Agreement",
                "parties": [{"display_name": "Artist Alpha", "role": "Artist"}],
                "works_hints": {"tracks": ["Track Alpha"]},
                "splits": [],
                "parser_version": "v1.2.2",
            }
        }

        response = client.post("/api/ai/contracts/link_suggest", json=payload)
        assert response.status_code == 200
        evidence_json = response.json()

        audit_row = db.query(AIAuditLog).filter(AIAuditLog.organization_id == org_a).first()
        assert audit_row is not None
        assert audit_row.action == "contract_link_suggest"
        assert audit_row.request_hash and len(audit_row.request_hash) == 64

        artists = [a["display_name"] for a in evidence_json["suggestions"].get("artists", [])]
        assert "Artist Alpha (Org A)" in artists
        assert "Secret Artist (Org B)" not in artists

        # Governance: network suggestions may be enabled on this branch, but must remain org-isolated.
        for category in ("parties", "organizations"):
            for suggestion in evidence_json["suggestions"].get(category, []):
                assert "Secret" not in (suggestion.get("display_name") or "")
    finally:
        db.close()
        engine.dispose()
        app.dependency_overrides.clear()

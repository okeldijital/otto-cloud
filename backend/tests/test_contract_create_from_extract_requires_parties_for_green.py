import json
import os
import sys
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from database import Base, get_db
from dependencies import get_current_organization_id, get_current_user
from main import app
from models.artist import Artist
from models.track import Track
from models.user import User

TEST_DB_FILE = "./test_contract_create_from_extract_requires_parties_for_green.db"


def test_from_extract_completeness_red_without_parties_green_with_parties(tmp_path, monkeypatch):
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    org = uuid.UUID(int=24101)
    user = User(email="cfe.parties.green@example.com", hashed_password="x", full_name="CFE", organization_id=org, role="admin", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    track = Track(organization_id=org, track_id="TRK-CFE-GREEN", title="CFE Green Track")
    artist = Artist(organization_id=org, artist_id="ART-CFE-GREEN", name="CFE Green Artist")
    db.add_all([track, artist])
    db.commit()
    db.refresh(track)
    db.refresh(artist)

    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_WIZARD_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path / "uploads"), raising=False)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_organization_id] = lambda: org

    with TestClient(app) as client:
        payload_red = {
            "confirm_non_destructive": True,
            "idempotency_key": "sha256:cfe-red",
            "track_ids": [track.id],
            "extract_version": "v2",
            "extract": {
                "title": "Red Missing Parties",
                "type": "recording",
                "dates": {"effective_date": None, "end_date": None, "end_date_specified": False},
                "key_terms": {"territory": None, "governing_law": None, "term_text": None},
            },
            "party_links": [],
        }
        red = client.post(
            "/api/contracts/from_extract",
            files={"file": ("red.pdf", b"%PDF-1.4 body", "application/pdf")},
            data={"payload": json.dumps(payload_red)},
            headers={"X-Organization-ID": str(org)},
        )
        assert red.status_code == 200
        red_body = red.json()
        assert red_body["completeness"]["color"] == "red"
        assert "missing_parties" in red_body["completeness"]["missing"]

        payload_green = {
            "confirm_non_destructive": True,
            "idempotency_key": "sha256:cfe-green",
            "track_ids": [track.id],
            "extract_version": "v2",
            "extract": {
                "title": "Green With Parties",
                "type": "recording",
                "dates": {"effective_date": None, "end_date": None, "end_date_specified": False},
                "key_terms": {"territory": None, "governing_law": None, "term_text": None},
            },
            "party_links": [
                {"role": "artist", "entity_type": "artist", "entity_id": artist.id, "split_percent": 100}
            ],
        }
        green = client.post(
            "/api/contracts/from_extract",
            files={"file": ("green.pdf", b"%PDF-1.4 body", "application/pdf")},
            data={"payload": json.dumps(payload_green)},
            headers={"X-Organization-ID": str(org)},
        )
        assert green.status_code == 200
        green_body = green.json()
        assert green_body["completeness"]["color"] == "green"
        assert green_body["completeness"]["score"] == 100

    app.dependency_overrides.clear()
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

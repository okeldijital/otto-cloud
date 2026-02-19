import os
import sys
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_organization_id, get_current_user
from main import app
from models.contract import Contract, ContractDocument
from models.track import Track
from models.user import User

TEST_DB_FILE = "./test_contracts_bulk_parties_inline.db"


def test_bulk_party_and_track_batch_set_flow():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    org_a = uuid.UUID(int=21101)
    org_b = uuid.UUID(int=21102)
    user_a = User(email="bulk.party.inline.a@example.com", hashed_password="x", full_name="A", organization_id=org_a, role="admin", is_active=True)
    user_b = User(email="bulk.party.inline.b@example.com", hashed_password="x", full_name="B", organization_id=org_b, role="admin", is_active=True)
    db.add_all([user_a, user_b])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)

    track_a = Track(organization_id=org_a, track_id="TRK-BPI-A", title="Track A")
    track_b = Track(organization_id=org_b, track_id="TRK-BPI-B", title="Track B ORG_B_TOKEN")
    db.add_all([track_a, track_b])
    db.commit()
    db.refresh(track_a)
    db.refresh(track_b)

    contract = Contract(contract_number="CTR-BPI-1", organization_id=org_a, title="Bulk Inline Contract", status="Draft", created_by=user_a.id)
    db.add(contract)
    db.commit()
    db.refresh(contract)
    db.add(ContractDocument(contract_id=contract.id, organization_id=org_a, file_path="/uploads/x.pdf", file_name="x.pdf", version=1, uploaded_by=user_a.id))
    db.commit()

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user_a
    app.dependency_overrides[get_current_organization_id] = lambda: user_a.organization_id

    with TestClient(app) as client:
        search = client.get("/api/contracts/party_search", params={"q": "No Match"})
        assert search.status_code == 200
        assert isinstance(search.json().get("items"), list)

        create_artist = client.post("/api/contracts/party_create", json={"entity_type": "artist", "display_name": "Inline Artist"})
        assert create_artist.status_code == 201
        artist_payload = create_artist.json()
        assert artist_payload["entity_type"] == "artist"
        artist_id = artist_payload["id"]

        create_org = client.post("/api/contracts/party_create", json={"entity_type": "organization", "display_name": "Inline Org"})
        assert create_org.status_code == 201
        org_payload = create_org.json()

        missing_confirm = client.post(
            f"/api/contracts/{contract.id}/parties/batch_set",
            json={"items": [{"role": "artist", "entity_type": "artist", "entity_id": artist_id, "split_percent": 60}]},
        )
        assert missing_confirm.status_code == 422

        ok_parties = client.post(
            f"/api/contracts/{contract.id}/parties/batch_set",
            json={
                "confirm_non_destructive": True,
                "items": [
                    {"role": "artist", "entity_type": "artist", "entity_id": artist_id, "split_percent": 60},
                    {"role": "label", "entity_type": "organization", "entity_id": org_payload["id"], "split_percent": 40},
                ],
            },
        )
        assert ok_parties.status_code == 200
        assert ok_parties.json()["updated_count"] == 2
        assert ok_parties.json()["completeness"]["color"] == "red"  # still missing tracks/effective date

        cross_org_party = client.post(
            f"/api/contracts/{contract.id}/parties/batch_set",
            json={
                "confirm_non_destructive": True,
                "items": [{"role": "artist", "entity_type": "organization", "entity_id": 999999}],
            },
        )
        assert cross_org_party.status_code in {404, 400}

        missing_confirm_tracks = client.post(
            f"/api/contracts/{contract.id}/tracks/batch_set",
            json={"track_ids": [track_a.id]},
        )
        assert missing_confirm_tracks.status_code == 422

        cross_org_tracks = client.post(
            f"/api/contracts/{contract.id}/tracks/batch_set",
            json={"confirm_non_destructive": True, "track_ids": [track_b.id]},
        )
        assert cross_org_tracks.status_code == 403

        ok_tracks = client.post(
            f"/api/contracts/{contract.id}/tracks/batch_set",
            json={"confirm_non_destructive": True, "track_ids": [track_a.id]},
        )
        assert ok_tracks.status_code == 200
        assert ok_tracks.json()["linked_tracks_count"] == 1

        track_search = client.get("/api/tracks/search", params={"q": "Track", "limit": 20})
        assert track_search.status_code == 200
        body = track_search.json()
        assert body["status"] == "ok"
        assert body["org_id"] == str(org_a)
        assert "runtime" in body
        assert all("ORG_B_TOKEN" not in str(row) for row in body.get("items", []))

    app.dependency_overrides.clear()
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

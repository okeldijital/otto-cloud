import os
import sys
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.release import Release
from models.track import Track
from models.user import User

TEST_DB_FILE = "./test_ai_contract_track_map_plan.db"


def _seed(db):
    org_a = uuid.UUID(int=14101)
    org_b = uuid.UUID(int=14102)

    user_a = User(email="trackmap.a@example.com", hashed_password="...", full_name="A", organization_id=org_a, role="admin", is_active=True)
    user_b = User(email="trackmap.b@example.com", hashed_password="...", full_name="B", organization_id=org_b, role="admin", is_active=True)
    db.add_all([user_a, user_b])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)

    rel_a = Release(organization_id=org_a, release_id="REL-TMAP-A", title="Release A")
    rel_b = Release(organization_id=org_b, release_id="REL-TMAP-B", title="Release B ORG_B_TOKEN")
    db.add_all([rel_a, rel_b])
    db.commit()
    db.refresh(rel_a)
    db.refresh(rel_b)

    t1 = Track(organization_id=org_a, track_id="TRK-TMAP-A1", title="Black Motion Mix", release_id=rel_a.id)
    t2 = Track(organization_id=org_b, track_id="TRK-TMAP-B1", title="Hidden Org B Track ORG_B_TOKEN", release_id=rel_b.id)
    db.add_all([t1, t2])
    db.commit()
    db.refresh(t1)

    return {"user_a": user_a, "user_b": user_b, "org_a": org_a, "org_b": org_b, "track_a": t1}


def test_track_map_plan_gated_and_org_scoped(monkeypatch):
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    seeded = _seed(db)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_TRACK_MAP_ENABLED", False, raising=False)

    with TestClient(app) as client:
        disabled = client.post(
            "/api/ai/contracts/track_map_plan",
            json={
                "contract_extract_v2": {"tracks": [{"raw_mention": "Black Motion Mix"}]},
                "track_ids_hint": [],
                "max_results": 20,
            },
        )
        assert disabled.status_code == 404

    monkeypatch.setattr(settings, "AI_CONTRACT_TRACK_MAP_ENABLED", True, raising=False)

    with TestClient(app) as client:
        enabled = client.post(
            "/api/ai/contracts/track_map_plan",
            json={
                "contract_extract_v2": {"tracks": [{"raw_mention": "Black Motion Mix"}]},
                "track_ids_hint": [],
                "max_results": 20,
            },
        )
        assert enabled.status_code == 200
        body = enabled.json()
        assert body["mapping_version"] == "track_map_v1"
        assert body["org_id"] == str(seeded["org_a"])
        strategy = body["candidates"][0]["matches"][0]["strategy"]
        assert strategy in {"exact", "normalized_exact", "contains", "token_overlap", "heuristic_partial"}
        assert "ORG_B_TOKEN" not in str(body)

    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

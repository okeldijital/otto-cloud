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
from models.track import Track
from models.user import User

TEST_DB_FILE = "./test_tracks_by_ids_endpoint.db"


def test_tracks_by_ids_org_scoped():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    org_a = uuid.UUID(int=26101)
    org_b = uuid.UUID(int=26102)
    user_a = User(email="tracks.byids.a@example.com", hashed_password="x", full_name="A", organization_id=org_a, role="admin", is_active=True)
    db.add(user_a)
    db.commit()
    db.refresh(user_a)

    track_a = Track(organization_id=org_a, track_id="TRK-BYIDS-A", title="Track ByIds A")
    track_b = Track(organization_id=org_b, track_id="TRK-BYIDS-B", title="Track ByIds B ORG_B_TOKEN")
    db.add_all([track_a, track_b])
    db.commit()
    db.refresh(track_a)
    db.refresh(track_b)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user_a
    app.dependency_overrides[get_current_organization_id] = lambda: org_a

    with TestClient(app) as client:
        res = client.post("/api/tracks/by_ids", json={"ids": [track_a.id, track_b.id]})
        assert res.status_code == 200
        items = res.json().get("items") or []
        assert len(items) == 1
        assert items[0]["id"] == track_a.id
        assert items[0]["title"] == "Track ByIds A"
        assert all("ORG_B_TOKEN" not in str(row) for row in items)

    app.dependency_overrides.clear()
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

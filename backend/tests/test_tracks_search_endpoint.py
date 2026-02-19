import os
import sys
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.artist import Artist
from models.release import Release
from models.track import Track
from models.user import User

TEST_DB_FILE = "./test_tracks_search_endpoint.db"


def test_tracks_search_org_scoped():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    org_a = uuid.UUID(int=19301)
    org_b = uuid.UUID(int=19302)
    user_a = User(email="tracks.search.a@example.com", hashed_password="x", full_name="A", organization_id=org_a, role="admin", is_active=True)
    user_b = User(email="tracks.search.b@example.com", hashed_password="x", full_name="B", organization_id=org_b, role="admin", is_active=True)
    db.add_all([user_a, user_b])
    db.commit()

    artist_a = Artist(organization_id=org_a, artist_id="ART-TSA", name="Artist A")
    artist_b = Artist(organization_id=org_b, artist_id="ART-TSB", name="Artist B ORG_B_TOKEN")
    db.add_all([artist_a, artist_b])
    db.commit()
    db.refresh(artist_a)
    db.refresh(artist_b)

    rel_a = Release(organization_id=org_a, release_id="REL-TSA", title="Release A", artist_id=artist_a.id)
    rel_b = Release(organization_id=org_b, release_id="REL-TSB", title="Release B ORG_B_TOKEN", artist_id=artist_b.id)
    db.add_all([rel_a, rel_b])
    db.commit()
    db.refresh(rel_a)
    db.refresh(rel_b)

    db.add(Track(organization_id=org_a, track_id="TRK-TSA", title="Shared Query Song", release_id=rel_a.id))
    db.add(Track(organization_id=org_b, track_id="TRK-TSB", title="Shared Query Song ORG_B_TOKEN", release_id=rel_b.id))
    db.commit()

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user_a

    with TestClient(app) as client:
        res = client.get("/api/tracks/search", params={"q": "Shared Query Song", "limit": 20}, headers={"X-Organization-ID": str(org_a)})
        assert res.status_code == 200
        body = res.json()
        assert isinstance(body.get("items"), list)
        assert len(body["items"]) >= 1
        titles = [row.get("display_name") for row in body["items"]]
        assert "Shared Query Song" in titles
        assert all("ORG_B_TOKEN" not in str(row) for row in body["items"])
        row = body["items"][0]
        assert "id" in row
        assert "display_name" in row
        assert "artist" in row
        assert "release" in row

    app.dependency_overrides.clear()
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

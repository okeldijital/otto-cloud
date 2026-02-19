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
from models.user import User

TEST_DB_FILE = "./test_parties_search_org_scope.db"


def test_parties_search_is_org_scoped():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    org_a = uuid.UUID(int=23101)
    org_b = uuid.UUID(int=23102)

    user_a = User(email="party.search.a@example.com", hashed_password="x", full_name="A", organization_id=org_a, role="admin", is_active=True)
    user_b = User(email="party.search.b@example.com", hashed_password="x", full_name="B", organization_id=org_b, role="admin", is_active=True)
    db.add_all([user_a, user_b])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)

    db.add(Artist(organization_id=org_a, artist_id="ART-PS-A", name="Party Scope Artist A"))
    db.add(Artist(organization_id=org_b, artist_id="ART-PS-B", name="Party Scope Artist B ORG_B_TOKEN"))
    db.commit()

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user_a

    with TestClient(app) as client:
        res_a = client.get("/api/contracts/party_search", params={"q": "ORG_B_TOKEN"}, headers={"X-Organization-ID": str(org_a)})
        assert res_a.status_code == 200
        assert res_a.json()["items"] == []

        app.dependency_overrides[get_current_user] = lambda: user_b
        res_b = client.get("/api/contracts/party_search", params={"q": "ORG_B_TOKEN"}, headers={"X-Organization-ID": str(org_b)})
        assert res_b.status_code == 200
        assert len(res_b.json()["items"]) >= 1

    app.dependency_overrides.clear()
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

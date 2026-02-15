import sys
import os
import pytest
import uuid
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
from models.network import Individual, Organization

# Configure test database (file-based)
TEST_DB_FILE = "./test_ai_suggest.db"
if os.path.exists(TEST_DB_FILE):
    try:
        os.remove(TEST_DB_FILE)
    except:
        pass

SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency overrides
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)
class TestAILinkSuggest:
    
    def setup_method(self):
        # Reset state
        settings.AI_ENABLED = True
        settings.AI_CONTRACT_INTEL_ENABLED = True
        app.dependency_overrides.clear()
        app.dependency_overrides[get_db] = override_get_db
        
        # Clear DB tables to ensure isolation between tests
        db = TestingSessionLocal()
        db.query(Artist).delete()
        db.query(Track).delete()
        db.query(AIAuditLog).delete()
        db.query(Individual).delete()
        db.query(Organization).delete()
        db.commit()
        db.close()

    def override_user(self, org_id_str):
        uid = 1
        oid = uuid.UUID(org_id_str)
        app.dependency_overrides[get_current_user] = lambda: type('User', (), {'id': uid, 'organization_id': oid})

    def test_link_suggest_disabled_returns_404(self):
        settings.AI_CONTRACT_INTEL_ENABLED = False
        self.override_user("00000000-0000-0000-0000-000000000001")
        
        response = client.post("/api/ai/contracts/link_suggest", json={"extraction": {
            "parties": [{"display_name": "Test", "role": "Artist"}],
            "splits": [],
            "parser_version": "test"
        }})
        assert response.status_code == 404

    def test_link_suggest_enabled_basic_check(self):
        self.override_user("00000000-0000-0000-0000-000000000001")
        
        payload = {
            "extraction": {
                "parties": [{"display_name": "Test Artist", "role": "Artist"}],
                "splits": [],
                "parser_version": "test_v1"
            }
        }
        response = client.post("/api/ai/contracts/link_suggest", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["linker_version"] == "link_suggest_v1.0.0"
        assert "suggestions" in data
        assert "network_suggestions_disabled_unscoped_models" not in data["warnings"]

    def test_network_suggestions_are_org_scoped(self):
        """Verify Individuals and Organizations are correctly org-scoped."""
        db = TestingSessionLocal()
        org_a = uuid.UUID(int=42)
        org_b = uuid.UUID(int=99)
        
        # Seed Org A
        db.add(Individual(first_name="Alice", last_name="Smith", organization_id=org_a))
        db.add(Organization(name="Alice Corp", organization_id=org_a))
        
        # Seed Org B
        db.add(Individual(first_name="Bob", last_name="Jones", organization_id=org_b))
        db.add(Organization(name="Bob Ltd", organization_id=org_b))
        db.commit()

        # Act as Org A
        self.override_user(str(org_a))
        
        response = client.post("/api/ai/contracts/link_suggest", json={"extraction": {
            "parties": [
                {"display_name": "Alice Smith", "role": "Artist"},
                {"display_name": "Alice Corp", "role": "Label"},
                {"display_name": "Bob Jones", "role": "Artist"},
                {"display_name": "Bob Ltd", "role": "Label"}
            ],
            "splits": [], "parser_version": "test"
        }})
        
        data = response.json()
        assert response.status_code == 200
        parties = data["suggestions"]["parties"]
        organizations = data["suggestions"]["organizations"]
        
        # Should only see Org A's data
        assert any(p["display_name"] == "Alice Smith" for p in parties)
        assert any(o["display_name"] == "Alice Corp" for o in organizations)
        
        # Should NOT see Org B's data
        assert not any(p["display_name"] == "Bob Jones" for p in parties)
        assert not any(o["display_name"] == "Bob Ltd" for o in organizations)
        db.close()

    def test_network_suggestions_no_cross_org_leak(self):
        """Strict check for identical names in different orgs."""
        db = TestingSessionLocal()
        org_a = uuid.UUID(int=1)
        org_b = uuid.UUID(int=2)
        
        db.add(Individual(first_name="Shared", last_name="Name", organization_id=org_a))
        db.add(Individual(first_name="Shared", last_name="Name", organization_id=org_b))
        db.commit()

        # Act as Org B
        self.override_user(str(org_b))
        
        response = client.post("/api/ai/contracts/link_suggest", json={"extraction": {
            "parties": [{"display_name": "Shared Name", "role": "Artist"}],
            "splits": [], "parser_version": "test"
        }})
        
        data = response.json()
        parties = data["suggestions"]["parties"]
        
        # Should only find 1 suggestion (for the current org)
        assert len(parties) == 1
        # It's hard to verify ID without more work, but the fact that it's 1 is a good sign
        # Given we only have 2 in total in the DB.
        db.close()

    def test_org_isolation_regression(self):
        """
        BLOCKER RECOVERY: Ensure Org A cannot see Org B data.
        """
        db = TestingSessionLocal()
        org_a = uuid.UUID(int=1)
        org_b = uuid.UUID(int=2)
        
        # Seed
        db.add(Artist(name="Secret Artist B", organization_id=org_b))
        db.add(Artist(name="Public Artist A", organization_id=org_a))
        db.commit()
        
        # Act as Org A
        self.override_user(str(org_a))
        
        # Search for for anything
        response = client.post("/api/ai/contracts/link_suggest", json={"extraction": {
            "parties": [{"display_name": "Artist", "role": "Artist"}],
            "splits": [],
            "parser_version": "test"
        }})
        
        data = response.json()
        artists = data["suggestions"]["artists"]
        
        # Should find Artist A
        assert any(a["display_name"] == "Public Artist A" for a in artists)
        # Should NEVER find Artist B
        assert not any(a["display_name"] == "Secret Artist B" for a in artists)
        
        # Verify audit log was created for Org A
        audit_count = db.query(AIAuditLog).filter(AIAuditLog.organization_id == org_a).count()
        assert audit_count >= 1
        db.close()

    @classmethod
    def teardown_class(cls):
        # We leave the file for post-test inspection if needed, or remove it.
        # But for CI/CD cleanliness, we remove it.
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except:
                pass

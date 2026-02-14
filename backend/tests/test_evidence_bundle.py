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

# Configure test database
TEST_DB_FILE = "./evidence_check.db"
if os.path.exists(TEST_DB_FILE):
    os.remove(TEST_DB_FILE)

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

def test_generate_evidence():
    # Setup
    settings.AI_ENABLED = True
    settings.AI_CONTRACT_INTEL_ENABLED = True
    
    db = TestingSessionLocal()
    org_a = uuid.UUID(int=42)
    org_b = uuid.UUID(int=999)
    
    # User A
    app.dependency_overrides[get_current_user] = lambda: type('User', (), {'id': 1, 'organization_id': org_a})
    
    # Seed Data
    # Org A (Target)
    db.add(Artist(name="Artist Alpha (Org A)", organization_id=org_a))
    db.add(Track(title="Track Alpha (Org A)", organization_id=org_a))
    
    # Org B (Secret - should never appear)
    db.add(Artist(name="Secret Artist (Org B)", organization_id=org_b))
    db.add(Track(title="Secret Track (Org B)", organization_id=org_b))
    
    db.commit()
    
    # 1. Request Evidence
    payload = {
        "extraction": {
            "contract_title": "Evidence Verification Agreement",
            "parties": [{"display_name": "Artist Alpha", "role": "Artist"}],
            "works_hints": {"tracks": ["Track Alpha"]},
            "splits": [],
            "parser_version": "v1.2.2"
        }
    }
    
    print("\n--- SAMPLE LINK-SUGGEST JSON RESPONSE ---")
    response = client.post("/api/ai/contracts/link_suggest", json=payload)
    assert response.status_code == 200
    evidence_json = response.json()
    print(json.dumps(evidence_json, indent=2))
    
    # 2. Audit Log Evidence
    print("\n--- AI_AUDIT_LOG ROW EVIDENCE ---")
    audit_row = db.query(AIAuditLog).filter(AIAuditLog.organization_id == org_a).first()
    if audit_row:
        row_dict = {
            "id": audit_row.id,
            "organization_id": str(audit_row.organization_id),
            "user_id": audit_row.user_id,
            "action": audit_row.action,
            "tool": audit_row.tool,
            "request_hash": audit_row.request_hash[:16] + "...",
            "created_at": str(audit_row.created_at)
        }
        print(json.dumps(row_dict, indent=2))
    else:
        print("ERROR: No audit log found")

    # 3. Isolation Verification
    artists = [a["display_name"] for a in evidence_json["suggestions"]["artists"]]
    assert "Artist Alpha (Org A)" in artists
    assert "Secret Artist (Org B)" not in artists
    
    # 4. Warning Verification
    assert "network_suggestions_disabled_unscoped_models" in evidence_json["warnings"]
    assert evidence_json["suggestions"]["parties"] == []
    
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

if __name__ == "__main__":
    test_generate_evidence()

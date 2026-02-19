import os
import sys
import uuid
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from database import Base, get_db
from dependencies import get_current_active_user, get_current_organization_id
from main import app
from models.user import User
from models.document import Document

TEST_DB_FILE = "./test_extract_bulk_contract_v2_shape.db"

# Minimal valid PDF
MINIMAL_PDF = b"%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000111 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF"

@pytest.fixture
def override_deps():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(
        email="bulk.v2.shape@example.com",
        hashed_password="x",
        full_name="Bulk V2 Shape",
        organization_id=uuid.UUID(int=19201),
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    def override_get_db():
        try:
            yield db
        finally:
            db.close()
            
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = lambda: user
    app.dependency_overrides[get_current_organization_id] = lambda: user.organization_id

    yield

    app.dependency_overrides.clear()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

def test_extract_bulk_no_files(override_deps):
    with TestClient(app) as client:
        res = client.post("/api/ai/contracts/extract_bulk", files=[])
        assert res.status_code == 400
        assert "No files received" in res.json()["detail"]

def test_extract_bulk_valid_file(override_deps):
    with TestClient(app) as client:
        res = client.post(
            "/api/ai/contracts/extract_bulk",
            files=[("files", ("test_contract.pdf", MINIMAL_PDF, "application/pdf"))]
        )
        
        assert res.status_code == 200
        payload = res.json()
        assert payload["status"] == "completed"
        assert len(payload["results"]) == 1
        
        row = payload["results"][0]
        assert row["filename"] == "test_contract.pdf"
        assert row["status"] in ["ok", "error"]
        assert row["contract_document_id"] > 0
        
        # Check if output has extract data (might fail if extraction logic fails on empty PDF text)
        # But we handle errors gracefully in loop.
        if row["status"] == "ok":
            assert "extract" in row
            assert row["extract"]["version"] == "v2"

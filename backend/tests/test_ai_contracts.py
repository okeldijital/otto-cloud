import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app
from config import settings
from database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from io import BytesIO
import PyPDF2
import uuid

TEST_DB_FILE = "./test_ai_contracts_standalone.db"

@pytest.fixture(scope="module")
def engine():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

@pytest.fixture
def db(engine):
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def mock_pdf():
    writer = PyPDF2.PdfWriter()
    writer.add_blank_page(width=300, height=200)
    buf = BytesIO()
    writer.write(buf)
    buf.seek(0)
    return buf

class TestAIContractsDisabled:
    def test_extract_returns_404_when_ai_disabled(self, client, mock_pdf):
        settings.AI_ENABLED = False
        settings.AI_CONTRACT_INTEL_ENABLED = True
        
        response = client.post(
            "/api/ai/contracts/extract",
            files={"file": ("test.pdf", mock_pdf, "application/pdf")}
        )
        assert response.status_code == 404

    def test_extract_returns_404_when_intel_disabled(self, client, mock_pdf):
        settings.AI_ENABLED = True
        settings.AI_CONTRACT_INTEL_ENABLED = False
        
        response = client.post(
            "/api/ai/contracts/extract",
            files={"file": ("test.pdf", mock_pdf, "application/pdf")}
        )
        assert response.status_code == 404

class TestAIContractsEnabled:
    @pytest.fixture(autouse=True)
    def setup_flags(self):
        old_ai = settings.AI_ENABLED
        old_intel = settings.AI_CONTRACT_INTEL_ENABLED
        old_resolve = settings.AI_CONTRACT_RESOLVE_ENABLED
        
        settings.AI_ENABLED = True
        settings.AI_CONTRACT_INTEL_ENABLED = True
        settings.AI_CONTRACT_RESOLVE_ENABLED = True
        
        yield
        
        settings.AI_ENABLED = old_ai
        settings.AI_CONTRACT_INTEL_ENABLED = old_intel
        settings.AI_CONTRACT_RESOLVE_ENABLED = old_resolve

    def test_extract_endpoint_exists(self, client, mock_pdf):
        response = client.post(
            "/api/ai/contracts/extract",
            files={"file": ("test.pdf", mock_pdf, "application/pdf")}
        )
        assert response.status_code == 200
        body = response.json()
        assert body.get("version") == "v2"
        assert isinstance(body.get("data"), dict)

    def test_resolve_endpoint_exists(self, client):
        payload = {
            "contract_hash": "test_hash",
            "extractor_version": "v1",
            "linker_version": "v1",
            "decisions": []
        }
        response = client.post("/api/ai/contracts/resolve", json=payload)
        assert response.status_code == 200

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app
from config import settings
from io import BytesIO
import PyPDF2

client = TestClient(app)

@pytest.fixture
def mock_pdf():
    writer = PyPDF2.PdfWriter()
    writer.add_blank_page(width=300, height=200)
    buf = BytesIO()
    writer.write(buf)
    buf.seek(0)
    return buf

class TestAIContractsDisabled:
    def test_extract_returns_404_when_ai_disabled(self, mock_pdf):
        settings.AI_ENABLED = False
        settings.AI_CONTRACT_INTEL_ENABLED = True
        
        response = client.post(
            "/api/ai/contracts/extract",
            files={"file": ("test.pdf", mock_pdf, "application/pdf")}
        )
        assert response.status_code == 404

    def test_extract_returns_404_when_intel_disabled(self, mock_pdf):
        settings.AI_ENABLED = True
        settings.AI_CONTRACT_INTEL_ENABLED = False
        
        response = client.post(
            "/api/ai/contracts/extract",
            files={"file": ("test.pdf", mock_pdf, "application/pdf")}
        )
        assert response.status_code == 404

class TestAIContractsEnabled:
    def setup_method(self):
        settings.AI_ENABLED = True
        settings.AI_CONTRACT_INTEL_ENABLED = True
        settings.AI_CONTRACT_RESOLVE_ENABLED = True

    def test_extract_endpoint_exists(self, mock_pdf):
        # We expect a 200 if the route exists and we're auto-authenticated in this environment
        response = client.post(
            "/api/ai/contracts/extract",
            files={"file": ("test.pdf", mock_pdf, "application/pdf")}
        )
        assert response.status_code == 200
        body = response.json()
        assert body.get("version") == "v2"
        assert isinstance(body.get("data"), dict)

    def test_resolve_endpoint_exists(self):
        # We expect a 200 if payload is valid and resolver is enabled
        payload = {
            "contract_hash": "test_hash",
            "extractor_version": "v1",
            "linker_version": "v1",
            "decisions": []
        }
        response = client.post("/api/ai/contracts/resolve", json=payload)
        assert response.status_code == 200

# Note: Integration tests requiring auth and DB would follow the pattern in test_ai.py
# but target the /api/ai/contracts/* endpoints.

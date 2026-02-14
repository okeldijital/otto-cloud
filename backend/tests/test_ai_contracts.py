import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app
from config import settings
from io import BytesIO

client = TestClient(app)

@pytest.fixture
def mock_pdf():
    return BytesIO(b"%PDF-1.4\n1 0 obj\n<<\n/Title (Sample Contract)\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF")

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

    def test_extract_endpoint_exists(self, mock_pdf):
        # We expect a 200 if the route exists and we're auto-authenticated in this environment
        response = client.post(
            "/api/ai/contracts/extract",
            files={"file": ("test.pdf", mock_pdf, "application/pdf")}
        )
        assert response.status_code == 200

    def test_resolve_endpoint_exists(self):
        # We expect a 200 with no-op response if payload is empty
        # ResolveRequestV1() default returns needs_review=True
        response = client.post("/api/ai/contracts/resolve", json={})
        assert response.status_code == 200
        assert response.json()["needs_review"] is True

# Note: Integration tests requiring auth and DB would follow the pattern in test_ai.py
# but target the /api/ai/contracts/* endpoints.

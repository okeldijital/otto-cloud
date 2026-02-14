"""
AI Module Tests - Phase 1 (Simplified)
Core tests for read-only AI functionality.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app
from config import settings

client = TestClient(app)


class TestAIDisabled:
    """Test AI module when disabled"""
    
    def test_health_endpoint_works_when_disabled(self):
        """Health endpoint should work even when AI is disabled"""
        original_value = settings.AI_ENABLED
        settings.AI_ENABLED = False
        
        response = client.get("/api/ai/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["enabled"] == False
        
        settings.AI_ENABLED = original_value
    
    def test_tools_returns_404_when_disabled(self):
        """Tools endpoint should return 404 when AI is disabled"""
        original_value = settings.AI_ENABLED
        settings.AI_ENABLED = False
        
        # Try without auth (should get 404)
        response = client.get("/api/ai/tools")
        assert response.status_code == 404
        
        settings.AI_ENABLED = original_value
    
    def test_chat_returns_404_when_disabled(self):
        """Chat endpoint should return 404 when AI is disabled"""
        original_value = settings.AI_ENABLED
        settings.AI_ENABLED = False
        
        response = client.post(
            "/api/ai/chat",
            json={"message": "test"}
        )
        assert response.status_code == 404
        
        settings.AI_ENABLED = original_value


class TestAIAuthentication:
    """Test AI authentication requirements"""
    
    def setup_method(self):
        self.original_auth = settings.AUTH_DISABLED
        self.original_ai = settings.AI_ENABLED
        settings.AI_ENABLED = True
        settings.AUTH_DISABLED = False

    def teardown_method(self):
        settings.AUTH_DISABLED = self.original_auth
        settings.AI_ENABLED = self.original_ai

    def test_chat_requires_auth(self):
        """Chat endpoint should require authentication"""
        response = client.post(
            "/api/ai/chat",
            json={"message": "test"}
        )
        assert response.status_code == 401
    
    def test_tools_requires_auth(self):
        """Tools endpoint should require authentication"""
        response = client.get("/api/ai/tools")
        assert response.status_code == 401


class TestAIHealth:
    """Test AI health endpoint"""
    
    def test_health_when_enabled(self):
        """Health endpoint should report enabled status"""
        original_value = settings.AI_ENABLED
        settings.AI_ENABLED = True
        
        response = client.get("/api/ai/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["enabled"] == True
        assert "version" in data
        
        settings.AI_ENABLED = original_value
    
    def test_health_no_auth_required(self):
        """Health endpoint should not require authentication"""
        response = client.get("/api/ai/health")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

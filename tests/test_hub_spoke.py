import pytest
import os
import json
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from fastapi.routing import APIRoute

# Import the app safely
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from main import app

client = TestClient(app)

def test_node_info_endpoint():
    """Test /api/node/info returns correct structure from Env."""
    # Simulate HUB role via Env
    with patch.dict(os.environ, {"OTTO_NODE_ROLE": "hub", "OTTO_NODE_ID": "env-hub-id"}, clear=True):
        response = client.get("/api/node/info")
        assert response.status_code == 200
        data = response.json()
        assert data["nodeRole"] == "hub"
        assert data["nodeId"] == "env-hub-id"
        assert data["env_injected"] is True

def test_role_gating_hub_only():
    """Test that hub_only dependency blocks spokes."""
    # Set Env to SPOKE
    with patch.dict(os.environ, {"OTTO_NODE_ROLE": "spoke"}, clear=True):
        # Define route logic
        async def hub_only_route():
            from dependencies import require_hub_role
            await require_hub_role()
            return {"status": "ok"}
        
        # Manually insert route at beginning to bypass catch-all
        route = APIRoute("/test/hub-only", hub_only_route, methods=["GET"])
        app.router.routes.insert(0, route)
        
        try:
            # Test request
            response = client.get("/test/hub-only")
            assert response.status_code == 403
            assert response.json()["detail"]["code"] == "hub_only"
        finally:
            # Cleanup
            app.router.routes.remove(route)

def test_role_gating_spoke_only():
    """Test that spoke_only dependency blocks hubs."""
    # Set Env to HUB
    with patch.dict(os.environ, {"OTTO_NODE_ROLE": "hub"}, clear=True):
         # Define route logic
        async def spoke_only_route():
            from dependencies import require_spoke_role
            await require_spoke_role()
            return {"status": "ok"}

        # Manually insert route at beginning
        route = APIRoute("/test/spoke-only", spoke_only_route, methods=["GET"])
        app.router.routes.insert(0, route)
        
        try:
            # Test request
            response = client.get("/test/spoke-only")
            assert response.status_code == 403
            assert response.json()["detail"]["code"] == "spoke_only"
        finally:
            # Cleanup
            app.router.routes.remove(route)

def test_role_gating_hub_allowed():
    """Test that hub_only dependency allows hubs."""
    # Set Env to HUB
    with patch.dict(os.environ, {"OTTO_NODE_ROLE": "hub"}, clear=True):
        async def hub_allowed_route():
            from dependencies import require_hub_role
            await require_hub_role()
            return {"status": "ok"}
            
        route = APIRoute("/test/hub-allowed", hub_allowed_route, methods=["GET"])
        app.router.routes.insert(0, route)
        try:
            response = client.get("/test/hub-allowed")
            assert response.status_code == 200
        finally:
            app.router.routes.remove(route)

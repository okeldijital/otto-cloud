import pytest
from fastapi.testclient import TestClient
from main import app
from config import settings
from pathlib import Path

client = TestClient(app)

def test_scc_storage_usage_endpoint():
    """
    Test GET /api/admin/scc/storage/usage returns expected fields.
    """
    response = client.get("/api/admin/scc/storage/usage")
    assert response.status_code == 200
    data = response.json()
    
    assert "app_data_dir" in data
    assert "storage_root" in data
    assert "backup_root" in data
    assert "sizes" in data
    assert "storage_bytes" in data["sizes"]
    assert "backups_bytes" in data["sizes"]
    assert "contracts_bytes" in data["sizes"]
    assert "retention" in data
    assert "count" in data["retention"]
    assert "max_total_gb" in data["retention"]
    
    assert data["app_data_dir"] == settings.APP_DATA_DIR
    assert data["storage_root"] == settings.STORAGE_ROOT
    assert data["backup_root"] == settings.BACKUP_ROOT

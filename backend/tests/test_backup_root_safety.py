import pytest
from fastapi.testclient import TestClient
from main import app
from config import settings
import os
import shutil
from pathlib import Path

client = TestClient(app)

def test_backup_root_safety_checks():
    """
    Test that unsafe BACKUP_ROOT destinations are rejected with 422.
    """
    # 1. Test inside APP_DATA_DIR
    original_root = settings.BACKUP_ROOT
    original_storage = settings.STORAGE_ROOT
    original_logs = settings.IMPORT_LOGS_ROOT
    
    tmp_storage = Path("/tmp/otto_test_storage_safety")
    tmp_storage.mkdir(parents=True, exist_ok=True)
    settings.STORAGE_ROOT = str(tmp_storage)
    
    settings.BACKUP_ROOT = str(Path(settings.APP_DATA_DIR) / "nested_backups")
    Path(settings.BACKUP_ROOT).mkdir(parents=True, exist_ok=True)
    
    try:
        response = client.post("/api/admin/backups")
        assert response.status_code == 422
        data = response.json()
        assert data["detail"] == "unsafe_backup_root"
        assert "BACKUP_ROOT must not be inside APP_DATA_DIR" in data["hint"]
    finally:
        # Cleanup
        shutil.rmtree(settings.BACKUP_ROOT, ignore_errors=True)
        shutil.rmtree(tmp_storage, ignore_errors=True)
        settings.BACKUP_ROOT = original_root
        settings.STORAGE_ROOT = original_storage

def test_backup_root_safety_storage_root():
    """
    Test that unsafe BACKUP_ROOT inside STORAGE_ROOT is rejected.
    """
    original_root = settings.BACKUP_ROOT
    original_storage = settings.STORAGE_ROOT
    
    tmp_storage = Path("/tmp/otto_test_storage_safety_2")
    tmp_storage.mkdir(parents=True, exist_ok=True)
    settings.STORAGE_ROOT = str(tmp_storage)
    
    settings.BACKUP_ROOT = str(tmp_storage / "backups")
    Path(settings.BACKUP_ROOT).mkdir(parents=True, exist_ok=True)
    
    try:
        response = client.post("/api/admin/backups")
        assert response.status_code == 422
        data = response.json()
        assert data["detail"] == "unsafe_backup_root"
        assert "BACKUP_ROOT must not be inside APP_DATA_DIR or STORAGE_ROOT" in data["hint"]
    finally:
        # Cleanup
        shutil.rmtree(tmp_storage, ignore_errors=True)
        settings.BACKUP_ROOT = original_root
        settings.STORAGE_ROOT = original_storage

def test_safe_backup_root_works():
    """
    Test that a safe BACKUP_ROOT works.
    """
    original_root = settings.BACKUP_ROOT
    original_storage = settings.STORAGE_ROOT
    original_import = settings.IMPORT_LOGS_ROOT
    
    # Use a temp directory sibling to .otto or in /tmp for test
    safe_dir = Path("/tmp/otto_test_backups")
    safe_dir.mkdir(parents=True, exist_ok=True)
    
    tmp_storage = Path("/tmp/otto_test_storage_safe")
    tmp_storage.mkdir(parents=True, exist_ok=True)
    tmp_import = Path("/tmp/otto_test_import_safe")
    tmp_import.mkdir(parents=True, exist_ok=True)
    
    settings.BACKUP_ROOT = str(safe_dir)
    settings.STORAGE_ROOT = str(tmp_storage)
    settings.IMPORT_LOGS_ROOT = str(tmp_import)
    
    try:
        response = client.post("/api/admin/backups")
        # Depending on auth/env, might be 200 or 401. 
        # In dev/test with AUTH_DISABLED=True, it should be 200.
        assert response.status_code == 200
        assert response.json()["status"] == "uploaded"
    finally:
        shutil.rmtree(safe_dir, ignore_errors=True)
        shutil.rmtree(tmp_storage, ignore_errors=True)
        shutil.rmtree(tmp_import, ignore_errors=True)
        settings.BACKUP_ROOT = original_root
        settings.STORAGE_ROOT = original_storage
        settings.IMPORT_LOGS_ROOT = original_import

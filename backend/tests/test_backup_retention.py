import pytest
from fastapi.testclient import TestClient
from main import app
from config import settings
import os
import shutil
from pathlib import Path
from database import SessionLocal

client = TestClient(app)

def test_backup_retention_counts():
    """
    Create N+2 backups -> count reduced to N.
    """
    original_root = settings.BACKUP_ROOT
    original_count = settings.BACKUP_RETENTION_COUNT
    original_storage = settings.STORAGE_ROOT
    original_import = settings.IMPORT_LOGS_ROOT
    
    import uuid
    safe_uid = uuid.uuid4()
    safe_dir = Path(f"/tmp/otto_test_retention_{safe_uid}")
    safe_dir.mkdir(parents=True, exist_ok=True)
    
    tmp_storage = Path("/tmp/otto_test_storage_ret")
    tmp_storage.mkdir(parents=True, exist_ok=True)
    tmp_import = Path("/tmp/otto_test_import_ret")
    tmp_import.mkdir(parents=True, exist_ok=True)

    settings.BACKUP_ROOT = str(safe_dir)
    settings.BACKUP_RETENTION_COUNT = 3
    settings.STORAGE_ROOT = str(tmp_storage)
    settings.IMPORT_LOGS_ROOT = str(tmp_import)
    
    # Mock the user's organization_id if needed, 
    # but since we are using TestClient, we might need to override the dependency.
    # For OTTO, we can often just pass it in headers or it's hardcoded for dev.
    # Let's assume the test client uses the active org.
    
    try:
        # Create 5 backups
        for i in range(5):
            # Add a unique file to storage to ensure different SHAs
            test_file = tmp_storage / f"file_{i}.txt"
            test_file.write_text(f"content_{i}")
            
            response = client.post("/api/admin/backups")
            assert response.status_code == 200
            print(f"Created backup {i}: {response.json()}")
        
        # Check filesystem
        files = list(safe_dir.rglob("*.zip"))
        print(f"Files found in {safe_dir}: {[f.name for f in files]}")
        assert len(files) == 3
        
        # Check DB
        response = client.get("/api/admin/backups")
        assert response.status_code == 200
        data = response.json()
        backups = [b for b in data["backups"] if not b["is_pre_restore_snapshot"]]
        print(f"Non-snapshot backups in DB: {len(backups)}")
        assert len(backups) == 3
        
    finally:
        shutil.rmtree(safe_dir, ignore_errors=True)
        shutil.rmtree(tmp_storage, ignore_errors=True)
        shutil.rmtree(tmp_import, ignore_errors=True)
        settings.BACKUP_ROOT = original_root
        settings.BACKUP_RETENTION_COUNT = original_count
        settings.STORAGE_ROOT = original_storage
        settings.IMPORT_LOGS_ROOT = original_import

def test_backup_retention_size():
    """
    Test retention based on MAX_TOTAL_GB.
    """
    original_root = settings.BACKUP_ROOT
    original_size = settings.BACKUP_MAX_TOTAL_GB
    original_storage = settings.STORAGE_ROOT
    original_import = settings.IMPORT_LOGS_ROOT
    
    # Setup test env
    safe_dir = Path("/tmp/otto_test_retention_size")
    safe_dir.mkdir(parents=True, exist_ok=True)
    
    tmp_storage = Path("/tmp/otto_test_storage_ret_size")
    tmp_storage.mkdir(parents=True, exist_ok=True)
    tmp_import = Path("/tmp/otto_test_import_ret_size")
    tmp_import.mkdir(parents=True, exist_ok=True)

    settings.BACKUP_ROOT = str(safe_dir)
    # Set a very small limit: 0.0001 GB (~100 KB)
    settings.BACKUP_MAX_TOTAL_GB = 0.0001 
    settings.STORAGE_ROOT = str(tmp_storage)
    settings.IMPORT_LOGS_ROOT = str(tmp_import)
    
    try:
        # Create backups until we exceed limit.
        # Note: A real backup of OTTO might be larger than 100KB already.
        # If so, it should only keep the LATEST one.
        
        # 1st backup
        response = client.post("/api/admin/backups")
        assert response.status_code == 200
        
        # 2nd backup - should trigger pruning of the 1st one if size is > 100KB
        response = client.post("/api/admin/backups")
        assert response.status_code == 200
        
        response = client.get("/api/admin/backups")
        backups = response.json()["backups"]
        
        # Should keep at least one (the latest)
        assert len(backups) >= 1
        
        # If the size was really exceeded, it should be exactly 1
        # (Assuming the backup itself is > 100KB)
        # Let's check size of one backup
        if backups[0]["size_bytes"] > 100 * 1024:
            assert len(backups) == 1
        
    finally:
        shutil.rmtree(safe_dir, ignore_errors=True)
        shutil.rmtree(tmp_storage, ignore_errors=True)
        shutil.rmtree(tmp_import, ignore_errors=True)
        settings.BACKUP_ROOT = original_root
        settings.BACKUP_MAX_TOTAL_GB = original_size
        settings.STORAGE_ROOT = original_storage
        settings.IMPORT_LOGS_ROOT = original_import

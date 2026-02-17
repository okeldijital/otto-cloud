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
import main
from main import app
from models.user import User
from routes.auth import get_current_admin_user

TEST_DB_FILE = "./test_admin_backup_run_fix.db"


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
def db(engine, tmp_path):
    Session = sessionmaker(bind=engine)
    db = Session()

    old_storage = settings.STORAGE_ROOT
    old_db_url = settings.DATABASE_URL
    old_logs = settings.IMPORT_LOGS_ROOT

    settings.STORAGE_ROOT = str(tmp_path / "storage")
    settings.IMPORT_LOGS_ROOT = str(tmp_path / "import_logs")
    settings.DATABASE_URL = f"sqlite:///{tmp_path}/otto.sqlite"

    Path(settings.STORAGE_ROOT).mkdir(parents=True, exist_ok=True)
    Path(settings.IMPORT_LOGS_ROOT).mkdir(parents=True, exist_ok=True)
    Path(settings.DATABASE_URL.replace("sqlite:///", "")).write_bytes(b"sqlite-test")

    # Seed one file in storage to ensure backup captures storage without self-recursion.
    (Path(settings.STORAGE_ROOT) / "sample.txt").write_text("sample", encoding="utf-8")

    try:
        yield db
    finally:
        settings.STORAGE_ROOT = old_storage
        settings.DATABASE_URL = old_db_url
        settings.IMPORT_LOGS_ROOT = old_logs
        db.close()


@pytest.fixture
def client(db, monkeypatch):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    admin = db.query(User).filter(User.email == "admin.backup.runfix@example.com").first()
    if not admin:
        admin = User(
            email="admin.backup.runfix@example.com",
            hashed_password="x",
            full_name="Admin Backup RunFix",
            organization_id=uuid.UUID(int=1),
            role="admin",
            is_active=True,
            is_superuser=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin_user] = lambda: admin
    monkeypatch.setattr(main, "run_preflight_checks", lambda: None)
    monkeypatch.setattr(main, "_run_migrations", lambda: None)
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


def test_run_backup_post_creates_row_and_is_listed(client):
    created = client.post("/api/admin/backups")
    assert created.status_code == 200
    payload = created.json()
    assert payload["status"] == "uploaded"
    assert payload["backup_id"] > 0
    assert payload["filename"].endswith(".zip")

    listed = client.get("/api/admin/backups")
    assert listed.status_code == 200
    backups = listed.json().get("backups", [])
    assert any(row["id"] == payload["backup_id"] for row in backups)

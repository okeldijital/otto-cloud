import io
import os
import sys
import uuid
import zipfile
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

TEST_DB_FILE = "./test_admin_backups_routing.db"


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
    settings.STORAGE_ROOT = str(tmp_path / "storage")
    settings.DATABASE_URL = f"sqlite:///{tmp_path}/otto.sqlite"
    Path(settings.STORAGE_ROOT).mkdir(parents=True, exist_ok=True)
    try:
        yield db
    finally:
        settings.STORAGE_ROOT = old_storage
        settings.DATABASE_URL = old_db_url
        db.close()


@pytest.fixture
def client(db, monkeypatch):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    admin = db.query(User).filter(User.email == "admin.backup.routing@example.com").first()
    if not admin:
        admin = User(
            email="admin.backup.routing@example.com",
            hashed_password="x",
            full_name="Admin Backup Routing",
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
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _zip_bytes() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("otto.sqlite", "sqlite-placeholder")
    return buf.getvalue()


def test_get_upload_path_is_not_html(client):
    response = client.get("/api/admin/backups/upload")
    assert response.status_code in (404, 405)
    assert "text/html" not in (response.headers.get("content-type") or "")


def test_post_upload_returns_json_not_html(client):
    content = _zip_bytes()
    response = client.post(
        "/api/admin/backups/upload",
        files={"file": ("routing_test.zip", content, "application/zip")},
    )
    assert response.status_code in (200, 400, 413, 422)
    assert "application/json" in (response.headers.get("content-type") or "")

import io
import json
import os
import sqlite3
import sys
import uuid
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import main
from config import settings
from database import Base, get_db
from main import app
from models.user import User
from routes.auth import get_current_admin_user

TEST_DB_FILE = "./test_admin_restore_preflight.db"


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
    old_restore_enabled = settings.ADMIN_RESTORE_ENABLED
    settings.STORAGE_ROOT = str(tmp_path / "storage")
    settings.IMPORT_LOGS_ROOT = str(tmp_path / "import_logs")
    settings.DATABASE_URL = f"sqlite:///{tmp_path}/otto.sqlite"
    settings.ADMIN_RESTORE_ENABLED = True
    Path(settings.STORAGE_ROOT).mkdir(parents=True, exist_ok=True)
    Path(settings.IMPORT_LOGS_ROOT).mkdir(parents=True, exist_ok=True)
    _seed_core_sqlite(Path(settings.DATABASE_URL.replace("sqlite:///", "")))
    try:
        yield db
    finally:
        settings.STORAGE_ROOT = old_storage
        settings.DATABASE_URL = old_db_url
        settings.IMPORT_LOGS_ROOT = old_logs
        settings.ADMIN_RESTORE_ENABLED = old_restore_enabled
        db.close()


def _seed_core_sqlite(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    cur = con.cursor()
    cur.execute("create table if not exists artists (id integer primary key, name text)")
    cur.execute("create table if not exists tracks (id integer primary key, title text)")
    cur.execute("create table if not exists works (id integer primary key, title text)")
    cur.execute("create table if not exists releases (id integer primary key, title text)")
    cur.execute("create table if not exists organizations (id integer primary key, name text)")
    cur.execute("create table if not exists individuals (id integer primary key, name text)")
    cur.execute("create table if not exists users (id integer primary key, email text)")
    cur.execute("create table if not exists alembic_version (version_num text primary key)")
    cur.execute("create table if not exists admin_restore_audit (id integer primary key, organization_id integer, user_id integer, backup_id integer, pre_restore_snapshot_id integer, request_hash text, result text, error_hash text, created_at text)")
    cur.execute("create table if not exists admin_backup_artifacts (id integer primary key, organization_id integer, created_by integer, backup_kind text, filename text, file_path text, size_bytes integer, sha256 text, is_pre_restore_snapshot integer, source_backup_id integer, created_at text)")
    cur.execute("create table if not exists admin_backup_restore_events (id integer primary key, backup_id integer, snapshot_backup_id integer, initiator_user_id integer, initiator_org_id integer, status text, error text, duration_ms integer, created_at text)")
    cur.execute("insert into artists(name) values ('A1')")
    cur.execute("insert into tracks(title) values ('T1')")
    cur.execute("insert into works(title) values ('W1')")
    cur.execute("insert into releases(title) values ('R1')")
    cur.execute("insert into organizations(name) values ('O1')")
    cur.execute("insert into individuals(name) values ('I1')")
    cur.execute("insert into users(email) values ('admin@otto.com')")
    cur.execute("insert or replace into alembic_version(version_num) values ('test')")
    con.commit()
    con.close()


@pytest.fixture
def client(db, monkeypatch):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    admin = db.query(User).filter(User.email == "admin.restore.preflight@example.com").first()
    if not admin:
        admin = User(
            email="admin.restore.preflight@example.com",
            hashed_password="x",
            full_name="Admin Restore Preflight",
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


def _zip_payload(include_manifest: bool) -> bytes:
    db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))
    db_bytes = db_path.read_bytes()
    checksum = __import__("hashlib").sha256(db_bytes).hexdigest()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("otto.sqlite", db_bytes)
        if include_manifest:
            zf.writestr("manifest.json", json.dumps({"version": 1, "checksums": {"otto.sqlite": checksum}}))
    return buf.getvalue()


def test_restore_confirmation_required(client):
    uploaded = client.post(
        "/api/admin/backups/upload",
        files={"file": ("confirm.zip", _zip_payload(include_manifest=True), "application/zip")},
    )
    assert uploaded.status_code == 200
    backup_id = uploaded.json()["backup_id"]

    restored = client.post("/api/admin/backups/restore", json={"backup_id": backup_id, "confirm": False})
    assert restored.status_code == 422
    assert restored.json()["detail"] == "confirmation required"


def test_restore_preflight_missing_manifest(client):
    uploaded = client.post(
        "/api/admin/backups/upload",
        files={"file": ("missing_manifest.zip", _zip_payload(include_manifest=False), "application/zip")},
    )
    assert uploaded.status_code == 200
    backup_id = uploaded.json()["backup_id"]

    restored = client.post("/api/admin/backups/restore", json={"backup_id": backup_id, "confirm": True})
    assert restored.status_code == 400
    assert restored.json()["detail"] == "missing_manifest"

import io
import os
import sqlite3
import sys
import uuid
import zipfile
from pathlib import Path

import pytest
from fastapi import HTTPException, status
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
from services.admin_backup import service as backup_service

TEST_DB_FILE = "./test_admin_backups_a_grade.db"


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
    _seed_core_sqlite(Path(settings.DATABASE_URL.replace("sqlite:///", "")))
    try:
        yield db
    finally:
        settings.STORAGE_ROOT = old_storage
        settings.DATABASE_URL = old_db_url
        settings.IMPORT_LOGS_ROOT = old_logs
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
    cur.execute(
        """
        create table if not exists admin_backup_artifacts (
            id integer primary key,
            organization_id integer,
            created_by integer,
            backup_kind text,
            filename text,
            file_path text,
            size_bytes integer,
            sha256 text,
            is_pre_restore_snapshot integer,
            source_backup_id integer,
            created_at text
        )
        """
    )
    cur.execute(
        """
        create table if not exists admin_restore_audit (
            id integer primary key,
            organization_id integer,
            user_id integer,
            backup_id integer,
            pre_restore_snapshot_id integer,
            request_hash text,
            result text,
            error_hash text,
            created_at text
        )
        """
    )
    cur.execute("insert into artists(name) values ('A1')")
    cur.execute("insert into tracks(title) values ('T1')")
    cur.execute("insert into works(title) values ('W1')")
    cur.execute("insert into releases(title) values ('R1')")
    cur.execute("insert into organizations(name) values ('O1')")
    cur.execute("insert into individuals(name) values ('I1')")
    con.commit()
    con.close()


@pytest.fixture
def seeded_users(db):
    admin_a = db.query(User).filter(User.email == "admin.backup.a@example.com").first()
    if not admin_a:
        admin_a = User(
            email="admin.backup.a@example.com",
            hashed_password="x",
            full_name="Admin A",
            organization_id=uuid.UUID(int=101),
            role="admin",
            is_active=True,
            is_superuser=True,
        )
        db.add(admin_a)
    admin_b = db.query(User).filter(User.email == "admin.backup.b@example.com").first()
    if not admin_b:
        admin_b = User(
            email="admin.backup.b@example.com",
            hashed_password="x",
            full_name="Admin B",
            organization_id=uuid.UUID(int=102),
            role="admin",
            is_active=True,
            is_superuser=True,
        )
        db.add(admin_b)
    db.commit()
    db.refresh(admin_a)
    db.refresh(admin_b)
    return {"admin_a": admin_a, "admin_b": admin_b}


def _make_client(db, admin_user):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin_user] = lambda: admin_user
    main.run_preflight_checks = lambda: None
    main._run_migrations = lambda: None
    return TestClient(app, raise_server_exceptions=False)


def _zip_payload(db_marker="original", include_storage=False, zip_slip=False):
    buf = io.BytesIO()
    db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))
    db_bytes = db_path.read_bytes() if db_path.exists() else b""
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("otto.sqlite", db_bytes)
        if include_storage:
            zf.writestr("storage/example.txt", "ok")
        if zip_slip:
            zf.writestr("../evil.txt", "bad")
    return buf.getvalue()


def _core_counts_sqlite(path: Path):
    con = sqlite3.connect(path)
    cur = con.cursor()
    out = {}
    for table in ["artists", "tracks", "works", "releases", "organizations", "individuals"]:
        cur.execute(f"select count(*) from {table}")
        out[table] = cur.fetchone()[0]
    con.close()
    return out


def test_upload_success_and_bad_extension_and_bad_signature(db, seeded_users):
    with _make_client(db, seeded_users["admin_a"]) as client:
        ok = client.post("/api/admin/backups/upload", files={"file": ("good.zip", _zip_payload(), "application/zip")})
        assert ok.status_code == 200
        payload = ok.json()
        assert payload["status"] == "uploaded"
        assert payload["organization_id"] == str(seeded_users["admin_a"].organization_id)

        bad_ext = client.post("/api/admin/backups/upload", files={"file": ("bad.txt", b"x", "text/plain")})
        assert bad_ext.status_code == 400

        bad_sig = client.post("/api/admin/backups/upload", files={"file": ("bad.zip", b"not-a-zip", "application/zip")})
        assert bad_sig.status_code == 400


def test_upload_forbidden_non_admin(db, seeded_users):
    def deny():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin only")

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin_user] = deny
    with TestClient(app) as client:
        resp = client.post("/api/admin/backups/upload", files={"file": ("x.zip", _zip_payload(), "application/zip")})
        assert resp.status_code == 403
    app.dependency_overrides.clear()


def test_org_isolation_list_and_restore_scope(db, seeded_users):
    with _make_client(db, seeded_users["admin_a"]) as client_a:
        upload_a = client_a.post("/api/admin/backups/upload", files={"file": ("a.zip", _zip_payload("A"), "application/zip")})
        assert upload_a.status_code == 200
        backup_a_id = upload_a.json()["backup_id"]

    with _make_client(db, seeded_users["admin_b"]) as client_b:
        upload_b = client_b.post("/api/admin/backups/upload", files={"file": ("b.zip", _zip_payload("B"), "application/zip")})
        assert upload_b.status_code == 200
        list_b = client_b.get("/api/admin/backups")
        assert list_b.status_code == 200
        ids_b = {row["id"] for row in list_b.json()["backups"]}
        assert backup_a_id not in ids_b

    with _make_client(db, seeded_users["admin_a"]) as client_a:
        denied = client_a.post("/api/admin/backups/restore", json={"backup_id": upload_b.json()["backup_id"]})
        assert denied.status_code == 404


def test_restore_success_creates_pre_snapshot_and_audit(db, seeded_users):
    db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))
    before_counts = _core_counts_sqlite(db_path)

    with _make_client(db, seeded_users["admin_a"]) as client:
        uploaded = client.post(
            "/api/admin/backups/upload",
            files={"file": ("restore_ok.zip", _zip_payload("restore", include_storage=True), "application/zip")},
        )
        assert uploaded.status_code == 200
        backup_id = uploaded.json()["backup_id"]

        restored = client.post("/api/admin/backups/restore", json={"backup_id": backup_id})
        assert restored.status_code == 200
        payload = restored.json()
        assert payload["status"] == "restored"
        assert payload["pre_restore_snapshot_id"] is not None

    assert _core_counts_sqlite(db_path) == before_counts


def test_restore_preflight_zip_slip_fails(db, seeded_users):
    with _make_client(db, seeded_users["admin_a"]) as client:
        uploaded = client.post(
            "/api/admin/backups/upload",
            files={"file": ("zip_slip.zip", _zip_payload(zip_slip=True), "application/zip")},
        )
        assert uploaded.status_code == 400


def test_restore_atomicity_on_mid_failure(db, seeded_users, monkeypatch):
    db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))
    before_bytes = db_path.read_bytes()

    with _make_client(db, seeded_users["admin_a"]) as client:
        uploaded = client.post(
            "/api/admin/backups/upload",
            files={"file": ("atomic.zip", _zip_payload("atomic", include_storage=True), "application/zip")},
        )
        assert uploaded.status_code == 200
        backup_id = uploaded.json()["backup_id"]

        original_replace = backup_service.os.replace

        state = {"count": 0}

        def fail_on_second_replace(src, dst):
            state["count"] += 1
            if state["count"] == 2:
                raise RuntimeError("forced_mid_restore_failure")
            return original_replace(src, dst)

        monkeypatch.setattr(backup_service.os, "replace", fail_on_second_replace)
        failed = client.post("/api/admin/backups/restore", json={"backup_id": backup_id})
        assert failed.status_code == 500 or failed.status_code == 422

    after_bytes = db_path.read_bytes()
    assert before_bytes == after_bytes

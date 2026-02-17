import os
import sqlite3
import sys
import uuid
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from database import Base
import models  # noqa: F401
from models.admin_backup import AdminBackupArtifact
from models.user import User
from services.admin_backup.service import create_manual_backup, restore_backup

TEST_DB_FILE = "./test_admin_restore_atomicity.db"


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
    _seed_restore_db(Path(settings.DATABASE_URL.replace("sqlite:///", "")))
    try:
        yield db
    finally:
        settings.STORAGE_ROOT = old_storage
        settings.DATABASE_URL = old_db_url
        settings.IMPORT_LOGS_ROOT = old_logs
        db.close()


def _seed_restore_db(path: Path):
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
    cur.execute("create table if not exists sentinel (name text primary key)")
    cur.execute("insert or ignore into organizations(id,name) values (1,'Org')")
    cur.execute("insert or ignore into users(id,email) values (1,'admin@otto.com')")
    cur.execute("insert or replace into alembic_version(version_num) values ('test')")
    cur.execute("insert or replace into sentinel(name) values ('before')")
    con.commit()
    con.close()


def _sentinel_values(path: Path):
    con = sqlite3.connect(path)
    cur = con.cursor()
    cur.execute("select name from sentinel order by name")
    vals = [r[0] for r in cur.fetchall()]
    con.close()
    return vals


def _restore_event_count(path: Path, backup_id: int, status: str):
    con = sqlite3.connect(path)
    cur = con.cursor()
    cur.execute("select count(*) from admin_backup_restore_events where backup_id=? and status=?", (backup_id, status))
    out = cur.fetchone()[0]
    con.close()
    return out


def test_restore_reverts_data_and_records_events(db):
    admin = db.query(User).filter(User.email == "admin.restore.atomicity@example.com").first()
    if not admin:
        admin = User(
            email="admin.restore.atomicity@example.com",
            hashed_password="x",
            full_name="Admin Restore Atomicity",
            organization_id=uuid.UUID(int=1),
            role="admin",
            is_active=True,
            is_superuser=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    backup_row = create_manual_backup(db=db, org_id=admin.organization_id, user_id=admin.id)
    backup_id = backup_row.id

    db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    cur.execute("insert or replace into sentinel(name) values ('after')")
    con.commit()
    con.close()
    assert _sentinel_values(db_path) == ["after", "before"]

    result = restore_backup(db=db, org_id=admin.organization_id, user_id=admin.id, backup_id=backup_id, confirm=True)
    assert result["status"] == "restored"
    assert result["pre_restore_snapshot_id"] > 0

    post_vals = _sentinel_values(db_path)
    assert "before" in post_vals
    assert "after" not in post_vals

    assert _restore_event_count(db_path, backup_id, "succeeded") >= 1
    assert (
        db.query(AdminBackupArtifact)
        .filter(AdminBackupArtifact.is_pre_restore_snapshot.is_(True), AdminBackupArtifact.source_backup_id == backup_id)
        .count()
        >= 1
    )

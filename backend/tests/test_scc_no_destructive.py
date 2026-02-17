import os
import sqlite3
import sys
import uuid
from pathlib import Path

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

TEST_DB_FILE = "./test_scc_no_destructive.db"


def _seed_core_tables(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    cur = con.cursor()
    cur.execute("create table if not exists artists (id integer primary key, name text)")
    cur.execute("create table if not exists tracks (id integer primary key, title text)")
    cur.execute("create table if not exists works (id integer primary key, title text)")
    cur.execute("create table if not exists releases (id integer primary key, title text)")
    cur.execute("create table if not exists organizations (id integer primary key, name text)")
    cur.execute("create table if not exists individuals (id integer primary key, name text)")
    cur.execute("create table if not exists contracts (id integer primary key, title text)")
    cur.execute("insert into artists(name) values ('a')")
    cur.execute("insert into tracks(title) values ('t')")
    cur.execute("insert into works(title) values ('w')")
    cur.execute("insert into releases(title) values ('r')")
    cur.execute("insert into organizations(name) values ('o')")
    cur.execute("insert into individuals(name) values ('i')")
    cur.execute("insert into contracts(title) values ('c')")
    con.commit()
    con.close()


def _counts(path: Path):
    con = sqlite3.connect(path)
    cur = con.cursor()
    out = {}
    for table in ["artists", "tracks", "works", "releases", "organizations", "individuals", "contracts"]:
        cur.execute(f"select count(*) from {table}")
        out[table] = cur.fetchone()[0]
    con.close()
    return out


def test_scc_runtime_inventory_switch_no_core_mutation(tmp_path, monkeypatch):
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    old_storage = settings.STORAGE_ROOT
    old_logs = settings.IMPORT_LOGS_ROOT
    old_db_url = settings.DATABASE_URL
    old_app_data = settings.APP_DATA_DIR
    old_pointer = settings.ACTIVE_DB_POINTER_FILE

    app_data = tmp_path / "app_data"
    current_db = app_data / "db" / "otto.sqlite"
    candidate_db = app_data / "db" / "other.sqlite"
    _seed_core_tables(current_db)
    _seed_core_tables(candidate_db)

    settings.APP_DATA_DIR = str(app_data)
    settings.DATABASE_URL = f"sqlite:///{current_db}"
    settings.STORAGE_ROOT = str(app_data / "storage")
    settings.IMPORT_LOGS_ROOT = str(app_data / "import_logs")
    settings.ACTIVE_DB_POINTER_FILE = str(app_data / "runtime" / "active_db.json")
    Path(settings.ACTIVE_DB_POINTER_FILE).parent.mkdir(parents=True, exist_ok=True)

    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("OTTO_DB_PATH", raising=False)

    admin = User(
        email="scc.nodestructive.admin@otto.com",
        hashed_password="x",
        full_name="SCC Non Destructive Admin",
        organization_id=uuid.UUID(int=1),
        role="admin",
        is_active=True,
        is_superuser=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin_user] = lambda: admin
    main.run_preflight_checks = lambda: None
    main._run_migrations = lambda: None

    before = _counts(current_db)

    with TestClient(app, raise_server_exceptions=False) as client:
        assert client.get("/api/admin/scc/runtime").status_code == 200
        inv = client.get("/api/admin/scc/db/inventory")
        assert inv.status_code == 200
        candidate_id = None
        for row in inv.json().get("options", []):
            if row.get("db_path") == str(candidate_db.resolve()):
                candidate_id = row.get("db_id")
                break
        assert candidate_id is not None
        switched = client.post(
            "/api/admin/scc/db/switch",
            json={"db_id": candidate_id, "confirm": True},
        )
        assert switched.status_code == 200

    after = _counts(current_db)
    assert before == after
    assert Path(settings.ACTIVE_DB_POINTER_FILE).exists()

    app.dependency_overrides.clear()
    settings.STORAGE_ROOT = old_storage
    settings.IMPORT_LOGS_ROOT = old_logs
    settings.DATABASE_URL = old_db_url
    settings.APP_DATA_DIR = old_app_data
    settings.ACTIVE_DB_POINTER_FILE = old_pointer
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

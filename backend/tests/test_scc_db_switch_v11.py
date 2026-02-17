import json
import os
import sqlite3
import sys
import uuid
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

TEST_DB_FILE = "./test_scc_db_switch_v11.db"


def _create_sqlite(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.execute("create table if not exists artists (id integer primary key, name text)")
    con.execute("insert into artists(name) values ('x')")
    con.commit()
    con.close()


def _count_artists(path: Path) -> int:
    con = sqlite3.connect(path)
    cur = con.cursor()
    cur.execute("select count(*) from artists")
    value = cur.fetchone()[0]
    con.close()
    return value


@pytest.fixture
def scc_env(tmp_path):
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    old_db_url = settings.DATABASE_URL
    old_app_data = settings.APP_DATA_DIR
    old_storage = settings.STORAGE_ROOT
    old_logs = settings.IMPORT_LOGS_ROOT
    old_pointer = settings.ACTIVE_DB_POINTER_FILE

    app_data = tmp_path / "app_data"
    current_db = app_data / "db" / "otto.sqlite"
    target_db = app_data / "db" / "target.sqlite"
    _create_sqlite(current_db)
    _create_sqlite(target_db)

    bad_file = app_data / "db" / "bad.sqlite"
    bad_file.parent.mkdir(parents=True, exist_ok=True)
    bad_file.write_text("not sqlite", encoding="utf-8")

    external_root = tmp_path / "external"
    external_db = external_root / "external.sqlite"
    _create_sqlite(external_db)

    settings.APP_DATA_DIR = str(app_data)
    settings.DATABASE_URL = f"sqlite:///{current_db}"
    settings.STORAGE_ROOT = str(app_data / "storage")
    settings.IMPORT_LOGS_ROOT = str(app_data / "import_logs")
    settings.ACTIVE_DB_POINTER_FILE = str(app_data / "runtime" / "active_db.json")
    Path(settings.ACTIVE_DB_POINTER_FILE).parent.mkdir(parents=True, exist_ok=True)

    admin = User(
        email="scc.v11.switch@otto.com",
        hashed_password="x",
        full_name="SCC v11 Switch",
        organization_id=uuid.UUID(int=1),
        role="admin",
        is_active=True,
        is_superuser=True,
    )
    db.add(admin)
    db.commit()

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin_user] = lambda: admin
    main.run_preflight_checks = lambda: None
    main._run_migrations = lambda: None

    with TestClient(app, raise_server_exceptions=False) as client:
        inv = client.get("/api/admin/scc/db/inventory")
        opts = inv.json().get("options", [])
        target_db_id = next(row["db_id"] for row in opts if row["db_path"] == str(target_db.resolve()))
        yield {
            "client": client,
            "current_db": current_db,
            "target_db": target_db,
            "target_db_id": target_db_id,
            "bad_file": bad_file,
            "external_db": external_db,
        }

    app.dependency_overrides.clear()
    settings.DATABASE_URL = old_db_url
    settings.APP_DATA_DIR = old_app_data
    settings.STORAGE_ROOT = old_storage
    settings.IMPORT_LOGS_ROOT = old_logs
    settings.ACTIVE_DB_POINTER_FILE = old_pointer
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)


def test_db_switch_requires_confirm(scc_env):
    resp = scc_env["client"].post(
        "/api/admin/scc/db/switch",
        json={"db_id": scc_env["target_db_id"], "confirm": False},
    )
    assert resp.status_code == 422


def test_db_switch_rejects_unknown_db_id(scc_env):
    resp = scc_env["client"].post(
        "/api/admin/scc/db/switch",
        json={"db_id": "sha256:missing", "confirm": True},
    )
    assert resp.status_code == 404


def test_db_switch_writes_pointer_only(scc_env):
    before_count = _count_artists(scc_env["current_db"])
    resp = scc_env["client"].post(
        "/api/admin/scc/db/switch",
        json={"db_id": scc_env["target_db_id"], "confirm": True},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["active"]["requires_restart"] is True
    pointer = json.loads(Path(settings.ACTIVE_DB_POINTER_FILE).read_text(encoding="utf-8"))
    assert pointer["database_url"] == f"sqlite:///{scc_env['target_db'].resolve()}"
    assert _count_artists(scc_env["current_db"]) == before_count


def test_db_switch_rejects_non_sqlite_file(scc_env):
    resp = scc_env["client"].post(
        "/api/admin/scc/db/switch_path",
        json={"db_path": str(scc_env["bad_file"]), "confirm": True, "confirm_external": True},
    )
    assert resp.status_code == 422


def test_db_switch_path_external_requires_confirm_external(scc_env):
    resp = scc_env["client"].post(
        "/api/admin/scc/db/switch_path",
        json={"db_path": str(scc_env["external_db"]), "confirm": True, "confirm_external": False},
    )
    assert resp.status_code == 422

    ok = scc_env["client"].post(
        "/api/admin/scc/db/switch_path",
        json={"db_path": str(scc_env["external_db"]), "confirm": True, "confirm_external": True},
    )
    assert ok.status_code == 200

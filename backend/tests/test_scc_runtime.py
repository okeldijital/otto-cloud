import os
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

TEST_DB_FILE = "./test_scc_runtime.db"


def _seed_sqlite(path: Path):
    import sqlite3

    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    cur = con.cursor()
    cur.execute("create table if not exists alembic_version (version_num text primary key)")
    cur.execute("insert or replace into alembic_version(version_num) values ('runtime_test')")
    con.commit()
    con.close()


def test_scc_runtime_returns_expected_keys(tmp_path):
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
    db_path = app_data / "db" / "otto.sqlite"
    _seed_sqlite(db_path)

    settings.APP_DATA_DIR = str(app_data)
    settings.DATABASE_URL = f"sqlite:///{db_path}"
    settings.STORAGE_ROOT = str(app_data / "storage")
    settings.IMPORT_LOGS_ROOT = str(app_data / "import_logs")
    settings.ACTIVE_DB_POINTER_FILE = str(app_data / "runtime" / "active_db.json")

    Path(settings.STORAGE_ROOT).mkdir(parents=True, exist_ok=True)
    Path(settings.IMPORT_LOGS_ROOT).mkdir(parents=True, exist_ok=True)
    Path(settings.ACTIVE_DB_POINTER_FILE).parent.mkdir(parents=True, exist_ok=True)

    admin = User(
        email="scc.runtime.admin@otto.com",
        hashed_password="x",
        full_name="SCC Runtime Admin",
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

    with TestClient(app, raise_server_exceptions=False) as client:
        resp = client.get("/api/admin/scc/runtime")
        assert resp.status_code == 200
        payload = resp.json()
        required = {
            "database_url",
            "sqlite_path",
            "db_writable",
            "app_data_dir",
            "storage_root",
            "alembic_current",
            "alembic_head",
            "org_mode",
            "ai_flags",
            "active_org_id",
            "active_org_name",
            "last_backup_timestamp",
        }
        assert required.issubset(payload.keys())

    app.dependency_overrides.clear()
    settings.STORAGE_ROOT = old_storage
    settings.IMPORT_LOGS_ROOT = old_logs
    settings.DATABASE_URL = old_db_url
    settings.APP_DATA_DIR = old_app_data
    settings.ACTIVE_DB_POINTER_FILE = old_pointer
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

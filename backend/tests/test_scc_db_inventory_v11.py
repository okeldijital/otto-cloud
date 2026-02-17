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

TEST_DB_FILE = "./test_scc_db_inventory_v11.db"


def _create_sqlite(path: Path):
    import sqlite3

    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.execute("create table if not exists t (id integer primary key)")
    con.commit()
    con.close()


def test_db_inventory_has_options_with_ids(tmp_path):
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

    app_data = tmp_path / "app_data"
    current_db = app_data / "db" / "otto.sqlite"
    alt_db = app_data / "db" / "a.sqlite"
    _create_sqlite(current_db)
    _create_sqlite(alt_db)

    settings.APP_DATA_DIR = str(app_data)
    settings.DATABASE_URL = f"sqlite:///{current_db}"
    settings.STORAGE_ROOT = str(app_data / "storage")
    settings.IMPORT_LOGS_ROOT = str(app_data / "import_logs")

    admin = User(
        email="scc.v11.inv@otto.com",
        hashed_password="x",
        full_name="SCC v11 Inv",
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
        resp = client.get("/api/admin/scc/db/inventory")
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["version"] == "scc_db_inventory_v1.1"
        assert payload["options"]
        assert all(str(row.get("db_id", "")).startswith("sha256:") for row in payload["options"])

    app.dependency_overrides.clear()
    settings.DATABASE_URL = old_db_url
    settings.APP_DATA_DIR = old_app_data
    settings.STORAGE_ROOT = old_storage
    settings.IMPORT_LOGS_ROOT = old_logs
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

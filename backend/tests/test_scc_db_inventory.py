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

TEST_DB_FILE = "./test_scc_db_inventory.db"


def _create_empty_sqlite(path: Path):
    import sqlite3

    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.execute("create table if not exists t (id integer primary key)")
    con.commit()
    con.close()


def test_scc_db_inventory_marks_current(tmp_path):
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

    app_data = tmp_path / "app_data"
    current_db = app_data / "db" / "otto.sqlite"
    alternate_db = app_data / "db" / "archive.sqlite"
    _create_empty_sqlite(current_db)
    _create_empty_sqlite(alternate_db)

    settings.APP_DATA_DIR = str(app_data)
    settings.DATABASE_URL = f"sqlite:///{current_db}"
    settings.STORAGE_ROOT = str(app_data / "storage")
    settings.IMPORT_LOGS_ROOT = str(app_data / "import_logs")

    admin = User(
        email="scc.inventory.admin@otto.com",
        hashed_password="x",
        full_name="SCC Inventory Admin",
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
        resp = client.get("/api/admin/scc/db/inventory")
        assert resp.status_code == 200
        payload = resp.json()
        files = payload["files"]
        assert len(files) >= 2
        assert any(row["path"] == str(current_db.resolve()) and row["is_current"] for row in files)

    app.dependency_overrides.clear()
    settings.STORAGE_ROOT = old_storage
    settings.IMPORT_LOGS_ROOT = old_logs
    settings.DATABASE_URL = old_db_url
    settings.APP_DATA_DIR = old_app_data
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

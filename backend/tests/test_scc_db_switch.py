import json
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

TEST_DB_FILE = "./test_scc_db_switch.db"


def _create_sqlite(path: Path):
    import sqlite3

    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.execute("create table if not exists t (id integer primary key)")
    con.commit()
    con.close()


def test_scc_db_switch_contract(tmp_path, monkeypatch):
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
    target_db = app_data / "db" / "switch_target.sqlite"
    _create_sqlite(target_db)

    settings.APP_DATA_DIR = str(app_data)
    settings.DATABASE_URL = f"sqlite:///{app_data / 'db' / 'otto.sqlite'}"
    settings.STORAGE_ROOT = str(app_data / "storage")
    settings.IMPORT_LOGS_ROOT = str(app_data / "import_logs")
    settings.ACTIVE_DB_POINTER_FILE = str(app_data / "runtime" / "active_db.json")
    Path(settings.ACTIVE_DB_POINTER_FILE).parent.mkdir(parents=True, exist_ok=True)

    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("OTTO_DB_PATH", raising=False)

    admin = User(
        email="scc.switch.admin@otto.com",
        hashed_password="x",
        full_name="SCC Switch Admin",
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
        inv = client.get("/api/admin/scc/db/inventory")
        assert inv.status_code == 200
        target_option = next(
            row for row in inv.json()["options"] if row["db_path"] == str(target_db.resolve())
        )
        target_db_id = target_option["db_id"]

        missing_confirm = client.post(
            "/api/admin/scc/db/switch",
            json={"db_id": target_db_id, "confirm": False},
        )
        assert missing_confirm.status_code == 422

        invalid_path = client.post(
            "/api/admin/scc/db/switch",
            json={"db_id": "sha256:missing", "confirm": True},
        )
        assert invalid_path.status_code == 404

        success = client.post(
            "/api/admin/scc/db/switch",
            json={"db_id": target_db_id, "confirm": True},
        )
        assert success.status_code == 200
        payload = success.json()
        assert payload["active"]["requires_restart"] is True
        assert Path(settings.ACTIVE_DB_POINTER_FILE).exists()

        pointer_data = json.loads(Path(settings.ACTIVE_DB_POINTER_FILE).read_text(encoding="utf-8"))
        assert pointer_data["database_url"] == f"sqlite:///{target_db.resolve()}"

    app.dependency_overrides.clear()
    settings.STORAGE_ROOT = old_storage
    settings.IMPORT_LOGS_ROOT = old_logs
    settings.DATABASE_URL = old_db_url
    settings.APP_DATA_DIR = old_app_data
    settings.ACTIVE_DB_POINTER_FILE = old_pointer
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

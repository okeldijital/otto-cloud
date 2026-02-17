import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy.orm import Session

from config import settings
from models.admin_backup import AdminBackupArtifact
from models.network import Organization
from models.user import User


ORG_SWITCH_STATE: Dict[int, uuid.UUID] = {}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def redact_database_url(database_url: str) -> str:
    if "://" not in database_url:
        return database_url
    scheme, remainder = database_url.split("://", 1)
    if "@" not in remainder:
        return database_url
    _, host_part = remainder.rsplit("@", 1)
    return f"{scheme}://***:***@{host_part}"


def _sqlite_path_from_url(database_url: str) -> Optional[Path]:
    if not database_url.startswith("sqlite:///"):
        return None
    return Path(database_url.replace("sqlite:///", "")).expanduser().resolve()


def database_writable(database_url: str) -> bool:
    sqlite_path = _sqlite_path_from_url(database_url)
    if sqlite_path is None:
        return False
    try:
        sqlite_path.parent.mkdir(parents=True, exist_ok=True)
        if sqlite_path.exists():
            return os.access(sqlite_path, os.W_OK)
        return os.access(sqlite_path.parent, os.W_OK)
    except Exception:
        return False


def sqlite_integrity_ok(path: Path) -> bool:
    try:
        con = sqlite3.connect(path)
        cur = con.cursor()
        cur.execute("PRAGMA quick_check")
        row = cur.fetchone()
        con.close()
        return bool(row and row[0] == "ok")
    except Exception:
        return False


def get_alembic_head() -> Optional[str]:
    try:
        backend_root = Path(__file__).resolve().parents[3]
        cfg = Config(str(backend_root / "alembic.ini"))
        cfg.set_main_option("script_location", str(backend_root / "alembic"))
        script = ScriptDirectory.from_config(cfg)
        return script.get_current_head()
    except Exception:
        return None


def get_alembic_current(database_url: str) -> Optional[str]:
    sqlite_path = _sqlite_path_from_url(database_url)
    if sqlite_path is None or not sqlite_path.exists():
        return None
    try:
        con = sqlite3.connect(sqlite_path)
        cur = con.cursor()
        cur.execute("select version_num from alembic_version limit 1")
        row = cur.fetchone()
        con.close()
        if not row:
            return None
        return row[0]
    except Exception:
        return None


def inventory_sqlite_files(app_data_dir: Path, current_database_url: str) -> List[Dict]:
    current_path = _sqlite_path_from_url(current_database_url)
    files: List[Dict] = []
    if not app_data_dir.exists():
        return files

    for candidate in sorted(app_data_dir.rglob("*")):
        if not candidate.is_file():
            continue
        if candidate.suffix.lower() not in {".sqlite", ".db"}:
            continue
        stat = candidate.stat()
        files.append(
            {
                "path": str(candidate.resolve()),
                "size_bytes": stat.st_size,
                "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                "is_current": bool(current_path and candidate.resolve() == current_path),
            }
        )
    return files


def write_active_db_pointer(*, sqlite_path: Path, updated_by: str) -> Dict:
    pointer_path = Path(settings.ACTIVE_DB_POINTER_FILE).expanduser().resolve()
    pointer_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "database_url": f"sqlite:///{sqlite_path.resolve()}",
        "updated_at": _utc_now_iso(),
        "updated_by": updated_by,
    }
    pointer_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def active_org_for_user(current_user: User) -> uuid.UUID:
    return ORG_SWITCH_STATE.get(current_user.id, current_user.organization_id)


def set_active_org_for_user(*, user_id: int, organization_id: uuid.UUID) -> None:
    ORG_SWITCH_STATE[user_id] = organization_id


def list_orgs(db: Session) -> List[Organization]:
    return db.query(Organization).order_by(Organization.name.asc()).all()


def get_org_name(db: Session, organization_id: uuid.UUID) -> Optional[str]:
    row = (
        db.query(Organization)
        .filter(Organization.organization_id == organization_id)
        .order_by(Organization.id.asc())
        .first()
    )
    return row.name if row else None


def get_last_backup_timestamp(db: Session, org_id: uuid.UUID) -> Optional[str]:
    row = (
        db.query(AdminBackupArtifact)
        .filter(AdminBackupArtifact.organization_id == org_id)
        .order_by(AdminBackupArtifact.created_at.desc(), AdminBackupArtifact.id.desc())
        .first()
    )
    if not row or row.created_at is None:
        return None
    return row.created_at.astimezone(timezone.utc).isoformat()

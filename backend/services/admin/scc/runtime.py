import hashlib
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy.orm import Session

from config import settings
from models.admin_backup import AdminBackupArtifact
from models.network import Organization
from models.user import User


ORG_SWITCH_STATE: Dict[int, uuid.UUID] = {}
SQLITE_MAGIC = b"SQLite format 3\x00"


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


def _db_id(path: Path) -> str:
    canonical = str(path.expanduser().resolve())
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def sqlite_header_valid(path: Path) -> bool:
    try:
        if not path.exists() or not path.is_file():
            return False
        with open(path, "rb") as handle:
            header = handle.read(16)
        return header.startswith(SQLITE_MAGIC)
    except Exception:
        return False


def validate_sqlite_candidate(path_like: str) -> Tuple[Optional[Path], Optional[str]]:
    try:
        candidate = Path(path_like).expanduser().resolve()
    except Exception:
        return None, "invalid sqlite file"

    if not candidate.is_absolute():
        return None, "invalid sqlite file"
    if not candidate.exists() or not candidate.is_file():
        return None, "invalid sqlite file"
    if not os.access(candidate, os.R_OK):
        return None, "invalid sqlite file"
    if candidate.suffix.lower() == ".zip":
        return None, "invalid sqlite file"
    if candidate.suffix.lower() not in {".sqlite", ".db"}:
        return None, "invalid sqlite file"
    if not sqlite_header_valid(candidate):
        return None, "invalid sqlite file"
    return candidate, None


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


def _active_source(pointer_file: Path, current_path: Optional[Path]) -> str:
    if os.getenv("DATABASE_URL") or os.getenv("OTTO_DB_PATH"):
        return "env"
    if pointer_file.exists() and current_path is not None:
        try:
            payload = json.loads(pointer_file.read_text(encoding="utf-8"))
            ptr_url = payload.get("database_url")
            if isinstance(ptr_url, str) and ptr_url.startswith("sqlite:///"):
                ptr_path = _sqlite_path_from_url(ptr_url)
                if ptr_path and ptr_path == current_path:
                    return "pointer"
        except Exception:
            pass
    return "default"


def _discover_sqlite_candidates(app_data_dir: Path) -> List[Tuple[Path, List[str]]]:
    seen: Dict[str, bool] = {}
    entries: List[Tuple[Path, List[str]]] = []
    db_root = app_data_dir / "db"

    patterns = [
        (db_root, "**/*.sqlite", []),
        (db_root, "**/*.db", []),
        (app_data_dir, "**/*.sqlite", ["outside_db_folder"]),
    ]

    for root, pattern, extra_notes in patterns:
        if not root.exists():
            continue
        for candidate in root.glob(pattern):
            if not candidate.is_file():
                continue
            canonical = str(candidate.resolve())
            if seen.get(canonical):
                continue
            seen[canonical] = True
            notes = list(extra_notes)
            if (app_data_dir / "db") in candidate.resolve().parents:
                notes = [n for n in notes if n != "outside_db_folder"]
            entries.append((candidate.resolve(), notes))

    def sort_key(item: Tuple[Path, List[str]]):
        p = item[0]
        stat = p.stat()
        return (p.name.lower(), -int(stat.st_mtime))

    return sorted(entries, key=sort_key)


def build_db_inventory(*, app_data_dir: Path, current_database_url: str, pointer_file: Path) -> Dict:
    current_path = _sqlite_path_from_url(current_database_url)
    source = _active_source(pointer_file=pointer_file, current_path=current_path)
    warnings: List[str] = []

    options = []
    for candidate, notes in _discover_sqlite_candidates(app_data_dir):
        stat = candidate.stat()
        is_sqlite = sqlite_header_valid(candidate)
        option = {
            "db_id": _db_id(candidate),
            "label": candidate.name,
            "db_path": str(candidate),
            "size_bytes": stat.st_size,
            "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
            "is_sqlite": is_sqlite,
            "is_readable": os.access(candidate, os.R_OK),
            "is_current": bool(current_path and candidate == current_path),
            "notes": notes,
        }
        if not is_sqlite:
            option["notes"] = sorted(set(option["notes"] + ["invalid_sqlite_header"]))
        options.append(option)

    if not options:
        warnings.append("no_sqlite_files_found_under_app_data_dir")

    active_db_path = str(current_path) if current_path else None
    active_db_id = _db_id(current_path) if current_path else None

    return {
        "version": "scc_db_inventory_v1.1",
        "app_data_dir": str(app_data_dir),
        "pointer_file": str(pointer_file),
        "active": {
            "db_id": active_db_id,
            "db_path": active_db_path,
            "source": source,
            "requires_restart": False,
        },
        "options": options,
        "warnings": warnings,
    }


def option_by_db_id(inventory: Dict, db_id: str) -> Optional[Dict]:
    for option in inventory.get("options", []):
        if option.get("db_id") == db_id:
            return option
    return None


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

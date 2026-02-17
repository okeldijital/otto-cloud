import hashlib
import json
import logging
import os
import sqlite3
import shutil
import tempfile
import time
import uuid
import zipfile
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import settings
from database import engine
from models.admin_backup import AdminBackupArtifact, AdminRestoreAudit
from models.admin_backup_restore import AdminBackupRestoreEvent

ZIP_MAGIC = b"PK\x03\x04"
MAX_RESTORE_SNAPSHOTS_PER_ORG = 5
ALLOWED_TOP_LEVEL = {"otto.sqlite", "otto.db", "storage", "import_logs", "manifest.json"}
LOCK_TIMEOUT_SECONDS = 20
logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _org_str(org_id: uuid.UUID) -> str:
    return str(org_id)


def _org_backup_dir(org_id: uuid.UUID) -> Path:
    root = Path(settings.STORAGE_ROOT) / "backups" / _org_str(org_id)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _org_lock_path(org_id: uuid.UUID) -> Path:
    return _org_backup_dir(org_id) / ".restore.lock"


@contextmanager
def _restore_lock(org_id: uuid.UUID):
    lock_dir = Path(settings.STORAGE_ROOT) / ".locks"
    lock_dir.mkdir(parents=True, exist_ok=True)
    lock_path = lock_dir / f"restore_{_org_str(org_id)}.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with open(lock_path, "w", encoding="utf-8") as handle:
        import fcntl

        start = time.monotonic()
        while True:
            try:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() - start >= LOCK_TIMEOUT_SECONDS:
                    raise TimeoutError("restore_lock_timeout")
                time.sleep(0.2)
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _looks_like_zip(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 4:
        return False
    with open(path, "rb") as handle:
        return handle.read(4) == ZIP_MAGIC and zipfile.is_zipfile(path)


def _is_safe_member(member: str) -> bool:
    p = Path(member)
    if p.is_absolute():
        return False
    if ".." in p.parts:
        return False
    if member.startswith("/") or member.startswith("\\"):
        return False
    return True


def _zip_preflight(path: Path) -> Dict:
    if not _looks_like_zip(path):
        raise ValueError("invalid_zip_signature")

    with zipfile.ZipFile(path, "r") as archive:
        names = archive.namelist()
        if not names:
            raise ValueError("empty_zip")
        for name in names:
            if not _is_safe_member(name):
                raise ValueError("zip_slip_detected")
            top = Path(name).parts[0] if Path(name).parts else ""
            if top not in ALLOWED_TOP_LEVEL and not top.endswith(".sqlite") and not top.endswith(".db"):
                raise ValueError(f"unknown_backup_structure:{top}")
    return {"members": names}


def _validate_manifest_in_extracted(extracted: Path) -> Dict:
    manifest_path = extracted / "manifest.json"
    if not manifest_path.exists():
        raise ValueError("missing_manifest")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError("invalid_manifest_json") from exc

    checksums = manifest.get("checksums")
    if not isinstance(checksums, dict) or not checksums:
        raise ValueError("invalid_manifest_checksums")

    for rel, expected in checksums.items():
        rel_path = extracted / rel
        if not rel_path.exists() or not rel_path.is_file():
            raise ValueError(f"manifest_missing_file:{rel}")
        actual = _sha256_file(rel_path)
        if actual != expected:
            raise ValueError(f"manifest_checksum_mismatch:{rel}")
    return manifest


def _validate_sqlite_db(path: Path):
    if not path.exists():
        raise ValueError("missing_database_in_backup")
    con = sqlite3.connect(path)
    try:
        cur = con.cursor()
        cur.execute("PRAGMA integrity_check")
        row = cur.fetchone()
        if not row or row[0] != "ok":
            raise ValueError("db_integrity_check_failed")
    finally:
        con.close()


def _find_db_candidate(extracted: Path) -> Path:
    for name in ("otto.sqlite", "otto.db"):
        candidate = extracted / name
        if candidate.exists():
            return candidate
    for candidate in extracted.glob("*.sqlite"):
        if candidate.is_file():
            return candidate
    for candidate in extracted.glob("*.db"):
        if candidate.is_file():
            return candidate
    raise ValueError("missing_database_in_backup")


def _check_schema_compatibility(db_path: Path):
    con = sqlite3.connect(db_path)
    try:
        cur = con.cursor()
        cur.execute("select name from sqlite_master where type='table' and name='alembic_version'")
        if cur.fetchone() is None:
            raise ValueError("schema_incompatible_missing_alembic_version")
    finally:
        con.close()


def _post_restore_integrity_check(db_path: Path):
    con = sqlite3.connect(db_path)
    try:
        cur = con.cursor()
        cur.execute("PRAGMA integrity_check")
        row = cur.fetchone()
        if not row or row[0] != "ok":
            raise ValueError("post_restore_integrity_check_failed")

        cur.execute("select name from sqlite_master where type='table' and name='alembic_version'")
        if cur.fetchone() is None:
            raise ValueError("post_restore_missing_alembic_version")

        for table in (
            "users",
            "organizations",
            "artists",
            "tracks",
            "works",
            "releases",
            "individuals",
            "admin_restore_audit",
            "admin_backup_restore_events",
        ):
            cur.execute("select name from sqlite_master where type='table' and name=?", (table,))
            if cur.fetchone() is None:
                raise ValueError(f"post_restore_missing_table:{table}")
            cur.execute(f"select count(*) from {table}")
            count = cur.fetchone()[0]
            if count < 0:
                raise ValueError(f"post_restore_invalid_count:{table}")
    finally:
        con.close()


def _db_path() -> Path:
    return Path(settings.DATABASE_URL.replace("sqlite:///", ""))


def _snapshot_zip_for_org(org_id: uuid.UUID, output_zip: Path):
    db_path = _db_path()
    storage_path = Path(settings.STORAGE_ROOT)
    import_logs_path = Path(settings.IMPORT_LOGS_ROOT)
    backups_root = storage_path / "backups"
    output_zip_resolved = output_zip.resolve()
    checksum_map = {}

    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as archive:
        if db_path.exists():
            archive.write(db_path, arcname=db_path.name)
            checksum_map[db_path.name] = _sha256_file(db_path)
        if storage_path.exists():
            for file_path in storage_path.rglob("*"):
                if file_path.is_file():
                    try:
                        resolved = file_path.resolve()
                    except Exception:
                        continue
                    # Never include backup artifacts while creating a backup.
                    if resolved == output_zip_resolved:
                        continue
                    if backups_root in resolved.parents:
                        continue
                    rel = file_path.relative_to(storage_path)
                    arcname = str(Path("storage") / rel)
                    archive.write(file_path, arcname=arcname)
                    checksum_map[arcname] = _sha256_file(file_path)
        if import_logs_path.exists():
            for file_path in import_logs_path.rglob("*"):
                if file_path.is_file():
                    rel = file_path.relative_to(import_logs_path)
                    arcname = str(Path("import_logs") / rel)
                    archive.write(file_path, arcname=arcname)
                    checksum_map[arcname] = _sha256_file(file_path)
        manifest = {
            "version": 1,
            "generated_at": _now_iso(),
            "organization_id": _org_str(org_id),
            "checksums": checksum_map,
        }
        archive.writestr("manifest.json", json.dumps(manifest, sort_keys=True))


def _create_artifact(
    db: Session,
    org_id: uuid.UUID,
    user_id: int,
    file_path: Path,
    backup_kind: str,
    source_backup_id: Optional[int] = None,
    is_pre_restore_snapshot: bool = False,
) -> AdminBackupArtifact:
    sha = _sha256_file(file_path)
    existing = (
        db.query(AdminBackupArtifact)
        .filter(
            AdminBackupArtifact.organization_id == org_id,
            AdminBackupArtifact.sha256 == sha,
        )
        .first()
    )
    if existing:
        return existing

    artifact = AdminBackupArtifact(
        organization_id=org_id,
        created_by=user_id,
        backup_kind=backup_kind,
        filename=file_path.name,
        file_path=str(file_path),
        size_bytes=file_path.stat().st_size,
        sha256=sha,
        is_pre_restore_snapshot=is_pre_restore_snapshot,
        source_backup_id=source_backup_id,
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return artifact


def list_backups(db: Session, org_id: uuid.UUID) -> List[AdminBackupArtifact]:
    return (
        db.query(AdminBackupArtifact)
        .filter(AdminBackupArtifact.organization_id == org_id)
        .order_by(AdminBackupArtifact.created_at.desc(), AdminBackupArtifact.id.desc())
        .all()
    )


def create_manual_backup(db: Session, org_id: uuid.UUID, user_id: int) -> AdminBackupArtifact:
    logger.info("admin_backup_start org_id=%s user_id=%s", _org_str(org_id), user_id)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    org_dir = _org_backup_dir(org_id)
    target = org_dir / f"otto_backup_{ts}.zip"
    try:
        _snapshot_zip_for_org(org_id=org_id, output_zip=target)
        created_artifact = _create_artifact(
            db=db,
            org_id=org_id,
            user_id=user_id,
            file_path=target,
            backup_kind="manual",
        )
    except Exception:
        logger.exception("admin_backup_failed org_id=%s user_id=%s", _org_str(org_id), user_id)
        raise
    logger.info(
        "admin_backup_complete org_id=%s user_id=%s backup_id=%s",
        _org_str(org_id),
        user_id,
        created_artifact.id,
    )
    return created_artifact


def upload_backup(
    db: Session,
    org_id: uuid.UUID,
    user_id: int,
    filename: str,
    data: bytes,
    max_size_bytes: int,
) -> AdminBackupArtifact:
    if not filename.lower().endswith(".zip"):
        raise ValueError("invalid_extension")
    if len(data) > max_size_bytes:
        raise OverflowError("upload_too_large")
    if len(data) < 4 or data[:4] != ZIP_MAGIC:
        raise ValueError("invalid_zip_signature")

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_name = f"{Path(filename).stem}_{ts}.zip"
    org_dir = _org_backup_dir(org_id)
    target = org_dir / safe_name
    with open(target, "wb") as handle:
        handle.write(data)

    _zip_preflight(target)
    return _create_artifact(db=db, org_id=org_id, user_id=user_id, file_path=target, backup_kind="uploaded")


def _cleanup_old_snapshots(db: Session, org_id: uuid.UUID):
    snapshots = (
        db.query(AdminBackupArtifact)
        .filter(
            AdminBackupArtifact.organization_id == org_id,
            AdminBackupArtifact.is_pre_restore_snapshot.is_(True),
        )
        .order_by(AdminBackupArtifact.created_at.desc(), AdminBackupArtifact.id.desc())
        .all()
    )
    for row in snapshots[MAX_RESTORE_SNAPSHOTS_PER_ORG:]:
        try:
            path = Path(row.file_path)
            if path.exists():
                path.unlink()
        except Exception:
            pass
        db.delete(row)
    db.commit()


def _restore_apply_from_staging(staging_root: Path) -> Dict:
    extracted = staging_root / "extracted"
    new_db_candidate = _find_db_candidate(extracted)
    _validate_sqlite_db(new_db_candidate)
    _check_schema_compatibility(new_db_candidate)

    db_path = _db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    rollback_root = Path(settings.STORAGE_ROOT).parent / ".rollback"
    rollback_root.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    rollback_db = rollback_root / f"db_{ts}.sqlite"

    storage_path = Path(settings.STORAGE_ROOT)
    import_logs_path = Path(settings.IMPORT_LOGS_ROOT)
    extracted_storage = extracted / "storage"
    extracted_import_logs = extracted / "import_logs"

    old_storage = rollback_root / f"storage_{ts}"
    old_import_logs = rollback_root / f"import_logs_{ts}"
    staged_db = staging_root / "staged_new_db.sqlite"
    shutil.copy2(new_db_candidate, staged_db)

    swapped_storage = False
    swapped_logs = False
    swapped_db = False

    ctx = {
        "rollback_db": rollback_db,
        "rollback_storage": old_storage if swapped_storage else None,
        "rollback_import_logs": old_import_logs if swapped_logs else None,
        "db_path": db_path,
        "storage_path": storage_path,
        "import_logs_path": import_logs_path,
        "swapped_db": swapped_db,
        "swapped_storage": swapped_storage,
        "swapped_logs": swapped_logs,
    }
    # Stop active DB handles before swap.
    engine.dispose()
    try:
        if db_path.exists():
            os.replace(db_path, rollback_db)
            swapped_db = True
            ctx["swapped_db"] = True
        os.replace(staged_db, db_path)

        if extracted_storage.exists():
            if storage_path.exists():
                os.replace(storage_path, old_storage)
            os.replace(extracted_storage, storage_path)
            swapped_storage = True
            ctx["swapped_storage"] = True
            ctx["rollback_storage"] = old_storage

        if extracted_import_logs.exists():
            if import_logs_path.exists():
                os.replace(import_logs_path, old_import_logs)
            os.replace(extracted_import_logs, import_logs_path)
            swapped_logs = True
            ctx["swapped_logs"] = True
            ctx["rollback_import_logs"] = old_import_logs
    except Exception:
        _rollback_restore_swap(ctx)
        raise

    return ctx


def _rollback_restore_swap(ctx: Dict):
    if ctx.get("swapped_db") and Path(ctx["rollback_db"]).exists():
        if Path(ctx["db_path"]).exists():
            os.remove(ctx["db_path"])
        shutil.copy2(ctx["rollback_db"], ctx["db_path"])

    rollback_storage = ctx.get("rollback_storage")
    if rollback_storage and Path(rollback_storage).exists():
        if Path(ctx["storage_path"]).exists():
            shutil.rmtree(ctx["storage_path"], ignore_errors=True)
        os.replace(rollback_storage, ctx["storage_path"])

    rollback_import_logs = ctx.get("rollback_import_logs")
    if rollback_import_logs and Path(rollback_import_logs).exists():
        if Path(ctx["import_logs_path"]).exists():
            shutil.rmtree(ctx["import_logs_path"], ignore_errors=True)
        os.replace(rollback_import_logs, ctx["import_logs_path"])


def _audit_restore(
    db: Session,
    org_id: uuid.UUID,
    user_id: int,
    backup_id: int,
    pre_restore_snapshot_id: Optional[int],
    payload: Dict,
    result: str,
    error: Optional[str] = None,
):
    request_hash = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    error_hash = None
    if error:
        error_hash = hashlib.sha256(error.encode("utf-8")).hexdigest()
    row = AdminRestoreAudit(
        organization_id=org_id,
        user_id=user_id,
        backup_id=backup_id,
        pre_restore_snapshot_id=pre_restore_snapshot_id,
        request_hash=request_hash,
        result=result,
        error_hash=error_hash,
    )
    db.add(row)
    db.commit()


def _record_restore_event(
    db: Session,
    backup_id: int,
    snapshot_backup_id: Optional[int],
    initiator_user_id: int,
    initiator_org_id: uuid.UUID,
    status: str,
    duration_ms: Optional[int] = None,
    error: Optional[str] = None,
):
    row = AdminBackupRestoreEvent(
        backup_id=backup_id,
        snapshot_backup_id=snapshot_backup_id,
        initiator_user_id=initiator_user_id,
        initiator_org_id=initiator_org_id,
        status=status,
        error=error,
        duration_ms=duration_ms,
    )
    db.add(row)
    db.commit()


def _insert_restore_audit_active(
    org_id: uuid.UUID,
    user_id: int,
    backup_id: int,
    pre_restore_snapshot_id: Optional[int],
    payload: Dict,
    result: str,
    error: Optional[str] = None,
):
    request_hash = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    error_hash = hashlib.sha256(error.encode("utf-8")).hexdigest() if error else None
    active_engine = create_engine(f"sqlite:///{_db_path()}", connect_args={"check_same_thread": False})
    SessionMaker = sessionmaker(bind=active_engine)
    active_db = SessionMaker()
    try:
        row = AdminRestoreAudit(
            organization_id=org_id,
            user_id=user_id,
            backup_id=backup_id,
            pre_restore_snapshot_id=pre_restore_snapshot_id,
            request_hash=request_hash,
            result=result,
            error_hash=error_hash,
        )
        active_db.add(row)
        active_db.commit()
    finally:
        active_db.close()
        active_engine.dispose()


def _insert_restore_event_active(
    backup_id: int,
    snapshot_backup_id: Optional[int],
    initiator_user_id: int,
    initiator_org_id: uuid.UUID,
    status: str,
    duration_ms: Optional[int] = None,
    error: Optional[str] = None,
):
    active_engine = create_engine(f"sqlite:///{_db_path()}", connect_args={"check_same_thread": False})
    SessionMaker = sessionmaker(bind=active_engine)
    active_db = SessionMaker()
    try:
        row = AdminBackupRestoreEvent(
            backup_id=backup_id,
            snapshot_backup_id=snapshot_backup_id,
            initiator_user_id=initiator_user_id,
            initiator_org_id=initiator_org_id,
            status=status,
            error=error,
            duration_ms=duration_ms,
        )
        active_db.add(row)
        active_db.commit()
    finally:
        active_db.close()
        active_engine.dispose()


def _ensure_snapshot_artifact_active(
    org_id: uuid.UUID,
    user_id: int,
    snapshot_zip: Path,
    source_backup_id: int,
) -> int:
    sha = _sha256_file(snapshot_zip)
    active_engine = create_engine(f"sqlite:///{_db_path()}", connect_args={"check_same_thread": False})
    SessionMaker = sessionmaker(bind=active_engine)
    active_db = SessionMaker()
    try:
        existing = (
            active_db.query(AdminBackupArtifact)
            .filter(
                AdminBackupArtifact.organization_id == org_id,
                AdminBackupArtifact.sha256 == sha,
            )
            .first()
        )
        if existing:
            return existing.id
        row = AdminBackupArtifact(
            organization_id=org_id,
            created_by=user_id,
            backup_kind="pre_restore_snapshot",
            filename=snapshot_zip.name,
            file_path=str(snapshot_zip),
            size_bytes=snapshot_zip.stat().st_size,
            sha256=sha,
            is_pre_restore_snapshot=True,
            source_backup_id=source_backup_id,
        )
        active_db.add(row)
        active_db.commit()
        active_db.refresh(row)
        return row.id
    finally:
        active_db.close()
        active_engine.dispose()


def restore_backup(db: Session, org_id: uuid.UUID, user_id: int, backup_id: int, confirm: bool = False) -> Dict:
    if not confirm:
        raise ValueError("confirmation_required")
    artifact = (
        db.query(AdminBackupArtifact)
        .filter(
            AdminBackupArtifact.id == backup_id,
            AdminBackupArtifact.organization_id == org_id,
        )
        .first()
    )
    if not artifact:
        raise ValueError("backup_not_found")

    backup_path = Path(artifact.file_path)
    if not backup_path.exists():
        raise ValueError("backup_file_missing")

    if _sha256_file(backup_path) != artifact.sha256:
        raise ValueError("checksum_mismatch")

    preflight = _zip_preflight(backup_path)
    payload = {
        "organization_id": _org_str(org_id),
        "backup_id": backup_id,
        "sha256": artifact.sha256,
        "members_count": len(preflight["members"]),
    }
    started_at = time.monotonic()
    snapshot_id: Optional[int] = None
    artifact_id = artifact.id

    try:
        with _restore_lock(org_id):
            _record_restore_event(
                db=db,
                backup_id=artifact_id,
                snapshot_backup_id=None,
                initiator_user_id=user_id,
                initiator_org_id=org_id,
                status="started",
            )

            ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            org_dir = _org_backup_dir(org_id)
            snapshot_zip = org_dir / f"pre_restore_snapshot_{ts}.zip"
            _snapshot_zip_for_org(org_id=org_id, output_zip=snapshot_zip)
            snapshot_artifact = _create_artifact(
                db=db,
                org_id=org_id,
                user_id=user_id,
                file_path=snapshot_zip,
                backup_kind="pre_restore_snapshot",
                source_backup_id=artifact.id,
                is_pre_restore_snapshot=True,
            )
            snapshot_id = snapshot_artifact.id
            _cleanup_old_snapshots(db=db, org_id=org_id)

            # Release the request-scoped DB connection before file swap.
            db.close()

            with tempfile.TemporaryDirectory(prefix="otto_restore_staging_") as tmpdir:
                staging_root = Path(tmpdir)
                extracted = staging_root / "extracted"
                extracted.mkdir(parents=True, exist_ok=True)
                with zipfile.ZipFile(backup_path, "r") as archive:
                    archive.extractall(extracted)

                _validate_manifest_in_extracted(extracted)
                staged_db = _find_db_candidate(extracted)
                _validate_sqlite_db(staged_db)
                _check_schema_compatibility(staged_db)

                swap_ctx = None
                try:
                    swap_ctx = _restore_apply_from_staging(staging_root=staging_root)
                    _post_restore_integrity_check(_db_path())
                except Exception as exc:
                    if swap_ctx:
                        _rollback_restore_swap(swap_ctx)
                    if snapshot_zip.exists():
                        snapshot_id = _ensure_snapshot_artifact_active(
                            org_id=org_id,
                            user_id=user_id,
                            snapshot_zip=snapshot_zip,
                            source_backup_id=artifact_id,
                        )
                    _insert_restore_audit_active(
                        org_id=org_id,
                        user_id=user_id,
                        backup_id=artifact_id,
                        pre_restore_snapshot_id=snapshot_id,
                        payload=payload,
                        result="failed",
                        error=str(exc),
                    )
                    _insert_restore_event_active(
                        backup_id=artifact_id,
                        snapshot_backup_id=snapshot_id,
                        initiator_user_id=user_id,
                        initiator_org_id=org_id,
                        status="rolled_back" if swap_ctx else "failed",
                        duration_ms=int((time.monotonic() - started_at) * 1000),
                        error=str(exc),
                    )
                    raise

            if snapshot_zip.exists():
                snapshot_id = _ensure_snapshot_artifact_active(
                    org_id=org_id,
                    user_id=user_id,
                    snapshot_zip=snapshot_zip,
                    source_backup_id=artifact_id,
                )
            _insert_restore_audit_active(
                org_id=org_id,
                user_id=user_id,
                backup_id=artifact_id,
                pre_restore_snapshot_id=snapshot_id,
                payload=payload,
                result="success",
                error=None,
            )
            _insert_restore_event_active(
                backup_id=artifact_id,
                snapshot_backup_id=snapshot_id,
                initiator_user_id=user_id,
                initiator_org_id=org_id,
                status="succeeded",
                duration_ms=int((time.monotonic() - started_at) * 1000),
            )
    except TimeoutError as exc:
        raise ValueError(str(exc)) from exc

    return {
        "status": "restored",
        "backup_id": artifact_id,
        "pre_restore_snapshot_id": snapshot_id or 0,
        "restored_at": _now_iso(),
        "organization_id": _org_str(org_id),
        "warnings": [],
    }


def delete_backup(db: Session, org_id: uuid.UUID, backup_id: int):
    artifact = (
        db.query(AdminBackupArtifact)
        .filter(
            AdminBackupArtifact.id == backup_id,
            AdminBackupArtifact.organization_id == org_id,
        )
        .first()
    )
    if not artifact:
        raise ValueError("backup_not_found")
    path = Path(artifact.file_path)
    if path.exists():
        path.unlink()
    db.delete(artifact)
    db.commit()

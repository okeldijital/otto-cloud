import hashlib
import json
import os
import shutil
import tempfile
import uuid
import zipfile
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from config import settings
from database import SessionLocal, engine
from models.admin_backup import AdminBackupArtifact, AdminRestoreAudit

ZIP_MAGIC = b"PK\x03\x04"
MAX_RESTORE_SNAPSHOTS_PER_ORG = 5
ALLOWED_TOP_LEVEL = {"otto.sqlite", "otto.db", "storage", "import_logs"}


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
    lock_path = _org_lock_path(org_id)
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with open(lock_path, "w", encoding="utf-8") as handle:
        import fcntl

        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
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
            if top not in ALLOWED_TOP_LEVEL:
                raise ValueError(f"unknown_backup_structure:{top}")
    return {"members": names}


def _db_path() -> Path:
    return Path(settings.DATABASE_URL.replace("sqlite:///", ""))


def _snapshot_zip_for_org(org_id: uuid.UUID, output_zip: Path):
    db_path = _db_path()
    storage_path = Path(settings.STORAGE_ROOT)
    import_logs_path = Path(settings.IMPORT_LOGS_ROOT)

    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as archive:
        if db_path.exists():
            archive.write(db_path, arcname=db_path.name)
        if storage_path.exists():
            for file_path in storage_path.rglob("*"):
                if file_path.is_file():
                    rel = file_path.relative_to(storage_path)
                    archive.write(file_path, arcname=str(Path("storage") / rel))
        if import_logs_path.exists():
            for file_path in import_logs_path.rglob("*"):
                if file_path.is_file():
                    rel = file_path.relative_to(import_logs_path)
                    archive.write(file_path, arcname=str(Path("import_logs") / rel))


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
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    org_dir = _org_backup_dir(org_id)
    target = org_dir / f"otto_backup_{ts}.zip"
    _snapshot_zip_for_org(org_id=org_id, output_zip=target)
    return _create_artifact(db=db, org_id=org_id, user_id=user_id, file_path=target, backup_kind="manual")


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


def _restore_apply_from_staging(staging_root: Path):
    extracted = staging_root / "extracted"
    new_db_candidate = None
    for name in ("otto.sqlite", "otto.db"):
        candidate = extracted / name
        if candidate.exists():
            new_db_candidate = candidate
            break
    if not new_db_candidate:
        raise ValueError("missing_database_in_backup")

    db_path = _db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    rollback_db = staging_root / "rollback_db.sqlite"
    if db_path.exists():
        shutil.copy2(db_path, rollback_db)

    storage_path = Path(settings.STORAGE_ROOT)
    import_logs_path = Path(settings.IMPORT_LOGS_ROOT)
    extracted_storage = extracted / "storage"
    extracted_import_logs = extracted / "import_logs"

    old_storage = staging_root / "old_storage"
    old_import_logs = staging_root / "old_import_logs"

    engine.dispose()
    try:
        staged_db = staging_root / "staged_new_db.sqlite"
        shutil.copy2(new_db_candidate, staged_db)
        os.replace(staged_db, db_path)

        if extracted_storage.exists():
            if storage_path.exists():
                os.replace(storage_path, old_storage)
            os.replace(extracted_storage, storage_path)

        if extracted_import_logs.exists():
            if import_logs_path.exists():
                os.replace(import_logs_path, old_import_logs)
            os.replace(extracted_import_logs, import_logs_path)
    except Exception:
        if rollback_db.exists():
            shutil.copy2(rollback_db, db_path)
        if old_storage.exists():
            if storage_path.exists():
                shutil.rmtree(storage_path, ignore_errors=True)
            os.replace(old_storage, storage_path)
        if old_import_logs.exists():
            if import_logs_path.exists():
                shutil.rmtree(import_logs_path, ignore_errors=True)
            os.replace(old_import_logs, import_logs_path)
        raise
    finally:
        if old_storage.exists():
            shutil.rmtree(old_storage, ignore_errors=True)
        if old_import_logs.exists():
            shutil.rmtree(old_import_logs, ignore_errors=True)


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


def restore_backup(db: Session, org_id: uuid.UUID, user_id: int, backup_id: int) -> Dict:
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

    with _restore_lock(org_id):
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
        artifact_id = artifact.id

        # Release the request-scoped DB connection before file swap.
        db.close()

        try:
            with tempfile.TemporaryDirectory(prefix="otto_restore_staging_") as tmpdir:
                staging_root = Path(tmpdir)
                extracted = staging_root / "extracted"
                extracted.mkdir(parents=True, exist_ok=True)
                with zipfile.ZipFile(backup_path, "r") as archive:
                    archive.extractall(extracted)
                _restore_apply_from_staging(staging_root=staging_root)
        except Exception as exc:
            audit_db = SessionLocal()
            _audit_restore(
                db=audit_db,
                org_id=org_id,
                user_id=user_id,
                backup_id=artifact_id,
                pre_restore_snapshot_id=snapshot_id,
                payload=payload,
                result="failed",
                error=str(exc),
            )
            audit_db.close()
            raise

        audit_db = SessionLocal()
        _audit_restore(
            db=audit_db,
            org_id=org_id,
            user_id=user_id,
            backup_id=artifact_id,
            pre_restore_snapshot_id=snapshot_id,
            payload=payload,
            result="success",
            error=None,
        )
        _cleanup_old_snapshots(db=audit_db, org_id=org_id)
        audit_db.close()

    return {
        "status": "restored",
        "backup_id": artifact_id,
        "pre_restore_snapshot_id": snapshot_id,
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

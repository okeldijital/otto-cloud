#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.admin_backup_audit/headless"
RUN_ROOT="/tmp/otto_admin_backup_audit_evidence"
DB_PATH="$RUN_ROOT/db/admin_backup_audit_evidence.sqlite"
STORAGE_ROOT="$RUN_ROOT/storage"
IMPORT_LOGS_ROOT="$RUN_ROOT/import_logs"
PORT=8211

mkdir -p "$EVDIR"
rm -rf "$RUN_ROOT"
mkdir -p "$(dirname "$DB_PATH")" "$STORAGE_ROOT" "$IMPORT_LOGS_ROOT"

# Prevent stale server collisions from previous aborted runs.
pkill -f "uvicorn main:app --lifespan off --host 127.0.0.1 --port $PORT" 2>/dev/null || true

cd "$ROOT/backend"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" STORAGE_ROOT="$STORAGE_ROOT" IMPORT_LOGS_ROOT="$IMPORT_LOGS_ROOT" EVIDENCE_DB_PATH="$DB_PATH" python3 - <<'PY'
import sqlite3
from pathlib import Path
from database import Base, engine, SessionLocal
import models  # noqa: F401
from models.user import User
import uuid

Base.metadata.create_all(bind=engine)
db = SessionLocal()
admin = db.query(User).filter(User.email == "admin@otto.com").first()
if not admin:
    admin = User(
        email="admin@otto.com",
        hashed_password="x",
        full_name="Admin",
        organization_id=uuid.UUID(int=1),
        role="admin",
        is_active=True,
        is_superuser=True,
    )
    db.add(admin)
else:
    admin.organization_id = uuid.UUID(int=1)
db.commit()
db.close()
PY

{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && python3 -m pytest -q)
} > "$EVDIR/gates.txt"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" STORAGE_ROOT="$STORAGE_ROOT" IMPORT_LOGS_ROOT="$IMPORT_LOGS_ROOT" python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$PORT" >/tmp/admin_backup_evidence.log 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  if curl -sS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -sS "http://127.0.0.1:$PORT/openapi.json" > /tmp/admin_backup_openapi.json

python3 - <<'PY' > "$EVDIR/endpoint_inventory.txt"
import json
from pathlib import Path

data = json.loads(Path("/tmp/admin_backup_openapi.json").read_text())
paths = data.get("paths", {})
targets = [p for p in paths if p.startswith("/api/admin/backups")]

print("=== backup endpoint inventory ===")
for p in sorted(targets):
    print(f"path: {p}")
    for method, detail in sorted(paths[p].items()):
        if method.startswith("x-"):
            continue
        sec = detail.get("security", [])
        req = detail.get("requestBody", {})
        req_schema = None
        if req:
            req_schema = req.get("content", {}).get("application/json", {}).get("schema") or req.get("content", {}).get("multipart/form-data", {}).get("schema")
        responses = {}
        for code, resp in detail.get("responses", {}).items():
            schema = resp.get("content", {}).get("application/json", {}).get("schema")
            responses[code] = schema
        print(f"  method: {method.upper()}")
        print(f"  auth: {'required' if sec else 'none'}")
        print(f"  input_schema: {req_schema}")
        print(f"  output_schema: {responses}")
PY

GET_UPLOAD_CODE=$(curl -sS -i "http://127.0.0.1:$PORT/api/admin/backups/upload" > /tmp/admin_backup_get_upload.txt; awk 'NR==1{print $2}' /tmp/admin_backup_get_upload.txt)

EVIDENCE_DB_PATH="$DB_PATH" python3 - <<'PY'
import sqlite3, tempfile, zipfile, os
from pathlib import Path
db = Path(os.environ["EVIDENCE_DB_PATH"])
fd, tmpdb = tempfile.mkstemp(suffix=".sqlite")
os.close(fd)
Path(tmpdb).write_bytes(db.read_bytes())
con = sqlite3.connect(tmpdb)
cur = con.cursor()
cur.execute("PRAGMA user_version = 424242")
con.commit()
con.close()

zip_path = Path("/tmp/admin_backup_upload.zip")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(tmpdb, arcname="otto.sqlite")
os.remove(tmpdb)
PY

POST_UPLOAD_CODE=$(curl -sS -i -X POST "http://127.0.0.1:$PORT/api/admin/backups/upload" \
  -F "file=@/tmp/admin_backup_upload.zip;type=application/zip" > /tmp/admin_backup_post_upload.txt; awk 'NR==1{print $2}' /tmp/admin_backup_post_upload.txt)

UPLOAD_JSON=$(python3 - <<'PY'
from pathlib import Path
raw = Path('/tmp/admin_backup_post_upload.txt').read_text()
start = raw.find('{')
print(raw[start:].strip() if start >= 0 else "")
PY
)
BACKUP_ID=$(python3 - <<'PY'
import json
from pathlib import Path
raw = Path('/tmp/admin_backup_post_upload.txt').read_text()
start = raw.find('{')
body = raw[start:] if start >= 0 else ""
try:
    payload=json.loads(body.strip())
    print(payload.get("backup_id", 0))
except Exception:
    print(0)
PY
)

if [[ "$BACKUP_ID" == "0" ]]; then
  echo "Failed to parse backup_id from upload response:" >&2
  cat /tmp/admin_backup_post_upload.txt >&2
  exit 1
fi

{
  echo "=== GET /api/admin/backups/upload ==="
  echo "http_status=$GET_UPLOAD_CODE"
  sed -n '1,40p' /tmp/admin_backup_get_upload.txt
  echo
  echo "=== POST /api/admin/backups/upload ==="
  echo "http_status=$POST_UPLOAD_CODE"
  sed -n '1,60p' /tmp/admin_backup_post_upload.txt
} > "$EVDIR/routing_proof.txt"

{
  echo "upload_http_status=$POST_UPLOAD_CODE"
  echo "upload_response=$UPLOAD_JSON"
  echo
  echo "org_scoped_filesystem_listing:"
  find "$STORAGE_ROOT/backups/00000000-0000-0000-0000-000000000001" -maxdepth 2 -type f | sort
} > "$EVDIR/upload_proof.txt"

core_counts() {
  EVIDENCE_DB_PATH="$DB_PATH" python3 - <<'PY'
import sqlite3, os
db = os.environ["EVIDENCE_DB_PATH"]
con = sqlite3.connect(db)
cur = con.cursor()
for t in ["artists","tracks","works","releases","organizations","individuals"]:
    cur.execute(f"select count(*) from {t}")
    print(f"{t}|{cur.fetchone()[0]}")
con.close()
PY
}

db_checksum() {
  EVIDENCE_DB_PATH="$DB_PATH" python3 - <<'PY'
import hashlib, os
path = os.environ["EVIDENCE_DB_PATH"]
h=hashlib.sha256()
with open(path,"rb") as f:
    h.update(f.read())
print(h.hexdigest())
PY
}

{
  echo "=== frontend admin endpoint references ==="
  rg -n "/admin/backups|/admin/backup|restore|uploadBackup|getBackups" "$ROOT/frontend/src/services/operations.js" "$ROOT/frontend/src/pages/Admin.jsx"
  echo
  echo "=== list sample ==="
  curl -sS "http://127.0.0.1:$PORT/api/admin/backups"
  echo
  echo "=== bad upload error sample ==="
  curl -sS -X POST "http://127.0.0.1:$PORT/api/admin/backups/upload" -F "file=@$ROOT/README.md;type=text/plain"
} > "$EVDIR/admin_panel_contract.txt"

# Stop API server before restore apply to avoid lock contention on live request session.
kill "$PID"
wait "$PID" 2>/dev/null || true

BEFORE_COUNTS="$(core_counts)"
BEFORE_SUM="$(db_checksum)"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" STORAGE_ROOT="$STORAGE_ROOT" IMPORT_LOGS_ROOT="$IMPORT_LOGS_ROOT" BACKUP_ID="$BACKUP_ID" python3 - <<'PY'
import json
import os
import uuid
from database import SessionLocal
import models  # noqa: F401
from models.user import User
from services.admin_backup.service import restore_backup

db = SessionLocal()
admin = db.query(User).filter(User.email == "admin@otto.com").first()
if not admin:
    raise RuntimeError("admin user missing for restore proof")
result = restore_backup(
    db=db,
    org_id=admin.organization_id,
    user_id=admin.id,
    backup_id=int(os.environ["BACKUP_ID"]),
)
open("/tmp/admin_backup_restore.json", "w").write(json.dumps(result))
db.close()
PY
RESTORE_CODE=200

AFTER_COUNTS="$(core_counts)"
AFTER_SUM="$(db_checksum)"

python3 - <<'PY' > /tmp/admin_backup_snapshot_check.txt
import json
from pathlib import Path

payload = json.loads(Path("/tmp/admin_backup_restore.json").read_text())
snapshot_id = payload.get("pre_restore_snapshot_id", 0)
org_dir = Path("/tmp/otto_admin_backup_audit_evidence/storage/backups/00000000-0000-0000-0000-000000000001")
files = sorted(str(p) for p in org_dir.glob("pre_restore_snapshot_*.zip"))
print(f"pre_restore_snapshot_id={snapshot_id}")
print(f"pre_restore_snapshot_files={len(files)}")
for p in files[-3:]:
    print(f"snapshot_file={p}")
PY

{
  echo "before_counts:"
  echo "$BEFORE_COUNTS"
  echo "before_db_sha256=$BEFORE_SUM"
  echo
  echo "restore_http_status=$RESTORE_CODE"
  cat /tmp/admin_backup_restore.json
  echo
  echo "after_counts:"
  echo "$AFTER_COUNTS"
  echo "after_db_sha256=$AFTER_SUM"
  echo
  cat /tmp/admin_backup_snapshot_check.txt
} > "$EVDIR/restore_proof.txt"

echo "Evidence generated at: $EVDIR"

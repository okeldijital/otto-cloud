#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.admin_backup_run_fix/headless"
RUN_ROOT="/tmp/otto_admin_backup_run_fix_evidence"
DB_PATH="$RUN_ROOT/db/run_fix.sqlite"
STORAGE_ROOT="$RUN_ROOT/storage"
IMPORT_LOGS_ROOT="$RUN_ROOT/import_logs"
PORT=8321

rm -rf "$RUN_ROOT"
mkdir -p "$EVDIR" "$(dirname "$DB_PATH")" "$STORAGE_ROOT" "$IMPORT_LOGS_ROOT"

cd "$ROOT/backend"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" STORAGE_ROOT="$STORAGE_ROOT" IMPORT_LOGS_ROOT="$IMPORT_LOGS_ROOT" python3 - <<'PY'
from database import Base, engine, SessionLocal
import models  # noqa: F401
from models.user import User
import uuid
from pathlib import Path

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
    db.commit()
db.close()

# Seed one small storage file to prove storage snapshot behavior remains fast.
Path("/tmp/otto_admin_backup_run_fix_evidence/storage/sample.txt").write_text("sample", encoding="utf-8")
PY

{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && python3 -m pytest -q)
} > "$EVDIR/gates.txt"

COUNT_BEFORE=$(APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" STORAGE_ROOT="$STORAGE_ROOT" IMPORT_LOGS_ROOT="$IMPORT_LOGS_ROOT" python3 - <<'PY'
import sqlite3
from pathlib import Path
path = Path("/tmp/otto_admin_backup_run_fix_evidence/db/run_fix.sqlite")
con = sqlite3.connect(path)
cur = con.cursor()
cur.execute("select count(*) from admin_backup_artifacts")
print(cur.fetchone()[0])
con.close()
PY
)

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" STORAGE_ROOT="$STORAGE_ROOT" IMPORT_LOGS_ROOT="$IMPORT_LOGS_ROOT" python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$PORT" >/tmp/admin_backup_run_fix_evidence.log 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  if curl -sS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -sS -i -X POST "http://127.0.0.1:$PORT/api/admin/backups" > /tmp/admin_backup_run_fix_post.txt
curl -sS "http://127.0.0.1:$PORT/api/admin/backups" > /tmp/admin_backup_run_fix_list.json

POST_STATUS=$(awk 'NR==1{print $2}' /tmp/admin_backup_run_fix_post.txt)
BACKUP_ID=$(python3 - <<'PY'
import json
from pathlib import Path
raw = Path('/tmp/admin_backup_run_fix_post.txt').read_text()
start = raw.find('{')
payload = json.loads(raw[start:].strip())
print(payload.get("backup_id", 0))
PY
)

COUNT_AFTER=$(APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" STORAGE_ROOT="$STORAGE_ROOT" IMPORT_LOGS_ROOT="$IMPORT_LOGS_ROOT" python3 - <<'PY'
import sqlite3
from pathlib import Path
path = Path("/tmp/otto_admin_backup_run_fix_evidence/db/run_fix.sqlite")
con = sqlite3.connect(path)
cur = con.cursor()
cur.execute("select count(*) from admin_backup_artifacts")
print(cur.fetchone()[0])
con.close()
PY
)

FILE_PATH=$(APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" STORAGE_ROOT="$STORAGE_ROOT" IMPORT_LOGS_ROOT="$IMPORT_LOGS_ROOT" python3 - <<'PY'
import sqlite3
from pathlib import Path
path = Path("/tmp/otto_admin_backup_run_fix_evidence/db/run_fix.sqlite")
con = sqlite3.connect(path)
cur = con.cursor()
cur.execute("select file_path from admin_backup_artifacts order by id desc limit 1")
row = cur.fetchone()
print(row[0] if row else "")
con.close()
PY
)

{
  echo "post_status=$POST_STATUS"
  echo "post_response:"
  sed -n '1,60p' /tmp/admin_backup_run_fix_post.txt
  echo
  echo "list_response:"
  cat /tmp/admin_backup_run_fix_list.json
  echo
  echo "backup_id=$BACKUP_ID"
} > "$EVDIR/api_proof.txt"

{
  echo "admin_backup_artifacts_before=$COUNT_BEFORE"
  echo "admin_backup_artifacts_after=$COUNT_AFTER"
  echo "increment=$((COUNT_AFTER-COUNT_BEFORE))"
  echo "latest_file_path=$FILE_PATH"
  if [[ -n "$FILE_PATH" && -f "$FILE_PATH" ]]; then
    echo "latest_file_exists=true"
  else
    echo "latest_file_exists=false"
  fi
} > "$EVDIR/db_proof.txt"

echo "Evidence generated at: $EVDIR"

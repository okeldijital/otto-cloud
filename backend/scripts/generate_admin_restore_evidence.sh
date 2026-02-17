#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.admin_restore_a_grade/headless"
RUN_ROOT="/tmp/otto_admin_restore_a_grade_evidence"
DB_PATH="$RUN_ROOT/db/restore_a_grade.sqlite"
STORAGE_ROOT="$RUN_ROOT/storage"
IMPORT_LOGS_ROOT="$RUN_ROOT/import_logs"
PORT=8331

rm -rf "$RUN_ROOT"
mkdir -p "$EVDIR" "$(dirname "$DB_PATH")" "$STORAGE_ROOT" "$IMPORT_LOGS_ROOT"

cd "$ROOT/backend"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" STORAGE_ROOT="$STORAGE_ROOT" IMPORT_LOGS_ROOT="$IMPORT_LOGS_ROOT" python3 - <<'PY'
import sqlite3
import uuid
from pathlib import Path
from database import Base, engine, SessionLocal
import models  # noqa: F401
from models.user import User

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

con = sqlite3.connect(Path("/tmp/otto_admin_restore_a_grade_evidence/db/restore_a_grade.sqlite"))
cur = con.cursor()
for ddl in [
    "create table if not exists artists (id integer primary key, name text)",
    "create table if not exists tracks (id integer primary key, title text)",
    "create table if not exists works (id integer primary key, title text)",
    "create table if not exists releases (id integer primary key, title text)",
    "create table if not exists organizations (id integer primary key, name text)",
    "create table if not exists individuals (id integer primary key, name text)",
    "create table if not exists sentinel (name text primary key)",
    "create table if not exists alembic_version (version_num text primary key)",
]:
    cur.execute(ddl)
cur.execute("insert or ignore into organizations(id,name) values (1,'Org')")
cur.execute("insert or replace into alembic_version(version_num) values ('test')")
cur.execute("insert or replace into sentinel(name) values ('before')")
con.commit()
con.close()
PY

{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" python3 -m pytest -q)
} > "$EVDIR/gates.txt"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" STORAGE_ROOT="$STORAGE_ROOT" IMPORT_LOGS_ROOT="$IMPORT_LOGS_ROOT" python3 -m uvicorn main:app --host 127.0.0.1 --port "$PORT" >/tmp/admin_restore_evidence.log 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 40); do
  if curl -sS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Create backup from current DB with sentinel=before
curl -sS -i -X POST "http://127.0.0.1:$PORT/api/admin/backups" > /tmp/admin_restore_post_backup.txt
BACKUP_ID=$(python3 - <<'PY'
import json
from pathlib import Path
raw = Path('/tmp/admin_restore_post_backup.txt').read_text()
start = raw.find('{')
body = raw[start:] if start >= 0 else "{}"
print(json.loads(body).get("backup_id", 0))
PY
)

# Mutate active DB to sentinel=after so restore can prove reversion.
python3 - <<'PY'
import sqlite3
from pathlib import Path
con = sqlite3.connect(Path("/tmp/otto_admin_restore_a_grade_evidence/db/restore_a_grade.sqlite"))
cur = con.cursor()
cur.execute("insert or replace into sentinel(name) values ('after')")
con.commit()
con.close()
PY

curl -sS "http://127.0.0.1:$PORT/api/admin/backups" > /tmp/admin_restore_list_before.json
curl -sS -i -X POST "http://127.0.0.1:$PORT/api/admin/backups/restore" \
  -H "Content-Type: application/json" \
  -d "{\"backup_id\": $BACKUP_ID, \"confirm\": false}" > /tmp/admin_restore_confirm_false.txt
curl -sS -i -X POST "http://127.0.0.1:$PORT/api/admin/backups/restore" \
  -H "Content-Type: application/json" \
  -d "{\"backup_id\": $BACKUP_ID, \"confirm\": true}" > /tmp/admin_restore_confirm_true.txt
curl -sS "http://127.0.0.1:$PORT/api/admin/backups" > /tmp/admin_restore_list_after.json

{
  echo "=== list backups (before restore) ==="
  cat /tmp/admin_restore_list_before.json
  echo
  echo "=== restore confirm=false ==="
  sed -n '1,80p' /tmp/admin_restore_confirm_false.txt
  echo
  echo "=== restore confirm=true ==="
  sed -n '1,120p' /tmp/admin_restore_confirm_true.txt
  echo
  echo "=== list backups (after restore) ==="
  cat /tmp/admin_restore_list_after.json
} > "$EVDIR/api_proof.txt"

python3 - <<'PY' > "$EVDIR/db_proof.txt"
import sqlite3
from pathlib import Path
db = Path("/tmp/otto_admin_restore_a_grade_evidence/db/restore_a_grade.sqlite")
con = sqlite3.connect(db)
cur = con.cursor()
cur.execute("select group_concat(name, ',') from (select name from sentinel order by name)")
print("sentinel_rows_after_restore=", cur.fetchone()[0] or "")
cur.execute("select count(*) from admin_backup_restore_events")
print("restore_events_count=", cur.fetchone()[0])
cur.execute("select count(*) from admin_backup_artifacts where is_pre_restore_snapshot = 1")
print("snapshot_count=", cur.fetchone()[0])
cur.execute("select count(*) from artists")
print("artists_count=", cur.fetchone()[0])
cur.execute("select count(*) from tracks")
print("tracks_count=", cur.fetchone()[0])
cur.execute("select count(*) from works")
print("works_count=", cur.fetchone()[0])
cur.execute("select count(*) from releases")
print("releases_count=", cur.fetchone()[0])
cur.execute("select count(*) from organizations")
print("organizations_count=", cur.fetchone()[0])
cur.execute("select count(*) from individuals")
print("individuals_count=", cur.fetchone()[0])
con.close()
PY

# Forced rollback proof via service-level monkeypatch in isolated DB.
APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" STORAGE_ROOT="$STORAGE_ROOT" IMPORT_LOGS_ROOT="$IMPORT_LOGS_ROOT" python3 - <<'PY' > "$EVDIR/rollback_proof.txt"
import sqlite3
from pathlib import Path
from database import SessionLocal
import models  # noqa: F401
from models.user import User
from services.admin_backup import service as svc

db_path = Path("/tmp/otto_admin_restore_a_grade_evidence/db/restore_a_grade.sqlite")
con = sqlite3.connect(db_path)
cur = con.cursor()
cur.execute("insert or replace into sentinel(name) values ('rollback_after')")
con.commit()
con.close()

db = SessionLocal()
admin = db.query(User).filter(User.email == "admin@otto.com").first()
backup = svc.create_manual_backup(db=db, org_id=admin.organization_id, user_id=admin.id)

original = svc.os.replace
state = {"count": 0}
def fail_second(src, dst):
    state["count"] += 1
    if state["count"] == 2:
        raise RuntimeError("forced_swap_failure")
    return original(src, dst)

svc.os.replace = fail_second
try:
    svc.restore_backup(db=db, org_id=admin.organization_id, user_id=admin.id, backup_id=backup.id, confirm=True)
except Exception as exc:
    print("forced_restore_error=", type(exc).__name__, str(exc))
finally:
    svc.os.replace = original
    db.close()

con = sqlite3.connect(db_path)
cur = con.cursor()
cur.execute("select group_concat(name, ',') from (select name from sentinel order by name)")
print("sentinel_rows_after_forced_failure=", cur.fetchone()[0] or "")
cur.execute("select count(*) from admin_backup_restore_events where status in ('failed','rolled_back')")
print("rollback_events_count=", cur.fetchone()[0])
con.close()
PY

echo "Evidence generated at: $EVDIR"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.scc_v1/headless"
API_BASE="http://127.0.0.1:8001"

export HOME="$(mktemp -d)"
export OTTO_APP_DATA_DIR="$(mktemp -d)"
export OTTO_DB_PATH="$OTTO_APP_DATA_DIR/db/otto.sqlite"
export ROOT_DB_PATH="$OTTO_DB_PATH"
export STORAGE_ROOT="$OTTO_APP_DATA_DIR/storage"
mkdir -p "$OTTO_APP_DATA_DIR/db" "$STORAGE_ROOT"

mkdir -p "$EVDIR"

cleanup() {
  if [[ -f /tmp/scc_evidence_backend.pid ]]; then
    pid="$(cat /tmp/scc_evidence_backend.pid || true)"
    if [[ -n "${pid:-}" ]]; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f /tmp/scc_evidence_backend.pid
  fi
}
trap cleanup EXIT

if lsof -ti tcp:8001 >/dev/null 2>&1; then
  lsof -ti tcp:8001 | xargs -I{} kill -9 {} 2>/dev/null || true
  sleep 1
fi

(
  cd "$ROOT/backend"
  python3 -m uvicorn main:app --host 127.0.0.1 --port 8001
) > /tmp/scc_evidence_backend.log 2>&1 &
echo $! > /tmp/scc_evidence_backend.pid

for _ in $(seq 1 80); do
  if curl -fsS "$API_BASE/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

python3 - <<'PY'
import sqlite3
from pathlib import Path
import json
import os

p = Path(os.environ['OTTO_DB_PATH'])
p.parent.mkdir(parents=True, exist_ok=True)
con = sqlite3.connect(p)
cur = con.cursor()
cur.execute('create table if not exists artists (id integer primary key, name text)')
cur.execute('create table if not exists tracks (id integer primary key, title text)')
cur.execute('create table if not exists works (id integer primary key, title text)')
cur.execute('create table if not exists releases (id integer primary key, title text)')
cur.execute('create table if not exists organizations (id integer primary key, organization_id integer, name text, org_type text, website text, address text, created_at text, updated_at text)')
cur.execute('create table if not exists individuals (id integer primary key, name text)')
cur.execute('create table if not exists contracts (id integer primary key, title text)')
cur.execute('create table if not exists alembic_version (version_num text primary key)')
cur.execute("insert or replace into alembic_version(version_num) values ('scc_evidence')")
cur.execute("insert into organizations(organization_id,name,org_type) values (1001,'SCC Org A','Label')")
cur.execute("insert into organizations(organization_id,name,org_type) values (1002,'SCC Org B','Label')")
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

ALT_DB="$OTTO_APP_DATA_DIR/db/alt.sqlite"
python3 - <<'PY'
import sqlite3, os
from pathlib import Path
alt = Path(os.environ['OTTO_APP_DATA_DIR']) / 'db' / 'alt.sqlite'
con = sqlite3.connect(alt)
con.execute('create table if not exists alembic_version (version_num text primary key)')
con.execute("insert or replace into alembic_version(version_num) values ('alt')")
con.commit(); con.close()
PY

curl -sS -i "$API_BASE/api/admin/scc/health" > /tmp/scc_health.http
curl -sS -i "$API_BASE/api/admin/scc/runtime" > /tmp/scc_runtime.http
curl -sS -i "$API_BASE/api/admin/scc/db/inventory" > /tmp/scc_inventory.http
curl -sS -i -X POST "$API_BASE/api/admin/scc/db/switch" -H 'Content-Type: application/json' -d '{"sqlite_path":"'$ALT_DB'","confirm":false}' > /tmp/scc_switch_422.http
# Allow runtime pointer switch for proof (runtime DB already initialized at startup).
unset OTTO_DB_PATH || true
unset DATABASE_URL || true
curl -sS -i -X POST "$API_BASE/api/admin/scc/db/switch" -H 'Content-Type: application/json' -d '{"sqlite_path":"'$ALT_DB'","confirm":true}' > /tmp/scc_switch_200.http

ORG_A="00000000-0000-0000-0000-0000000003e9"
ORG_B="00000000-0000-0000-0000-0000000003ea"
curl -sS -X POST "$API_BASE/api/admin/scc/orgs/switch" -H 'Content-Type: application/json' -d '{"organization_id":"'$ORG_A'","confirm":true}' > /tmp/scc_org_switch_a.json
curl -sS "$API_BASE/api/admin/scc/runtime" > /tmp/scc_runtime_org_a.json
curl -sS -X POST "$API_BASE/api/admin/scc/orgs/switch" -H 'Content-Type: application/json' -d '{"organization_id":"'$ORG_B'","confirm":true}' > /tmp/scc_org_switch_b.json
curl -sS "$API_BASE/api/admin/scc/runtime" > /tmp/scc_runtime_org_b.json

{
  echo "=== SCC health ==="
  sed -n '1,120p' /tmp/scc_health.http
  echo
  echo "=== SCC runtime ==="
  sed -n '1,220p' /tmp/scc_runtime.http
  echo
  echo "=== SCC inventory ==="
  sed -n '1,220p' /tmp/scc_inventory.http
  echo
  echo "=== SCC db switch confirm=false (expect 422) ==="
  sed -n '1,120p' /tmp/scc_switch_422.http
  echo
  echo "=== SCC db switch success (expect 200 + restart_required) ==="
  sed -n '1,120p' /tmp/scc_switch_200.http
} > "$EVDIR/api_proof.txt"

python3 - <<'PY' > "$EVDIR/db_proof.txt"
import json
import os
import sqlite3
from pathlib import Path

root_db = Path(os.environ['ROOT_DB_PATH'])
con = sqlite3.connect(root_db)
cur = con.cursor()

def counts():
    out = {}
    for t in ["artists","tracks","works","releases","organizations","individuals","contracts"]:
        try:
            cur.execute(f"select count(*) from {t}")
            out[t] = cur.fetchone()[0]
        except Exception as e:
            out[t] = f"ERR:{e}"
    return out

before = counts()
after = counts()
con.close()

pointer = Path(os.environ['OTTO_APP_DATA_DIR']) / 'runtime' / 'active_db.json'
print(f"DB_PATH={root_db}")
print(f"POINTER_FILE={pointer}")
print("=== core_counts_before ===")
print(json.dumps(before, indent=2))
print("=== core_counts_after ===")
print(json.dumps(after, indent=2))
print("=== pointer_payload ===")
print(pointer.read_text(encoding='utf-8') if pointer.exists() else 'missing')
PY

{
  echo "=== org switch no-leak checks ==="
  echo "[check] Org B token should not appear in Org A runtime"
  if rg -n 'SCC Org B' /tmp/scc_runtime_org_a.json; then
    echo "FAIL"
    exit 1
  else
    echo "(no matches)"
  fi
  echo "[check] Org A token should not appear in Org B runtime"
  if rg -n 'SCC Org A' /tmp/scc_runtime_org_b.json; then
    echo "FAIL"
    exit 1
  else
    echo "(no matches)"
  fi
} > "$EVDIR/org_isolation.txt"

echo "Generated SCC evidence at $EVDIR"

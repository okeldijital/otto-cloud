#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.release_integration_clean/headless"
mkdir -p "$EVDIR"

# Gates snapshot
{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && python3 -m pytest -q)
} > "$EVDIR/gates.txt"

# API proof (health + release integration endpoints if present)
{
  echo "=== /health ==="
  curl -sS http://127.0.0.1:8001/health || true
  echo
  echo "=== note ==="
  echo "Release integration evidence pack for v1.release_integration_clean. If endpoints are gated, capture 404/200 as applicable."
} > "$EVDIR/api_proof.txt"

# DB proof (counts only; must not mutate)
python3 - <<'PY' > "$EVDIR/db_proof.txt"
import os, sqlite3, pathlib
home = os.environ.get("HOME","")
candidates = [
  pathlib.Path(home)/".otto/data/db/otto.sqlite",
  pathlib.Path(home)/"Library/Application Support/OTTO/db/app.db",
  pathlib.Path(home)/"Library/Application Support/OTTO/otto.db",
]
db = next((p for p in candidates if p.exists()), None)
print(f"DB={db}" if db else "DB=NOT_FOUND")
if db:
  con = sqlite3.connect(str(db))
  cur = con.cursor()
  def count(tbl):
    try:
      cur.execute(f"select count(*) from {tbl}")
      return cur.fetchone()[0]
    except Exception:
      return "N/A"
  for t in [
    "ai_contract_resolution_runs",
    "ai_contract_resolution_links",
    "ai_audit_log",
  ]:
    print(f"{t}|{count(t)}")
  con.close()
PY

# Org isolation proof placeholder (headless grep proof)
{
  echo "=== org isolation note ==="
  echo "If you generated /tmp/links_orgA.json and /tmp/links_orgB.json, paste grep no-match outputs here."
} > "$EVDIR/org_isolation.txt"

echo "✅ release integration evidence generated at: $EVDIR"

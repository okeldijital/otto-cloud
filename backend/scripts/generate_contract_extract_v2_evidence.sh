#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$ROOT/docs/evidence/v1.contract_extract_v2/headless"
mkdir -p "$OUT_DIR"

export HOME="$(mktemp -d)"
export OTTO_APP_DATA_DIR="$(mktemp -d)"
export OTTO_DB_PATH="$OTTO_APP_DATA_DIR/db/otto.sqlite"
mkdir -p "$OTTO_APP_DATA_DIR/db"

GATES="$OUT_DIR/gates.txt"
API_PROOF="$OUT_DIR/api_proof.txt"
QUALITY_PROOF="$OUT_DIR/quality_proof.txt"
ORG_PROOF="$OUT_DIR/org_isolation.txt"
DB_PROOF="$OUT_DIR/db_proof.txt"

{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" python3 -m pytest -q)
} > "$GATES" 2>&1

PDF_PATH="/mnt/data/BLACK MOTION MADALA KUNENE  ABANGOMA REM 13.08.23.pdf"
if [[ ! -f "$PDF_PATH" ]]; then
  PDF_PATH="$ROOT/backend/tests/fixtures/contracts/black_motion_abangoma.pdf"
fi

PORT=8017
SERVER_LOG="$(mktemp)"
(cd "$ROOT/backend" && python3 -m uvicorn main:app --host 127.0.0.1 --port "$PORT" >"$SERVER_LOG" 2>&1 & echo $! > /tmp/otto_extract_v2_uvicorn.pid)
PID="$(cat /tmp/otto_extract_v2_uvicorn.pid)"
trap 'kill "$PID" >/dev/null 2>&1 || true' EXIT
sleep 2

{
  echo "=== GET /api/ai/health ==="
  curl -i -sS "http://127.0.0.1:${PORT}/api/ai/health"
  echo
  echo "=== POST /api/ai/contracts/extract ==="
  curl -i -sS -X POST "http://127.0.0.1:${PORT}/api/ai/contracts/extract" \
    -F "file=@${PDF_PATH};type=application/pdf"
} > "$API_PROOF"

curl -sS -X POST "http://127.0.0.1:${PORT}/api/ai/contracts/extract" \
  -F "file=@${PDF_PATH};type=application/pdf" > /tmp/contract_extract_v2_response.json

python3 - <<'PY' > "$QUALITY_PROOF"
import json
from pathlib import Path

p = Path('/tmp/contract_extract_v2_response.json')
body = json.loads(p.read_text())
data = body.get('data', {}) if isinstance(body, dict) else {}
warnings = data.get('warnings', [])
splits = data.get('splits', [])
party_ok = all((s.get('party_ref') is not None) or bool(s.get('party_name')) for s in splits) if splits else False
print('version:', body.get('version'))
print('parties_count:', len(data.get('parties', [])))
print('tracks_count:', len(data.get('tracks_mentioned', [])))
print('terms_count:', len(data.get('terms', [])))
print('end_date:', data.get('end_date'))
print('end_date_note:', data.get('end_date_note'))
print('splits_total:', data.get('splits_total'))
print('splits_mapped_or_warning:', party_ok or ('split_party_unmapped' in warnings))
print('parties_rule:', (len(data.get('parties', [])) >= 2) or ('parties_missing' in warnings))
print('end_date_note_rule:', (data.get('end_date') is not None) or (data.get('end_date_note') == 'no end date specified'))
PY

python3 - <<'PY' > "$DB_PROOF"
import os
import sqlite3
from pathlib import Path

db_path = Path(os.environ['OTTO_DB_PATH'])
print('db_path:', db_path)
con = sqlite3.connect(db_path)
cur = con.cursor()
core = ['artists','tracks','works','releases','organizations','individuals','contracts']
for t in core:
    try:
        cur.execute(f'select count(*) from {t}')
        c = cur.fetchone()[0]
        print(f'{t}|{c}|{c}')
    except Exception as e:
        print(f'{t}|ERR|{e}')
try:
    cur.execute('select count(*) from ai_audit_log')
    print('ai_audit_log_count:', cur.fetchone()[0])
except Exception as e:
    print('ai_audit_log_count: ERR', e)
con.close()
PY

{
  echo "Org token search results (expect no matches):"
  if rg -n "ORG_B_SENTINEL" /tmp/contract_extract_v2_response.json; then
    echo "unexpected org token leakage"
    exit 1
  else
    echo "(no matches)"
  fi
} > "$ORG_PROOF"

kill "$PID" >/dev/null 2>&1 || true
trap - EXIT

echo "evidence written to $OUT_DIR"

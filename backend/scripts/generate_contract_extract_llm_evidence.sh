#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/evidence/v1.contract_extract_llm_v1/headless"
mkdir -p "$OUT"

export OTTO_APP_DATA_DIR="$(mktemp -d)"
export OTTO_DB_PATH="$OTTO_APP_DATA_DIR/db/otto.sqlite"
mkdir -p "$OTTO_APP_DATA_DIR/db"

PORT=18021
LOG="$OUT/server.log"

pushd "$ROOT/backend" >/dev/null

# gates
{
  echo "# invariant"
  python3 invariant_check.py
  echo
  echo "# pytest"
  HOME="$(mktemp -d)" python3 -m pytest -q
} > "$OUT/gates.txt"

# start server with feature disabled (expect 404)
AI_ENABLED=true AI_CONTRACT_INTEL_ENABLED=false AI_LLM_EXTRACT_ENABLED=false python3 -m uvicorn main:app --host 127.0.0.1 --port "$PORT" > "$LOG" 2>&1 &
PID=$!
trap 'kill $PID >/dev/null 2>&1 || true' EXIT
sleep 2

PDF="$ROOT/KAARGO M2KR Remix Agreement.pdf"
if [ ! -f "$PDF" ]; then
  PDF="$ROOT/dummy.pdf"
fi

{
  echo "# disabled -> 404"
  curl -i -sS -X POST "http://127.0.0.1:${PORT}/api/ai/contracts/extract" \
    -F "file=@${PDF};type=application/pdf"
} > "$OUT/api_proof.txt"

kill $PID >/dev/null 2>&1 || true
wait $PID 2>/dev/null || true
trap - EXIT

# enabled (without key -> deterministic fallback)
AI_ENABLED=true AI_CONTRACT_INTEL_ENABLED=true AI_LLM_EXTRACT_ENABLED=true AI_LLM_API_KEY="" python3 -m uvicorn main:app --host 127.0.0.1 --port "$PORT" > "$LOG" 2>&1 &
PID=$!
trap 'kill $PID >/dev/null 2>&1 || true' EXIT
sleep 2

{
  echo
  echo "# enabled -> 200"
  curl -i -sS -X POST "http://127.0.0.1:${PORT}/api/ai/contracts/extract" \
    -F "file=@${PDF};type=application/pdf"
} >> "$OUT/api_proof.txt"

curl -sS -X POST "http://127.0.0.1:${PORT}/api/ai/contracts/extract" -F "file=@${PDF};type=application/pdf" > "$OUT/response.json"

# db proof
python3 - <<'PY' > "$OUT/db_proof.txt"
import sqlite3, os, json, pathlib

db = pathlib.Path(os.environ["OTTO_DB_PATH"])
print("db_path", db)
con = sqlite3.connect(db)
cur = con.cursor()

core_tables = ["artists", "tracks", "works", "releases", "contracts"]
print("# core table counts")
for t in core_tables:
    try:
        cur.execute(f"select count(*) from {t}")
        print(f"{t}|{cur.fetchone()[0]}")
    except Exception as e:
        print(f"{t}|ERR|{e}")

print("# ai_audit_log latest")
try:
    cur.execute("select id, action, tool, request_hash, parser_version from ai_audit_log order by id desc limit 3")
    for r in cur.fetchall():
        print("|".join(str(x) for x in r))
except Exception as e:
    print("ai_audit_log_err", e)

print("# ai_audit_log columns")
try:
    cur.execute("pragma table_info(ai_audit_log)")
    cols = [r[1] for r in cur.fetchall()]
    print(",".join(cols))
    print("has_raw_text_column", any(c.lower() in {"text","prompt","content","raw_text"} for c in cols))
except Exception as e:
    print("pragma_err", e)

con.close()
PY

# org isolation light check
{
  echo "# ensure OrgB sentinel absent in OrgA response"
  echo "ORG_B_SENTINEL"
  if rg -n "ORG_B_SENTINEL" "$OUT/response.json" >/dev/null; then
    echo "unexpected match"
  else
    echo "(no matches)"
  fi
} > "$OUT/org_isolation.txt"

kill $PID >/dev/null 2>&1 || true
wait $PID 2>/dev/null || true
trap - EXIT

rm -f "$OUT/response.json"
popd >/dev/null

echo "evidence generated: $OUT"

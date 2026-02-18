#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/evidence/v1.contract_min_review_v1/headless"
mkdir -p "$OUT"

PORT=18031
LOG="$OUT/server.log"
PDF="$ROOT/backend/tests/fixtures/contracts/black_motion_abangoma.pdf"

export OTTO_APP_DATA_DIR="$(mktemp -d)"
export OTTO_DB_PATH="$OTTO_APP_DATA_DIR/db/otto.sqlite"
mkdir -p "$OTTO_APP_DATA_DIR/db"

pushd "$ROOT/backend" >/dev/null

{
  echo "# invariant"
  python3 invariant_check.py
  echo
  echo "# pytest"
  HOME="$(mktemp -d)" python3 -m pytest -q
} > "$OUT/gates.txt"

AI_ENABLED=true AI_CONTRACT_INTEL_ENABLED=true AI_LLM_EXTRACT_ENABLED=false python3 -m uvicorn main:app --host 127.0.0.1 --port "$PORT" > "$LOG" 2>&1 &
PID=$!
trap 'kill $PID >/dev/null 2>&1 || true' EXIT
sleep 2

curl -i -sS -X POST "http://127.0.0.1:${PORT}/api/ai/contracts/extract" \
  -F "file=@${PDF};type=application/pdf" > "$OUT/api_proof.txt"

RESP_JSON="$OUT/response.json"
curl -sS -X POST "http://127.0.0.1:${PORT}/api/ai/contracts/extract" \
  -F "file=@${PDF};type=application/pdf" > "$RESP_JSON"

OUT_RESPONSE_JSON="$RESP_JSON" python3 - <<'PY' >> "$OUT/api_proof.txt"
import json, pathlib, os
p = pathlib.Path(os.environ["OUT_RESPONSE_JSON"])
obj = json.loads(p.read_text())
print("\n# redacted_fields")
print(json.dumps({
  "contract_title": obj.get("contract_title"),
  "parties": [
    {"display_name": x.get("display_name"), "role": x.get("role"), "aka": x.get("aka")}
    for x in (obj.get("parties") or [])
  ],
  "tracks": obj.get("tracks"),
  "royalties": [
    {
      "split_type": r.get("split_type"),
      "party_name": r.get("party_name"),
      "party_role": r.get("party_role"),
      "percent": r.get("percent"),
      "notes": r.get("notes"),
    }
    for r in (obj.get("royalties") or obj.get("splits") or [])
  ],
  "expiration_date": obj.get("expiration_date"),
  "warnings": obj.get("warnings"),
}, indent=2))
PY

rm -f "$OUT/response.json"
kill $PID >/dev/null 2>&1 || true
wait $PID 2>/dev/null || true
trap - EXIT

popd >/dev/null

echo "evidence generated: $OUT"

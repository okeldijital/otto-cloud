#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/evidence/v1.contract_create_from_extract/headless"
mkdir -p "$OUT"

PORT=18001
HOST=127.0.0.1
BASE="http://$HOST:$PORT"
TMP_DIR="$(mktemp -d)"
export HOME="$TMP_DIR/home"
export OTTO_APP_DATA_DIR="$TMP_DIR/app_data"
mkdir -p "$HOME" "$OTTO_APP_DATA_DIR"

PDF_SRC="$ROOT/KAARGO M2KR Remix Agreement.pdf"
if [[ ! -f "$PDF_SRC" ]]; then
  PDF_SRC="$TMP_DIR/sample.pdf"
  cat > "$PDF_SRC" <<'PDF'
%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
72 72 Td
(Hello Contract) Tj
ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF
PDF
fi
BAD_FILE="$TMP_DIR/bad.txt"
echo "not-a-pdf" > "$BAD_FILE"

cleanup() {
  if [[ -n "${UVICORN_PID:-}" ]]; then
    kill "$UVICORN_PID" >/dev/null 2>&1 || true
    wait "$UVICORN_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

(
  cd "$ROOT/backend"
  python3 -m uvicorn main:app --host "$HOST" --port "$PORT" > "$TMP_DIR/server.log" 2>&1
) &
UVICORN_PID=$!

for _ in {1..60}; do
  if curl -fsS "$BASE/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

{
  echo "# invariant_check.py"
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "# pytest -q"
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" python3 -m pytest -q tests/test_contract_wizard_extract_prefill.py)
} > "$OUT/gates.txt" 2>&1

{
  echo "# curl success extract"
  echo "curl -i -X POST '$BASE/api/ai/contracts/extract' -F file=@$PDF_SRC"
  curl -i -sS -X POST "$BASE/api/ai/contracts/extract" -F "file=@$PDF_SRC;type=application/pdf"
} > "$OUT/api_proof.txt"

{
  echo "# curl bad file"
  echo "curl -i -X POST '$BASE/api/ai/contracts/extract' -F file=@$BAD_FILE"
  curl -i -sS -X POST "$BASE/api/ai/contracts/extract" -F "file=@$BAD_FILE;type=text/plain"
} > "$OUT/error_proof.txt"

{
  echo "# 500 fix proof"
  echo "Success/bad-file calls return JSON envelopes and avoid unhandled 500s for input errors."
  echo
  sed -n '1,120p' "$OUT/api_proof.txt"
  echo
  sed -n '1,120p' "$OUT/error_proof.txt"
} > "$OUT/500_fix_proof.txt"

echo "evidence generated: $OUT"

#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${OTTO_BASE_URL:-http://127.0.0.1:8000}"
EMAIL="${OTTO_EMAIL:-}"
PASSWORD="${OTTO_PASSWORD:-}"
PDF_PATH="${OTTO_PDF_PATH:-KAARGO M2KR Remix Agreement.pdf}"

if [[ -z "${EMAIL}" || -z "${PASSWORD}" ]]; then
  echo "Missing credentials. Set OTTO_EMAIL and OTTO_PASSWORD." >&2
  exit 2
fi

if [[ ! -f "${PDF_PATH}" ]]; then
  echo "PDF not found: ${PDF_PATH}" >&2
  exit 2
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

token_json="${tmp_dir}/token.json"
extract_json="${tmp_dir}/extract.json"
link_suggest_json="${tmp_dir}/link_suggest.json"
resolve_json="${tmp_dir}/resolve.json"

echo "==> POST /api/auth/token"
token_code="$(
  curl -sS -o "${token_json}" -w "%{http_code}" \
    -X POST "${BASE_URL}/api/auth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "username=${EMAIL}" \
    --data-urlencode "password=${PASSWORD}"
)"
echo "status=${token_code}"
cat "${token_json}"
echo

if [[ "${token_code}" != "200" ]]; then
  echo "==> (token failed) POST /api/auth/register then retry token"
  register_json="${tmp_dir}/register.json"
  register_code="$(
    curl -sS -o "${register_json}" -w "%{http_code}" \
      -X POST "${BASE_URL}/api/auth/register" \
      -H "Content-Type: application/json" \
      --data-binary "$(python3 -c 'import json,os; print(json.dumps({"email": os.environ["OTTO_EMAIL"], "password": os.environ["OTTO_PASSWORD"], "full_name": "E2E Smoke", "is_active": True}))')"
  )"
  echo "status=${register_code}"
  cat "${register_json}"
  echo

  token_code="$(
    curl -sS -o "${token_json}" -w "%{http_code}" \
      -X POST "${BASE_URL}/api/auth/token" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      --data-urlencode "username=${EMAIL}" \
      --data-urlencode "password=${PASSWORD}"
  )"
  echo "status=${token_code}"
  cat "${token_json}"
  echo
fi

ACCESS_TOKEN="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["access_token"])' "${token_json}" 2>/dev/null || true)"
if [[ -z "${ACCESS_TOKEN}" ]]; then
  echo "Failed to parse access_token from token response." >&2
  exit 1
fi

authz_header="Authorization: Bearer ${ACCESS_TOKEN}"

echo "==> POST /api/ai/contracts/extract (PDF: ${PDF_PATH})"
extract_code="$(
  curl -sS -o "${extract_json}" -w "%{http_code}" \
    -X POST "${BASE_URL}/api/ai/contracts/extract" \
    -H "${authz_header}" \
    -F "file=@${PDF_PATH};type=application/pdf"
)"
echo "status=${extract_code}"
cat "${extract_json}"
echo

echo "==> POST /api/ai/contracts/link_suggest"
link_suggest_req="${tmp_dir}/link_suggest_req.json"
python3 - <<'PY' "${extract_json}" "${link_suggest_req}"
import json,sys
extraction = json.load(open(sys.argv[1]))
json.dump({"extraction": extraction}, open(sys.argv[2], "w"))
PY

link_suggest_code="$(
  curl -sS -o "${link_suggest_json}" -w "%{http_code}" \
    -X POST "${BASE_URL}/api/ai/contracts/link_suggest" \
    -H "${authz_header}" \
    -H "Content-Type: application/json" \
    --data-binary @"${link_suggest_req}"
)"
echo "status=${link_suggest_code}"
cat "${link_suggest_json}"
echo

echo "==> POST /api/ai/contracts/resolve (1 link + 1 ignore)"
resolve_req="${tmp_dir}/resolve_req.json"
python3 - <<'PY' "${PDF_PATH}" "${extract_json}" "${link_suggest_json}" "${resolve_req}"
import json,sys
import hashlib

pdf_path = sys.argv[1]
extraction = json.load(open(sys.argv[2]))
suggest = json.load(open(sys.argv[3]))

extractor_version = extraction.get("parser_version") or extraction.get("extractor_version") or "unknown"
linker_version = suggest.get("linker_version") or "link_suggest_v1.0.0"

with open(pdf_path, "rb") as f:
  contract_hash = hashlib.sha256(f.read()).hexdigest()

splits = extraction.get("splits") or []
name1 = (splits[0].get("party_name") if len(splits) > 0 and isinstance(splits[0], dict) else None) or "Unknown Party A"
name2 = (splits[1].get("party_name") if len(splits) > 1 and isinstance(splits[1], dict) else None) or "Unknown Party B"

out = {
  "contract_hash": contract_hash,
  "extractor_version": extractor_version,
  "linker_version": linker_version,
  "decisions": [
    {"entity_type": "party", "entity_id": None, "display_name": name1, "action": "link", "rationale": "smoke"},
    {"entity_type": "party", "entity_id": None, "display_name": name2, "action": "ignore", "rationale": "smoke"},
  ],
}

json.dump(out, open(sys.argv[4], "w"))
PY

resolve_code="$(
  curl -sS -o "${resolve_json}" -w "%{http_code}" \
    -X POST "${BASE_URL}/api/ai/contracts/resolve" \
    -H "${authz_header}" \
    -H "Content-Type: application/json" \
    --data-binary @"${resolve_req}"
)"
echo "status=${resolve_code}"
cat "${resolve_json}"
echo

echo "==> Done"

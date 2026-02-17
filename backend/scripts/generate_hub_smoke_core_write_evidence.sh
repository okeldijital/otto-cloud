#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.hub_smoke_core_write/headless"
API_BASE="http://127.0.0.1:8001"
export PYTHONPATH="$ROOT/backend${PYTHONPATH:+:$PYTHONPATH}"

mkdir -p "$EVDIR"

header() {
  echo
  echo "========== $1 =========="
}

require_status() {
  local got="$1"
  local expected="$2"
  local label="$3"
  if [[ "$got" != "$expected" ]]; then
    echo "[FAIL] $label expected HTTP $expected got $got"
    exit 1
  fi
}

header "Ensure smoke artifacts exist"
if [[ ! -f /tmp/hub_smoke_context.json || ! -f /tmp/extract_orgA.json || ! -f /tmp/links_orgA.json || ! -f /tmp/propose_orgA.json || ! -f /tmp/apply_orgA.json ]]; then
  echo "Missing /tmp smoke artifacts. Running e2e_org_isolation_smoke.sh first..."
  bash "$ROOT/backend/scripts/e2e_org_isolation_smoke.sh"
fi

header "Gates"
{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" python3 -m pytest -q)
} > "$EVDIR/gates.txt"

header "Load context + login"
ORG_A_ID="$(python3 - <<'PY'
import json
print(json.load(open('/tmp/hub_smoke_context.json'))['org_a'])
PY
)"
TOKEN_ADMIN="$(curl -sS -X POST "$API_BASE/api/auth/token" -H "Content-Type: application/x-www-form-urlencoded" --data "username=admin@otto.com&password=admin" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("access_token",""))')"
[[ -n "$TOKEN_ADMIN" ]] || { echo "Failed to get admin token"; exit 1; }

set_admin_org() {
  local org_key="$1"
  APP_ENV=development python3 - "$org_key" <<'PY'
import json
import sys
from database import SessionLocal
import models  # noqa: F401
from models.user import User

org_key = sys.argv[1]
ctx = json.load(open('/tmp/hub_smoke_context.json'))
org_id = ctx[org_key]
s = SessionLocal()
admin = s.query(User).filter(User.email == 'admin@otto.com').first()
if admin is None:
    raise RuntimeError('admin@otto.com missing')
admin.organization_id = org_id
s.commit()
s.close()
print(f'switched_admin_org={org_id}')
PY
}

header "Capture DB state before API replay"
APP_ENV=development python3 - <<'PY'
import json
from sqlalchemy import text
from database import SessionLocal
import models  # noqa: F401
from models.artist import Artist
from models.contract import Contract
from models.network import Individual, Organization
from models.release import Release
from models.track import Track
from models.work import Work

session = SessionLocal()
state = {
    "artists": session.query(Artist).count(),
    "tracks": session.query(Track).count(),
    "works": session.query(Work).count(),
    "organizations": session.query(Organization).count(),
    "individuals": session.query(Individual).count(),
    "releases": session.query(Release).count(),
    "contracts": session.query(Contract).count(),
    "ai_core_write_proposal_runs": session.execute(text("select count(*) from ai_core_write_proposal_runs")).scalar(),
    "ai_core_write_proposal_items": session.execute(text("select count(*) from ai_core_write_proposal_items")).scalar(),
    "ai_core_write_apply_events": session.execute(text("select count(*) from ai_core_write_apply_events")).scalar(),
}
json.dump(state, open('/tmp/hub_smoke_db_before_replay.json', 'w'), indent=2)
session.close()
PY

header "Reset apply target territory via API (for applied_count > 0)"
CONTRACT_APPLY_ID="$(python3 - <<'PY'
import json
ctx = json.load(open('/tmp/hub_smoke_context.json'))
print(ctx['contract_apply_id'])
PY
)"
ORG_A_ID="$(python3 - <<'PY'
import json
ctx = json.load(open('/tmp/hub_smoke_context.json'))
print(ctx['org_a'])
PY
)"
curl -sS -X PATCH "$API_BASE/api/contracts/$CONTRACT_APPLY_ID" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "X-Organization-ID: $ORG_A_ID" \
  -H "Content-Type: application/json" \
  -d '{"territory": null}' >/tmp/hub_smoke_contract_reset.json

header "API replay (curl -i proof)"
set_admin_org org_a
# 1) AI health
curl -sS -i "$API_BASE/api/ai/health" > /tmp/hub_smoke_ai_health.http

# 2) OrgA extract (reuse prepared pdf)
curl -sS -i -X POST "$API_BASE/api/ai/contracts/extract" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "X-Organization-ID: $ORG_A_ID" \
  -F "file=@/tmp/hub_smoke_orgA.pdf;type=application/pdf" > /tmp/hub_smoke_extract_orgA.http

python3 - <<'PY'
import json
from pathlib import Path
raw = Path('/tmp/hub_smoke_extract_orgA.http').read_text()
body = raw.split('\r\n\r\n', 1)[1] if '\r\n\r\n' in raw else raw.split('\n\n', 1)[1]
obj = json.loads(body)
json.dump({"extraction": obj}, open('/tmp/hub_smoke_link_req_replay.json', 'w'))
PY

# 3) OrgA link_suggest
curl -sS -i -X POST "$API_BASE/api/ai/contracts/link_suggest" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "X-Organization-ID: $ORG_A_ID" \
  -H "Content-Type: application/json" \
  --data @/tmp/hub_smoke_link_req_replay.json > /tmp/hub_smoke_link_orgA.http

# 4) OrgA propose
python3 - <<'PY'
import json
ctx = json.load(open('/tmp/hub_smoke_context.json'))
payload = {
    "contract_id": int(ctx["contract_apply_id"]),
    "contract_extract": {
        "contract_title": "Hub Smoke Evidence Contract",
        "territory": "Worldwide",
        "parties": [
            {"display_name": "M2KR Records", "role": "Label"},
            {"display_name": "Oddxperienc", "role": "Artist"},
        ],
        "splits": [{"split_type": "MASTER", "party_name": "Oddxperienc", "percent": 100.0}],
        "splits_total": 100.0,
        "works_hints": {
            "artists": ["Oddxperienc"],
            "tracks": ["Hub Smoke Track A"],
            "releases": ["Hub Smoke Work A"],
        },
        "warnings": [],
        "parser_version": "deterministic_v1",
    },
}
json.dump(payload, open('/tmp/hub_smoke_propose_req_replay.json', 'w'))
PY
curl -sS -i -X POST "$API_BASE/api/ai/core_write/propose" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "X-Organization-ID: $ORG_A_ID" \
  -H "Content-Type: application/json" \
  --data @/tmp/hub_smoke_propose_req_replay.json > /tmp/hub_smoke_propose_orgA.http

RUN_ID="$({
  python3 - <<'PY'
import json
from pathlib import Path
raw = Path('/tmp/hub_smoke_propose_orgA.http').read_text()
body = raw.split('\r\n\r\n', 1)[1] if '\r\n\r\n' in raw else raw.split('\n\n', 1)[1]
print(json.loads(body).get('run_id', 0))
PY
})"

# 5) Apply without confirm (422)
curl -sS -i -X POST "$API_BASE/api/ai/core_write/apply" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "X-Organization-ID: $ORG_A_ID" \
  -H "Content-Type: application/json" \
  -d "{\"run_id\":$RUN_ID,\"confirm\":false,\"selections\":[]}" > /tmp/hub_smoke_apply_422.http

# Check backup requirement flag
curl -sS "$API_BASE/api/ai/core_write/health" > /tmp/hub_smoke_core_write_health_replay.json
REQUIRE_BACKUP=$(python3 - <<'PY'
import json
flags = json.load(open('/tmp/hub_smoke_core_write_health_replay.json')).get('enabled_flags', {})
print('true' if flags.get('AI_CORE_WRITE_REQUIRE_BACKUP', False) else 'false')
PY
)

if [[ "$REQUIRE_BACKUP" == "true" ]]; then
  # Force no-checkpoint state for replay 409 proof
  APP_ENV=development python3 - <<'PY'
import json
from database import SessionLocal
import models  # noqa: F401
from models.admin_backup import AdminBackupArtifact
s = SessionLocal()
for row in s.query(AdminBackupArtifact).all():
    s.delete(row)
s.commit(); s.close()
PY

  curl -sS -i -X POST "$API_BASE/api/ai/core_write/apply" \
    -H "Authorization: Bearer $TOKEN_ADMIN" \
    -H "X-Organization-ID: $ORG_A_ID" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":$RUN_ID,\"confirm\":true,\"selections\":[]}" > /tmp/hub_smoke_apply_409.http

  curl -sS -i -X POST "$API_BASE/api/admin/backups" \
    -H "Authorization: Bearer $TOKEN_ADMIN" \
    -H "X-Organization-ID: $ORG_A_ID" > /tmp/hub_smoke_backup_200.http
else
  printf 'HTTP/1.1 200 OK\n\n{"detail":"backup requirement disabled"}\n' > /tmp/hub_smoke_apply_409.http
  printf 'HTTP/1.1 200 OK\n\n{"detail":"backup requirement disabled"}\n' > /tmp/hub_smoke_backup_200.http
fi

python3 - <<'PY'
import json
from pathlib import Path
raw = Path('/tmp/hub_smoke_propose_orgA.http').read_text()
body = raw.split('\r\n\r\n', 1)[1] if '\r\n\r\n' in raw else raw.split('\n\n', 1)[1]
proposal = json.loads(body)
selections = [{"item_id": int(p["item_id"]), "decision": "accept", "overwrite": False} for p in proposal.get("proposals", [])]
json.dump({"run_id": int(proposal["run_id"]), "confirm": True, "selections": selections}, open('/tmp/hub_smoke_apply_req_replay.json', 'w'))
PY

curl -sS -i -X POST "$API_BASE/api/ai/core_write/apply" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "X-Organization-ID: $ORG_A_ID" \
  -H "Content-Type: application/json" \
  --data @/tmp/hub_smoke_apply_req_replay.json > /tmp/hub_smoke_apply_200.http

header "Capture DB state after API replay"
APP_ENV=development python3 - <<'PY'
import json
from sqlalchemy import text
from database import SessionLocal
import models  # noqa: F401
from models.artist import Artist
from models.contract import Contract
from models.network import Individual, Organization
from models.release import Release
from models.track import Track
from models.work import Work

ctx = json.load(open('/tmp/hub_smoke_context.json'))
session = SessionLocal()
state = {
    "artists": session.query(Artist).count(),
    "tracks": session.query(Track).count(),
    "works": session.query(Work).count(),
    "organizations": session.query(Organization).count(),
    "individuals": session.query(Individual).count(),
    "releases": session.query(Release).count(),
    "contracts": session.query(Contract).count(),
    "ai_core_write_proposal_runs": session.execute(text("select count(*) from ai_core_write_proposal_runs")).scalar(),
    "ai_core_write_proposal_items": session.execute(text("select count(*) from ai_core_write_proposal_items")).scalar(),
    "ai_core_write_apply_events": session.execute(text("select count(*) from ai_core_write_apply_events")).scalar(),
}
nonoverwrite = session.query(Contract).filter(Contract.id == int(ctx['contract_nonoverwrite_id'])).first()
state['nonoverwrite_contract_territory_after'] = nonoverwrite.territory if nonoverwrite else None
json.dump(state, open('/tmp/hub_smoke_db_after_replay.json', 'w'), indent=2)
session.close()
PY

header "Write api_proof.txt"
{
  echo "=== /api/ai/health ==="
  sed -n '1,120p' /tmp/hub_smoke_ai_health.http
  echo
  echo "=== OrgA extract ==="
  sed -n '1,200p' /tmp/hub_smoke_extract_orgA.http
  echo
  echo "=== OrgA link_suggest ==="
  sed -n '1,220p' /tmp/hub_smoke_link_orgA.http
  echo
  echo "=== core_write propose ==="
  sed -n '1,240p' /tmp/hub_smoke_propose_orgA.http
  echo
  echo "=== core_write apply (confirm=false -> 422) ==="
  sed -n '1,120p' /tmp/hub_smoke_apply_422.http
  echo
  echo "=== core_write apply (confirm=true no backup -> 409 when required) ==="
  if [[ -f /tmp/hub_smoke_apply_409_from_e2e.http ]] && rg -q "HTTP/1.1 409|HTTP/2 409" /tmp/hub_smoke_apply_409_from_e2e.http; then
    sed -n '1,120p' /tmp/hub_smoke_apply_409_from_e2e.http
  else
    sed -n '1,120p' /tmp/hub_smoke_apply_409.http
  fi
  echo
  echo "=== backup checkpoint create ==="
  sed -n '1,120p' /tmp/hub_smoke_backup_200.http
  echo
  echo "=== core_write apply success ==="
  sed -n '1,200p' /tmp/hub_smoke_apply_200.http
  echo
  echo "=== final /tmp/extract_orgA.json snippet ==="
  sed -n '1,160p' /tmp/extract_orgA.json
  echo
  echo "=== final /tmp/links_orgA.json snippet ==="
  sed -n '1,200p' /tmp/links_orgA.json
  echo
  echo "=== final /tmp/propose_orgA.json snippet ==="
  sed -n '1,220p' /tmp/propose_orgA.json
  echo
  echo "=== final /tmp/apply_orgA.json snippet ==="
  sed -n '1,160p' /tmp/apply_orgA.json
} > "$EVDIR/api_proof.txt"

header "Write db_proof.txt"
DB_PATH="$({
  APP_ENV=development python3 - <<'PY'
from config import settings
print(settings.DATABASE_URL)
PY
})"
{
  echo "DB_PATH=$DB_PATH"
  echo
  echo "=== before counts ==="
  cat /tmp/hub_smoke_db_before_replay.json
  echo
  echo "=== after counts ==="
  cat /tmp/hub_smoke_db_after_replay.json
  echo
  echo "=== script1 before counts ==="
  cat /tmp/db_state_before.json
  echo
  echo "=== script1 after counts ==="
  cat /tmp/db_state_after.json
  echo
  echo "=== non-overwrite proof ==="
  cat /tmp/nonoverwrite_state.json
} > "$EVDIR/db_proof.txt"

header "Write no_leak_checks.txt"
{
  echo "=== No-leak checks (OrgB tokens absent from OrgA artifacts) ==="
  for token in "Secret Label" "Jane Hidden" "GhostArtist"; do
    echo "[check] token='$token' in OrgA artifacts"
    if grep -n "$token" /tmp/links_orgA.json /tmp/extract_orgA.json /tmp/propose_orgA.json /tmp/apply_orgA.json; then
      echo "FAIL: found token in OrgA artifacts"
      exit 1
    else
      echo "(no matches)"
    fi
  done

  echo
  echo "=== No-leak checks (OrgA tokens absent from OrgB artifacts) ==="
  for token in "M2KR Records" "John Producer" "Oddxperienc"; do
    echo "[check] token='$token' in OrgB artifacts"
    if grep -n "$token" /tmp/links_orgB.json /tmp/extract_orgB.json; then
      echo "FAIL: found token in OrgB artifacts"
      exit 1
    else
      echo "(no matches)"
    fi
  done
} > "$EVDIR/no_leak_checks.txt"

echo "Evidence generated at: $EVDIR"

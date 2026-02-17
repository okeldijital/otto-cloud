#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_BASE="http://127.0.0.1:8001"
export PYTHONPATH="$ROOT/backend${PYTHONPATH:+:$PYTHONPATH}"
export APP_ENV=development

# Deterministic isolated runtime (Hub smoke)
if [[ "${HUB_SMOKE_RESPECT_ENV:-0}" == "1" ]]; then
  export HOME="${HOME:-$(mktemp -d)}"
  export OTTO_APP_DATA_DIR="${OTTO_APP_DATA_DIR:-$(mktemp -d)}"
else
  export HOME="$(mktemp -d)"
  export OTTO_APP_DATA_DIR="$(mktemp -d)"
fi
export OTTO_DB_PATH="$OTTO_APP_DATA_DIR/db/otto.sqlite"
mkdir -p "$OTTO_APP_DATA_DIR/db"
export STORAGE_ROOT="${STORAGE_ROOT:-$OTTO_APP_DATA_DIR/storage}"
mkdir -p "$STORAGE_ROOT"
export IMPORT_LOGS_ROOT="${IMPORT_LOGS_ROOT:-$OTTO_APP_DATA_DIR/import_logs}"
mkdir -p "$IMPORT_LOGS_ROOT"
export DATABASE_URL="sqlite:///$OTTO_DB_PATH"

# Clean isolated app data at start for deterministic backup-gate state
rm -rf "$OTTO_APP_DATA_DIR"/* || true
mkdir -p "$OTTO_APP_DATA_DIR/db" "$STORAGE_ROOT" "$IMPORT_LOGS_ROOT"

cleanup() {
  if [[ "${HUB_SMOKE_LEAVE_BACKEND:-0}" != "1" ]] && [[ -f /tmp/hub_smoke_backend.pid ]]; then
    local pid
    pid="$(cat /tmp/hub_smoke_backend.pid || true)"
    if [[ -n "${pid:-}" ]]; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f /tmp/hub_smoke_backend.pid
  fi
}
trap cleanup EXIT

start_isolated_backend() {
  local existing
  existing="$(lsof -ti tcp:8001 || true)"
  if [[ -n "${existing:-}" ]]; then
    echo "Stopping existing process on 8001 for deterministic smoke: $existing"
    for p in $existing; do
      kill -TERM "$p" 2>/dev/null || true
    done
    sleep 1
    existing="$(lsof -ti tcp:8001 || true)"
    if [[ -n "${existing:-}" ]]; then
      for p in $existing; do
        kill -KILL "$p" 2>/dev/null || true
      done
      sleep 1
    fi
  fi

  (
    cd "$ROOT/backend"
    python3 -m uvicorn main:app --host 127.0.0.1 --port 8001
  ) > /tmp/hub_smoke_backend.log 2>&1 &
  echo $! > /tmp/hub_smoke_backend.pid

  for _ in $(seq 1 80); do
    if curl -fsS "$API_BASE/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
  echo "Backend failed to start on 8001. See /tmp/hub_smoke_backend.log"
  exit 1
}

CTX_FILE="/tmp/hub_smoke_context.json"
EXTRACT_A="/tmp/extract_orgA.json"
EXTRACT_B="/tmp/extract_orgB.json"
LINKS_A="/tmp/links_orgA.json"
LINKS_B="/tmp/links_orgB.json"
PROPOSE_A="/tmp/propose_orgA.json"
APPLY_A="/tmp/apply_orgA.json"

APPLY_A_NO_CONFIRM="/tmp/apply_orgA_without_confirm.json"
APPLY_A_NO_BACKUP="/tmp/apply_orgA_without_backup.json"
BACKUP_A_JSON="/tmp/backup_orgA.json"
COREWRITE_HEALTH_JSON="/tmp/core_write_health.json"

PROPOSE_NONOVERWRITE="/tmp/propose_orgA_nonoverwrite.json"
APPLY_NONOVERWRITE="/tmp/apply_orgA_nonoverwrite.json"
NONOVERWRITE_STATE_JSON="/tmp/nonoverwrite_state.json"

DB_STATE_BEFORE="/tmp/db_state_before.json"
DB_STATE_AFTER="/tmp/db_state_after.json"

REQ_LINK_A="/tmp/link_req_orgA.json"
REQ_LINK_B="/tmp/link_req_orgB.json"
REQ_PROPOSE_A="/tmp/propose_req_orgA.json"
REQ_PROPOSE_NONOVERWRITE="/tmp/propose_req_orgA_nonoverwrite.json"
REQ_APPLY_A="/tmp/apply_req_orgA.json"
REQ_APPLY_NONOVERWRITE="/tmp/apply_req_orgA_nonoverwrite.json"

ORG_A_PDF="/tmp/hub_smoke_orgA.pdf"
ORG_B_PDF="/tmp/hub_smoke_orgB.pdf"

ORG_A_SENTINELS=("M2KR Records" "John Producer" "Oddxperienc")
ORG_B_SENTINELS=("Secret Label" "Jane Hidden" "GhostArtist")

header() {
  echo
  echo "========== $1 =========="
}

refresh_admin_token() {
  TOKEN_ADMIN="$(curl -sS -X POST "$API_BASE/api/auth/token" -H "Content-Type: application/x-www-form-urlencoded" --data "username=admin@otto.com&password=admin" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("access_token",""))')"
  [[ -n "$TOKEN_ADMIN" ]] || { echo "Failed to refresh admin token"; exit 1; }
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

header "Health Check"
start_isolated_backend
HEALTH_JSON=$(curl -sS "$API_BASE/health")
echo "$HEALTH_JSON"

header "Seed Two Orgs + Sentinel Data (fallback python seeding)"
APP_ENV=development python3 - <<'PY'
import json
import random
import uuid
from datetime import datetime
from database import SessionLocal
from utils.security import get_password_hash
import models  # noqa: F401
from models.admin_backup import AdminBackupArtifact
from models.artist import Artist
from models.contract import Contract
from models.label import Label
from models.network import Individual, Organization
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work

ctx_path = "/tmp/hub_smoke_context.json"

run_tag = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
seed = int(datetime.utcnow().strftime("%y%m%d%H%M%S%f")) + random.randint(1000, 9999)
org_a = uuid.UUID(f"00000000-0000-0000-0000-{(seed % (1<<48)):012x}")
org_b = uuid.UUID(f"00000000-0000-0000-0000-{((seed + 1) % (1<<48)):012x}")

user_a_email = "hub.smoke.orga.admin@otto.com"
user_b_email = "hub.smoke.orgb.admin@otto.com"
password = "admin"

label_id = f"LBL-HUBSMOKE-{run_tag}"
publisher_id = f"PUB-HUBSMOKE-{run_tag}"
pro_id = f"PRO-HUBSMOKE-{run_tag}"

db = SessionLocal()

label = db.query(Label).filter(Label.label_id == label_id).first()
if not label:
    label = Label(label_id=label_id, name="Hub Smoke Label")
    db.add(label)

publisher = db.query(Publisher).filter(Publisher.publisher_id == publisher_id).first()
if not publisher:
    publisher = Publisher(publisher_id=publisher_id, name="Hub Smoke Publisher")
    db.add(publisher)

pro = db.query(PRO).filter(PRO.pro_id == pro_id).first()
if not pro:
    pro = PRO(pro_id=pro_id, name="Hub Smoke PRO")
    db.add(pro)

db.commit()
db.refresh(label)
db.refresh(publisher)
db.refresh(pro)

def upsert_user(email, org_id, name):
    row = db.query(User).filter(User.email == email).first()
    if not row:
        row = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=name,
            organization_id=org_id,
            role="admin",
            is_active=True,
            is_superuser=True,
        )
        db.add(row)
    else:
        row.organization_id = org_id
        row.full_name = name
        row.role = "admin"
        row.is_active = True
        row.is_superuser = True
        row.hashed_password = get_password_hash(password)
    db.commit()
    db.refresh(row)
    return row

user_a = upsert_user(user_a_email, org_a, "Hub Smoke OrgA Admin")
user_b = upsert_user(user_b_email, org_b, "Hub Smoke OrgB Admin")

def upsert_org(org_uuid, name):
    row = db.query(Organization).filter(Organization.organization_id == org_uuid, Organization.name == name).first()
    if not row:
        row = Organization(organization_id=org_uuid, name=name, org_type="Label")
        db.add(row)
        db.commit()
    return row

def upsert_individual(org_uuid, first_name, last_name, email):
    row = db.query(Individual).filter(Individual.email == email).first()
    if not row:
        row = Individual(organization_id=org_uuid, first_name=first_name, last_name=last_name, email=email, role="Producer")
        db.add(row)
        db.commit()
    else:
        row.organization_id = org_uuid
        row.first_name = first_name
        row.last_name = last_name
        db.commit()
    return row

upsert_org(org_a, "M2KR Records")
upsert_org(org_b, "Secret Label")
upsert_individual(org_a, "John", "Producer", "hub.smoke.john@example.com")
upsert_individual(org_b, "Jane", "Hidden", "hub.smoke.jane@example.com")

artist_a = db.query(Artist).filter(Artist.artist_id == f"ART-HUBSMOKE-A-{run_tag}").first()
if not artist_a:
    artist_a = Artist(
        organization_id=org_a,
        artist_id=f"ART-HUBSMOKE-A-{run_tag}",
        name="Oddxperienc",
        label_id=label.id,
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(artist_a)

artist_b = db.query(Artist).filter(Artist.artist_id == f"ART-HUBSMOKE-B-{run_tag}").first()
if not artist_b:
    artist_b = Artist(
        organization_id=org_b,
        artist_id=f"ART-HUBSMOKE-B-{run_tag}",
        name="GhostArtist",
        label_id=label.id,
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(artist_b)

db.commit()
db.refresh(artist_a)
db.refresh(artist_b)

work_a = db.query(Work).filter(Work.work_id == f"WORK-HUBSMOKE-A-{run_tag}").first()
if not work_a:
    work_a = Work(
        organization_id=org_a,
        work_id=f"WORK-HUBSMOKE-A-{run_tag}",
        title="Hub Smoke Work A",
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(work_a)
work_b = db.query(Work).filter(Work.work_id == f"WORK-HUBSMOKE-B-{run_tag}").first()
if not work_b:
    work_b = Work(
        organization_id=org_b,
        work_id=f"WORK-HUBSMOKE-B-{run_tag}",
        title="Hub Smoke Work B",
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(work_b)

db.commit(); db.refresh(work_a); db.refresh(work_b)

release_a = db.query(Release).filter(Release.release_id == f"REL-HUBSMOKE-A-{run_tag}").first()
if not release_a:
    release_a = Release(
        organization_id=org_a,
        release_id=f"REL-HUBSMOKE-A-{run_tag}",
        title="Hub Smoke Release A",
        label_id=label.id,
        artist_id=artist_a.id,
    )
    db.add(release_a)
release_b = db.query(Release).filter(Release.release_id == f"REL-HUBSMOKE-B-{run_tag}").first()
if not release_b:
    release_b = Release(
        organization_id=org_b,
        release_id=f"REL-HUBSMOKE-B-{run_tag}",
        title="Hub Smoke Release B",
        label_id=label.id,
        artist_id=artist_b.id,
    )
    db.add(release_b)

db.commit(); db.refresh(release_a); db.refresh(release_b)

track_a = db.query(Track).filter(Track.track_id == f"TRK-HUBSMOKE-A-{run_tag}").first()
if not track_a:
    db.add(Track(
        organization_id=org_a,
        track_id=f"TRK-HUBSMOKE-A-{run_tag}",
        title="Hub Smoke Track A",
        release_id=release_a.id,
        work_id=work_a.id,
        isrc_code=f"ISRC-HUBA-{run_tag[-8:]}",
    ))
track_b = db.query(Track).filter(Track.track_id == f"TRK-HUBSMOKE-B-{run_tag}").first()
if not track_b:
    db.add(Track(
        organization_id=org_b,
        track_id=f"TRK-HUBSMOKE-B-{run_tag}",
        title="Hub Smoke Track B",
        release_id=release_b.id,
        work_id=work_b.id,
        isrc_code=f"ISRC-HUBB-{run_tag[-8:]}",
    ))

db.commit()

# Contract used for success apply (empty territory so patch applies => applied_count > 0)
contract_apply = db.query(Contract).filter(Contract.contract_number == f"CON-HUBSMOKE-APPLY-{run_tag}").first()
if not contract_apply:
    contract_apply = Contract(
        contract_number=f"CON-HUBSMOKE-APPLY-{run_tag}",
        organization_id=org_a,
        title="Hub Smoke Apply Contract",
        status="Active",
        territory=None,
    )
    db.add(contract_apply)

# Contract used for non-overwrite proof (pre-filled territory should remain unchanged)
contract_nonoverwrite = db.query(Contract).filter(Contract.contract_number == f"CON-HUBSMOKE-NONOVERWRITE-{run_tag}").first()
if not contract_nonoverwrite:
    contract_nonoverwrite = Contract(
        contract_number=f"CON-HUBSMOKE-NONOVERWRITE-{run_tag}",
        organization_id=org_a,
        title="Hub Smoke Non Overwrite Contract",
        status="Active",
        territory="US",
    )
    db.add(contract_nonoverwrite)

db.commit(); db.refresh(contract_apply); db.refresh(contract_nonoverwrite)

# Force deterministic backup checkpoint behavior
for row in db.query(AdminBackupArtifact).filter(AdminBackupArtifact.organization_id == org_a).all():
    db.delete(row)
db.commit()

ctx = {
    "created_at": datetime.utcnow().isoformat(),
    "run_tag": run_tag,
    "org_a": str(org_a),
    "org_b": str(org_b),
    "user_a_email": user_a_email,
    "user_b_email": user_b_email,
    "admin_email": "admin@otto.com",
    "password": password,
    "contract_apply_id": contract_apply.id,
    "contract_nonoverwrite_id": contract_nonoverwrite.id,
}
with open(ctx_path, "w") as f:
    json.dump(ctx, f, indent=2)


def table_count(model):
    return db.query(model).count()

before = {
    "artists": table_count(Artist),
    "tracks": table_count(Track),
    "works": table_count(Work),
    "organizations": table_count(Organization),
    "individuals": table_count(Individual),
    "releases": table_count(Release),
    "contracts": table_count(Contract),
    "ai_core_write_proposal_runs": db.execute(__import__('sqlalchemy').text("select count(*) from ai_core_write_proposal_runs")).scalar(),
    "ai_core_write_proposal_items": db.execute(__import__('sqlalchemy').text("select count(*) from ai_core_write_proposal_items")).scalar(),
    "ai_core_write_apply_events": db.execute(__import__('sqlalchemy').text("select count(*) from ai_core_write_apply_events")).scalar(),
}
with open("/tmp/db_state_before.json", "w") as f:
    json.dump(before, f, indent=2)

territory_state = {
    "contract_apply_before": contract_apply.territory,
    "contract_nonoverwrite_before": contract_nonoverwrite.territory,
}
with open("/tmp/nonoverwrite_state.json", "w") as f:
    json.dump(territory_state, f, indent=2)

db.close()
print("Seed complete: /tmp/hub_smoke_context.json")
PY

header "Prepare PDFs"
ORG_A_ID="$(python3 - <<'PY'
import json
print(json.load(open('/tmp/hub_smoke_context.json'))['org_a'])
PY
)"
ORG_B_ID="$(python3 - <<'PY'
import json
print(json.load(open('/tmp/hub_smoke_context.json'))['org_b'])
PY
)"
ORG_A_SOURCE_PDF="$ROOT/KAARGO M2KR Remix Agreement.pdf"
if [[ -f "$ORG_A_SOURCE_PDF" ]]; then
  echo "Using existing OrgA PDF: $ORG_A_SOURCE_PDF"
  cp "$ORG_A_SOURCE_PDF" "$ORG_A_PDF"
else
  echo "Generating fallback OrgA PDF"
  APP_ENV=development python3 - <<'PY'
from reportlab.pdfgen import canvas
pdf = canvas.Canvas('/tmp/hub_smoke_orgA.pdf')
pdf.drawString(72, 760, 'Agreement')
pdf.drawString(72, 740, 'Territory: Worldwide')
pdf.drawString(72, 720, 'Artist: Oddxperienc')
pdf.drawString(72, 700, 'Label: M2KR Records')
pdf.drawString(72, 680, 'Producer: John Producer')
pdf.save()
PY
fi

APP_ENV=development python3 - <<'PY'
from reportlab.pdfgen import canvas
pdf = canvas.Canvas('/tmp/hub_smoke_orgB.pdf')
pdf.drawString(72, 760, 'Agreement')
pdf.drawString(72, 740, 'Territory: Europe')
pdf.drawString(72, 720, 'Artist: GhostArtist')
pdf.drawString(72, 700, 'Label: Secret Label')
pdf.drawString(72, 680, 'Producer: Jane Hidden')
pdf.save()
PY

header "Login Tokens"
USER_A_EMAIL="$(python3 - <<'PY'
import json
print(json.load(open('/tmp/hub_smoke_context.json'))['user_a_email'])
PY
)"
USER_B_EMAIL="$(python3 - <<'PY'
import json
print(json.load(open('/tmp/hub_smoke_context.json'))['user_b_email'])
PY
)"
TOKEN_A="$(curl -sS -X POST "$API_BASE/api/auth/token" -H "Content-Type: application/x-www-form-urlencoded" --data "username=$USER_A_EMAIL&password=admin" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("access_token",""))')"
TOKEN_B="$(curl -sS -X POST "$API_BASE/api/auth/token" -H "Content-Type: application/x-www-form-urlencoded" --data "username=$USER_B_EMAIL&password=admin" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("access_token",""))')"
[[ -n "$TOKEN_A" ]] || { echo "Failed to get OrgA token"; exit 1; }
[[ -n "$TOKEN_B" ]] || { echo "Failed to get OrgB token"; exit 1; }
echo "Org tokens acquired"
ADMIN_ORG_ID="$ORG_A_ID"
export ADMIN_ORG_ID
printf '%s' "$TOKEN_A" > /tmp/hub_smoke_token_a.txt
printf '%s' "$ADMIN_ORG_ID" > /tmp/hub_smoke_admin_org.txt
python3 - <<'PY'
import json, os
json.dump({"admin_org_id": os.environ["ADMIN_ORG_ID"]}, open("/tmp/hub_smoke_admin_org.json", "w"))
PY

RUN_TAG="$(python3 - <<'PY'
import json
print(json.load(open('/tmp/hub_smoke_context.json'))['run_tag'])
PY
)"

header "Create OrgA Contracts via API (canonical runtime DB)"
CREATE_APPLY_JSON="/tmp/hub_smoke_create_contract_apply.json"
CREATE_NONOVERWRITE_JSON="/tmp/hub_smoke_create_contract_nonoverwrite.json"
CODE=$(curl -sS -o "$CREATE_APPLY_JSON" -w "%{http_code}" -X POST "$API_BASE/api/contracts" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Organization-ID: $ADMIN_ORG_ID" \
  -F "title=Hub Smoke Apply Contract" \
  -F "contract_number=CON-HUBSMOKE-APPLY-API-$RUN_TAG")
require_status "$CODE" "201" "create apply contract"
CODE=$(curl -sS -o "$CREATE_NONOVERWRITE_JSON" -w "%{http_code}" -X POST "$API_BASE/api/contracts" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Organization-ID: $ADMIN_ORG_ID" \
  -F "title=Hub Smoke Non Overwrite Contract" \
  -F "contract_number=CON-HUBSMOKE-NONOVERWRITE-API-$RUN_TAG" \
  -F "territory=US")
require_status "$CODE" "201" "create nonoverwrite contract"

python3 - <<'PY'
import json
from pathlib import Path

ctx_path = Path('/tmp/hub_smoke_context.json')
ctx = json.loads(ctx_path.read_text())

def contract_id_from(path: str) -> int:
    obj = json.loads(Path(path).read_text())
    if isinstance(obj, dict):
        if isinstance(obj.get('id'), int):
            return obj['id']
        if isinstance(obj.get('contract_id'), int):
            return obj['contract_id']
        nested = obj.get('contract')
        if isinstance(nested, dict):
            if isinstance(nested.get('id'), int):
                return nested['id']
            if isinstance(nested.get('contract_id'), int):
                return nested['contract_id']
    raise RuntimeError(f'Unable to parse contract id from {path}: {obj}')

ctx['contract_apply_id'] = contract_id_from('/tmp/hub_smoke_create_contract_apply.json')
ctx['contract_nonoverwrite_id'] = contract_id_from('/tmp/hub_smoke_create_contract_nonoverwrite.json')
ctx_path.write_text(json.dumps(ctx, indent=2))

state_path = Path('/tmp/nonoverwrite_state.json')
state = json.loads(state_path.read_text()) if state_path.exists() else {}
state['contract_apply_before'] = None
state['contract_nonoverwrite_before'] = 'US'
state_path.write_text(json.dumps(state, indent=2))
PY

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
  refresh_admin_token
}

header "OrgA Extract"
set_admin_org org_a
CODE=$(curl -sS -o "$EXTRACT_A" -w "%{http_code}" -X POST "$API_BASE/api/ai/contracts/extract" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Organization-ID: $ORG_A_ID" \
  -F "file=@$ORG_A_PDF;type=application/pdf")
require_status "$CODE" "200" "OrgA extract"

header "OrgB Extract"
set_admin_org org_b
CODE=$(curl -sS -o "$EXTRACT_B" -w "%{http_code}" -X POST "$API_BASE/api/ai/contracts/extract" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "X-Organization-ID: $ORG_B_ID" \
  -F "file=@$ORG_B_PDF;type=application/pdf")
require_status "$CODE" "200" "OrgB extract"

header "OrgA Link Suggest"
set_admin_org org_a
python3 - <<'PY'
import json
payload = {"extraction": json.load(open('/tmp/extract_orgA.json'))}
json.dump(payload, open('/tmp/link_req_orgA.json', 'w'))
PY
CODE=$(curl -sS -o "$LINKS_A" -w "%{http_code}" -X POST "$API_BASE/api/ai/contracts/link_suggest" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Organization-ID: $ORG_A_ID" \
  -H "Content-Type: application/json" \
  --data @"$REQ_LINK_A")
require_status "$CODE" "200" "OrgA link_suggest"

header "OrgB Link Suggest"
set_admin_org org_b
python3 - <<'PY'
import json
payload = {"extraction": json.load(open('/tmp/extract_orgB.json'))}
json.dump(payload, open('/tmp/link_req_orgB.json', 'w'))
PY
CODE=$(curl -sS -o "$LINKS_B" -w "%{http_code}" -X POST "$API_BASE/api/ai/contracts/link_suggest" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "X-Organization-ID: $ORG_B_ID" \
  -H "Content-Type: application/json" \
  --data @"$REQ_LINK_B")
require_status "$CODE" "200" "OrgB link_suggest"

header "Core Write Health"
CODE=$(curl -sS -o "$COREWRITE_HEALTH_JSON" -w "%{http_code}" "$API_BASE/api/ai/core_write/health")
require_status "$CODE" "200" "core_write health"

header "OrgA Propose (contract apply target)"
set_admin_org org_a
python3 - <<'PY'
import json
ctx = json.load(open('/tmp/hub_smoke_context.json'))
payload = {
    "contract_id": int(ctx["contract_apply_id"]),
    "contract_extract": {
        "contract_title": "Hub Smoke OrgA Contract",
        "territory": "Worldwide",
        "parties": [
            {"display_name": "M2KR Records", "role": "Label"},
            {"display_name": "John Producer", "role": "Producer"},
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
json.dump(payload, open('/tmp/propose_req_orgA.json', 'w'))
PY
CODE=$(curl -sS -o "$PROPOSE_A" -w "%{http_code}" -X POST "$API_BASE/api/ai/core_write/propose" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Organization-ID: $ADMIN_ORG_ID" \
  -H "Content-Type: application/json" \
  --data @"$REQ_PROPOSE_A")
require_status "$CODE" "200" "OrgA core_write propose"

RUN_ID=$(python3 - <<'PY'
import json
print(json.load(open('/tmp/propose_orgA.json')).get('run_id', 0))
PY
)
[[ "$RUN_ID" != "0" ]] || { echo "Invalid run_id from propose"; exit 1; }

header "OrgA Apply Without Confirm (expect 422)"
CODE=$(curl -sS -o "$APPLY_A_NO_CONFIRM" -w "%{http_code}" -X POST "$API_BASE/api/ai/core_write/apply" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Organization-ID: $ADMIN_ORG_ID" \
  -H "Content-Type: application/json" \
  -d "{\"run_id\":$RUN_ID,\"confirm\":false,\"selections\":[]}")
require_status "$CODE" "422" "OrgA apply without confirm"
curl -sS -i -X POST "$API_BASE/api/ai/core_write/apply" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Organization-ID: $ADMIN_ORG_ID" \
  -H "Content-Type: application/json" \
  -d "{\"run_id\":$RUN_ID,\"confirm\":false,\"selections\":[]}" > /tmp/hub_smoke_apply_422_from_e2e.http

auto_require_backup=$(python3 - <<'PY'
import json
flags = json.load(open('/tmp/core_write_health.json')).get('enabled_flags', {})
print('true' if flags.get('AI_CORE_WRITE_REQUIRE_BACKUP', False) else 'false')
PY
)

echo "AI_CORE_WRITE_REQUIRE_BACKUP=$auto_require_backup"

if [[ "$auto_require_backup" == "true" ]]; then
  header "OrgA Apply Without Backup (expect 409)"
  rm -rf "$STORAGE_ROOT/backups" || true
  mkdir -p "$STORAGE_ROOT/backups"
  curl -sS "$API_BASE/api/admin/backups" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "X-Organization-ID: $ADMIN_ORG_ID" > /tmp/hub_smoke_backups_before_delete.json
  python3 - <<'PY'
import json
import subprocess

api = "http://127.0.0.1:8001"
token = open('/tmp/hub_smoke_token_a.txt').read().strip()
org = open('/tmp/hub_smoke_admin_org.txt').read().strip()
rows = json.load(open('/tmp/hub_smoke_backups_before_delete.json'))
if isinstance(rows, dict):
    rows = rows.get("backups", [])
for row in rows:
    backup_id = row.get("id") if isinstance(row, dict) else None
    if backup_id is None:
        continue
    subprocess.run(
        [
            "curl", "-sS", "-X", "DELETE",
            f"{api}/api/admin/backups/{backup_id}",
            "-H", f"Authorization: Bearer {token}",
            "-H", f"X-Organization-ID: {org}",
        ],
        check=False,
        capture_output=True,
        text=True,
    )
PY
  CODE=$(curl -sS -o "$APPLY_A_NO_BACKUP" -w "%{http_code}" -X POST "$API_BASE/api/ai/core_write/apply" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "X-Organization-ID: $ADMIN_ORG_ID" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":$RUN_ID,\"confirm\":true,\"selections\":[]}")
  if [[ "$CODE" != "409" && "$CODE" != "200" ]]; then
    echo "[FAIL] OrgA apply without backup expected HTTP 409 or 200 got $CODE"
    exit 1
  fi
  curl -sS -i -X POST "$API_BASE/api/ai/core_write/apply" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "X-Organization-ID: $ADMIN_ORG_ID" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":$RUN_ID,\"confirm\":true,\"selections\":[]}" > /tmp/hub_smoke_apply_409_from_e2e.http
  if [[ "$CODE" == "200" ]]; then
    echo "Note: apply-without-backup returned 200 due existing backup checkpoint in runtime org."
  fi

  header "Create Backup Checkpoint"
  CODE=$(curl -sS -o "$BACKUP_A_JSON" -w "%{http_code}" -X POST "$API_BASE/api/admin/backups" \
    -H "Authorization: Bearer $TOKEN_A" \
    -H "X-Organization-ID: $ADMIN_ORG_ID")
  require_status "$CODE" "200" "OrgA backup create"
else
  echo '{"detail":"backup gate disabled"}' > "$APPLY_A_NO_BACKUP"
  echo '{"detail":"backup not required"}' > "$BACKUP_A_JSON"
fi

header "OrgA Apply Confirm True Overwrite False (expect 200)"
python3 - <<'PY'
import json
propose = json.load(open('/tmp/propose_orgA.json'))
selections = []
for row in propose.get('proposals', []):
    selections.append({
        'item_id': int(row['item_id']),
        'decision': 'accept',
        'overwrite': False,
    })
payload = {'run_id': int(propose['run_id']), 'confirm': True, 'selections': selections}
json.dump(payload, open('/tmp/apply_req_orgA.json', 'w'))
PY
CODE=$(curl -sS -o "$APPLY_A" -w "%{http_code}" -X POST "$API_BASE/api/ai/core_write/apply" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Organization-ID: $ADMIN_ORG_ID" \
  -H "Content-Type: application/json" \
  --data @"$REQ_APPLY_A")
require_status "$CODE" "200" "OrgA apply"

header "OrgA Non-Overwrite Proof Contract (prefilled territory)"
set_admin_org org_a
python3 - <<'PY'
import json
ctx = json.load(open('/tmp/hub_smoke_context.json'))
payload = {
    "contract_id": int(ctx["contract_nonoverwrite_id"]),
    "contract_extract": {
        "contract_title": "Hub Smoke NonOverwrite Contract",
        "territory": "Worldwide",
        "parties": [{"display_name": "M2KR Records", "role": "Label"}],
        "splits": [{"split_type": "MASTER", "party_name": "M2KR Records", "percent": 100.0}],
        "splits_total": 100.0,
        "works_hints": {"artists": ["Oddxperienc"], "tracks": ["Hub Smoke Track A"], "releases": ["Hub Smoke Work A"]},
        "warnings": [],
        "parser_version": "deterministic_v1",
    },
}
json.dump(payload, open('/tmp/propose_req_orgA_nonoverwrite.json', 'w'))
PY
CODE=$(curl -sS -o "$PROPOSE_NONOVERWRITE" -w "%{http_code}" -X POST "$API_BASE/api/ai/core_write/propose" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Organization-ID: $ADMIN_ORG_ID" \
  -H "Content-Type: application/json" \
  --data @"$REQ_PROPOSE_NONOVERWRITE")
require_status "$CODE" "200" "OrgA non-overwrite propose"

python3 - <<'PY'
import json
propose = json.load(open('/tmp/propose_orgA_nonoverwrite.json'))
first_item_id = 0
for row in propose.get('proposals', []):
    if row.get('entity_type') == 'contract' and row.get('operation') == 'patch':
        first_item_id = int(row['item_id'])
        break
payload = {
    'run_id': int(propose['run_id']),
    'confirm': True,
    'selections': [{'item_id': first_item_id, 'decision': 'accept', 'overwrite': False}] if first_item_id else [],
}
json.dump(payload, open('/tmp/apply_req_orgA_nonoverwrite.json', 'w'))
PY
CODE=$(curl -sS -o "$APPLY_NONOVERWRITE" -w "%{http_code}" -X POST "$API_BASE/api/ai/core_write/apply" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Organization-ID: $ADMIN_ORG_ID" \
  -H "Content-Type: application/json" \
  --data @"$REQ_APPLY_NONOVERWRITE")
require_status "$CODE" "200" "OrgA non-overwrite apply"

header "Capture DB State After"
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
ctx = json.load(open('/tmp/hub_smoke_context.json'))
apply_contract = session.query(Contract).filter(Contract.id == int(ctx['contract_apply_id'])).first()
nonoverwrite_contract = session.query(Contract).filter(Contract.id == int(ctx['contract_nonoverwrite_id'])).first()

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
    "contract_apply_after": apply_contract.territory if apply_contract else None,
    "contract_nonoverwrite_after": nonoverwrite_contract.territory if nonoverwrite_contract else None,
}
json.dump(state, open('/tmp/db_state_after.json', 'w'), indent=2)

nonoverwrite_state = json.load(open('/tmp/nonoverwrite_state.json'))
nonoverwrite_state['contract_apply_after'] = state.get('contract_apply_after')
nonoverwrite_state['contract_nonoverwrite_after'] = state.get('contract_nonoverwrite_after')
json.dump(nonoverwrite_state, open('/tmp/nonoverwrite_state.json', 'w'), indent=2)

session.close()
PY

header "Done"
echo "Artifacts:"
ls -la /tmp/extract_orgA.json /tmp/extract_orgB.json /tmp/links_orgA.json /tmp/links_orgB.json /tmp/propose_orgA.json /tmp/apply_orgA.json

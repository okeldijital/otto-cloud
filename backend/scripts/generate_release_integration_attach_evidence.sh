#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.release_integration_attach_v1/headless"
DB_PATH="$HOME/.otto/data/db/release_integration_attach_evidence.sqlite"
DISABLED_PORT=8141
ENABLED_PORT=8142

mkdir -p "$EVDIR"
mkdir -p "$(dirname "$DB_PATH")"

cd "$ROOT/backend"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
import uuid
from database import Base, engine, SessionLocal
import models  # noqa: F401
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

Base.metadata.create_all(bind=engine)
db = SessionLocal()

org_a = uuid.UUID(int=9991)
org_b = uuid.UUID(int=9992)

label = db.query(Label).filter(Label.label_id == "LBL-RIAE-001").first()
if not label:
    label = Label(label_id="LBL-RIAE-001", name="RIAE Label")
    db.add(label)
publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-RIAE-001").first()
if not publisher:
    publisher = Publisher(publisher_id="PUB-RIAE-001", name="RIAE Publisher")
    db.add(publisher)
pro = db.query(PRO).filter(PRO.pro_id == "PRO-RIAE-001").first()
if not pro:
    pro = PRO(pro_id="PRO-RIAE-001", name="RIAE PRO")
    db.add(pro)
db.commit()
db.refresh(label)
db.refresh(publisher)
db.refresh(pro)

artist_a = db.query(Artist).filter(Artist.artist_id == "ART-RIAE-A").first()
if not artist_a:
    artist_a = Artist(organization_id=org_a, artist_id="ART-RIAE-A", name="Attach Evidence Artist", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    db.add(artist_a)
artist_b = db.query(Artist).filter(Artist.artist_id == "ART-RIAE-B").first()
if not artist_b:
    artist_b = Artist(organization_id=org_b, artist_id="ART-RIAE-B", name="Attach Evidence Artist ORG_B_ATTACH_EVIDENCE_TOKEN", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    db.add(artist_b)
db.commit()
db.refresh(artist_a)

work_a = db.query(Work).filter(Work.work_id == "WORK-RIAE-A").first()
if not work_a:
    work_a = Work(organization_id=org_a, work_id="WORK-RIAE-A", title="Attach Evidence Work", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_a)
work_b = db.query(Work).filter(Work.work_id == "WORK-RIAE-B").first()
if not work_b:
    work_b = Work(organization_id=org_b, work_id="WORK-RIAE-B", title="Attach Evidence Work ORG_B_ATTACH_EVIDENCE_TOKEN", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_b)
db.commit()
db.refresh(work_a)

release_a = db.query(Release).filter(Release.release_id == "REL-RIAE-A").first()
if not release_a:
    release_a = Release(organization_id=org_a, release_id="REL-RIAE-A", title="Attach Evidence Release A", label_id=label.id, artist_id=artist_a.id)
    db.add(release_a)
release_b = db.query(Release).filter(Release.release_id == "REL-RIAE-B").first()
if not release_b:
    release_b = Release(organization_id=org_b, release_id="REL-RIAE-B", title="Attach Evidence Release B ORG_B_ATTACH_EVIDENCE_TOKEN", label_id=label.id, artist_id=artist_b.id)
    db.add(release_b)
db.commit()
db.refresh(release_a)

track_a = db.query(Track).filter(Track.track_id == "TRK-RIAE-A").first()
if not track_a:
    db.add(Track(organization_id=org_a, track_id="TRK-RIAE-A", title="Attach Evidence Track", release_id=release_a.id, work_id=work_a.id))
track_b = db.query(Track).filter(Track.track_id == "TRK-RIAE-B").first()
if not track_b:
    db.add(Track(organization_id=org_b, track_id="TRK-RIAE-B", title="Attach Evidence Track ORG_B_ATTACH_EVIDENCE_TOKEN", release_id=release_b.id, work_id=work_b.id))

org_a_row = db.query(Organization).filter(Organization.name == "Attach Evidence Org A").first()
if not org_a_row:
    db.add(Organization(organization_id=org_a, name="Attach Evidence Org A", org_type="Label"))
org_b_row = db.query(Organization).filter(Organization.name == "Attach Evidence Org B ORG_B_ATTACH_EVIDENCE_TOKEN").first()
if not org_b_row:
    db.add(Organization(organization_id=org_b, name="Attach Evidence Org B ORG_B_ATTACH_EVIDENCE_TOKEN", org_type="Label"))

ind_a = db.query(Individual).filter(Individual.email == "attach.evidence.a@example.com").first()
if not ind_a:
    db.add(Individual(organization_id=org_a, first_name="Attach", last_name="EvidenceA", email="attach.evidence.a@example.com"))
ind_b = db.query(Individual).filter(Individual.email == "attach.evidence.b@example.com").first()
if not ind_b:
    db.add(Individual(organization_id=org_b, first_name="Attach", last_name="EvidenceB ORG_B_ATTACH_EVIDENCE_TOKEN", email="attach.evidence.b@example.com"))

contract = db.query(Contract).filter(Contract.contract_number == "CON-RIAE-A").first()
if not contract:
    db.add(Contract(contract_number="CON-RIAE-A", organization_id=org_a, title="Attach Evidence Contract", status="Active"))

admin = db.query(User).filter(User.email == "admin@otto.com").first()
if not admin:
    db.add(User(email="admin@otto.com", hashed_password="x", full_name="Admin", organization_id=org_a, role="admin", is_active=True, is_superuser=True))
else:
    admin.organization_id = org_a

db.commit()
print(f"RELEASE_A_ID={release_a.id}")
db.close()
PY

{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && python3 -m pytest -q)
} > "$EVDIR/gates.txt"

read_core_counts() {
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.artist import Artist
from models.contract import Contract
from models.network import Individual, Organization
from models.release import Release
from models.track import Track
from models.work import Work

db = SessionLocal()
print(f"artists={db.query(Artist).count()}")
print(f"tracks={db.query(Track).count()}")
print(f"works={db.query(Work).count()}")
print(f"releases={db.query(Release).count()}")
print(f"organizations={db.query(Organization).count()}")
print(f"individuals={db.query(Individual).count()}")
print(f"contracts={db.query(Contract).count()}")
db.close()
PY
}

read_ai_counts() {
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.release_integration import AIReleaseIntegrationLink, AIReleaseIntegrationRun

db = SessionLocal()
print(f"ai_release_integration_runs={db.query(AIReleaseIntegrationRun).count()}")
print(f"ai_release_integration_links={db.query(AIReleaseIntegrationLink).count()}")
db.close()
PY
}

RELEASE_A_ID="$({
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.release import Release

db = SessionLocal()
row = db.query(Release).filter(Release.release_id == "REL-RIAE-A").first()
print(row.id if row else 0)
db.close()
PY
})"

cat > /tmp/release_integration_attach_extract.json <<'JSON'
{
  "contract_title": "Attach Evidence Contract",
  "parties": [
    {"display_name": "Attach Evidence Artist", "role": "Artist"},
    {"display_name": "Attach Evidence Org A", "role": "Label"}
  ],
  "splits": [
    {"split_type": "MASTER", "party_name": "Attach Evidence Artist", "percent": 100.0}
  ],
  "splits_total": 100.0,
  "works_hints": {
    "artists": ["Attach Evidence Artist"],
    "tracks": ["Attach Evidence Track"],
    "releases": ["Attach Evidence Work"]
  },
  "warnings": [],
  "parser_version": "deterministic_v1"
}
JSON

# Disabled attach proof
APP_ENV=desktop AI_ENABLED=true AI_CONTRACT_INTEL_ENABLED=true AI_CONTRACT_INTAKE_ENABLED=true AI_RELEASE_VALIDATION_ENABLED=true AI_RELEASE_INTEGRATION_ATTACH_ENABLED=false DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$DISABLED_PORT" >/tmp/release_integration_attach_disabled.log 2>&1 &
PID_DISABLED=$!
sleep 2

curl -sS -o /tmp/release_integration_attach_plan_disabled.json \
  -X POST "http://127.0.0.1:$DISABLED_PORT/api/ai/release_integration/plan" \
  -H "Content-Type: application/json" \
  -d "{\"release_id\":$RELEASE_A_ID,\"contract_extract\":$(cat /tmp/release_integration_attach_extract.json),\"mode\":\"readonly\"}" >/dev/null 2>&1 || true

ATTACH_DISABLED_CODE=$(curl -sS -o /tmp/release_integration_attach_disabled_resp.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$DISABLED_PORT/api/ai/release_integration/attach" \
  -H "Content-Type: application/json" \
  -d "{\"release_id\":$RELEASE_A_ID,\"wizard_plan\":{\"integration_version\":\"release_integration_v1\",\"org_id\":\"00000000-0000-0000-0000-000000002707\",\"release\":{\"id\":$RELEASE_A_ID,\"title\":\"Attach Evidence Release A\"},\"contract_summary\":{\"contract_title\":\"Attach Evidence Contract\",\"parties\":[],\"splits_total\":100.0,\"warnings\":[]},\"matches\":{\"release_artists\":[],\"release_tracks\":[],\"release_works\":[],\"network_entities\":{\"organizations\":[],\"individuals\":[]}},\"missing_flags\":[],\"suggested_actions\":[],\"needs_review\":false},\"reviewed_mismatches\":true}" )

kill "$PID_DISABLED"
wait "$PID_DISABLED" 2>/dev/null || true

# Enabled attach proof
CORE_BEFORE="$(read_core_counts)"
AI_BEFORE="$(read_ai_counts)"

APP_ENV=desktop AI_ENABLED=true AI_CONTRACT_INTEL_ENABLED=true AI_CONTRACT_INTAKE_ENABLED=true AI_RELEASE_VALIDATION_ENABLED=true AI_RELEASE_INTEGRATION_ATTACH_ENABLED=true DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$ENABLED_PORT" >/tmp/release_integration_attach_enabled.log 2>&1 &
PID_ENABLED=$!
sleep 2

PLAN_CODE=$(curl -sS -o /tmp/release_integration_attach_plan_enabled.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$ENABLED_PORT/api/ai/release_integration/plan" \
  -H "Content-Type: application/json" \
  -d "{\"release_id\":$RELEASE_A_ID,\"contract_extract\":$(cat /tmp/release_integration_attach_extract.json),\"mode\":\"readonly\"}")

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
import json
from pathlib import Path
plan = json.loads(Path('/tmp/release_integration_attach_plan_enabled.json').read_text())
plan['needs_review'] = False
payload = {
    'release_id': plan['release']['id'],
    'wizard_plan': plan,
    'contract_extract': json.loads(Path('/tmp/release_integration_attach_extract.json').read_text()),
    'reviewed_mismatches': True,
}
Path('/tmp/release_integration_attach_request.json').write_text(json.dumps(payload))
PY

ATTACH_ENABLED_CODE=$(curl -sS -o /tmp/release_integration_attach_enabled_resp.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$ENABLED_PORT/api/ai/release_integration/attach" \
  -H "Content-Type: application/json" \
  --data @/tmp/release_integration_attach_request.json)

kill "$PID_ENABLED"
wait "$PID_ENABLED" 2>/dev/null || true

CORE_AFTER="$(read_core_counts)"
AI_AFTER="$(read_ai_counts)"

{
  echo "=== attach disabled ==="
  echo "HTTP_STATUS=$ATTACH_DISABLED_CODE"
  cat /tmp/release_integration_attach_disabled_resp.json
  echo
  echo "=== plan enabled ==="
  echo "HTTP_STATUS=$PLAN_CODE"
  echo
  echo "=== attach enabled ==="
  echo "HTTP_STATUS=$ATTACH_ENABLED_CODE"
  python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/tmp/release_integration_attach_enabled_resp.json').read_text())
print(json.dumps({
  'status': payload.get('status'),
  'run_id': payload.get('run_id'),
  'attached_counts': payload.get('attached_counts'),
  'needs_review': payload.get('needs_review'),
}, indent=2))
PY
} > "$EVDIR/api_proof.txt"

{
  echo "DB=$DB_PATH"
  echo "=== core before ==="
  echo "$CORE_BEFORE"
  echo
  echo "=== core after ==="
  echo "$CORE_AFTER"
  echo
  echo "=== ai before ==="
  echo "$AI_BEFORE"
  echo
  echo "=== ai after ==="
  echo "$AI_AFTER"
} > "$EVDIR/db_proof.txt"

{
  echo "=== org isolation checks ==="
  echo "Token=ORG_B_ATTACH_EVIDENCE_TOKEN"
  if grep -q "ORG_B_ATTACH_EVIDENCE_TOKEN" /tmp/release_integration_attach_enabled_resp.json; then
    echo "FAIL: org B token leaked"
    exit 1
  else
    echo "PASS: org B token absent"
  fi
  echo
  grep -n "ORG_B_ATTACH_EVIDENCE_TOKEN" /tmp/release_integration_attach_enabled_resp.json || true
} > "$EVDIR/org_isolation.txt"

echo "Evidence generated at: $EVDIR"

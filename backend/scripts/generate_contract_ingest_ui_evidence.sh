#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.contract_ingest_ui_v1/headless"
DB_PATH="$HOME/.otto/data/db/contract_ingest_ui_evidence.sqlite"
PORT=8161

mkdir -p "$EVDIR"
mkdir -p "$(dirname "$DB_PATH")"

cd "$ROOT/backend"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
import io
import uuid
from reportlab.pdfgen import canvas
from database import Base, engine, SessionLocal
import models  # noqa: F401
from models.artist import Artist
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

org_a = uuid.UUID(int=9966)
org_b = uuid.UUID(int=9967)

label = db.query(Label).filter(Label.label_id == "LBL-CIUI-001").first()
if not label:
    label = Label(label_id="LBL-CIUI-001", name="Contract Ingest UI Label")
    db.add(label)
publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-CIUI-001").first()
if not publisher:
    publisher = Publisher(publisher_id="PUB-CIUI-001", name="Contract Ingest UI Publisher")
    db.add(publisher)
pro = db.query(PRO).filter(PRO.pro_id == "PRO-CIUI-001").first()
if not pro:
    pro = PRO(pro_id="PRO-CIUI-001", name="Contract Ingest UI PRO")
    db.add(pro)
db.commit(); db.refresh(label); db.refresh(publisher); db.refresh(pro)

artist_a = db.query(Artist).filter(Artist.artist_id == "ART-CIUI-A").first()
if not artist_a:
    artist_a = Artist(organization_id=org_a, artist_id="ART-CIUI-A", name="UI Evidence Artist", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    db.add(artist_a)
artist_b = db.query(Artist).filter(Artist.artist_id == "ART-CIUI-B").first()
if not artist_b:
    artist_b = Artist(organization_id=org_b, artist_id="ART-CIUI-B", name="UI Evidence Artist ORG_B_UI_INGEST_TOKEN", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    db.add(artist_b)
db.commit(); db.refresh(artist_a)

work_a = db.query(Work).filter(Work.work_id == "WORK-CIUI-A").first()
if not work_a:
    work_a = Work(organization_id=org_a, work_id="WORK-CIUI-A", title="UI Evidence Work", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_a)
work_b = db.query(Work).filter(Work.work_id == "WORK-CIUI-B").first()
if not work_b:
    work_b = Work(organization_id=org_b, work_id="WORK-CIUI-B", title="UI Evidence Work ORG_B_UI_INGEST_TOKEN", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_b)
db.commit(); db.refresh(work_a)

release_a = db.query(Release).filter(Release.release_id == "REL-CIUI-A").first()
if not release_a:
    release_a = Release(organization_id=org_a, release_id="REL-CIUI-A", title="UI Evidence Release A", label_id=label.id, artist_id=artist_a.id)
    db.add(release_a)
release_b = db.query(Release).filter(Release.release_id == "REL-CIUI-B").first()
if not release_b:
    release_b = Release(organization_id=org_b, release_id="REL-CIUI-B", title="UI Evidence Release B ORG_B_UI_INGEST_TOKEN", label_id=label.id, artist_id=artist_b.id)
    db.add(release_b)
db.commit(); db.refresh(release_a); db.refresh(release_b)

if not db.query(Track).filter(Track.track_id == "TRK-CIUI-A").first():
    db.add(Track(organization_id=org_a, track_id="TRK-CIUI-A", title="UI Evidence Track", release_id=release_a.id, work_id=work_a.id))
if not db.query(Track).filter(Track.track_id == "TRK-CIUI-B").first():
    db.add(Track(organization_id=org_b, track_id="TRK-CIUI-B", title="UI Evidence Track ORG_B_UI_INGEST_TOKEN", release_id=release_b.id, work_id=work_b.id))

if not db.query(Organization).filter(Organization.name == "UI Evidence Org A").first():
    db.add(Organization(organization_id=org_a, name="UI Evidence Org A", org_type="Label"))
if not db.query(Organization).filter(Organization.name == "UI Evidence Org B ORG_B_UI_INGEST_TOKEN").first():
    db.add(Organization(organization_id=org_b, name="UI Evidence Org B ORG_B_UI_INGEST_TOKEN", org_type="Label"))
if not db.query(Individual).filter(Individual.email == "ui.evidence.a@example.com").first():
    db.add(Individual(organization_id=org_a, first_name="UI", last_name="EvidenceA", email="ui.evidence.a@example.com"))
if not db.query(Individual).filter(Individual.email == "ui.evidence.b@example.com").first():
    db.add(Individual(organization_id=org_b, first_name="UI", last_name="EvidenceB ORG_B_UI_INGEST_TOKEN", email="ui.evidence.b@example.com"))

admin = db.query(User).filter(User.email == "admin@otto.com").first()
if not admin:
    db.add(User(email="admin@otto.com", hashed_password="x", full_name="Admin", organization_id=org_a, role="admin", is_active=True, is_superuser=True))
else:
    admin.organization_id = org_a

db.commit()
print(f"RELEASE_A_ID={release_a.id}")

buf = io.BytesIO()
pdf = canvas.Canvas(buf)
pdf.drawString(72, 750, "UI ingest evidence PDF")
pdf.showPage()
pdf.save()
open('/tmp/contract_ingest_ui_evidence.pdf', 'wb').write(buf.getvalue())

db.close()
PY

{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && python3 -m pytest -q)
} > "$EVDIR/gates.txt"

core_counts() {
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.artist import Artist
from models.release import Release
from models.track import Track
from models.work import Work

db = SessionLocal()
print(f"releases={db.query(Release).count()}")
print(f"works={db.query(Work).count()}")
print(f"tracks={db.query(Track).count()}")
print(f"artists={db.query(Artist).count()}")
db.close()
PY
}

ai_counts() {
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.contract_documents import AIContractDocument, AIContractWorkLink
from models.release_integration import AIReleaseIntegrationRun, AIReleaseIntegrationLink

db = SessionLocal()
print(f"ai_contract_documents={db.query(AIContractDocument).count()}")
print(f"ai_contract_work_links={db.query(AIContractWorkLink).count()}")
print(f"ai_release_integration_runs={db.query(AIReleaseIntegrationRun).count()}")
print(f"ai_release_integration_links={db.query(AIReleaseIntegrationLink).count()}")
db.close()
PY
}

RELEASE_A_ID="$(APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.release import Release

db = SessionLocal()
row = db.query(Release).filter(Release.release_id == 'REL-CIUI-A').first()
print(row.id if row else 0)
db.close()
PY
)"

APP_ENV=desktop AI_ENABLED=true AI_CONTRACT_INTEL_ENABLED=true AI_CONTRACT_INTAKE_ENABLED=true AI_RELEASE_VALIDATION_ENABLED=true AI_RELEASE_INTEGRATION_ATTACH_ENABLED=true AI_CONTRACT_INGEST_ENABLED=true DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$PORT" >/tmp/contract_ingest_ui_evidence.log 2>&1 &
PID=$!
sleep 2

PLAN_CODE=$(curl -sS -o /tmp/contract_ingest_ui_plan.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$PORT/api/ai/release_integration/plan" \
  -H "Content-Type: application/json" \
  -d "{\"release_id\":$RELEASE_A_ID,\"contract_extract\":{\"contract_title\":\"UI Evidence Contract\",\"parties\":[{\"display_name\":\"UI Evidence Artist\",\"role\":\"Artist\"}],\"splits\":[{\"split_type\":\"MASTER\",\"party_name\":\"UI Evidence Artist\",\"percent\":100.0}],\"splits_total\":100.0,\"works_hints\":{\"artists\":[\"UI Evidence Artist\"],\"tracks\":[\"UI Evidence Track\"],\"releases\":[\"UI Evidence Work\"]},\"warnings\":[],\"parser_version\":\"deterministic_v1\"},\"mode\":\"readonly\"}")

CORE_BEFORE="$(core_counts)"
AI_BEFORE="$(ai_counts)"

INGEST1_CODE=$(curl -sS -o /tmp/contract_ingest_ui_ingest_1.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$PORT/api/ai/release_integration/ingest" \
  -F "release_id=$RELEASE_A_ID" \
  -F "file=@/tmp/contract_ingest_ui_evidence.pdf;type=application/pdf")

AI_AFTER_FIRST="$(ai_counts)"

INGEST2_CODE=$(curl -sS -o /tmp/contract_ingest_ui_ingest_2.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$PORT/api/ai/release_integration/ingest" \
  -F "release_id=$RELEASE_A_ID" \
  -F "file=@/tmp/contract_ingest_ui_evidence.pdf;type=application/pdf")

CORE_AFTER="$(core_counts)"
AI_AFTER_SECOND="$(ai_counts)"

ORG_ISO_CODE=$(curl -sS -o /tmp/contract_ingest_ui_org_iso.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$PORT/api/ai/release_integration/ingest" \
  -F "release_id=2" \
  -F "file=@/tmp/contract_ingest_ui_evidence.pdf;type=application/pdf")

kill "$PID"
wait "$PID" 2>/dev/null || true

{
  echo "=== plan ==="
  echo "HTTP_STATUS=$PLAN_CODE"
  echo
  echo "=== ingest first ==="
  echo "HTTP_STATUS=$INGEST1_CODE"
  python3 - <<'PY'
import json
from pathlib import Path
p = json.loads(Path('/tmp/contract_ingest_ui_ingest_1.json').read_text())
print(json.dumps({
  'status': p.get('status'),
  'contract_document_id': p.get('contract_document_id'),
  'run_id': p.get('run_id'),
  'idempotent_hit': p.get('idempotent_hit'),
  'links_created_count': p.get('links_created_count'),
}, indent=2))
PY
  echo
  echo "=== ingest repeat ==="
  echo "HTTP_STATUS=$INGEST2_CODE"
  python3 - <<'PY'
import json
from pathlib import Path
p = json.loads(Path('/tmp/contract_ingest_ui_ingest_2.json').read_text())
print(json.dumps({
  'status': p.get('status'),
  'contract_document_id': p.get('contract_document_id'),
  'run_id': p.get('run_id'),
  'idempotent_hit': p.get('idempotent_hit'),
  'links_created_count': p.get('links_created_count'),
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
  echo "=== ai after first ingest ==="
  echo "$AI_AFTER_FIRST"
  echo
  echo "=== ai after second ingest ==="
  echo "$AI_AFTER_SECOND"
} > "$EVDIR/db_proof.txt"

{
  echo "=== org isolation ==="
  echo "org_iso_http_status=$ORG_ISO_CODE"
  echo "Token=ORG_B_UI_INGEST_TOKEN"
  if grep -q "ORG_B_UI_INGEST_TOKEN" /tmp/contract_ingest_ui_ingest_1.json; then
    echo "FAIL: org B token leaked"
    exit 1
  else
    echo "PASS: org B token absent in org A output"
  fi
  grep -n "ORG_B_UI_INGEST_TOKEN" /tmp/contract_ingest_ui_ingest_1.json || true
} > "$EVDIR/org_isolation.txt"

echo "Evidence generated at: $EVDIR"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.contract_ingest_v1/headless"
DB_PATH="$HOME/.otto/data/db/contract_ingest_evidence.sqlite"
DISABLED_PORT=8151
ENABLED_PORT=8152

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

org_a = uuid.UUID(int=9971)
org_b = uuid.UUID(int=9972)

label = db.query(Label).filter(Label.label_id == "LBL-CIE-001").first()
if not label:
    label = Label(label_id="LBL-CIE-001", name="Contract Ingest Evidence Label")
    db.add(label)

publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-CIE-001").first()
if not publisher:
    publisher = Publisher(publisher_id="PUB-CIE-001", name="Contract Ingest Evidence Publisher")
    db.add(publisher)

pro = db.query(PRO).filter(PRO.pro_id == "PRO-CIE-001").first()
if not pro:
    pro = PRO(pro_id="PRO-CIE-001", name="Contract Ingest Evidence PRO")
    db.add(pro)

db.commit()
db.refresh(label)
db.refresh(publisher)
db.refresh(pro)

artist_a = db.query(Artist).filter(Artist.artist_id == "ART-CIE-A").first()
if not artist_a:
    artist_a = Artist(organization_id=org_a, artist_id="ART-CIE-A", name="Ingest Evidence Artist", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    db.add(artist_a)
artist_b = db.query(Artist).filter(Artist.artist_id == "ART-CIE-B").first()
if not artist_b:
    artist_b = Artist(organization_id=org_b, artist_id="ART-CIE-B", name="Ingest Evidence Artist ORG_B_INGEST_EVIDENCE_TOKEN", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    db.add(artist_b)
db.commit()
db.refresh(artist_a)

work_a = db.query(Work).filter(Work.work_id == "WORK-CIE-A").first()
if not work_a:
    work_a = Work(organization_id=org_a, work_id="WORK-CIE-A", title="Ingest Evidence Work", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_a)
work_b = db.query(Work).filter(Work.work_id == "WORK-CIE-B").first()
if not work_b:
    work_b = Work(organization_id=org_b, work_id="WORK-CIE-B", title="Ingest Evidence Work ORG_B_INGEST_EVIDENCE_TOKEN", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_b)
db.commit()
db.refresh(work_a)

release_a = db.query(Release).filter(Release.release_id == "REL-CIE-A").first()
if not release_a:
    release_a = Release(organization_id=org_a, release_id="REL-CIE-A", title="Ingest Evidence Release A", label_id=label.id, artist_id=artist_a.id)
    db.add(release_a)
release_b = db.query(Release).filter(Release.release_id == "REL-CIE-B").first()
if not release_b:
    release_b = Release(organization_id=org_b, release_id="REL-CIE-B", title="Ingest Evidence Release B ORG_B_INGEST_EVIDENCE_TOKEN", label_id=label.id, artist_id=artist_b.id)
    db.add(release_b)
db.commit()
db.refresh(release_a)

track_a = db.query(Track).filter(Track.track_id == "TRK-CIE-A").first()
if not track_a:
    db.add(Track(organization_id=org_a, track_id="TRK-CIE-A", title="Ingest Evidence Track", release_id=release_a.id, work_id=work_a.id))
track_b = db.query(Track).filter(Track.track_id == "TRK-CIE-B").first()
if not track_b:
    db.add(Track(organization_id=org_b, track_id="TRK-CIE-B", title="Ingest Evidence Track ORG_B_INGEST_EVIDENCE_TOKEN", release_id=release_b.id, work_id=work_b.id))

org_a_row = db.query(Organization).filter(Organization.name == "Ingest Evidence Org A").first()
if not org_a_row:
    db.add(Organization(organization_id=org_a, name="Ingest Evidence Org A", org_type="Label"))
org_b_row = db.query(Organization).filter(Organization.name == "Ingest Evidence Org B ORG_B_INGEST_EVIDENCE_TOKEN").first()
if not org_b_row:
    db.add(Organization(organization_id=org_b, name="Ingest Evidence Org B ORG_B_INGEST_EVIDENCE_TOKEN", org_type="Label"))

ind_a = db.query(Individual).filter(Individual.email == "ingest.evidence.a@example.com").first()
if not ind_a:
    db.add(Individual(organization_id=org_a, first_name="Ingest", last_name="EvidenceA", email="ingest.evidence.a@example.com"))
ind_b = db.query(Individual).filter(Individual.email == "ingest.evidence.b@example.com").first()
if not ind_b:
    db.add(Individual(organization_id=org_b, first_name="Ingest", last_name="EvidenceB ORG_B_INGEST_EVIDENCE_TOKEN", email="ingest.evidence.b@example.com"))

contract = db.query(Contract).filter(Contract.contract_number == "CON-CIE-A").first()
if not contract:
    db.add(Contract(contract_number="CON-CIE-A", organization_id=org_a, title="Ingest Evidence Contract", status="Active"))

admin = db.query(User).filter(User.email == "admin@otto.com").first()
if not admin:
    db.add(User(email="admin@otto.com", hashed_password="x", full_name="Admin", organization_id=org_a, role="admin", is_active=True, is_superuser=True))
else:
    admin.organization_id = org_a

db.commit()
print(f"RELEASE_A_ID={release_a.id}")

def mkpdf(path, text):
    buf = io.BytesIO()
    pdf = canvas.Canvas(buf)
    pdf.drawString(72, 750, text)
    pdf.showPage()
    pdf.save()
    open(path, 'wb').write(buf.getvalue())

mkpdf('/tmp/contract_ingest_disabled.pdf', 'disabled ingest')
mkpdf('/tmp/contract_ingest_enabled.pdf', 'enabled ingest')


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

read_ai_counts() {
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

RELEASE_A_ID="$({
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.release import Release

db = SessionLocal()
row = db.query(Release).filter(Release.release_id == "REL-CIE-A").first()
print(row.id if row else 0)
db.close()
PY
})"

APP_ENV=desktop AI_ENABLED=true AI_CONTRACT_INTEL_ENABLED=true AI_RELEASE_VALIDATION_ENABLED=true AI_RELEASE_INTEGRATION_ATTACH_ENABLED=true AI_CONTRACT_INGEST_ENABLED=false DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$DISABLED_PORT" >/tmp/contract_ingest_disabled.log 2>&1 &
PID_DISABLED=$!
sleep 2

DISABLED_CODE=$(curl -sS -o /tmp/contract_ingest_disabled_resp.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$DISABLED_PORT/api/ai/release_integration/ingest" \
  -F "release_id=$RELEASE_A_ID" \
  -F "file=@/tmp/contract_ingest_disabled.pdf;type=application/pdf")

kill "$PID_DISABLED"
wait "$PID_DISABLED" 2>/dev/null || true

CORE_BEFORE="$(read_core_counts)"
AI_BEFORE="$(read_ai_counts)"

APP_ENV=desktop AI_ENABLED=true AI_CONTRACT_INTEL_ENABLED=true AI_RELEASE_VALIDATION_ENABLED=true AI_RELEASE_INTEGRATION_ATTACH_ENABLED=true AI_CONTRACT_INGEST_ENABLED=true DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$ENABLED_PORT" >/tmp/contract_ingest_enabled.log 2>&1 &
PID_ENABLED=$!
sleep 2

ENABLED_CODE=$(curl -sS -o /tmp/contract_ingest_enabled_resp.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$ENABLED_PORT/api/ai/release_integration/ingest" \
  -F "release_id=$RELEASE_A_ID" \
  -F "file=@/tmp/contract_ingest_enabled.pdf;type=application/pdf")

kill "$PID_ENABLED"
wait "$PID_ENABLED" 2>/dev/null || true

CORE_AFTER="$(read_core_counts)"
AI_AFTER="$(read_ai_counts)"

{
  echo "=== ingest disabled ==="
  echo "HTTP_STATUS=$DISABLED_CODE"
  cat /tmp/contract_ingest_disabled_resp.json
  echo
  echo "=== ingest enabled ==="
  echo "HTTP_STATUS=$ENABLED_CODE"
  python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/tmp/contract_ingest_enabled_resp.json').read_text())
print(json.dumps({
  'release_id': payload.get('release_id'),
  'contract_document_id': payload.get('contract_document_id'),
  'run_id': payload.get('run_id'),
  'ingest_counts': payload.get('ingest_counts'),
  'attached_counts': payload.get('attached_counts'),
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
  echo "Token=ORG_B_INGEST_EVIDENCE_TOKEN"
  if grep -q "ORG_B_INGEST_EVIDENCE_TOKEN" /tmp/contract_ingest_enabled_resp.json; then
    echo "FAIL: org B token leaked"
    exit 1
  else
    echo "PASS: org B token absent"
  fi
  echo
  grep -n "ORG_B_INGEST_EVIDENCE_TOKEN" /tmp/contract_ingest_enabled_resp.json || true
} > "$EVDIR/org_isolation.txt"

echo "Evidence generated at: $EVDIR"

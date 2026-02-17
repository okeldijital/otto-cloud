#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.royalty_sim_v1/headless"
DB_PATH="$HOME/.otto/data/db/royalty_sim_evidence.sqlite"
DISABLED_PORT=8171
ENABLED_PORT=8172

mkdir -p "$EVDIR"
mkdir -p "$(dirname "$DB_PATH")"

cd "$ROOT/backend"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
import uuid
from database import Base, engine, SessionLocal
import models  # noqa: F401
from models.ai import AIContractResolutionRun
from models.artist import Artist
from models.contract_documents import AIContractDocument, AIContractWorkLink
from models.label import Label
from models.network import Individual, Organization
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.release_integration import AIReleaseIntegrationLink, AIReleaseIntegrationRun
from models.track import Track
from models.user import User
from models.work import Work

Base.metadata.create_all(bind=engine)
db = SessionLocal()

org_a = uuid.UUID(int=9921)
org_b = uuid.UUID(int=9922)

label = db.query(Label).filter(Label.label_id == "LBL-RSE-001").first()
if not label:
    label = Label(label_id="LBL-RSE-001", name="Royalty Sim Label")
    db.add(label)
publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-RSE-001").first()
if not publisher:
    publisher = Publisher(publisher_id="PUB-RSE-001", name="Royalty Sim Publisher")
    db.add(publisher)
pro = db.query(PRO).filter(PRO.pro_id == "PRO-RSE-001").first()
if not pro:
    pro = PRO(pro_id="PRO-RSE-001", name="Royalty Sim PRO")
    db.add(pro)
db.commit(); db.refresh(label); db.refresh(publisher); db.refresh(pro)

artist_a = db.query(Artist).filter(Artist.artist_id == "ART-RSE-A").first()
if not artist_a:
    artist_a = Artist(organization_id=org_a, artist_id="ART-RSE-A", name="Royalty Sim Artist A", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    db.add(artist_a)
artist_b = db.query(Artist).filter(Artist.artist_id == "ART-RSE-B").first()
if not artist_b:
    artist_b = Artist(organization_id=org_b, artist_id="ART-RSE-B", name="Royalty Sim Artist B ORG_B_ROYALTY_EVIDENCE_TOKEN", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    db.add(artist_b)
db.commit(); db.refresh(artist_a)

work_a = db.query(Work).filter(Work.work_id == "WORK-RSE-A").first()
if not work_a:
    work_a = Work(organization_id=org_a, work_id="WORK-RSE-A", title="Royalty Sim Work A", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_a)
work_b = db.query(Work).filter(Work.work_id == "WORK-RSE-B").first()
if not work_b:
    work_b = Work(organization_id=org_b, work_id="WORK-RSE-B", title="Royalty Sim Work B ORG_B_ROYALTY_EVIDENCE_TOKEN", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_b)
db.commit(); db.refresh(work_a)

release_a = db.query(Release).filter(Release.release_id == "REL-RSE-A").first()
if not release_a:
    release_a = Release(organization_id=org_a, release_id="REL-RSE-A", title="Royalty Sim Release A", label_id=label.id, artist_id=artist_a.id)
    db.add(release_a)
release_b = db.query(Release).filter(Release.release_id == "REL-RSE-B").first()
if not release_b:
    release_b = Release(organization_id=org_b, release_id="REL-RSE-B", title="Royalty Sim Release B ORG_B_ROYALTY_EVIDENCE_TOKEN", label_id=label.id, artist_id=artist_b.id)
    db.add(release_b)
db.commit(); db.refresh(release_a)

if not db.query(Track).filter(Track.track_id == "TRK-RSE-A").first():
    db.add(Track(organization_id=org_a, track_id="TRK-RSE-A", title="Royalty Sim Track A", release_id=release_a.id, work_id=work_a.id, isrc_code="ISRC-RSE-A"))
if not db.query(Track).filter(Track.track_id == "TRK-RSE-B").first():
    db.add(Track(organization_id=org_b, track_id="TRK-RSE-B", title="Royalty Sim Track B ORG_B_ROYALTY_EVIDENCE_TOKEN", release_id=release_b.id, work_id=work_b.id))

if not db.query(Organization).filter(Organization.name == "Royalty Sim Org A").first():
    db.add(Organization(organization_id=org_a, name="Royalty Sim Org A", org_type="Label"))
if not db.query(Organization).filter(Organization.name == "Royalty Sim Org B ORG_B_ROYALTY_EVIDENCE_TOKEN").first():
    db.add(Organization(organization_id=org_b, name="Royalty Sim Org B ORG_B_ROYALTY_EVIDENCE_TOKEN", org_type="Label"))
if not db.query(Individual).filter(Individual.email == "royalty.sim.a@example.com").first():
    db.add(Individual(organization_id=org_a, first_name="Roy", last_name="A", email="royalty.sim.a@example.com"))
if not db.query(Individual).filter(Individual.email == "royalty.sim.b@example.com").first():
    db.add(Individual(organization_id=org_b, first_name="Roy", last_name="B ORG_B_ROYALTY_EVIDENCE_TOKEN", email="royalty.sim.b@example.com"))

admin = db.query(User).filter(User.email == "admin@otto.com").first()
if not admin:
    admin = User(email="admin@otto.com", hashed_password="x", full_name="Admin", organization_id=org_a, role="admin", is_active=True, is_superuser=True)
    db.add(admin)
else:
    admin.organization_id = org_a

db.commit(); db.refresh(admin)

run = db.query(AIReleaseIntegrationRun).filter(AIReleaseIntegrationRun.request_hash == "royalty_sim_evidence_hash").first()
if not run:
    run = AIReleaseIntegrationRun(organization_id=org_a, user_id=admin.id, release_id=release_a.id, request_hash="royalty_sim_evidence_hash", planner_version="release_integration_v1")
    db.add(run)
    db.commit(); db.refresh(run)

if not db.query(AIReleaseIntegrationLink).filter(AIReleaseIntegrationLink.run_id == run.id, AIReleaseIntegrationLink.entity_type == "artist", AIReleaseIntegrationLink.entity_id == artist_a.id).first():
    db.add(AIReleaseIntegrationLink(organization_id=org_a, run_id=run.id, entity_type="artist", entity_id=artist_a.id, display_name=artist_a.name, action="attach", confidence=1.0, match_strategy="exact"))
if not db.query(AIReleaseIntegrationLink).filter(AIReleaseIntegrationLink.run_id == run.id, AIReleaseIntegrationLink.entity_type == "work", AIReleaseIntegrationLink.entity_id == work_a.id).first():
    db.add(AIReleaseIntegrationLink(organization_id=org_a, run_id=run.id, entity_type="work", entity_id=work_a.id, display_name=work_a.title, action="attach", confidence=0.9, match_strategy="normalized"))

doc = db.query(AIContractDocument).filter(AIContractDocument.file_hash == "cafebabe" * 8).first()
if not doc:
    doc = AIContractDocument(organization_id=org_a, release_id=release_a.id, file_path="/tmp/royalty_sim.pdf", file_hash="cafebabe" * 8, uploaded_by=admin.id)
    db.add(doc)
    db.commit(); db.refresh(doc)

if not db.query(AIContractWorkLink).filter(AIContractWorkLink.contract_document_id == doc.id, AIContractWorkLink.work_id == work_a.id).first():
    db.add(AIContractWorkLink(organization_id=org_a, contract_document_id=doc.id, work_id=work_a.id, confidence=0.95, match_strategy="exact"))

if db.query(AIContractResolutionRun).count() < 0:
    pass

db.commit()
print(f"RELEASE_A_ID={release_a.id}")
print(f"DOC_A_ID={doc.id}")
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
print(f"artists={db.query(Artist).count()}")
print(f"tracks={db.query(Track).count()}")
print(f"works={db.query(Work).count()}")
print(f"releases={db.query(Release).count()}")
db.close()
PY
}

read_ai_runs() {
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.ai_royalty import AIRoyaltySimulationRun

db = SessionLocal()
print(f"ai_royalty_simulation_runs={db.query(AIRoyaltySimulationRun).count()}")
db.close()
PY
}

RELEASE_A_ID="$({
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.release import Release

db = SessionLocal()
row = db.query(Release).filter(Release.release_id == "REL-RSE-A").first()
print(row.id if row else 0)
db.close()
PY
})"

DOC_A_ID="$({
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.contract_documents import AIContractDocument

db = SessionLocal()
row = db.query(AIContractDocument).filter(AIContractDocument.file_hash == "cafebabe" * 8).first()
print(row.id if row else 0)
db.close()
PY
})"

APP_ENV=desktop AI_ENABLED=true AI_ROYALTY_ENABLED=false AI_ROYALTY_PERSIST_ENABLED=true DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$DISABLED_PORT" >/tmp/royalty_sim_disabled.log 2>&1 &
PID_DISABLED=$!
sleep 2

HEALTH_CODE=$(curl -sS -o /tmp/royalty_sim_health.json -w "%{http_code}" "http://127.0.0.1:$DISABLED_PORT/api/ai/royalty/health")
DISABLED_CODE=$(curl -sS -o /tmp/royalty_sim_disabled.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$DISABLED_PORT/api/ai/royalty/simulate" \
  -H "Content-Type: application/json" \
  -d "{\"release_id\":$RELEASE_A_ID,\"contract_document_id\":$DOC_A_ID}")

kill "$PID_DISABLED"
wait "$PID_DISABLED" 2>/dev/null || true

CORE_BEFORE="$(read_core_counts)"
AI_BEFORE="$(read_ai_runs)"

APP_ENV=desktop AI_ENABLED=true AI_ROYALTY_ENABLED=true AI_ROYALTY_PERSIST_ENABLED=true DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$ENABLED_PORT" >/tmp/royalty_sim_enabled.log 2>&1 &
PID_ENABLED=$!
sleep 2

ENABLED_CODE=$(curl -sS -o /tmp/royalty_sim_enabled.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$ENABLED_PORT/api/ai/royalty/simulate" \
  -H "Content-Type: application/json" \
  -d "{\"release_id\":$RELEASE_A_ID,\"contract_document_id\":$DOC_A_ID}")

ORG_ISO_CODE=$(curl -sS -o /tmp/royalty_sim_org_iso.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$ENABLED_PORT/api/ai/royalty/simulate" \
  -H "Content-Type: application/json" \
  -d '{"release_id":2}')

kill "$PID_ENABLED"
wait "$PID_ENABLED" 2>/dev/null || true

CORE_AFTER="$(read_core_counts)"
AI_AFTER="$(read_ai_runs)"

{
  echo "=== health ==="
  echo "HTTP_STATUS=$HEALTH_CODE"
  cat /tmp/royalty_sim_health.json
  echo
  echo "=== simulate disabled ==="
  echo "HTTP_STATUS=$DISABLED_CODE"
  cat /tmp/royalty_sim_disabled.json
  echo
  echo "=== simulate enabled ==="
  echo "HTTP_STATUS=$ENABLED_CODE"
  python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/tmp/royalty_sim_enabled.json').read_text())
print(json.dumps({
  'royalty_version': payload.get('royalty_version'),
  'splits_total': payload.get('splits_total'),
  'integrity': payload.get('integrity'),
  'persisted': payload.get('persisted'),
  'run_id': payload.get('run_id'),
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
  echo "=== ai runs before ==="
  echo "$AI_BEFORE"
  echo
  echo "=== ai runs after ==="
  echo "$AI_AFTER"
} > "$EVDIR/db_proof.txt"

{
  echo "=== org isolation ==="
  echo "org_iso_http_status=$ORG_ISO_CODE"
  echo "Token=ORG_B_ROYALTY_EVIDENCE_TOKEN"
  if grep -q "ORG_B_ROYALTY_EVIDENCE_TOKEN" /tmp/royalty_sim_enabled.json; then
    echo "FAIL: org B token present"
    exit 1
  else
    echo "PASS: no org B token"
  fi
  grep -n "ORG_B_ROYALTY_EVIDENCE_TOKEN" /tmp/royalty_sim_enabled.json || true
} > "$EVDIR/org_isolation.txt"

echo "Evidence generated at: $EVDIR"

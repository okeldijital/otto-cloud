#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.royalty_ui_v1/headless"
DB_PATH="$HOME/.otto/data/db/royalty_ui_evidence.sqlite"
DISABLED_PORT=8191
ENABLED_PORT=8192

mkdir -p "$EVDIR"
mkdir -p "$(dirname "$DB_PATH")"

cd "$ROOT/backend"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
import uuid
from database import Base, engine, SessionLocal
import models  # noqa: F401
from models.artist import Artist
from models.contract import Contract
from models.contract_documents import AIContractDocument
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

org_a = uuid.UUID(int=9811)
org_b = uuid.UUID(int=9812)

label = db.query(Label).filter(Label.label_id == "LBL-RYUIE-001").first()
if not label:
    label = Label(label_id="LBL-RYUIE-001", name="Royalty UI Evidence Label")
    db.add(label)
publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-RYUIE-001").first()
if not publisher:
    publisher = Publisher(publisher_id="PUB-RYUIE-001", name="Royalty UI Evidence Publisher")
    db.add(publisher)
pro = db.query(PRO).filter(PRO.pro_id == "PRO-RYUIE-001").first()
if not pro:
    pro = PRO(pro_id="PRO-RYUIE-001", name="Royalty UI Evidence PRO")
    db.add(pro)
db.commit(); db.refresh(label); db.refresh(publisher); db.refresh(pro)

artist_a = db.query(Artist).filter(Artist.artist_id == "ART-RYUIE-A").first()
if not artist_a:
    artist_a = Artist(organization_id=org_a, artist_id="ART-RYUIE-A", name="Royalty UI Evidence Artist A", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    db.add(artist_a)
artist_b = db.query(Artist).filter(Artist.artist_id == "ART-RYUIE-B").first()
if not artist_b:
    artist_b = Artist(organization_id=org_b, artist_id="ART-RYUIE-B", name="Royalty UI Evidence Artist B ORG_B_ROYALTY_UI_EVIDENCE_TOKEN", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    db.add(artist_b)
db.commit(); db.refresh(artist_a); db.refresh(artist_b)

work_a = db.query(Work).filter(Work.work_id == "WORK-RYUIE-A").first()
if not work_a:
    work_a = Work(organization_id=org_a, work_id="WORK-RYUIE-A", title="Royalty UI Evidence Work A", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_a)
work_b = db.query(Work).filter(Work.work_id == "WORK-RYUIE-B").first()
if not work_b:
    work_b = Work(organization_id=org_b, work_id="WORK-RYUIE-B", title="Royalty UI Evidence Work B ORG_B_ROYALTY_UI_EVIDENCE_TOKEN", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_b)
db.commit(); db.refresh(work_a); db.refresh(work_b)

release_a = db.query(Release).filter(Release.release_id == "REL-RYUIE-A").first()
if not release_a:
    release_a = Release(organization_id=org_a, release_id="REL-RYUIE-A", title="Royalty UI Evidence Release A", label_id=label.id, artist_id=artist_a.id)
    db.add(release_a)
release_b = db.query(Release).filter(Release.release_id == "REL-RYUIE-B").first()
if not release_b:
    release_b = Release(organization_id=org_b, release_id="REL-RYUIE-B", title="Royalty UI Evidence Release B ORG_B_ROYALTY_UI_EVIDENCE_TOKEN", label_id=label.id, artist_id=artist_b.id)
    db.add(release_b)
db.commit(); db.refresh(release_a)

if not db.query(Track).filter(Track.track_id == "TRK-RYUIE-A").first():
    db.add(Track(organization_id=org_a, track_id="TRK-RYUIE-A", title="Royalty UI Evidence Track A", release_id=release_a.id, work_id=work_a.id, isrc_code="ISRC-RYUIE-A"))
if not db.query(Track).filter(Track.track_id == "TRK-RYUIE-B").first():
    db.add(Track(organization_id=org_b, track_id="TRK-RYUIE-B", title="Royalty UI Evidence Track B ORG_B_ROYALTY_UI_EVIDENCE_TOKEN", release_id=release_b.id, work_id=work_b.id, isrc_code="ISRC-RYUIE-B"))

if not db.query(Organization).filter(Organization.name == "Royalty UI Evidence Org A").first():
    db.add(Organization(organization_id=org_a, name="Royalty UI Evidence Org A", org_type="Label"))
if not db.query(Organization).filter(Organization.name == "Royalty UI Evidence Org B ORG_B_ROYALTY_UI_EVIDENCE_TOKEN").first():
    db.add(Organization(organization_id=org_b, name="Royalty UI Evidence Org B ORG_B_ROYALTY_UI_EVIDENCE_TOKEN", org_type="Label"))
if not db.query(Individual).filter(Individual.email == "royalty.ui.ev.a@example.com").first():
    db.add(Individual(organization_id=org_a, first_name="Royalty", last_name="UIEA", email="royalty.ui.ev.a@example.com"))
if not db.query(Individual).filter(Individual.email == "royalty.ui.ev.b@example.com").first():
    db.add(Individual(organization_id=org_b, first_name="Royalty", last_name="UIEB ORG_B_ROYALTY_UI_EVIDENCE_TOKEN", email="royalty.ui.ev.b@example.com"))

if not db.query(Contract).filter(Contract.contract_number == "CON-RYUIE-A").first():
    db.add(Contract(contract_number="CON-RYUIE-A", organization_id=org_a, title="Royalty UI Evidence Contract", status="Active"))

admin = db.query(User).filter(User.email == "admin@otto.com").first()
if not admin:
    admin = User(email="admin@otto.com", hashed_password="x", full_name="Admin", organization_id=org_a, role="admin", is_active=True, is_superuser=True)
    db.add(admin)
else:
    admin.organization_id = org_a
db.commit(); db.refresh(admin)

run = db.query(AIReleaseIntegrationRun).filter(AIReleaseIntegrationRun.request_hash == "royalty_ui_evidence_hash").first()
if not run:
    run = AIReleaseIntegrationRun(organization_id=org_a, user_id=admin.id, release_id=release_a.id, request_hash="royalty_ui_evidence_hash", planner_version="release_integration_v1")
    db.add(run)
    db.commit(); db.refresh(run)

if not db.query(AIReleaseIntegrationLink).filter(AIReleaseIntegrationLink.run_id == run.id, AIReleaseIntegrationLink.entity_type == "artist", AIReleaseIntegrationLink.entity_id == artist_a.id).first():
    db.add(AIReleaseIntegrationLink(organization_id=org_a, run_id=run.id, entity_type="artist", entity_id=artist_a.id, display_name=artist_a.name, action="attach", confidence=1.0, match_strategy="exact"))
if not db.query(AIReleaseIntegrationLink).filter(AIReleaseIntegrationLink.run_id == run.id, AIReleaseIntegrationLink.entity_type == "work", AIReleaseIntegrationLink.entity_id == work_a.id).first():
    db.add(AIReleaseIntegrationLink(organization_id=org_a, run_id=run.id, entity_type="work", entity_id=work_a.id, display_name=work_a.title, action="attach", confidence=0.9, match_strategy="normalized"))

doc = db.query(AIContractDocument).filter(AIContractDocument.file_hash == "abcddcba" * 8).first()
if not doc:
    doc = AIContractDocument(organization_id=org_a, release_id=release_a.id, file_path="/tmp/royalty_ui_evidence.pdf", file_hash="abcddcba" * 8, uploaded_by=admin.id)
    db.add(doc)
    db.commit(); db.refresh(doc)

db.commit()
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
row = db.query(Release).filter(Release.release_id == "REL-RYUIE-A").first()
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
row = db.query(AIContractDocument).filter(AIContractDocument.file_hash == "abcddcba" * 8).first()
print(row.id if row else 0)
db.close()
PY
})"

APP_ENV=desktop AI_ENABLED=true AI_ROYALTY_ENABLED=false AI_ROYALTY_PERSIST_ENABLED=true DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$DISABLED_PORT" >/tmp/royalty_ui_disabled.log 2>&1 &
PID_DISABLED=$!
sleep 2

HEALTH_CODE=$(curl -sS -o /tmp/royalty_ui_health.json -w "%{http_code}" "http://127.0.0.1:$DISABLED_PORT/api/ai/royalty/health")
DISABLED_CODE=$(curl -sS -o /tmp/royalty_ui_disabled.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$DISABLED_PORT/api/ai/royalty/simulate" \
  -H "Content-Type: application/json" \
  -d "{\"release_id\":$RELEASE_A_ID,\"contract_document_id\":$DOC_A_ID,\"gross_revenue\":1000.0,\"units\":1000,\"period_start\":\"2026-01-01\",\"period_end\":\"2026-01-31\"}")

kill "$PID_DISABLED"
wait "$PID_DISABLED" 2>/dev/null || true

CORE_BEFORE="$(read_core_counts)"
AI_BEFORE="$(read_ai_runs)"

APP_ENV=desktop AI_ENABLED=true AI_ROYALTY_ENABLED=true AI_ROYALTY_PERSIST_ENABLED=true DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$ENABLED_PORT" >/tmp/royalty_ui_enabled.log 2>&1 &
PID_ENABLED=$!
sleep 2

ENABLED_CODE=$(curl -sS -o /tmp/royalty_ui_enabled.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$ENABLED_PORT/api/ai/royalty/simulate" \
  -H "Content-Type: application/json" \
  -d "{\"release_id\":$RELEASE_A_ID,\"contract_document_id\":$DOC_A_ID,\"gross_revenue\":1000.0,\"units\":1000,\"period_start\":\"2026-01-01\",\"period_end\":\"2026-01-31\"}")

ORG_ISO_CODE=$(curl -sS -o /tmp/royalty_ui_org_iso.json -w "%{http_code}" \
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
  cat /tmp/royalty_ui_health.json
  echo
  echo "=== simulate disabled ==="
  echo "HTTP_STATUS=$DISABLED_CODE"
  cat /tmp/royalty_ui_disabled.json
  echo
  echo "=== simulate enabled ==="
  echo "HTTP_STATUS=$ENABLED_CODE"
  python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/tmp/royalty_ui_enabled.json').read_text())
print(json.dumps({
  'status': payload.get('status'),
  'org_id': payload.get('org_id'),
  'generated_at': payload.get('generated_at'),
  'simulation_version': payload.get('simulation_version'),
  'inputs': payload.get('inputs'),
  'results': payload.get('results'),
  'warnings': payload.get('warnings'),
  'persisted': payload.get('persisted'),
  'run_id': payload.get('run_id'),
  'idempotent_hit': payload.get('idempotent_hit'),
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
  echo "Token=ORG_B_ROYALTY_UI_EVIDENCE_TOKEN"
  if grep -q "ORG_B_ROYALTY_UI_EVIDENCE_TOKEN" /tmp/royalty_ui_enabled.json; then
    echo "FAIL: org B token present"
    exit 1
  else
    echo "PASS: no org B token"
  fi
  grep -n "ORG_B_ROYALTY_UI_EVIDENCE_TOKEN" /tmp/royalty_ui_enabled.json || true
} > "$EVDIR/org_isolation.txt"

echo "Evidence generated at: $EVDIR"

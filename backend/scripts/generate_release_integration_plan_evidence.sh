#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAG="${1:-v1.release_integration_plan_v1}"
EVDIR="$ROOT/docs/evidence/$TAG/headless"
DB_PATH="$HOME/.otto/data/db/release_integration_plan_evidence.sqlite"
PORT=8131
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

org_a = uuid.UUID(int=9901)
org_b = uuid.UUID(int=9902)

label = db.query(Label).filter(Label.label_id == "LBL-RIPE-001").first()
if not label:
    label = Label(label_id="LBL-RIPE-001", name="RI Evidence Label")
    db.add(label)

publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-RIPE-001").first()
if not publisher:
    publisher = Publisher(publisher_id="PUB-RIPE-001", name="RI Evidence Publisher")
    db.add(publisher)

pro = db.query(PRO).filter(PRO.pro_id == "PRO-RIPE-001").first()
if not pro:
    pro = PRO(pro_id="PRO-RIPE-001", name="RI Evidence PRO")
    db.add(pro)

db.commit()
db.refresh(label)
db.refresh(publisher)
db.refresh(pro)

artist_a = db.query(Artist).filter(Artist.artist_id == "ART-RIPE-A").first()
if not artist_a:
    artist_a = Artist(
        organization_id=org_a,
        artist_id="ART-RIPE-A",
        name="Evidence Shared Artist",
        label_id=label.id,
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(artist_a)

artist_b = db.query(Artist).filter(Artist.artist_id == "ART-RIPE-B").first()
if not artist_b:
    artist_b = Artist(
        organization_id=org_b,
        artist_id="ART-RIPE-B",
        name="Evidence Shared Artist ORG_B_SECRET_TOKEN",
        label_id=label.id,
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(artist_b)

db.commit()
db.refresh(artist_a)

work_a = db.query(Work).filter(Work.work_id == "WORK-RIPE-A").first()
if not work_a:
    work_a = Work(
        organization_id=org_a,
        work_id="WORK-RIPE-A",
        title="Evidence Shared Work",
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(work_a)

work_b = db.query(Work).filter(Work.work_id == "WORK-RIPE-B").first()
if not work_b:
    work_b = Work(
        organization_id=org_b,
        work_id="WORK-RIPE-B",
        title="Evidence Shared Work ORG_B_SECRET_TOKEN",
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(work_b)

db.commit()
db.refresh(work_a)

release_a = db.query(Release).filter(Release.release_id == "REL-RIPE-A").first()
if not release_a:
    release_a = Release(
        organization_id=org_a,
        release_id="REL-RIPE-A",
        title="RI Evidence Release A",
        label_id=label.id,
        artist_id=artist_a.id,
    )
    db.add(release_a)

db.commit()
db.refresh(release_a)

release_b = db.query(Release).filter(Release.release_id == "REL-RIPE-B").first()
if not release_b:
    release_b = Release(
        organization_id=org_b,
        release_id="REL-RIPE-B",
        title="RI Evidence Release B ORG_B_SECRET_TOKEN",
        label_id=label.id,
        artist_id=artist_b.id if artist_b else None,
    )
    db.add(release_b)

db.commit()
db.refresh(release_b)

track_a = db.query(Track).filter(Track.track_id == "TRK-RIPE-A").first()
if not track_a:
    track_a = Track(
        organization_id=org_a,
        track_id="TRK-RIPE-A",
        title="Evidence Shared Track",
        release_id=release_a.id,
        work_id=work_a.id,
    )
    db.add(track_a)

track_b = db.query(Track).filter(Track.track_id == "TRK-RIPE-B").first()
if not track_b:
    track_b = Track(
        organization_id=org_b,
        track_id="TRK-RIPE-B",
        title="Evidence Shared Track ORG_B_SECRET_TOKEN",
        release_id=release_b.id,
        work_id=work_b.id,
    )
    db.add(track_b)

org_a_row = db.query(Organization).filter(Organization.name == "RI Evidence Org A").first()
if not org_a_row:
    db.add(Organization(organization_id=org_a, name="RI Evidence Org A", org_type="Label"))

org_b_row = db.query(Organization).filter(Organization.name == "RI Evidence Org B ORG_B_SECRET_TOKEN").first()
if not org_b_row:
    db.add(Organization(organization_id=org_b, name="RI Evidence Org B ORG_B_SECRET_TOKEN", org_type="Label"))

ind_a = db.query(Individual).filter(Individual.email == "ri.evidence.a@example.com").first()
if not ind_a:
    db.add(Individual(organization_id=org_a, first_name="RI", last_name="EvidenceA", email="ri.evidence.a@example.com"))

ind_b = db.query(Individual).filter(Individual.email == "ri.evidence.b@example.com").first()
if not ind_b:
    db.add(Individual(organization_id=org_b, first_name="RI", last_name="EvidenceB ORG_B_SECRET_TOKEN", email="ri.evidence.b@example.com"))

contract_a = db.query(Contract).filter(Contract.contract_number == "CON-RIPE-A").first()
if not contract_a:
    db.add(Contract(contract_number="CON-RIPE-A", organization_id=org_a, title="RI Evidence Contract", status="Active"))

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

read_counts_and_checksums() {
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
import hashlib
from database import SessionLocal
import models  # noqa: F401
from models.artist import Artist
from models.contract import Contract
from models.network import Individual, Organization
from models.release import Release
from models.track import Track
from models.work import Work

db = SessionLocal()

def digest(rows):
    payload = "|".join(rows)
    return hashlib.sha256(payload.encode()).hexdigest()

artists = [f"{row.id}:{row.name}" for row in db.query(Artist).order_by(Artist.id.asc()).all()]
tracks = [f"{row.id}:{row.title}" for row in db.query(Track).order_by(Track.id.asc()).all()]
works = [f"{row.id}:{row.title}" for row in db.query(Work).order_by(Work.id.asc()).all()]
releases = [f"{row.id}:{row.title}" for row in db.query(Release).order_by(Release.id.asc()).all()]
organizations = [f"{row.id}:{row.name}" for row in db.query(Organization).order_by(Organization.id.asc()).all()]
individuals = [f"{row.id}:{row.full_name}" for row in db.query(Individual).order_by(Individual.id.asc()).all()]
contracts = [f"{row.id}:{row.title}" for row in db.query(Contract).order_by(Contract.id.asc()).all()]

print(f"artists.count={len(artists)}")
print(f"tracks.count={len(tracks)}")
print(f"works.count={len(works)}")
print(f"releases.count={len(releases)}")
print(f"organizations.count={len(organizations)}")
print(f"individuals.count={len(individuals)}")
print(f"contracts.count={len(contracts)}")
print(f"artists.sha256={digest(artists)}")
print(f"tracks.sha256={digest(tracks)}")
print(f"works.sha256={digest(works)}")
print(f"releases.sha256={digest(releases)}")
print(f"organizations.sha256={digest(organizations)}")
print(f"individuals.sha256={digest(individuals)}")
print(f"contracts.sha256={digest(contracts)}")

db.close()
PY
}

BEFORE="$(read_counts_and_checksums)"

RELEASE_A_ID="$(
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.release import Release
db = SessionLocal()
row = db.query(Release).filter(Release.release_id == "REL-RIPE-A").first()
print(row.id if row else 0)
db.close()
PY
)"

APP_ENV=desktop AI_ENABLED=true AI_CONTRACT_INTEL_ENABLED=true AI_CONTRACT_INTAKE_ENABLED=true AI_RELEASE_VALIDATION_ENABLED=true DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$PORT" >/tmp/release_integration_plan_evidence.log 2>&1 &
PID=$!
sleep 2

HEALTH_CODE=$(curl -sS -o /tmp/release_integration_health.json -w "%{http_code}" "http://127.0.0.1:$PORT/api/ai/release_integration/health")

cat > /tmp/release_integration_plan_request.json <<'JSON'
{
  "release_id": __RELEASE_A_ID__,
  "contract_extract": {
    "contract_title": "RI Evidence Contract",
    "parties": [
      {"display_name": "Evidence Shared Artist", "role": "Artist"},
      {"display_name": "RI Evidence Org A", "role": "Label"}
    ],
    "splits": [
      {"split_type": "MASTER", "party_name": "Evidence Shared Artist", "percent": 100.0}
    ],
    "splits_total": 100.0,
    "works_hints": {
      "artists": ["Evidence Shared Artist"],
      "tracks": ["Evidence Shared Track"],
      "releases": ["Evidence Shared Work"]
    },
    "warnings": [],
    "parser_version": "deterministic_v1"
  },
  "mode": "readonly"
}
JSON

sed -i.bak "s/__RELEASE_A_ID__/$RELEASE_A_ID/g" /tmp/release_integration_plan_request.json

PLAN_CODE=$(curl -sS -o /tmp/release_integration_plan_response.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$PORT/api/ai/release_integration/plan" \
  -H "Content-Type: application/json" \
  --data @/tmp/release_integration_plan_request.json)

kill "$PID"
wait "$PID" 2>/dev/null || true

AFTER="$(read_counts_and_checksums)"

{
  echo "=== GET /api/ai/release_integration/health ==="
  echo "HTTP_STATUS=$HEALTH_CODE"
  cat /tmp/release_integration_health.json
  echo
  echo "=== POST /api/ai/release_integration/plan ==="
  echo "HTTP_STATUS=$PLAN_CODE"
  python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/tmp/release_integration_plan_response.json').read_text())
print(json.dumps({
  'org_id': payload.get('org_id'),
  'missing_flags': payload.get('missing_flags', []),
}, indent=2))
PY
} > "$EVDIR/api_proof.txt"

{
  echo "DB=$DB_PATH"
  echo "=== before ==="
  echo "$BEFORE"
  echo
  echo "=== after ==="
  echo "$AFTER"
} > "$EVDIR/db_proof.txt"

{
  echo "=== Org isolation checks ==="
  echo "Token=ORG_B_SECRET_TOKEN"
  if grep -q "ORG_B_SECRET_TOKEN" /tmp/release_integration_plan_response.json; then
    echo "FAIL: org B token found in org A response"
    exit 1
  else
    echo "PASS: org B token not found in org A response"
  fi
  echo
  echo "Raw grep output:"
  grep -n "ORG_B_SECRET_TOKEN" /tmp/release_integration_plan_response.json || true
} > "$EVDIR/org_isolation.txt"

echo "Evidence generated at: $EVDIR"

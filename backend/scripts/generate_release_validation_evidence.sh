#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.release_validation_v1/headless"
DB_PATH="$HOME/.otto/data/db/release_validation_evidence.sqlite"
mkdir -p "$EVDIR"
mkdir -p "$(dirname "$DB_PATH")"
cd "$ROOT/backend"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
import uuid
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

org_a = uuid.UUID(int=9501)
org_b = uuid.UUID(int=9502)

label = db.query(Label).filter(Label.label_id == "LBL-RVE-001").first()
if not label:
    label = Label(label_id="LBL-RVE-001", name="RV Evidence Label")
    db.add(label)
publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-RVE-001").first()
if not publisher:
    publisher = Publisher(publisher_id="PUB-RVE-001", name="RV Evidence Publisher")
    db.add(publisher)
pro = db.query(PRO).filter(PRO.pro_id == "PRO-RVE-001").first()
if not pro:
    pro = PRO(pro_id="PRO-RVE-001", name="RV Evidence PRO")
    db.add(pro)
db.commit()
db.refresh(label)
db.refresh(publisher)
db.refresh(pro)

artist_a = db.query(Artist).filter(Artist.artist_id == "ART-RVE-001").first()
if not artist_a:
    artist_a = Artist(
        organization_id=org_a,
        artist_id="ART-RVE-001",
        name="RV Evidence Artist A",
        label_id=label.id,
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(artist_a)
artist_b = db.query(Artist).filter(Artist.artist_id == "ART-RVE-002").first()
if not artist_b:
    artist_b = Artist(
        organization_id=org_b,
        artist_id="ART-RVE-002",
        name="RV Evidence Artist B",
        label_id=label.id,
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(artist_b)

org_a_row = db.query(Organization).filter(Organization.name == "RV Evidence Org A").first()
if not org_a_row:
    org_a_row = Organization(organization_id=org_a, name="RV Evidence Org A", org_type="Label")
    db.add(org_a_row)
org_b_row = db.query(Organization).filter(Organization.name == "RV Evidence Org B").first()
if not org_b_row:
    org_b_row = Organization(organization_id=org_b, name="RV Evidence Org B", org_type="Label")
    db.add(org_b_row)

ind_a = db.query(Individual).filter(Individual.email == "rv.evidence.a@example.com").first()
if not ind_a:
    ind_a = Individual(organization_id=org_a, first_name="RV", last_name="A", email="rv.evidence.a@example.com")
    db.add(ind_a)
ind_b = db.query(Individual).filter(Individual.email == "rv.evidence.b@example.com").first()
if not ind_b:
    ind_b = Individual(organization_id=org_b, first_name="RV", last_name="B", email="rv.evidence.b@example.com")
    db.add(ind_b)

db.commit()
db.refresh(artist_a)
db.refresh(artist_b)

work_a = db.query(Work).filter(Work.work_id == "WORK-RVE-001").first()
if not work_a:
    work_a = Work(organization_id=org_a, work_id="WORK-RVE-001", title="RV Evidence Work A", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_a)
work_b = db.query(Work).filter(Work.work_id == "WORK-RVE-002").first()
if not work_b:
    work_b = Work(organization_id=org_b, work_id="WORK-RVE-002", title="RV Evidence Work B", publisher_id=publisher.id, pro_id=pro.id)
    db.add(work_b)
db.commit()
db.refresh(work_a)
db.refresh(work_b)

release_a = db.query(Release).filter(Release.release_id == "REL-RVE-001").first()
if not release_a:
    release_a = Release(organization_id=org_a, release_id="REL-RVE-001", title="RV Evidence Release A", label_id=label.id, artist_id=artist_a.id)
    db.add(release_a)
release_b = db.query(Release).filter(Release.release_id == "REL-RVE-002").first()
if not release_b:
    release_b = Release(organization_id=org_b, release_id="REL-RVE-002", title="RV Evidence Release B", label_id=label.id, artist_id=artist_b.id)
    db.add(release_b)
db.commit()
db.refresh(release_a)
db.refresh(release_b)

track_a = db.query(Track).filter(Track.track_id == "TRK-RVE-001").first()
if not track_a:
    track_a = Track(organization_id=org_a, track_id="TRK-RVE-001", title="RV Evidence Track A", release_id=release_a.id, work_id=work_a.id)
    db.add(track_a)
track_b = db.query(Track).filter(Track.track_id == "TRK-RVE-002").first()
if not track_b:
    track_b = Track(organization_id=org_b, track_id="TRK-RVE-002", title="RV Evidence Track B", release_id=release_b.id, work_id=work_b.id)
    db.add(track_b)

admin = db.query(User).filter(User.email == "admin@otto.com").first()
if not admin:
    admin = User(
        email="admin@otto.com",
        hashed_password="x",
        full_name="Admin",
        organization_id=org_a,
        role="admin",
        is_active=True,
        is_superuser=True,
    )
    db.add(admin)
else:
    admin.organization_id = org_a
db.commit()

print(f"ORG_A={org_a}")
print(f"ORG_B={org_b}")
print(f"RELEASE_A={release_a.id}")
print(f"RELEASE_B={release_b.id}")
db.close()
PY

{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && python3 -m pytest -q)
} > "$EVDIR/gates.txt"

DISABLED_RESP="$(
  cd "$ROOT/backend"
  APP_ENV=desktop AI_ENABLED=true AI_RELEASE_VALIDATION_ENABLED=false DATABASE_URL="sqlite:///$DB_PATH" \
  python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port 8121 >/tmp/release_validation_disabled.log 2>&1 &
  pid=$!
  sleep 2
  {
    echo "=== /api/ai/release_validation/health ==="
    curl -sS -i http://127.0.0.1:8121/api/ai/release_validation/health
    echo
    echo "=== /api/ai/release_validation/plan (disabled) ==="
    curl -sS -i -X POST http://127.0.0.1:8121/api/ai/release_validation/plan \
      -H "Content-Type: application/json" \
      -d '{"release_id":1}'
  }
  kill "$pid"
  wait "$pid" 2>/dev/null || true
)"

counts_before="$(
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.artist import Artist
from models.track import Track
from models.work import Work
from models.release import Release
from models.network import Organization, Individual
db = SessionLocal()
print(f"artists={db.query(Artist).count()}")
print(f"tracks={db.query(Track).count()}")
print(f"works={db.query(Work).count()}")
print(f"releases={db.query(Release).count()}")
print(f"organizations={db.query(Organization).count()}")
print(f"individuals={db.query(Individual).count()}")
db.close()
PY
)"

ENABLED_RESP="$(
  cd "$ROOT/backend"
  APP_ENV=desktop AI_ENABLED=true AI_RELEASE_VALIDATION_ENABLED=true DATABASE_URL="sqlite:///$DB_PATH" \
  python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port 8122 >/tmp/release_validation_enabled.log 2>&1 &
  pid=$!
  sleep 2
  curl -sS -i -X POST http://127.0.0.1:8122/api/ai/release_validation/plan \
    -H "Content-Type: application/json" \
    -d '{"release_id":1}'
  kill "$pid"
  wait "$pid" 2>/dev/null || true
)"

counts_after="$(
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.artist import Artist
from models.track import Track
from models.work import Work
from models.release import Release
from models.network import Organization, Individual
db = SessionLocal()
print(f"artists={db.query(Artist).count()}")
print(f"tracks={db.query(Track).count()}")
print(f"works={db.query(Work).count()}")
print(f"releases={db.query(Release).count()}")
print(f"organizations={db.query(Organization).count()}")
print(f"individuals={db.query(Individual).count()}")
db.close()
PY
)"

{
  echo "$DISABLED_RESP"
  echo
  echo "=== /api/ai/release_validation/plan (enabled) ==="
  echo "$ENABLED_RESP"
} > "$EVDIR/api_proof.txt"

{
  echo "DB=$DB_PATH"
  echo "=== counts before ==="
  echo "$counts_before"
  echo
  echo "=== counts after ==="
  echo "$counts_after"
} > "$EVDIR/db_proof.txt"

ORG_ISO_RESP="$(
  cd "$ROOT/backend"
  APP_ENV=desktop AI_ENABLED=true AI_RELEASE_VALIDATION_ENABLED=true DATABASE_URL="sqlite:///$DB_PATH" \
  python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port 8123 >/tmp/release_validation_iso.log 2>&1 &
  pid=$!
  sleep 2
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.user import User
import uuid
db = SessionLocal()
u = db.query(User).filter(User.email == "admin@otto.com").first()
u.organization_id = uuid.UUID(int=9501)
db.commit()
db.close()
PY
  echo "=== Org A request for Org B release ==="
  curl -sS -i -X POST http://127.0.0.1:8123/api/ai/release_validation/plan \
    -H "Content-Type: application/json" \
    -d '{"release_id":2}'
  echo
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.user import User
import uuid
db = SessionLocal()
u = db.query(User).filter(User.email == "admin@otto.com").first()
u.organization_id = uuid.UUID(int=9502)
db.commit()
db.close()
PY
  echo "=== Org B request for Org A release ==="
  curl -sS -i -X POST http://127.0.0.1:8123/api/ai/release_validation/plan \
    -H "Content-Type: application/json" \
    -d '{"release_id":1}'
  kill "$pid"
  wait "$pid" 2>/dev/null || true
)"

printf "%s\n" "$ORG_ISO_RESP" > "$EVDIR/org_isolation.txt"

echo "✅ release validation evidence generated at: $EVDIR"

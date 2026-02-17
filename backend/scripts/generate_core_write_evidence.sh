#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVDIR="$ROOT/docs/evidence/v1.core_write_v1/headless"
RUN_ROOT="/tmp/otto_core_write_v1_evidence"
APP_DATA_DIR="$HOME/.otto/data"
DB_PATH="$APP_DATA_DIR/db/core_write_v1_evidence.sqlite"
PORT_DISABLED=8461
PORT_ENABLED=8462

rm -rf "$RUN_ROOT"
rm -f "$DB_PATH"
mkdir -p "$EVDIR" "$APP_DATA_DIR/db"

cd "$ROOT/backend"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
import uuid
from database import Base, engine, SessionLocal
from utils.security import get_password_hash
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

org_a = uuid.UUID(int=9401)
org_b = uuid.UUID(int=9402)

label = db.query(Label).filter(Label.label_id == "LBL-CWE-001").first()
if not label:
    label = Label(label_id="LBL-CWE-001", name="Core Write Evidence Label")
    db.add(label)
publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-CWE-001").first()
if not publisher:
    publisher = Publisher(publisher_id="PUB-CWE-001", name="Core Write Evidence Publisher")
    db.add(publisher)
pro = db.query(PRO).filter(PRO.pro_id == "PRO-CWE-001").first()
if not pro:
    pro = PRO(pro_id="PRO-CWE-001", name="Core Write Evidence PRO")
    db.add(pro)
db.commit(); db.refresh(label); db.refresh(publisher); db.refresh(pro)

artist_a = db.query(Artist).filter(Artist.artist_id == "ART-CWE-A").first()
if not artist_a:
    artist_a = Artist(
        organization_id=org_a,
        artist_id="ART-CWE-A",
        name="Core Write Evidence Artist A",
        label_id=label.id,
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(artist_a)
artist_b = db.query(Artist).filter(Artist.artist_id == "ART-CWE-B").first()
if not artist_b:
    artist_b = Artist(
        organization_id=org_b,
        artist_id="ART-CWE-B",
        name="Core Write Evidence Artist B ORG_B_CORE_WRITE_EVIDENCE_TOKEN",
        label_id=label.id,
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(artist_b)
db.commit(); db.refresh(artist_a); db.refresh(artist_b)

work_a = db.query(Work).filter(Work.work_id == "WORK-CWE-A").first()
if not work_a:
    work_a = Work(
        organization_id=org_a,
        work_id="WORK-CWE-A",
        title="Core Write Evidence Work A",
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(work_a)
work_b = db.query(Work).filter(Work.work_id == "WORK-CWE-B").first()
if not work_b:
    work_b = Work(
        organization_id=org_b,
        work_id="WORK-CWE-B",
        title="Core Write Evidence Work B ORG_B_CORE_WRITE_EVIDENCE_TOKEN",
        publisher_id=publisher.id,
        pro_id=pro.id,
    )
    db.add(work_b)
db.commit(); db.refresh(work_a); db.refresh(work_b)

release_a = db.query(Release).filter(Release.release_id == "REL-CWE-A").first()
if not release_a:
    release_a = Release(
        organization_id=org_a,
        release_id="REL-CWE-A",
        title="Core Write Evidence Release A",
        label_id=label.id,
        artist_id=artist_a.id,
    )
    db.add(release_a)
release_b = db.query(Release).filter(Release.release_id == "REL-CWE-B").first()
if not release_b:
    release_b = Release(
        organization_id=org_b,
        release_id="REL-CWE-B",
        title="Core Write Evidence Release B ORG_B_CORE_WRITE_EVIDENCE_TOKEN",
        label_id=label.id,
        artist_id=artist_b.id,
    )
    db.add(release_b)
db.commit(); db.refresh(release_a)

if not db.query(Track).filter(Track.track_id == "TRK-CWE-A").first():
    db.add(Track(organization_id=org_a, track_id="TRK-CWE-A", title="Core Write Evidence Track A", release_id=release_a.id, work_id=work_a.id))
if not db.query(Track).filter(Track.track_id == "TRK-CWE-B").first():
    db.add(Track(organization_id=org_b, track_id="TRK-CWE-B", title="Core Write Evidence Track B ORG_B_CORE_WRITE_EVIDENCE_TOKEN", release_id=release_b.id, work_id=work_b.id))

if not db.query(Organization).filter(Organization.name == "Core Write Evidence Org A").first():
    db.add(Organization(organization_id=org_a, name="Core Write Evidence Org A", org_type="Label"))
if not db.query(Organization).filter(Organization.name == "Core Write Evidence Org B ORG_B_CORE_WRITE_EVIDENCE_TOKEN").first():
    db.add(Organization(organization_id=org_b, name="Core Write Evidence Org B ORG_B_CORE_WRITE_EVIDENCE_TOKEN", org_type="Label"))

if not db.query(Individual).filter(Individual.email == "core.write.ev.a@example.com").first():
    db.add(Individual(organization_id=org_a, first_name="Core", last_name="WriteA", email="core.write.ev.a@example.com"))
if not db.query(Individual).filter(Individual.email == "core.write.ev.b@example.com").first():
    db.add(Individual(organization_id=org_b, first_name="Core", last_name="WriteB ORG_B_CORE_WRITE_EVIDENCE_TOKEN", email="core.write.ev.b@example.com"))

contract_a = db.query(Contract).filter(Contract.contract_number == "CON-CWE-A").first()
if not contract_a:
    contract_a = Contract(contract_number="CON-CWE-A", organization_id=org_a, title="Core Write Evidence Contract A", status="Active", territory="US")
    db.add(contract_a)
contract_b = db.query(Contract).filter(Contract.contract_number == "CON-CWE-B").first()
if not contract_b:
    contract_b = Contract(contract_number="CON-CWE-B", organization_id=org_b, title="Core Write Evidence Contract B ORG_B_CORE_WRITE_EVIDENCE_TOKEN", status="Active")
    db.add(contract_b)

admin = db.query(User).filter(User.email == "admin@otto.com").first()
if not admin:
    admin = User(
        email="admin@otto.com",
        hashed_password=get_password_hash("admin"),
        full_name="Admin",
        organization_id=org_a,
        role="admin",
        is_active=True,
        is_superuser=True,
    )
    db.add(admin)
else:
    admin.organization_id = org_a
    admin.role = "admin"
    admin.is_superuser = True
    admin.hashed_password = get_password_hash("admin")

db.commit(); db.refresh(contract_a)
print(f"CONTRACT_A_ID={contract_a.id}")
print(f"CONTRACT_B_ID={contract_b.id}")
print(f"RELEASE_A_ID={release_a.id}")
db.close()
PY

{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" python3 -m pytest -q)
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
from models.ai_core_write import AICoreWriteProposalRun, AICoreWriteProposalItem, AICoreWriteApplyEvent

db = SessionLocal()
print(f"ai_core_write_proposal_runs={db.query(AICoreWriteProposalRun).count()}")
print(f"ai_core_write_proposal_items={db.query(AICoreWriteProposalItem).count()}")
print(f"ai_core_write_apply_events={db.query(AICoreWriteApplyEvent).count()}")
db.close()
PY
}

read_contract_territory() {
  APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.contract import Contract

db = SessionLocal()
row = db.query(Contract).filter(Contract.contract_number == "CON-CWE-A").first()
print(row.territory if row else "")
db.close()
PY
}

CONTRACT_A_ID="$({ APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.contract import Contract

db = SessionLocal()
row = db.query(Contract).filter(Contract.contract_number == "CON-CWE-A").first()
print(row.id if row else 0)
db.close()
PY
})"

CONTRACT_B_ID="$({ APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.contract import Contract

db = SessionLocal()
row = db.query(Contract).filter(Contract.contract_number == "CON-CWE-B").first()
print(row.id if row else 0)
db.close()
PY
})"

wait_for_server() {
  local port="$1"
  for _ in $(seq 1 60); do
    if curl -sS "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

APP_ENV=desktop AI_ENABLED=true AI_CORE_WRITE_ENABLED=true AI_CORE_WRITE_APPLY_ENABLED=true AI_CORE_WRITE_REQUIRE_BACKUP=true DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$PORT_DISABLED" >/tmp/core_write_disabled.log 2>&1 &
PID_DISABLED=$!
wait_for_server "$PORT_DISABLED" || { cat /tmp/core_write_disabled.log; exit 1; }

TOKEN="$({
  curl -sS -X POST "http://127.0.0.1:$PORT_DISABLED/api/auth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "username=admin@otto.com&password=admin" | python3 -c 'import json,sys; raw=sys.stdin.read().strip(); print(json.loads(raw).get("access_token","") if raw else "")'
})"
[ -n "$TOKEN" ] || { echo "Failed to obtain auth token on disabled server"; cat /tmp/core_write_disabled.log; exit 1; }

PROPOSE_CODE=$(curl -sS -o /tmp/core_write_propose.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$PORT_DISABLED/api/ai/core_write/propose" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"contract_id\":$CONTRACT_A_ID,\"contract_extract\":{\"contract_title\":\"Evidence Core Write\",\"territory\":\"Worldwide\",\"parties\":[{\"display_name\":\"Core Write Evidence New Org\",\"role\":\"Label\"}],\"splits\":[{\"split_type\":\"MASTER\",\"party_name\":\"Core Write Evidence New Org\",\"percent\":100.0}],\"splits_total\":100.0,\"works_hints\":{\"artists\":[\"Core Write Evidence Artist A\"],\"tracks\":[\"Core Write Evidence Track A\"],\"releases\":[\"Core Write Evidence Work A\"]},\"warnings\":[],\"parser_version\":\"deterministic_v1\"}}")

RUN_ID="$({ python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/tmp/core_write_propose.json').read_text())
print(payload.get("run_id", 0))
PY
})"

APPLY_422_CODE=$(curl -sS -o /tmp/core_write_apply_422.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$PORT_DISABLED/api/ai/core_write/apply" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"run_id\":$RUN_ID,\"confirm\":false,\"selections\":[]}")

APPLY_409_CODE=$(curl -sS -o /tmp/core_write_apply_409.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$PORT_DISABLED/api/ai/core_write/apply" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"run_id\":$RUN_ID,\"confirm\":true,\"selections\":[]}")

kill "$PID_DISABLED"
wait "$PID_DISABLED" 2>/dev/null || true

CORE_BEFORE="$(read_core_counts)"
AI_BEFORE="$(read_ai_counts)"
TERRITORY_BEFORE="$(read_contract_territory)"

APP_ENV=desktop DATABASE_URL="sqlite:///$DB_PATH" python3 - <<'PY'
from database import SessionLocal
import models  # noqa: F401
from models.admin_backup import AdminBackupArtifact
from models.user import User

db = SessionLocal()
admin = db.query(User).filter(User.email == "admin@otto.com").first()
exists = db.query(AdminBackupArtifact).filter(AdminBackupArtifact.filename == "core_write_checkpoint_for_apply.zip").first()
if not exists:
    db.add(AdminBackupArtifact(
        organization_id=admin.organization_id,
        created_by=admin.id,
        backup_kind="manual",
        filename="core_write_checkpoint_for_apply.zip",
        file_path="/tmp/core_write_checkpoint_for_apply.zip",
        size_bytes=256,
        sha256="f" * 64,
    ))
    db.commit()
db.close()
PY

APP_ENV=desktop AI_ENABLED=true AI_CORE_WRITE_ENABLED=true AI_CORE_WRITE_APPLY_ENABLED=true AI_CORE_WRITE_REQUIRE_BACKUP=true DATABASE_URL="sqlite:///$DB_PATH" \
python3 -m uvicorn main:app --lifespan off --host 127.0.0.1 --port "$PORT_ENABLED" >/tmp/core_write_enabled.log 2>&1 &
PID_ENABLED=$!
wait_for_server "$PORT_ENABLED" || { cat /tmp/core_write_enabled.log; exit 1; }

TOKEN2="$({
  curl -sS -X POST "http://127.0.0.1:$PORT_ENABLED/api/auth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "username=admin@otto.com&password=admin" | python3 -c 'import json,sys; raw=sys.stdin.read().strip(); print(json.loads(raw).get("access_token","") if raw else "")'
})"
[ -n "$TOKEN2" ] || { echo "Failed to obtain auth token on enabled server"; cat /tmp/core_write_enabled.log; exit 1; }

FIRST_ITEM_ID="$({ python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/tmp/core_write_propose.json').read_text())
items = payload.get("proposals", [])
print(items[0].get("item_id", 0) if items else 0)
PY
})"

APPLY_200_CODE=$(curl -sS -o /tmp/core_write_apply_200.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$PORT_ENABLED/api/ai/core_write/apply" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d "{\"run_id\":$RUN_ID,\"confirm\":true,\"selections\":[{\"item_id\":$FIRST_ITEM_ID,\"decision\":\"accept\",\"overwrite\":false}]}")

ORG_ISO_CODE=$(curl -sS -o /tmp/core_write_org_iso.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:$PORT_ENABLED/api/ai/core_write/propose" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d "{\"contract_id\":$CONTRACT_B_ID,\"contract_extract\":{\"contract_title\":\"Evidence\",\"parties\":[],\"splits\":[],\"splits_total\":0.0,\"works_hints\":{\"artists\":[],\"tracks\":[],\"releases\":[]},\"warnings\":[],\"parser_version\":\"deterministic_v1\"}}")

kill "$PID_ENABLED"
wait "$PID_ENABLED" 2>/dev/null || true

CORE_AFTER="$(read_core_counts)"
AI_AFTER="$(read_ai_counts)"
TERRITORY_AFTER="$(read_contract_territory)"

{
  echo "=== propose ==="
  echo "HTTP_STATUS=$PROPOSE_CODE"
  python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/tmp/core_write_propose.json').read_text())
print(json.dumps({
  "run_id": payload.get("run_id"),
  "requires_user_review": payload.get("requires_user_review"),
  "proposals": payload.get("proposals", [])[:3],
}, indent=2))
PY
  echo
  echo "=== apply without confirm ==="
  echo "HTTP_STATUS=$APPLY_422_CODE"
  cat /tmp/core_write_apply_422.json
  echo
  echo "=== apply without backup ==="
  echo "HTTP_STATUS=$APPLY_409_CODE"
  cat /tmp/core_write_apply_409.json
  echo
  echo "=== apply success ==="
  echo "HTTP_STATUS=$APPLY_200_CODE"
  cat /tmp/core_write_apply_200.json
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
  echo "=== org isolation ==="
  echo "org_isolation_http_status=$ORG_ISO_CODE"
  echo "Token=ORG_B_CORE_WRITE_EVIDENCE_TOKEN"
  if grep -q "ORG_B_CORE_WRITE_EVIDENCE_TOKEN" /tmp/core_write_propose.json; then
    echo "FAIL: org B token present in org A propose response"
    exit 1
  else
    echo "PASS: no org B token in org A propose response"
  fi
  grep -n "ORG_B_CORE_WRITE_EVIDENCE_TOKEN" /tmp/core_write_propose.json || true
} > "$EVDIR/org_isolation.txt"

{
  echo "=== non-overwrite proof ==="
  echo "territory_before=$TERRITORY_BEFORE"
  echo "territory_after=$TERRITORY_AFTER"
  echo "conflict_excerpt:"
  python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/tmp/core_write_propose.json').read_text())
first = payload.get('proposals', [{}])[0]
print(json.dumps({
  'entity_type': first.get('entity_type'),
  'operation': first.get('operation'),
  'conflicts': first.get('conflicts'),
  'safe_defaults': first.get('safe_defaults'),
}, indent=2))
PY
} > "$EVDIR/non_overwrite_proof.txt"

echo "Evidence generated at: $EVDIR"

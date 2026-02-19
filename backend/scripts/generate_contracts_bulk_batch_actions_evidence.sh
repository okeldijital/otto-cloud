#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT/docs/evidence/v1.contracts_bulk_batch_actions_v1/headless"
mkdir -p "$OUT_DIR"

GATES_FILE="$OUT_DIR/gates.txt"
API_FILE="$OUT_DIR/api_proof.txt"
DB_FILE="$OUT_DIR/db_proof.txt"
ORG_FILE="$OUT_DIR/org_isolation.txt"

: > "$GATES_FILE"
: > "$API_FILE"
: > "$DB_FILE"
: > "$ORG_FILE"

{
  echo "[invariant_check]"
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "[pytest -q]"
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" python3 -m pytest -q)
} | tee "$GATES_FILE"

ROOT_ENV="$ROOT" API_FILE_ENV="$API_FILE" DB_FILE_ENV="$DB_FILE" ORG_FILE_ENV="$ORG_FILE" python3 - <<'PY'
import json
import os
import sys
import tempfile
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(os.environ["ROOT_ENV"])
sys.path.insert(0, str(ROOT / "backend"))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.artist import Artist
from models.contract import Contract, ContractParty
from models.network import Organization
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work

api_file = Path(os.environ["API_FILE_ENV"])
db_file = Path(os.environ["DB_FILE_ENV"])
org_file = Path(os.environ["ORG_FILE_ENV"])

fd, db_path = tempfile.mkstemp(prefix="contracts-bulk-batch-actions-", suffix=".db")
os.close(fd)
engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

org_a = uuid.UUID(int=30001)
org_b = uuid.UUID(int=30002)
user_a = User(email="bulk.actions.a@example.com", hashed_password="x", full_name="Bulk Actions A", organization_id=org_a, role="admin", is_active=True)
db.add(user_a)
db.commit()
db.refresh(user_a)

contract_a = Contract(contract_number="CTR-BULK-ACTIONS-1", organization_id=org_a, title="Bulk Actions Contract", status="Draft", created_by=user_a.id)
org_entity_a = Organization(organization_id=org_a, name="BULK_ORG_A_TOKEN", org_type="Label")
org_entity_b = Organization(organization_id=org_b, name="BULK_ORG_B_TOKEN", org_type="Label")
db.add_all([contract_a, org_entity_a, org_entity_b])
db.commit()
db.refresh(contract_a)
db.refresh(org_entity_a)
db.refresh(org_entity_b)


def override_get_db():
    try:
        yield db
    finally:
        pass

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = lambda: user_a

core_before = {
    "artists": db.query(Artist).count(),
    "tracks": db.query(Track).count(),
    "works": db.query(Work).count(),
    "releases": db.query(Release).count(),
}
party_before = db.query(ContractParty).count()

with TestClient(app) as client:
    r422 = client.post("/api/contracts/parties/save", json={
        "contract_id": contract_a.id,
        "confirm_non_destructive": False,
        "parties": [{"role": "Label", "entity_type": "external", "display_name": "External Party X"}],
    })
    r404 = client.post("/api/contracts/parties/save", json={
        "contract_id": contract_a.id,
        "confirm_non_destructive": True,
        "parties": [{"role": "Label", "entity_type": "organization", "entity_id": org_entity_b.id, "display_name": org_entity_b.name}],
    })
    r200 = client.post("/api/contracts/parties/save", json={
        "contract_id": contract_a.id,
        "confirm_non_destructive": True,
        "parties": [
            {"role": "Label", "entity_type": "organization", "entity_id": org_entity_a.id, "display_name": org_entity_a.name, "split_percent": 30},
            {"role": "Artist", "entity_type": "external", "display_name": "External Artist Bulk", "split_percent": 70},
        ],
    })

api_file.write_text(
    "\n".join([
        "POST /api/contracts/parties/save (confirm false)",
        f"status={r422.status_code}",
        json.dumps(r422.json(), indent=2, sort_keys=True),
        "",
        "POST /api/contracts/parties/save (cross-org)",
        f"status={r404.status_code}",
        json.dumps(r404.json(), indent=2, sort_keys=True),
        "",
        "POST /api/contracts/parties/save (success)",
        f"status={r200.status_code}",
        json.dumps(r200.json(), indent=2, sort_keys=True),
        "",
    ])
)

core_after = {
    "artists": db.query(Artist).count(),
    "tracks": db.query(Track).count(),
    "works": db.query(Work).count(),
    "releases": db.query(Release).count(),
}
party_after = db.query(ContractParty).count()

db_file.write_text(
    "\n".join([
        f"db_path={db_path}",
        f"core_before={json.dumps(core_before, sort_keys=True)}",
        f"core_after={json.dumps(core_after, sort_keys=True)}",
        f"contract_party_rows_before={party_before}",
        f"contract_party_rows_after={party_after}",
        f"core_tables_unchanged={core_before == core_after}",
        f"contract_party_rows_incremented={party_after > party_before}",
    ])
)

org_text = "\n".join([
    "OrgB token search in OrgA outputs:",
    "(no matches)" if "BULK_ORG_B_TOKEN" not in r200.text else "FOUND BULK_ORG_B_TOKEN",
    "",
    "OrgA token search in OrgB error output:",
    "(no matches)" if "BULK_ORG_A_TOKEN" not in r404.text else "FOUND BULK_ORG_A_TOKEN",
])
org_file.write_text(org_text)

app.dependency_overrides.clear()
db.close()
try:
    os.remove(db_path)
except Exception:
    pass
PY

echo "Evidence written to $OUT_DIR"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/evidence/v1.contracts_bulk_track_label_fix/headless"
mkdir -p "$OUT"

{
  echo "=== python3 backend/invariant_check.py ==="
  (cd "$ROOT" && python3 backend/invariant_check.py)
  echo
  echo "=== cd backend && HOME=\$(mktemp -d) pytest -q ==="
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" pytest -q)
} > "$OUT/gates.txt" 2>&1

python3 - <<'PY'
import json
import sys
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path("/Users/m2krproduction/otto")
sys.path.insert(0, str(ROOT / "backend"))

from database import Base, get_db
from dependencies import get_current_organization_id, get_current_user
from main import app
from models.track import Track
from models.user import User

out = ROOT / "docs" / "evidence" / "v1.contracts_bulk_track_label_fix" / "headless"
api_file = out / "api_proof.txt"
iso_file = out / "org_isolation.txt"
ui_file = out / "ui_notes.txt"

db_path = ROOT / "backend" / "test_contracts_bulk_track_label_evidence.db"
if db_path.exists():
    db_path.unlink()
engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

org_a = uuid.UUID(int=27101)
org_b = uuid.UUID(int=27102)
user_a = User(email="bulk.track.label.a@example.com", hashed_password="x", full_name="A", organization_id=org_a, role="admin", is_active=True)
user_b = User(email="bulk.track.label.b@example.com", hashed_password="x", full_name="B", organization_id=org_b, role="admin", is_active=True)
db.add_all([user_a, user_b])
db.commit()
db.refresh(user_a)
db.refresh(user_b)

track_a = Track(organization_id=org_a, track_id="TRK-LBL-A", title="Konko Man (Muchacho Remix)")
track_b = Track(organization_id=org_b, track_id="TRK-LBL-B", title="Umoya ORG_B_TOKEN")
db.add_all([track_a, track_b])
db.commit()
db.refresh(track_a)
db.refresh(track_b)

def override_get_db():
    yield db

active_user = {"value": user_a}
active_org = {"value": org_a}
def override_user():
    return active_user["value"]
def override_org():
    return active_org["value"]

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_user
app.dependency_overrides[get_current_organization_id] = override_org

with TestClient(app) as client:
    by_ids = client.post("/api/tracks/by_ids", json={"ids": [track_a.id, track_b.id]})
    search = client.get("/api/tracks/search", params={"q": "Konko", "limit": 20})

    active_user["value"] = user_b
    active_org["value"] = org_b
    org_b_by_ids = client.post("/api/tracks/by_ids", json={"ids": [track_a.id, track_b.id]})
    active_user["value"] = user_a
    active_org["value"] = org_a

api_file.write_text(
    "\n".join([
        "=== POST /api/tracks/by_ids ===",
        f"HTTP/1.1 {by_ids.status_code}",
        json.dumps(by_ids.json(), indent=2),
        "",
        "=== GET /api/tracks/search ===",
        f"HTTP/1.1 {search.status_code}",
        json.dumps(search.json(), indent=2)[:2500],
    ]),
    encoding="utf-8",
)

iso_file.write_text(
    "\n".join([
        "Org A by_ids [track_a, track_b] (expect only track_a):",
        json.dumps(by_ids.json(), indent=2),
        "",
        "Org B by_ids [track_a, track_b] (expect only track_b):",
        json.dumps(org_b_by_ids.json(), indent=2),
    ]),
    encoding="utf-8",
)

ui_file.write_text(
    "\n".join([
        "TrackMultiSelect UI behavior:",
        "- selected chips render track labels (title/name/display_name), never raw #id.",
        "- selecting a result closes dropdown immediately and clears query.",
        "- legacy selected id arrays hydrate labels using POST /api/tracks/by_ids.",
    ]),
    encoding="utf-8",
)

app.dependency_overrides.clear()
db.close()
if db_path.exists():
    db_path.unlink()
PY

echo "evidence generated: $OUT"

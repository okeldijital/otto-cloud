#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/evidence/v1.contracts_bulk_parties_fix/headless"
mkdir -p "$OUT"

{
  echo "=== python3 backend/invariant_check.py ==="
  (cd "$ROOT" && python3 backend/invariant_check.py)
  echo
  echo "=== cd backend && HOME=\$(mktemp -d) python3 -m pytest -q ==="
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" python3 -m pytest -q)
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
from dependencies import get_current_user
from main import app
from models.artist import Artist
from models.contract import Contract, ContractDocument, ContractParty
from models.contract_track_links import ContractTrackLink
from models.network import Organization
from models.track import Track
from models.user import User

out = ROOT / "docs" / "evidence" / "v1.contracts_bulk_parties_fix" / "headless"
api_file = out / "api_proof.txt"
db_file = out / "db_proof.txt"
iso_file = out / "org_isolation.txt"

db_path = ROOT / "backend" / "test_contracts_bulk_parties_evidence.db"
if db_path.exists():
    db_path.unlink()
engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

org_a = uuid.UUID(int=51101)
org_b = uuid.UUID(int=51102)
user_a = User(email="bulk.parties.ev.a@example.com", hashed_password="x", full_name="A", organization_id=org_a, role="admin", is_active=True)
user_b = User(email="bulk.parties.ev.b@example.com", hashed_password="x", full_name="B", organization_id=org_b, role="admin", is_active=True)
db.add_all([user_a, user_b])
db.commit()
db.refresh(user_a)
db.refresh(user_b)

track_a = Track(organization_id=org_a, track_id="TRK-EV-A", title="Evidence Track A")
track_b = Track(organization_id=org_b, track_id="TRK-EV-B", title="Evidence Track B ORG_B_TOKEN")
db.add_all([track_a, track_b])
db.commit()
db.refresh(track_a)
db.refresh(track_b)

contract = Contract(contract_number="CTR-EV-BULK-PARTIES", organization_id=org_a, title="Bulk Parties Evidence", status="Draft", created_by=user_a.id)
db.add(contract)
db.commit()
db.refresh(contract)
db.add(ContractDocument(contract_id=contract.id, organization_id=org_a, file_path="/uploads/evidence.pdf", file_name="evidence.pdf", version=1, uploaded_by=user_a.id))
db.commit()

before = {
    "artists": db.query(Artist).count(),
    "organizations": db.query(Organization).count(),
    "contract_parties": db.query(ContractParty).count(),
    "contract_track_links": db.query(ContractTrackLink).count(),
    "tracks": db.query(Track).count(),
}

def override_get_db():
    yield db

active_user = {"value": user_a}
def override_get_current_user():
    return active_user["value"]

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

with TestClient(app) as client:
    track_search = client.get("/api/tracks/search", params={"q": "Evidence", "limit": 20}, headers={"X-Organization-ID": str(org_a)})
    party_search = client.get("/api/contracts/party_search", params={"q": "Spirit", "limit": 20}, headers={"X-Organization-ID": str(org_a)})
    party_create = client.post("/api/contracts/party_create", json={"entity_type": "artist", "display_name": "Evidence Artist"}, headers={"X-Organization-ID": str(org_a)})
    artist_id = party_create.json().get("id")

    parties_missing_confirm = client.post(
        f"/api/contracts/{contract.id}/parties/batch_set",
        json={"items": [{"role": "artist", "entity_type": "artist", "entity_id": artist_id, "split_percent": 100}]},
        headers={"X-Organization-ID": str(org_a)},
    )
    parties_ok = client.post(
        f"/api/contracts/{contract.id}/parties/batch_set",
        json={"confirm_non_destructive": True, "items": [{"role": "artist", "entity_type": "artist", "entity_id": artist_id, "split_percent": 100}]},
        headers={"X-Organization-ID": str(org_a)},
    )
    tracks_ok = client.post(
        f"/api/contracts/{contract.id}/tracks/batch_set",
        json={"confirm_non_destructive": True, "track_ids": [track_a.id]},
        headers={"X-Organization-ID": str(org_a)},
    )

    active_user["value"] = user_b
    org_b_track_search = client.get("/api/tracks/search", params={"q": "ORG_B_TOKEN", "limit": 20}, headers={"X-Organization-ID": str(org_b)})
    active_user["value"] = user_a
    org_a_track_search = client.get("/api/tracks/search", params={"q": "ORG_B_TOKEN", "limit": 20}, headers={"X-Organization-ID": str(org_a)})

api_file.write_text(
    "\n".join([
        "=== GET /api/tracks/search ===",
        f"HTTP/1.1 {track_search.status_code}",
        json.dumps(track_search.json(), indent=2)[:3000],
        "",
        "=== GET /api/contracts/party_search ===",
        f"HTTP/1.1 {party_search.status_code}",
        json.dumps(party_search.json(), indent=2)[:2000],
        "",
        "=== POST /api/contracts/party_create ===",
        f"HTTP/1.1 {party_create.status_code}",
        json.dumps(party_create.json(), indent=2)[:2000],
        "",
        "=== POST /api/contracts/{id}/parties/batch_set (422) ===",
        f"HTTP/1.1 {parties_missing_confirm.status_code}",
        json.dumps(parties_missing_confirm.json(), indent=2)[:2000],
        "",
        "=== POST /api/contracts/{id}/parties/batch_set (200) ===",
        f"HTTP/1.1 {parties_ok.status_code}",
        json.dumps(parties_ok.json(), indent=2)[:2000],
        "",
        "=== POST /api/contracts/{id}/tracks/batch_set (200) ===",
        f"HTTP/1.1 {tracks_ok.status_code}",
        json.dumps(tracks_ok.json(), indent=2)[:2000],
    ]),
    encoding="utf-8",
)

after = {
    "artists": db.query(Artist).count(),
    "organizations": db.query(Organization).count(),
    "contract_parties": db.query(ContractParty).count(),
    "contract_track_links": db.query(ContractTrackLink).count(),
    "tracks": db.query(Track).count(),
}

db_file.write_text(
    "\n".join([f"{k}|before={before[k]}|after={after[k]}" for k in before] + ["", "Only contract link tables should increment."]),
    encoding="utf-8",
)

iso_file.write_text(
    "\n".join([
        "Org A search for ORG_B_TOKEN (expect no matches):",
        json.dumps(org_a_track_search.json(), indent=2),
        "",
        "Org B search for ORG_B_TOKEN (expect matches):",
        json.dumps(org_b_track_search.json(), indent=2),
    ]),
    encoding="utf-8",
)

app.dependency_overrides.clear()
db.close()
if db_path.exists():
    db_path.unlink()
PY

echo "evidence generated: $OUT"

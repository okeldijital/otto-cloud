#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/evidence/v1.contracts_bulk_parties_tracks/headless"
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
import os
import sys
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path("/Users/m2krproduction/otto")
sys.path.insert(0, str(ROOT / "backend"))

from config import settings
from database import Base, get_db
from dependencies import get_current_organization_id, get_current_user
from main import app
from models.artist import Artist
from models.contract import Contract, ContractDocument, ContractParty
from models.contract_track_links import ContractTrackLink
from models.network import Organization
from models.track import Track
from models.user import User

out = ROOT / "docs" / "evidence" / "v1.contracts_bulk_parties_tracks" / "headless"
api_file = out / "api_proof.txt"
db_file = out / "db_proof.txt"
iso_file = out / "org_isolation.txt"

db_path = ROOT / "backend" / "test_contracts_bulk_parties_tracks_evidence.db"
if db_path.exists():
    db_path.unlink()
engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

org_a = uuid.UUID(int=55101)
org_b = uuid.UUID(int=55102)
user_a = User(email="bulk.parties.tracks.ev.a@example.com", hashed_password="x", full_name="A", organization_id=org_a, role="admin", is_active=True)
user_b = User(email="bulk.parties.tracks.ev.b@example.com", hashed_password="x", full_name="B", organization_id=org_b, role="admin", is_active=True)
db.add_all([user_a, user_b])
db.commit()
db.refresh(user_a)
db.refresh(user_b)

track_a = Track(organization_id=org_a, track_id="TRK-EV-PT-A", title="Evidence PT Track A")
track_b = Track(organization_id=org_b, track_id="TRK-EV-PT-B", title="Evidence PT Track B ORG_B_TOKEN")
artist_a = Artist(organization_id=org_a, artist_id="ART-EV-PT-A", name="Evidence PT Artist")
db.add_all([track_a, track_b, artist_a])
db.commit()
db.refresh(track_a)
db.refresh(track_b)
db.refresh(artist_a)

settings.UPLOAD_DIR = str((ROOT / "backend" / "tmp_evidence_uploads").resolve())
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

before = {
    "artists": db.query(Artist).count(),
    "organizations": db.query(Organization).count(),
    "contract_documents": db.query(ContractDocument).count(),
    "contract_parties": db.query(ContractParty).count(),
    "contract_track_links": db.query(ContractTrackLink).count(),
    "tracks": db.query(Track).count(),
}

def override_get_db():
    yield db

active_user = {"value": user_a}
def override_get_current_user():
    return active_user["value"]

active_org = {"value": org_a}
def override_get_org():
    return active_org["value"]

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_current_organization_id] = override_get_org

with TestClient(app) as client:
    contracts_list = client.get("/api/contracts")
    track_search = client.get("/api/tracks/search", params={"q": "Evidence PT", "limit": 20})
    party_search = client.get("/api/contracts/party_search", params={"q": "Evidence PT", "limit": 20})

    payload = {
        "confirm_non_destructive": True,
        "idempotency_key": "sha256:evidence-parties-tracks",
        "extract_version": "v2",
        "extract": {
            "title": "Evidence Parties/Tracks Contract",
            "type": "recording",
            "dates": {"effective_date": None, "end_date": None, "end_date_specified": False},
            "key_terms": {"territory": None, "governing_law": None, "term_text": None},
        },
        "track_ids": [track_a.id],
        "party_links": [{"role": "artist", "entity_type": "artist", "entity_id": artist_a.id, "split_percent": 100}],
    }
    create_from_extract = client.post(
        "/api/contracts/from_extract",
        files={"file": ("evidence.pdf", b"%PDF-1.4 body", "application/pdf")},
        data={"payload": json.dumps(payload)},
    )

    active_user["value"] = user_b
    active_org["value"] = org_b
    org_b_track_search = client.get("/api/tracks/search", params={"q": "ORG_B_TOKEN", "limit": 20})
    active_user["value"] = user_a
    active_org["value"] = org_a
    org_a_track_search = client.get("/api/tracks/search", params={"q": "ORG_B_TOKEN", "limit": 20})

api_file.write_text(
    "\n".join([
        "=== GET /api/contracts ===",
        f"HTTP/1.1 {contracts_list.status_code}",
        json.dumps(contracts_list.json(), indent=2)[:3000],
        "",
        "=== GET /api/tracks/search ===",
        f"HTTP/1.1 {track_search.status_code}",
        json.dumps(track_search.json(), indent=2)[:2500],
        "",
        "=== GET /api/contracts/party_search ===",
        f"HTTP/1.1 {party_search.status_code}",
        json.dumps(party_search.json(), indent=2)[:2000],
        "",
        "=== POST /api/contracts/from_extract (tracks + parties in payload) ===",
        f"HTTP/1.1 {create_from_extract.status_code}",
        json.dumps(create_from_extract.json(), indent=2)[:3000],
    ]),
    encoding="utf-8",
)

after = {
    "artists": db.query(Artist).count(),
    "organizations": db.query(Organization).count(),
    "contract_documents": db.query(ContractDocument).count(),
    "contract_parties": db.query(ContractParty).count(),
    "contract_track_links": db.query(ContractTrackLink).count(),
    "tracks": db.query(Track).count(),
}

db_file.write_text(
    "\n".join([f"{k}|before={before[k]}|after={after[k]}" for k in before] + ["", "Only contract/link tables should increment for this flow."]),
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

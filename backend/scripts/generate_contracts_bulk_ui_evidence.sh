#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/evidence/v1.contracts_bulk_ui_fix/headless"
mkdir -p "$OUT"

{
  echo "=== python3 backend/invariant_check.py ==="
  (cd "$ROOT" && python3 backend/invariant_check.py)
  echo
  echo "=== HOME=\$(mktemp -d) python3 -m pytest -q ==="
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" python3 -m pytest -q)
  echo
  echo "=== cd frontend && npm run -s build ==="
  (cd "$ROOT/frontend" && npm run -s build)
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
from dependencies import get_current_user
from main import app
from models.contract import Contract, ContractDocument
from models.contract_track_links import ContractTrackLink
from models.label import Label
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work
from models.artist import Artist

OUT = ROOT / "docs" / "evidence" / "v1.contracts_bulk_ui_fix" / "headless"
api_file = OUT / "api_proof.txt"
db_file = OUT / "db_proof.txt"
iso_file = OUT / "org_isolation.txt"
ui_file = OUT / "ui_notes.txt"

db_path = ROOT / "backend" / "test_contracts_bulk_ui_fix_evidence.db"
if db_path.exists():
    db_path.unlink()
engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

org_a = uuid.UUID(int=30101)
org_b = uuid.UUID(int=30102)
user_a = User(email="bulk.ui.fix.a@example.com", hashed_password="x", full_name="A", organization_id=org_a, role="admin", is_active=True)
user_b = User(email="bulk.ui.fix.b@example.com", hashed_password="x", full_name="B", organization_id=org_b, role="admin", is_active=True)
db.add_all([user_a, user_b])

label = Label(label_id="LBL-BULK-UI-FIX", name="Label BULK UI FIX")
publisher = Publisher(publisher_id="PUB-BULK-UI-FIX", name="Publisher BULK UI FIX")
pro = PRO(pro_id="PRO-BULK-UI-FIX", name="PRO BULK UI FIX")
db.add_all([label, publisher, pro])
db.commit()

artist_a = Artist(organization_id=org_a, artist_id="ART-BULK-UI-A", name="Bulk UI Artist A", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
artist_b = Artist(organization_id=org_b, artist_id="ART-BULK-UI-B", name="Bulk UI Artist B ORG_B_TOKEN", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
work_a = Work(organization_id=org_a, work_id="WORK-BULK-UI-A", title="Bulk UI Work A", publisher_id=publisher.id, pro_id=pro.id)
work_b = Work(organization_id=org_b, work_id="WORK-BULK-UI-B", title="Bulk UI Work B ORG_B_TOKEN", publisher_id=publisher.id, pro_id=pro.id)
db.add_all([artist_a, artist_b, work_a, work_b])
db.commit()
db.refresh(artist_a)
db.refresh(artist_b)
db.refresh(work_a)
db.refresh(work_b)

release_a = Release(organization_id=org_a, release_id="REL-BULK-UI-A", title="Bulk UI Release A", artist_id=artist_a.id, label_id=label.id)
release_b = Release(organization_id=org_b, release_id="REL-BULK-UI-B", title="Bulk UI Release B ORG_B_TOKEN", artist_id=artist_b.id, label_id=label.id)
db.add_all([release_a, release_b])
db.commit()
db.refresh(release_a)
db.refresh(release_b)

track_a = Track(organization_id=org_a, track_id="TRK-BULK-UI-A", title="ABANGOMA DRUM EFFECT MIX", release_id=release_a.id, work_id=work_a.id)
track_b = Track(organization_id=org_b, track_id="TRK-BULK-UI-B", title="Hidden ORG_B_TOKEN Track", release_id=release_b.id, work_id=work_b.id)
db.add_all([track_a, track_b])
db.commit()
db.refresh(track_a)
db.refresh(track_b)

def override_get_db():
    yield db

active_user = {"value": user_a}
def override_get_current_user():
    return active_user["value"]

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

settings.AI_ENABLED = True
settings.AI_CONTRACT_INTEL_ENABLED = True
settings.AI_CONTRACT_WIZARD_ENABLED = True

before = {
    "artists": db.query(Artist).count(),
    "tracks": db.query(Track).count(),
    "works": db.query(Work).count(),
    "releases": db.query(Release).count(),
    "contracts": db.query(Contract).count(),
    "contract_documents": db.query(ContractDocument).count(),
    "contract_track_links": db.query(ContractTrackLink).count(),
}

fixture = ROOT / "backend" / "tests" / "fixtures" / "contracts" / "black_motion_abangoma.pdf"
if fixture.exists():
    pdf = fixture.read_bytes()
else:
    pdf = b"%PDF-1.4 sample"

with TestClient(app) as client:
    extract_bulk = client.post(
        "/api/ai/contracts/extract_bulk",
        files=[("files", ("bulk_ui_fix.pdf", pdf, "application/pdf"))],
        headers={"X-Organization-ID": str(org_a)},
    )
    extract_json = extract_bulk.json()
    extract_data = (((extract_json.get("results") or [{}])[0]).get("extract") or {}).get("data") or {}

    from_extract_422 = client.post(
        "/api/contracts/from_extract",
        files={"file": ("bulk_ui_fix.pdf", pdf, "application/pdf")},
        data={"payload": json.dumps({
            "confirm_non_destructive": False,
            "idempotency_key": "sha256:bulk-ui-fix-422",
            "extract_version": "v2",
            "extract": {
                "title": extract_data.get("title") or "Bulk UI Contract",
                "type": extract_data.get("type") or "recording",
                "dates": extract_data.get("dates") or {
                    "contract_date": None,
                    "effective_date": None,
                    "expiration_date": None,
                    "end_date": None,
                    "end_date_specified": False,
                },
                "key_terms": extract_data.get("key_terms") or {},
            },
            "track_ids": [track_a.id],
        })},
        headers={"X-Organization-ID": str(org_a)},
    )

    from_extract_200 = client.post(
        "/api/contracts/from_extract",
        files={"file": ("bulk_ui_fix.pdf", pdf, "application/pdf")},
        data={"payload": json.dumps({
            "confirm_non_destructive": True,
            "idempotency_key": "sha256:bulk-ui-fix-200",
            "extract_version": "v2",
            "extract": {
                "title": extract_data.get("title") or "Bulk UI Contract",
                "type": extract_data.get("type") or "recording",
                "dates": extract_data.get("dates") or {
                    "contract_date": None,
                    "effective_date": None,
                    "expiration_date": None,
                    "end_date": None,
                    "end_date_specified": False,
                },
                "key_terms": extract_data.get("key_terms") or {},
            },
            "track_ids": [track_a.id],
        })},
        headers={"X-Organization-ID": str(org_a)},
    )

    track_search = client.get("/api/tracks/search", params={"q": "ABANGOMA", "limit": 20}, headers={"X-Organization-ID": str(org_a)})
    contracts_list = client.get("/api/contracts", headers={"X-Organization-ID": str(org_a)})

    active_user["value"] = user_b
    org_b_search = client.get("/api/tracks/search", params={"q": "ORG_B_TOKEN"}, headers={"X-Organization-ID": str(org_b)})
    active_user["value"] = user_a
    org_a_search = client.get("/api/tracks/search", params={"q": "ORG_B_TOKEN"}, headers={"X-Organization-ID": str(org_a)})

api_file.write_text(
    "\n".join([
        "=== POST /api/ai/contracts/extract_bulk ===",
        f"HTTP/1.1 {extract_bulk.status_code}",
        json.dumps(extract_bulk.json(), indent=2)[:3000],
        "",
        "=== POST /api/contracts/from_extract (expect 422) ===",
        f"HTTP/1.1 {from_extract_422.status_code}",
        json.dumps(from_extract_422.json(), indent=2)[:2000],
        "",
        "=== POST /api/contracts/from_extract (expect 200) ===",
        f"HTTP/1.1 {from_extract_200.status_code}",
        json.dumps(from_extract_200.json(), indent=2)[:3000],
        "",
        "=== GET /api/contracts ===",
        f"HTTP/1.1 {contracts_list.status_code}",
        json.dumps(contracts_list.json(), indent=2)[:3000],
        "",
        "=== GET /api/tracks/search ===",
        f"HTTP/1.1 {track_search.status_code}",
        json.dumps(track_search.json(), indent=2)[:3000],
    ]),
    encoding="utf-8",
)

after = {
    "artists": db.query(Artist).count(),
    "tracks": db.query(Track).count(),
    "works": db.query(Work).count(),
    "releases": db.query(Release).count(),
    "contracts": db.query(Contract).count(),
    "contract_documents": db.query(ContractDocument).count(),
    "contract_track_links": db.query(ContractTrackLink).count(),
}

db_file.write_text(
    "\n".join(
        [f"{k}|before={before[k]}|after={after[k]}" for k in before]
        + ["", "Allowed deltas: contracts, contract_documents, contract_track_links"]
    ),
    encoding="utf-8",
)

iso_file.write_text(
    "\n".join([
        "Org A /tracks/search for ORG_B_TOKEN (expect empty)",
        json.dumps(org_a_search.json(), indent=2),
        "",
        "Org B /tracks/search for ORG_B_TOKEN (expect matches)",
        json.dumps(org_b_search.json(), indent=2),
    ]),
    encoding="utf-8",
)

ui_file.write_text(
    "\n".join([
        "Screenshot waiver: headless evidence only.",
        "Navigation path: Administration of Works -> Contracts List; then Contracts -> Bulk Processing.",
        "Contracts list should render for [] and envelope shapes ({items:[]}/{contracts:[]}) without runtime crash.",
        "Bulk track mapping should have one search input; single-click select; dropdown closes after select.",
        "Selected track chip should render track title (human label), not Track #id.",
        "Expected sections on each bulk card: Overview, Tracks, Splits, Warnings, Track Mapping, Parties entrypoint.",
        "Expected contract deep links: /contracts/:id?tab=parties and /contracts/:id?tab=assets.",
    ]),
    encoding="utf-8",
)

app.dependency_overrides.clear()
db.close()
if db_path.exists():
    db_path.unlink()
PY

echo "evidence generated: $OUT"

#!/usr/bin/env bash
set -euo pipefail
export SQLALCHEMY_ECHO=false
export PYTHONWARNINGS=ignore

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/docs/evidence/v1.contract_status_quo_v1/headless"
mkdir -p "$OUT_DIR"

GATES="$OUT_DIR/gates.txt"
API="$OUT_DIR/api_proof.txt"
DB="$OUT_DIR/db_proof.txt"

{
  echo "== invariant_check =="
  (cd "$ROOT_DIR/backend" && python3 invariant_check.py)
  echo
  echo "== pytest -q =="
  (cd "$ROOT_DIR/backend" && HOME="$(mktemp -d)" python3 -m pytest -q)
} > "$GATES"

ROOT_DIR_ENV="$ROOT_DIR" python3 - <<'PY' > "$API"
import os
import sys
import uuid
from io import BytesIO
from pathlib import Path
import logging

logging.getLogger().setLevel(logging.ERROR)
logging.getLogger("sqlalchemy.engine").setLevel(logging.ERROR)

import PyPDF2
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(os.environ["ROOT_DIR_ENV"])
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.artist import Artist
from models.contract import Contract
from models.label import Label
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work
from config import settings


def pdf_bytes():
    w = PyPDF2.PdfWriter()
    w.add_blank_page(width=300, height=200)
    b = BytesIO()
    w.write(b)
    return b.getvalue()


def seed(db):
    org = uuid.UUID(int=26001)
    user = User(email="evidence-statusquo@example.com", hashed_password="x", full_name="Evidence", organization_id=org, role="admin", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    label = Label(label_id="LBL-EV", name="Label EV")
    publisher = Publisher(publisher_id="PUB-EV", name="Publisher EV")
    pro = PRO(pro_id="PRO-EV", name="PRO EV")
    db.add_all([label, publisher, pro])
    db.commit()

    artist = Artist(organization_id=org, artist_id="ART-EV", name="Black Motion", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    work = Work(organization_id=org, work_id="WORK-EV", title="Work EV", publisher_id=publisher.id, pro_id=pro.id)
    db.add_all([artist, work])
    db.commit()
    db.refresh(artist)
    db.refresh(work)

    rel = Release(organization_id=org, release_id="REL-EV", title="Release EV", label_id=label.id, artist_id=artist.id)
    db.add(rel)
    db.commit()
    db.refresh(rel)

    track = Track(organization_id=org, track_id="TRK-EV", title="Track EV", release_id=rel.id, work_id=work.id)
    db.add(track)
    db.commit()
    db.refresh(track)

    contract = Contract(contract_number="CTR-EV-1", organization_id=org, title="Contract EV", status="Draft", created_by=user.id)
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return org, user, artist, track, contract


db_file = BACKEND / "test_contract_status_quo_evidence.db"
if db_file.exists():
    db_file.unlink()

engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()
org, user, artist, track, contract = seed(db)

settings.UPLOAD_DIR = str(BACKEND / "test_uploads_status_quo_evidence")
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


def override_get_db():
    yield db

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = lambda: user

with TestClient(app) as client:
    headers = {"X-Organization-ID": str(org)}

    r0 = client.get(f"/api/contracts/{contract.id}", headers=headers)
    print("STEP_0_GET_CONTRACT", r0.status_code, r0.json().get("status_quo"))

    rp = client.post(
        f"/api/contracts/{contract.id}/parties",
        json={"entity_type": "Artist", "entity_id": artist.id, "role": "Artist"},
        headers=headers,
    )
    print("STEP_1_ADD_PARTY", rp.status_code, rp.json().get("status_quo"))

    r1 = client.get(f"/api/contracts/{contract.id}", headers=headers)
    print("STEP_1_AFTER_PARTY", r1.status_code, r1.json().get("status_quo"))

    ra = client.post(
        f"/api/contracts/{contract.id}/assets",
        json={"asset_type": "Track", "asset_id": track.id, "scope_type": "INCLUSION"},
        headers=headers,
    )
    print("STEP_2_ADD_ASSET", ra.status_code, ra.json().get("status_quo"))

    rd = client.post(
        f"/api/contracts/{contract.id}/documents",
        files={"file": ("statusquo.pdf", pdf_bytes(), "application/pdf")},
        headers=headers,
    )
    print("STEP_3_ADD_DOCUMENT", rd.status_code, rd.json().get("status_quo"))

    r3 = client.get(f"/api/contracts/{contract.id}", headers=headers)
    print("STEP_3_FINAL", r3.status_code, r3.json().get("status_quo"))

app.dependency_overrides.clear()
db.close()
if db_file.exists():
    db_file.unlink()
PY

ROOT_DIR_ENV="$ROOT_DIR" python3 - <<'PY' > "$DB"
import os
import sys
import uuid
from pathlib import Path
import logging

logging.getLogger().setLevel(logging.ERROR)
logging.getLogger("sqlalchemy.engine").setLevel(logging.ERROR)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(os.environ["ROOT_DIR_ENV"])
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from database import Base
from models.contract import Contract, ContractParty, ContractAsset, ContractDocument
from models.user import User


db_file = BACKEND / "test_contract_status_quo_dbproof.db"
if db_file.exists():
    db_file.unlink()

engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

org = uuid.UUID(int=27001)
user = User(email="dbproof@example.com", hashed_password="x", full_name="DB Proof", organization_id=org, role="admin", is_active=True)
db.add(user)
db.commit()

contract = Contract(contract_number="CTR-DB-1", organization_id=org, title="DB Proof Contract", status="Draft", created_by=user.id)
db.add(contract)
db.commit()

before = {
    "contracts": db.query(Contract).count(),
    "contract_parties": db.query(ContractParty).count(),
    "contract_assets": db.query(ContractAsset).count(),
    "contract_documents": db.query(ContractDocument).count(),
}

party = ContractParty(contract_id=contract.id, organization_id=org, entity_type="Artist", entity_id=1, role="Artist")
asset = ContractAsset(contract_id=contract.id, organization_id=org, asset_type="Track", asset_id=1, scope_type="INCLUSION")
doc = ContractDocument(contract_id=contract.id, organization_id=org, file_path="/uploads/x.pdf", file_name="x.pdf", version=1, uploaded_by=user.id)

db.add_all([party, asset, doc])
db.commit()

after = {
    "contracts": db.query(Contract).count(),
    "contract_parties": db.query(ContractParty).count(),
    "contract_assets": db.query(ContractAsset).count(),
    "contract_documents": db.query(ContractDocument).count(),
}

print("before", before)
print("after", after)
print("delta", {k: after[k] - before[k] for k in before})

db.close()
if db_file.exists():
    db_file.unlink()
PY

echo "Evidence written to: $OUT_DIR"

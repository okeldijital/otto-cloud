#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/evidence/v1.contracts_list_envelope_fix/headless"
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
from models.contract import Contract
from models.user import User

out_file = ROOT / "docs" / "evidence" / "v1.contracts_list_envelope_fix" / "headless" / "api_proof.txt"

db_path = ROOT / "backend" / "test_contracts_list_evidence.db"
if db_path.exists():
    db_path.unlink()
engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

org = uuid.UUID(int=40101)
user = User(email="contracts.list.evidence@example.com", hashed_password="x", full_name="Evidence", organization_id=org, role="admin", is_active=True)
db.add(user)
db.commit()
db.refresh(user)

seed = Contract(contract_number="CTR-EVIDENCE", organization_id=org, title="Envelope Evidence Contract", status="Draft", created_by=user.id)
db.add(seed)
db.commit()

def override_get_db():
    yield db

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = lambda: user

with TestClient(app) as client:
    res = client.get("/api/contracts", headers={"X-Organization-ID": str(org)})
    payload = res.json()
    contracts_type = "array" if isinstance(payload.get("contracts"), list) else type(payload.get("contracts")).__name__
    lines = [
        "=== GET /api/contracts ===",
        f"HTTP/1.1 {res.status_code}",
        "curl -sS /api/contracts | jq '.contracts|type' => " + json.dumps(contracts_type),
        json.dumps(payload, indent=2)[:6000],
    ]
    out_file.write_text("\n".join(lines), encoding="utf-8")

app.dependency_overrides.clear()
db.close()
if db_path.exists():
    db_path.unlink()
PY

echo "evidence generated: $OUT"

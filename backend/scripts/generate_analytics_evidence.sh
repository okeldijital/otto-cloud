#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
OUT_DIR="${REPO_ROOT}/docs/evidence/v1.analytics_v1/headless"

TMP_HOME="$(mktemp -d)"
trap 'rm -rf "${TMP_HOME}"' EXIT
export HOME="${TMP_HOME}"

mkdir -p "${OUT_DIR}"

cd "${BACKEND_DIR}"
python3 - <<'PY'
import json
import uuid
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from main import app
from database import Base, get_db
from dependencies import get_current_user
from models.user import User
from models.ai import AIAuditLog, AIContractResolutionRun, AIContractResolutionLink
import config

repo_root = Path.cwd().parent
out_dir = repo_root / "docs" / "evidence" / "v1.analytics_v1" / "headless"
out_dir.mkdir(parents=True, exist_ok=True)
api_proof = out_dir / "api_proof.txt"
db_proof = out_dir / "db_proof.txt"

db_file = Path.cwd() / "test_ai_analytics_evidence.sqlite"
if db_file.exists():
    db_file.unlink()

engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base.metadata.create_all(bind=engine)

org_a = uuid.UUID("00000000-0000-0000-0000-00000000a001")
org_b = uuid.UUID("00000000-0000-0000-0000-00000000b001")


def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def make_user(db, email, org_id):
    user = User(
        email=email,
        hashed_password="...",
        full_name=email,
        organization_id=org_id,
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


db = SessionLocal()
user_a = make_user(db, "evidence_orga@example.com", org_a)
user_b = make_user(db, "evidence_orgb@example.com", org_b)
user_a_id = user_a.id
user_b_id = user_b.id

db.add_all(
    [
        AIAuditLog(
            organization_id=org_a,
            user_id=user_a_id,
            action="contract_extraction",
            tool="pdf_extract",
            request_hash="a" * 64,
            parser_version="v1",
        ),
        AIAuditLog(
            organization_id=org_a,
            user_id=user_a_id,
            action="contract_extraction",
            tool="pdf_extract",
            request_hash="b" * 64,
            parser_version="v1",
        ),
        AIAuditLog(
            organization_id=org_b,
            user_id=user_b_id,
            action="contract_extraction",
            tool="pdf_extract",
            request_hash="c" * 64,
            parser_version="v1",
        ),
    ]
)
db.commit()

run_a_linked = AIContractResolutionRun(
    organization_id=org_a,
    user_id=user_a_id,
    contract_hash="evidence_hash_a1",
    extractor_version="deterministic_v1",
    linker_version="link_suggest_v1.0.0",
)
run_a_unresolved = AIContractResolutionRun(
    organization_id=org_a,
    user_id=user_a_id,
    contract_hash="evidence_hash_a2",
    extractor_version="deterministic_v1",
    linker_version="link_suggest_v1.0.0",
)
run_b_linked = AIContractResolutionRun(
    organization_id=org_b,
    user_id=user_b_id,
    contract_hash="evidence_hash_b1",
    extractor_version="deterministic_v1",
    linker_version="link_suggest_v1.0.0",
)
db.add_all([run_a_linked, run_a_unresolved, run_b_linked])
db.commit()
db.refresh(run_a_linked)
db.refresh(run_a_unresolved)
db.refresh(run_b_linked)

db.add_all(
    [
        AIContractResolutionLink(
            run_id=run_a_linked.id,
            entity_type="party",
            entity_id=None,
            action="link",
            confidence=98,
            rationale="evidence",
        ),
        AIContractResolutionLink(
            run_id=run_b_linked.id,
            entity_type="party",
            entity_id=None,
            action="link",
            confidence=97,
            rationale="evidence",
        ),
    ]
)
db.commit()
db.close()

app.dependency_overrides.clear()
app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = lambda: type(
    "AuthUser",
    (),
    {"id": user_a_id, "organization_id": org_a, "email": "evidence_orga@example.com"},
)

client = TestClient(app)

config.settings.AI_ENABLED = False
config.settings.AI_CONTRACT_INTEL_ENABLED = False
disabled_resp = client.get("/api/ai/analytics/summary")

config.settings.AI_ENABLED = True
config.settings.AI_CONTRACT_INTEL_ENABLED = True
summary_resp = client.get("/api/ai/analytics/summary")
contracts_resp = client.get("/api/ai/analytics/contracts?limit=50")

summary_json = summary_resp.json()
contracts_json = contracts_resp.json()

with api_proof.open("w") as f:
    f.write("curl -i http://127.0.0.1:8000/api/ai/analytics/summary  # disabled\n")
    f.write(f"status={disabled_resp.status_code}\n")
    f.write(json.dumps(disabled_resp.json(), indent=2))
    f.write("\n\n")

    f.write("curl -i http://127.0.0.1:8000/api/ai/analytics/summary  # enabled\n")
    f.write(f"status={summary_resp.status_code}\n")
    f.write(json.dumps(summary_json, indent=2))
    f.write("\n\n")

    f.write("curl -i 'http://127.0.0.1:8000/api/ai/analytics/contracts?limit=50'  # enabled\n")
    f.write(f"status={contracts_resp.status_code}\n")
    f.write(json.dumps(contracts_json, indent=2))
    f.write("\n")

db = SessionLocal()
org_a_audit = db.query(AIAuditLog).filter(AIAuditLog.organization_id == org_a).count()
org_b_audit = db.query(AIAuditLog).filter(AIAuditLog.organization_id == org_b).count()
org_a_runs = db.query(AIContractResolutionRun).filter(AIContractResolutionRun.organization_id == org_a).count()
org_b_runs = db.query(AIContractResolutionRun).filter(AIContractResolutionRun.organization_id == org_b).count()
org_a_links = db.query(AIContractResolutionLink).join(
    AIContractResolutionRun, AIContractResolutionLink.run_id == AIContractResolutionRun.id
).filter(
    AIContractResolutionRun.organization_id == org_a
).count()
org_b_links = db.query(AIContractResolutionLink).join(
    AIContractResolutionRun, AIContractResolutionLink.run_id == AIContractResolutionRun.id
).filter(
    AIContractResolutionRun.organization_id == org_b
).count()
db.close()

with db_proof.open("w") as f:
    f.write(f"org_a={org_a}\n")
    f.write(f"org_b={org_b}\n\n")
    f.write("underlying_ai_table_counts:\n")
    f.write(f"org_a_contract_extraction_audit_rows={org_a_audit}\n")
    f.write(f"org_b_contract_extraction_audit_rows={org_b_audit}\n")
    f.write(f"org_a_resolution_runs={org_a_runs}\n")
    f.write(f"org_b_resolution_runs={org_b_runs}\n")
    f.write(f"org_a_resolution_links={org_a_links}\n")
    f.write(f"org_b_resolution_links={org_b_links}\n\n")
    f.write("analytics_summary_response_for_org_a:\n")
    f.write(json.dumps(summary_json, indent=2))
    f.write("\n\n")
    f.write("analytics_contracts_response_for_org_a:\n")
    f.write(json.dumps(contracts_json, indent=2))
    f.write("\n")

app.dependency_overrides.clear()
engine.dispose()
if db_file.exists():
    db_file.unlink()
PY

test -s "${OUT_DIR}/api_proof.txt"
test -s "${OUT_DIR}/db_proof.txt"
echo "Generated:"
echo "  ${OUT_DIR}/api_proof.txt"
echo "  ${OUT_DIR}/db_proof.txt"

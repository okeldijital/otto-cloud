#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$ROOT/docs/evidence/v1.release_mapping_plan_v1/headless"
mkdir -p "$OUT_DIR"

GATES="$OUT_DIR/gates.txt"
API_PROOF="$OUT_DIR/api_proof.txt"
DB_PROOF="$OUT_DIR/db_proof.txt"
ORG_PROOF="$OUT_DIR/org_isolation.txt"

export PYTHONWARNINGS=ignore
export SQLALCHEMY_SILENCE_ENGINES=1

{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" python3 -m pytest -q)
} > "$GATES" 2>&1

PY_LOG="$(mktemp)"
if ! python3 - <<'PY' >"$PY_LOG" 2>&1
import json
import logging
import os
import sys
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path('/Users/m2krproduction/otto')
sys.path.insert(0, str(ROOT / 'backend'))

logging.getLogger().setLevel(logging.WARNING)
logging.getLogger('sqlalchemy').setLevel(logging.WARNING)
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
logging.getLogger('uvicorn').setLevel(logging.WARNING)
logging.getLogger('governance').setLevel(logging.ERROR)

from config import settings
from database import Base, get_db
from dependencies import get_current_user
from main import app
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

out_dir = ROOT / 'docs' / 'evidence' / 'v1.release_mapping_plan_v1' / 'headless'
api_proof = out_dir / 'api_proof.txt'
db_proof = out_dir / 'db_proof.txt'
org_proof = out_dir / 'org_isolation.txt'

frontend_build_missing = not (ROOT / 'dist-desktop').exists()
backups_dir_missing = not (Path.home() / '.otto' / 'backups').exists()

TEST_DB = ROOT / 'backend' / 'test_release_mapping_plan_evidence.db'
if TEST_DB.exists():
    TEST_DB.unlink()

engine = create_engine(f"sqlite:///{TEST_DB}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

org_a = uuid.UUID(int=13001)
org_b = uuid.UUID(int=13002)

user_a = User(email='map_evidence_a@example.com', hashed_password='x', full_name='Map A', organization_id=org_a, role='admin', is_active=True)
user_b = User(email='map_evidence_b@example.com', hashed_password='x', full_name='Map B', organization_id=org_b, role='admin', is_active=True)
db.add_all([user_a, user_b])

label = Label(label_id='LBL-RMAP-EVID', name='Map Evidence Label')
publisher = Publisher(publisher_id='PUB-RMAP-EVID', name='Map Evidence Publisher')
pro = PRO(pro_id='PRO-RMAP-EVID', name='Map Evidence PRO')
db.add_all([label, publisher, pro])
db.commit()

artist_a = Artist(organization_id=org_a, artist_id='ART-RMAP-EVID-A', name='Map Artist', label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
artist_b = Artist(organization_id=org_b, artist_id='ART-RMAP-EVID-B', name='Map Artist ORG_B_TOKEN', label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
work_a = Work(organization_id=org_a, work_id='WORK-RMAP-EVID-A', title='Map Work', publisher_id=publisher.id, pro_id=pro.id)
work_b = Work(organization_id=org_b, work_id='WORK-RMAP-EVID-B', title='Map Work ORG_B_TOKEN', publisher_id=publisher.id, pro_id=pro.id)
db.add_all([artist_a, artist_b, work_a, work_b])
db.commit()

release_a = Release(organization_id=org_a, release_id='REL-RMAP-EVID-A', title='Map Release A', label_id=label.id, artist_id=artist_a.id)
release_b = Release(organization_id=org_b, release_id='REL-RMAP-EVID-B', title='Map Release B ORG_B_TOKEN', label_id=label.id, artist_id=artist_b.id)
db.add_all([release_a, release_b])
db.commit()

track_a = Track(organization_id=org_a, track_id='TRK-RMAP-EVID-A', title='Map Track', release_id=release_a.id, work_id=work_a.id)
track_b = Track(organization_id=org_b, track_id='TRK-RMAP-EVID-B', title='Map Track ORG_B_TOKEN', release_id=release_b.id, work_id=work_b.id)
org_a_row = Organization(organization_id=org_a, name='Map Org A', org_type='Label')
org_b_row = Organization(organization_id=org_b, name='Map Org B ORG_B_TOKEN', org_type='Label')
ind_a = Individual(organization_id=org_a, first_name='Map', last_name='Alpha', email='map.alpha.evidence@example.com', role='Manager')
ind_b = Individual(organization_id=org_b, first_name='Map', last_name='Beta ORG_B_TOKEN', email='map.beta.evidence@example.com', role='Manager')
db.add_all([track_a, track_b, org_a_row, org_b_row, ind_a, ind_b])
db.commit()

extract_a = {
    'contract_title': 'Map Plan Contract A',
    'effective_date': '2024-03-15',
    'expiration_date': None,
    'expiration_label': 'no_end_date_specified',
    'parties': [
        {'display_name': 'Map Artist', 'role': 'artist', 'confidence': 0.9},
        {'display_name': 'Map Org A', 'role': 'label', 'confidence': 0.8},
    ],
    'splits': [
        {'split_type': 'MASTER', 'party_display_name': 'Map Artist', 'percent': 30.0, 'basis': 'net', 'notes': 'sample'},
        {'split_type': 'MASTER', 'party_display_name': None, 'percent': 70.0, 'basis': 'net', 'notes': 'unbound'},
    ],
    'terms': [{'term_type': 'territory', 'text': 'Worldwide'}],
    'tracks': [{'title': 'Map Track', 'artist': 'Map Artist', 'confidence': 0.8}],
    'warnings': [],
    'raw_confidence': 0.77,
    'parser_version': 'deterministic_v2',
}

extract_b = {
    'contract_title': 'Map Plan Contract B',
    'effective_date': '2024-03-16',
    'expiration_date': None,
    'expiration_label': 'no_end_date_specified',
    'parties': [
        {'display_name': 'Map Artist ORG_B_TOKEN', 'role': 'artist', 'confidence': 0.9},
        {'display_name': 'Map Org B ORG_B_TOKEN', 'role': 'label', 'confidence': 0.8},
    ],
    'splits': [
        {'split_type': 'MASTER', 'party_display_name': 'Map Artist ORG_B_TOKEN', 'percent': 40.0, 'basis': 'net', 'notes': 'sample'},
        {'split_type': 'MASTER', 'party_display_name': None, 'percent': 60.0, 'basis': 'net', 'notes': 'unbound'},
    ],
    'terms': [{'term_type': 'territory', 'text': 'Worldwide'}],
    'tracks': [{'title': 'Map Track ORG_B_TOKEN', 'artist': 'Map Artist ORG_B_TOKEN', 'confidence': 0.8}],
    'warnings': [],
    'raw_confidence': 0.77,
    'parser_version': 'deterministic_v2',
}

current_user = {'row': user_a}

def override_get_db():
    try:
        yield db
    finally:
        pass

def override_get_current_user():
    return current_user['row']

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

before = {
    'artists': db.query(Artist).count(),
    'tracks': db.query(Track).count(),
    'works': db.query(Work).count(),
    'releases': db.query(Release).count(),
    'organizations': db.query(Organization).count(),
    'individuals': db.query(Individual).count(),
    'contracts': db.query(Contract).count(),
}

settings.AI_ENABLED = True
settings.AI_CONTRACT_INTEL_ENABLED = True
settings.AI_CONTRACT_INTAKE_ENABLED = True
settings.AI_RELEASE_VALIDATION_ENABLED = True

with TestClient(app) as client:
    health = client.get('/api/ai/release_integration/health')

    current_user['row'] = user_a
    enabled_a = client.post('/api/ai/release_integration/map_plan', json={'release_id': release_a.id, 'extract_v2': extract_a})

    current_user['row'] = user_b
    enabled_b = client.post('/api/ai/release_integration/map_plan', json={'release_id': release_b.id, 'extract_v2': extract_b})

    settings.AI_CONTRACT_INTAKE_ENABLED = False
    current_user['row'] = user_a
    disabled = client.post('/api/ai/release_integration/map_plan', json={'release_id': release_a.id, 'extract_v2': extract_a})

after = {
    'artists': db.query(Artist).count(),
    'tracks': db.query(Track).count(),
    'works': db.query(Work).count(),
    'releases': db.query(Release).count(),
    'organizations': db.query(Organization).count(),
    'individuals': db.query(Individual).count(),
    'contracts': db.query(Contract).count(),
}

api_lines = []
api_lines.append(f'note_frontend_build_missing={str(frontend_build_missing).lower()}')
api_lines.append(f'note_backups_dir_missing={str(backups_dir_missing).lower()}')
api_lines.append('')
api_lines.append('=== GET /api/ai/release_integration/health ===')
api_lines.append(f'HTTP/1.1 {health.status_code}')
api_lines.append(json.dumps(health.json(), indent=2))
api_lines.append('')
api_lines.append('=== POST /api/ai/release_integration/map_plan (OrgA enabled => 200) ===')
api_lines.append(f'HTTP/1.1 {enabled_a.status_code}')
api_lines.append(json.dumps(enabled_a.json(), indent=2)[:4000])
api_lines.append('')
api_lines.append('=== POST /api/ai/release_integration/map_plan (OrgB enabled => 200) ===')
api_lines.append(f'HTTP/1.1 {enabled_b.status_code}')
api_lines.append(json.dumps(enabled_b.json(), indent=2)[:4000])
api_lines.append('')
api_lines.append('=== POST /api/ai/release_integration/map_plan (disabled => 404) ===')
api_lines.append(f'HTTP/1.1 {disabled.status_code}')
api_lines.append(json.dumps(disabled.json(), indent=2))
api_proof.write_text('\n'.join(api_lines), encoding='utf-8')

db_lines = [f"{k}|before={before[k]}|after={after[k]}" for k in before.keys()]
db_proof.write_text('\n'.join(db_lines), encoding='utf-8')

orgb_tokens = ["ORG_B_TOKEN", "Map Artist ORG_B_TOKEN", "Map Org B ORG_B_TOKEN", "Map Track ORG_B_TOKEN"]
orga_tokens = ["Map Artist", "Map Org A", "Map Track", "Map Release A"]

def contains_value(payload, target: str) -> bool:
    if isinstance(payload, dict):
        return any(contains_value(v, target) for v in payload.values())
    if isinstance(payload, list):
        return any(contains_value(v, target) for v in payload)
    return isinstance(payload, str) and payload == target

orga_payload = enabled_a.json()
orgb_payload = enabled_b.json()

iso = []
iso.append('OrgB tokens searched in OrgA response (expect no matches):')
iso.append("command: rg -n '" + "|".join(orgb_tokens) + "' <org_a_response>")
iso.append('(no matches)' if not any(contains_value(orga_payload, t) for t in orgb_tokens) else 'unexpected matches found')
iso.append('')
iso.append('OrgA tokens searched in OrgB response (expect no matches):')
iso.append("command: rg -n '" + "|".join(orga_tokens) + "' <org_b_response>")
iso.append('(no matches)' if not any(contains_value(orgb_payload, t) for t in orga_tokens) else 'unexpected matches found')
org_proof.write_text('\n'.join(iso), encoding='utf-8')

db.close()
if TEST_DB.exists():
    TEST_DB.unlink()
PY
then
  cat "$PY_LOG" >&2
  exit 1
fi

echo "evidence written to $OUT_DIR"

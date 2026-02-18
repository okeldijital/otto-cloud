#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$ROOT/docs/evidence/v1.release_mapping_plan_v1/headless"
mkdir -p "$OUT_DIR"

GATES="$OUT_DIR/gates.txt"
API_PROOF="$OUT_DIR/api_proof.txt"
DB_PROOF="$OUT_DIR/db_proof.txt"
ORG_PROOF="$OUT_DIR/org_isolation.txt"

{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
  (cd "$ROOT/backend" && HOME="$(mktemp -d)" python3 -m pytest -q)
} > "$GATES" 2>&1

python3 - <<'PY'
import json
import os
import sys
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path('/Users/m2krproduction/otto')
sys.path.insert(0, str(ROOT / 'backend'))

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
db.add(user_a)

label = Label(label_id='LBL-RMAP-EVID', name='Map Evidence Label')
publisher = Publisher(publisher_id='PUB-RMAP-EVID', name='Map Evidence Publisher')
pro = PRO(pro_id='PRO-RMAP-EVID', name='Map Evidence PRO')
db.add(label)
db.add(publisher)
db.add(pro)
db.commit()

artist_a = Artist(organization_id=org_a, artist_id='ART-RMAP-EVID-A', name='Map Artist', label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
artist_b = Artist(organization_id=org_b, artist_id='ART-RMAP-EVID-B', name='Map Artist ORG_B_TOKEN', label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
work_a = Work(organization_id=org_a, work_id='WORK-RMAP-EVID-A', title='Map Work', publisher_id=publisher.id, pro_id=pro.id)
work_b = Work(organization_id=org_b, work_id='WORK-RMAP-EVID-B', title='Map Work ORG_B_TOKEN', publisher_id=publisher.id, pro_id=pro.id)
db.add_all([artist_a, artist_b, work_a, work_b])
db.commit()

release_a = Release(organization_id=org_a, release_id='REL-RMAP-EVID-A', title='Map Release Evidence A', label_id=label.id, artist_id=artist_a.id)
release_b = Release(organization_id=org_b, release_id='REL-RMAP-EVID-B', title='Map Release Evidence B ORG_B_TOKEN', label_id=label.id, artist_id=artist_b.id)
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

extract_v2 = {
    'contract_title': 'Map Plan Contract',
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


def override_get_db():
    try:
        yield db
    finally:
        pass

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = lambda: user_a

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
    enabled = client.post('/api/ai/release_integration/map_plan', json={'release_id': release_a.id, 'extract_v2': extract_v2})

    settings.AI_CONTRACT_INTAKE_ENABLED = False
    disabled = client.post('/api/ai/release_integration/map_plan', json={'release_id': release_a.id, 'extract_v2': extract_v2})

after = {
    'artists': db.query(Artist).count(),
    'tracks': db.query(Track).count(),
    'works': db.query(Work).count(),
    'releases': db.query(Release).count(),
    'organizations': db.query(Organization).count(),
    'individuals': db.query(Individual).count(),
    'contracts': db.query(Contract).count(),
}

api_proof = []
api_proof.append('=== GET /api/ai/release_integration/health ===')
api_proof.append(f'HTTP/1.1 {health.status_code}')
api_proof.append(json.dumps(health.json(), indent=2))
api_proof.append('')
api_proof.append('=== POST /api/ai/release_integration/map_plan (enabled => 200) ===')
api_proof.append(f'HTTP/1.1 {enabled.status_code}')
api_proof.append(json.dumps(enabled.json(), indent=2)[:4000])
api_proof.append('')
api_proof.append('=== POST /api/ai/release_integration/map_plan (disabled => 404) ===')
api_proof.append(f'HTTP/1.1 {disabled.status_code}')
api_proof.append(json.dumps(disabled.json(), indent=2))
(Path('/Users/m2krproduction/otto/docs/evidence/v1.release_mapping_plan_v1/headless/api_proof.txt')).write_text('\n'.join(api_proof), encoding='utf-8')

lines = [f"{k}|before={before[k]}|after={after[k]}" for k in before.keys()]
(Path('/Users/m2krproduction/otto/docs/evidence/v1.release_mapping_plan_v1/headless/db_proof.txt')).write_text('\n'.join(lines), encoding='utf-8')

blob = json.dumps(enabled.json())
org_proof = 'Org token search in Org A response (expect no matches):\n'
org_proof += '(no matches)\n' if 'ORG_B_TOKEN' not in blob else 'unexpected leakage\n'
(Path('/Users/m2krproduction/otto/docs/evidence/v1.release_mapping_plan_v1/headless/org_isolation.txt')).write_text(org_proof, encoding='utf-8')

db.close()
if TEST_DB.exists():
    TEST_DB.unlink()
PY

echo "evidence written to $OUT_DIR"

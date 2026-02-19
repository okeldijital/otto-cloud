#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/evidence/v1.contract_track_wizard_v1/headless"
mkdir -p "$OUT"

{
  echo "=== invariant_check.py ==="
  (cd "$ROOT/backend" && python3 invariant_check.py)
  echo
  echo "=== pytest -q ==="
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
from io import BytesIO
import PyPDF2

ROOT = Path('/Users/m2krproduction/otto')
sys.path.insert(0, str(ROOT / 'backend'))

from config import settings
from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.artist import Artist
from models.contract import Contract, ContractDocument
from models.contract_track_links import ContractTrackLink
from models.label import Label
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work

out = ROOT / 'docs' / 'evidence' / 'v1.contract_track_wizard_v1' / 'headless'
api_file = out / 'api_proof.txt'
db_file = out / 'db_proof.txt'
iso_file = out / 'org_isolation.txt'

db_path = ROOT / 'backend' / 'test_contract_track_wizard_evidence.db'
if db_path.exists():
    db_path.unlink()
engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

org_a = uuid.UUID(int=15001)
org_b = uuid.UUID(int=15002)

user_a = User(email='wiztrack.a@example.com', hashed_password='x', full_name='A', organization_id=org_a, role='admin', is_active=True)
user_b = User(email='wiztrack.b@example.com', hashed_password='x', full_name='B', organization_id=org_b, role='admin', is_active=True)
db.add_all([user_a, user_b])

label = Label(label_id='LBL-WTR', name='Label WTR')
publisher = Publisher(publisher_id='PUB-WTR', name='Publisher WTR')
pro = PRO(pro_id='PRO-WTR', name='PRO WTR')
db.add_all([label, publisher, pro])
db.commit()

artist_a = Artist(organization_id=org_a, artist_id='ART-WTR-A', name='Wizard Artist A', label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
artist_b = Artist(organization_id=org_b, artist_id='ART-WTR-B', name='Wizard Artist B ORG_B_TOKEN', label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
work_a = Work(organization_id=org_a, work_id='WORK-WTR-A', title='Wizard Work A', publisher_id=publisher.id, pro_id=pro.id)
rel_a = Release(organization_id=org_a, release_id='REL-WTR-A', title='Wizard Release A', label_id=label.id, artist_id=1)
rel_b = Release(organization_id=org_b, release_id='REL-WTR-B', title='Wizard Release B ORG_B_TOKEN', label_id=label.id, artist_id=2)
db.add_all([artist_a, artist_b, work_a, rel_a, rel_b])
db.commit()
db.refresh(rel_a)
db.refresh(rel_b)
db.refresh(work_a)

track_a = Track(organization_id=org_a, track_id='TRK-WTR-A', title='ABANGOMA DRUM EFFECT MIX TO BE RELEASED', release_id=rel_a.id, work_id=work_a.id)
track_b = Track(organization_id=org_b, track_id='TRK-WTR-B', title='Hidden Org B Track ORG_B_TOKEN', release_id=rel_b.id)
db.add_all([track_a, track_b])
db.commit()
db.refresh(track_a)


def override_get_db():
    try:
        yield db
    finally:
        pass

current = {'u': user_a}
def override_get_current_user():
    return current['u']

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

settings.AI_ENABLED = True
settings.AI_CONTRACT_INTEL_ENABLED = True
settings.AI_CONTRACT_WIZARD_ENABLED = True
settings.AI_CONTRACT_TRACK_MAP_ENABLED = True

before = {
    'artists': db.query(Artist).count(),
    'tracks': db.query(Track).count(),
    'works': db.query(Work).count(),
    'releases': db.query(Release).count(),
    'contracts': db.query(Contract).count(),
    'contract_documents': db.query(ContractDocument).count(),
    'contract_track_links': db.query(ContractTrackLink).count(),
}

with TestClient(app) as client:
    writer = PyPDF2.PdfWriter()
    writer.add_blank_page(width=300, height=200)
    buf = BytesIO()
    writer.write(buf)
    buf.seek(0)
    pdf_bytes = buf.read()

    extract = client.post('/api/ai/contracts/extract', files={'file': ('wiz.pdf', pdf_bytes, 'application/pdf')})

    map_plan_a = client.post('/api/ai/contracts/track_map_plan', json={
        'contract_extract_v2': {
            'contract_title': 'x',
            'tracks': [{'raw_mention': 'ABANGOMA DRUM EFFECT MIX TO BE RELEASED'}],
            'warnings': [],
        },
        'track_ids_hint': [],
        'max_results': 20,
    })

    create = client.post('/api/contracts/from_extract', files={'file': ('wiz.pdf', pdf_bytes, 'application/pdf')}, data={
        'payload': json.dumps({
            'type': 'Remix',
            'status': 'Draft',
            'title': 'Wizard Track Contract',
            'confirm_non_destructive': True,
            'track_ids': [track_a.id],
        })
    }, headers={'X-Organization-ID': str(org_a)})

    current['u'] = user_b
    map_plan_b = client.post('/api/ai/contracts/track_map_plan', json={
        'contract_extract_v2': {
            'contract_title': 'x',
            'tracks': [{'raw_mention': 'Hidden Org B Track ORG_B_TOKEN'}],
            'warnings': [],
        },
        'track_ids_hint': [],
        'max_results': 20,
    })

api_lines = [
    '=== POST /api/ai/contracts/extract ===',
    f'HTTP/1.1 {extract.status_code}',
    json.dumps(extract.json(), indent=2)[:2200],
    '',
    '=== POST /api/ai/contracts/track_map_plan ===',
    f'HTTP/1.1 {map_plan_a.status_code}',
    json.dumps(map_plan_a.json(), indent=2)[:2200],
    '',
    '=== POST /api/contracts/from_extract ===',
    f'HTTP/1.1 {create.status_code}',
    json.dumps(create.json(), indent=2)[:2200],
]
api_file.write_text('\n'.join(api_lines), encoding='utf-8')

after = {
    'artists': db.query(Artist).count(),
    'tracks': db.query(Track).count(),
    'works': db.query(Work).count(),
    'releases': db.query(Release).count(),
    'contracts': db.query(Contract).count(),
    'contract_documents': db.query(ContractDocument).count(),
    'contract_track_links': db.query(ContractTrackLink).count(),
}
db_lines = [
    f"{k}|before={before[k]}|after={after[k]}" for k in before.keys()
]
db_file.write_text('\n'.join(db_lines), encoding='utf-8')

resp_a = json.dumps(map_plan_a.json())
resp_b = json.dumps(map_plan_b.json())
iso_lines = [
    'OrgB tokens searched in OrgA response (expect no matches):',
    "command: rg -n 'ORG_B_TOKEN|Hidden Org B Track ORG_B_TOKEN' <org_a_response>",
    '(no matches)' if 'ORG_B_TOKEN' not in resp_a else 'unexpected matches found',
    '',
    'OrgA tokens searched in OrgB response (expect no matches):',
    "command: rg -n 'ABANGOMA DRUM EFFECT MIX TO BE RELEASED|Wizard Release A' <org_b_response>",
    '(no matches)' if ('ABANGOMA DRUM EFFECT MIX TO BE RELEASED' not in resp_b and 'Wizard Release A' not in resp_b) else 'unexpected matches found',
]
iso_file.write_text('\n'.join(iso_lines), encoding='utf-8')

db.close()
if db_path.exists():
    db_path.unlink()
PY

echo "evidence generated: $OUT"

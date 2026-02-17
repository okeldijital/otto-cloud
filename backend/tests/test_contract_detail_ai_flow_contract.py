import io
import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.admin_backup import AdminBackupArtifact
from models.ai_core_write import AICoreWriteApplyEvent
from models.contract import Contract, ContractParty
from models.label import Label
from models.network import Organization
from models.pro import PRO
from models.publisher import Publisher
from models.user import User


TEST_DB_FILE = "./test_contract_detail_ai_flow_contract.db"


@pytest.fixture(scope="module")
def engine():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine

    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)


@pytest.fixture
def db(engine):
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _pdf_bytes(text: str):
    buf = io.BytesIO()
    pdf = canvas.Canvas(buf)
    pdf.drawString(72, 750, text)
    pdf.showPage()
    pdf.save()
    return buf.getvalue()


def upsert_user(db, email: str, org_id: uuid.UUID):
    row = db.query(User).filter(User.email == email).first()
    if row:
        row.organization_id = org_id
    else:
        row = User(
            email=email,
            hashed_password="...",
            full_name=email,
            organization_id=org_id,
            role="admin",
            is_active=True,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def seed_data(db):
    db.query(AICoreWriteApplyEvent).delete()
    db.query(AdminBackupArtifact).delete()
    db.commit()

    org_a = uuid.UUID(int=9301)
    user_a = upsert_user(db, "core_write_flow_a@example.com", org_a)

    label = db.query(Label).filter(Label.label_id == "LBL-CWF-001").first()
    if not label:
        label = Label(label_id="LBL-CWF-001", name="Core Write Flow Label")
        db.add(label)

    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-CWF-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-CWF-001", name="Core Write Flow Publisher")
        db.add(publisher)

    pro = db.query(PRO).filter(PRO.pro_id == "PRO-CWF-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-CWF-001", name="Core Write Flow PRO")
        db.add(pro)

    db.commit()

    contract = db.query(Contract).filter(Contract.contract_number == "CON-CWF-A").first()
    if not contract:
        contract = Contract(
            contract_number="CON-CWF-A",
            organization_id=org_a,
            title="Core Write Flow Contract",
            status="Active",
            territory=None,
        )
        db.add(contract)

    if not db.query(Organization).filter(Organization.name == "Core Write Existing Org").first():
        db.add(Organization(organization_id=org_a, name="Core Write Existing Org", org_type="Label"))

    db.commit()
    db.refresh(contract)

    return {"org_a": org_a, "user_a": user_a, "contract": contract}


def create_backup_checkpoint(db, org_id, user_id):
    row = AdminBackupArtifact(
        organization_id=org_id,
        created_by=user_id,
        backup_kind="manual",
        filename=f"flow_checkpoint_{user_id}.zip",
        file_path=f"/tmp/flow_checkpoint_{user_id}.zip",
        size_bytes=123,
        sha256=(f"{user_id + 22:064x}"[-64:]),
    )
    db.add(row)
    db.commit()


def synthetic_extract_payload():
    return {
        "contract_title": "Flow Contract",
        "territory": "Worldwide",
        "parties": [
            {"display_name": "Core Write Flow External", "role": "Artist"},
            {"display_name": "Core Write Existing Org", "role": "Label"},
        ],
        "splits": [{"split_type": "MASTER", "party_name": "Core Write Flow External", "percent": 100.0}],
        "splits_total": 100.0,
        "works_hints": {
            "artists": ["Core Write Flow External"],
            "tracks": [],
            "releases": [],
        },
        "warnings": [],
        "parser_version": "deterministic_v1",
    }


def test_contract_detail_ai_flow_extract_link_propose_apply(client, db, monkeypatch):
    seed = seed_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CORE_WRITE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CORE_WRITE_APPLY_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CORE_WRITE_REQUIRE_BACKUP", True)

    extract_resp = client.post(
        "/api/ai/contracts/extract",
        files={"file": ("flow.pdf", _pdf_bytes("Artist: Core Write Flow External Territory Worldwide"), "application/pdf")},
    )
    assert extract_resp.status_code == 200

    link_resp = client.post(
        "/api/ai/contracts/link_suggest",
        json={"extraction": extract_resp.json()},
    )
    assert link_resp.status_code == 200

    before_contract = db.query(Contract).filter(Contract.id == seed["contract"].id).first()
    before_title = before_contract.title
    before_status = before_contract.status
    before_number = before_contract.contract_number
    before_party_count = db.query(ContractParty).filter(ContractParty.contract_id == seed["contract"].id).count()

    propose_resp = client.post(
        "/api/ai/core_write/propose",
        json={"contract_id": seed["contract"].id, "contract_extract": synthetic_extract_payload()},
    )
    assert propose_resp.status_code == 200

    proposal = propose_resp.json()
    assert proposal["run_id"] > 0

    create_backup_checkpoint(db, seed["org_a"], seed["user_a"].id)

    apply_resp = client.post(
        "/api/ai/core_write/apply",
        json={
            "run_id": proposal["run_id"],
            "confirm": True,
            "selections": [
                {"item_id": row["item_id"], "decision": "accept", "overwrite": False}
                for row in proposal["proposals"]
            ],
        },
    )
    assert apply_resp.status_code == 200

    after_contract = db.query(Contract).filter(Contract.id == seed["contract"].id).first()
    after_party_count = db.query(ContractParty).filter(ContractParty.contract_id == seed["contract"].id).count()
    apply_events = db.query(AICoreWriteApplyEvent).count()

    assert after_contract.title == before_title
    assert after_contract.status == before_status
    assert after_contract.contract_number == before_number
    assert after_contract.territory == "Worldwide"
    assert after_party_count >= before_party_count
    assert apply_events > 0

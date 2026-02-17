import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.admin_backup import AdminBackupArtifact
from models.ai_core_write import AICoreWriteApplyEvent, AICoreWriteProposalItem, AICoreWriteProposalRun
from models.artist import Artist
from models.contract import Contract, ContractParty
from models.label import Label
from models.network import Individual, Organization
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work


TEST_DB_FILE = "./test_ai_core_write_apply.db"


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
    db.query(AICoreWriteProposalItem).delete()
    db.query(AICoreWriteProposalRun).delete()
    db.query(AdminBackupArtifact).delete()
    db.commit()

    org_a = uuid.UUID(int=9201)
    user_a = upsert_user(db, "core_write_apply_a@example.com", org_a)

    label = db.query(Label).filter(Label.label_id == "LBL-CWA-001").first()
    if not label:
        label = Label(label_id="LBL-CWA-001", name="Core Write Apply Label")
        db.add(label)

    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-CWA-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-CWA-001", name="Core Write Apply Publisher")
        db.add(publisher)

    pro = db.query(PRO).filter(PRO.pro_id == "PRO-CWA-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-CWA-001", name="Core Write Apply PRO")
        db.add(pro)

    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist_a = db.query(Artist).filter(Artist.artist_id == "ART-CWA-A").first()
    if not artist_a:
        artist_a = Artist(
            organization_id=org_a,
            artist_id="ART-CWA-A",
            name="Core Write Apply Artist A",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_a)

    work_a = db.query(Work).filter(Work.work_id == "WORK-CWA-A").first()
    if not work_a:
        work_a = Work(
            organization_id=org_a,
            work_id="WORK-CWA-A",
            title="Core Write Apply Work A",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_a)

    db.commit()
    db.refresh(artist_a)
    db.refresh(work_a)

    release_a = db.query(Release).filter(Release.release_id == "REL-CWA-A").first()
    if not release_a:
        release_a = Release(
            organization_id=org_a,
            release_id="REL-CWA-A",
            title="Core Write Apply Release A",
            label_id=label.id,
            artist_id=artist_a.id,
        )
        db.add(release_a)

    db.commit()

    track_a = db.query(Track).filter(Track.track_id == "TRK-CWA-A").first()
    if not track_a:
        db.add(
            Track(
                organization_id=org_a,
                track_id="TRK-CWA-A",
                title="Core Write Apply Track A",
                release_id=release_a.id,
                work_id=work_a.id,
            )
        )

    contract_a = db.query(Contract).filter(Contract.contract_number == "CON-CWA-A").first()
    if not contract_a:
        contract_a = Contract(
            contract_number="CON-CWA-A",
            organization_id=org_a,
            title="Core Write Apply Contract A",
            status="Active",
            territory="US",
        )
        db.add(contract_a)

    db.commit()
    db.refresh(contract_a)

    return {
        "org_a": org_a,
        "user_a": user_a,
        "contract_a": contract_a,
        "release_a": release_a,
    }


def core_counts(db):
    return {
        "artists": db.query(Artist).count(),
        "tracks": db.query(Track).count(),
        "works": db.query(Work).count(),
        "releases": db.query(Release).count(),
        "contracts": db.query(Contract).count(),
    }


def ai_counts(db):
    return {
        "proposal_runs": db.query(AICoreWriteProposalRun).count(),
        "proposal_items": db.query(AICoreWriteProposalItem).count(),
        "apply_events": db.query(AICoreWriteApplyEvent).count(),
        "contract_parties": db.query(ContractParty).count(),
        "organizations": db.query(Organization).count(),
        "individuals": db.query(Individual).count(),
    }


def proposal_extract_payload():
    return {
        "contract_title": "Core Write Apply Contract",
        "territory": "Worldwide",
        "parties": [
            {"display_name": "Core Write New Org", "role": "Label"},
            {"display_name": "Core Write External Party", "role": "Artist"},
        ],
        "splits": [{"split_type": "MASTER", "party_name": "Core Write External Party", "percent": 100.0}],
        "splits_total": 100.0,
        "works_hints": {
            "artists": ["Core Write Apply Artist A"],
            "tracks": ["Core Write Apply Track A"],
            "releases": ["Core Write Apply Work A"],
        },
        "warnings": [],
        "parser_version": "deterministic_v1",
    }


def create_recent_backup(db, org_id, user_id):
    row = AdminBackupArtifact(
        organization_id=org_id,
        created_by=user_id,
        backup_kind="manual",
        filename=f"core_write_checkpoint_{user_id}.zip",
        file_path=f"/tmp/core_write_checkpoint_{user_id}.zip",
        size_bytes=123,
        sha256=(f"{user_id:064x}"[-64:]),
        created_at=datetime.now(timezone.utc) - timedelta(minutes=2),
    )
    db.add(row)
    db.commit()


def create_stale_backup(db, org_id, user_id):
    row = AdminBackupArtifact(
        organization_id=org_id,
        created_by=user_id,
        backup_kind="manual",
        filename=f"core_write_stale_{user_id}.zip",
        file_path=f"/tmp/core_write_stale_{user_id}.zip",
        size_bytes=123,
        sha256=(f"{(user_id + 1):064x}"[-64:]),
        created_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    db.add(row)
    db.commit()


def test_apply_requires_confirm_and_backup_checkpoint(client, db, monkeypatch):
    seed = seed_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CORE_WRITE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CORE_WRITE_APPLY_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CORE_WRITE_REQUIRE_BACKUP", True)

    propose = client.post(
        "/api/ai/core_write/propose",
        json={
            "contract_id": seed["contract_a"].id,
            "release_id": seed["release_a"].id,
            "contract_extract": proposal_extract_payload(),
        },
    )
    assert propose.status_code == 200
    run_id = propose.json()["run_id"]
    selections = [{"item_id": row["item_id"], "decision": "accept", "overwrite": False} for row in propose.json()["proposals"]]

    no_confirm = client.post(
        "/api/ai/core_write/apply",
        json={"run_id": run_id, "confirm": False, "selections": selections},
    )
    assert no_confirm.status_code == 422

    no_backup = client.post(
        "/api/ai/core_write/apply",
        json={"run_id": run_id, "confirm": True, "selections": selections},
    )
    assert no_backup.status_code == 409


def test_apply_non_overwrite_idempotency_and_allowlisted_writes(client, db, monkeypatch):
    seed = seed_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CORE_WRITE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CORE_WRITE_APPLY_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CORE_WRITE_REQUIRE_BACKUP", True)

    create_stale_backup(db, seed["org_a"], seed["user_a"].id)
    create_recent_backup(db, seed["org_a"], seed["user_a"].id)

    before_core = core_counts(db)
    before_ai = ai_counts(db)

    propose = client.post(
        "/api/ai/core_write/propose",
        json={
            "contract_id": seed["contract_a"].id,
            "release_id": seed["release_a"].id,
            "contract_extract": proposal_extract_payload(),
        },
    )
    assert propose.status_code == 200
    payload = propose.json()
    run_id = payload["run_id"]

    selections = [{"item_id": row["item_id"], "decision": "accept", "overwrite": False} for row in payload["proposals"]]

    first = client.post(
        "/api/ai/core_write/apply",
        json={"run_id": run_id, "confirm": True, "selections": selections},
    )
    assert first.status_code == 200
    first_payload = first.json()
    assert first_payload["status"] == "applied"
    assert first_payload["idempotent_hit"] is False

    refreshed_contract = db.query(Contract).filter(Contract.id == seed["contract_a"].id).first()
    assert refreshed_contract.territory == "US"

    second = client.post(
        "/api/ai/core_write/apply",
        json={"run_id": run_id, "confirm": True, "selections": selections},
    )
    assert second.status_code == 200
    second_payload = second.json()
    assert second_payload["status"] == "skipped"
    assert second_payload["idempotent_hit"] is True

    after_core = core_counts(db)
    after_ai = ai_counts(db)

    assert before_core == after_core
    assert after_ai["apply_events"] == before_ai["apply_events"] + 1
    assert after_ai["contract_parties"] >= before_ai["contract_parties"]
    assert after_ai["organizations"] >= before_ai["organizations"]
    assert after_ai["individuals"] >= before_ai["individuals"]

import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.ai_core_write import AICoreWriteProposalItem, AICoreWriteProposalRun
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


TEST_DB_FILE = "./test_ai_core_write_propose.db"


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
    db.query(AICoreWriteProposalItem).delete()
    db.query(AICoreWriteProposalRun).delete()
    db.commit()

    org_a = uuid.UUID(int=9101)
    org_b = uuid.UUID(int=9102)
    user_a = upsert_user(db, "core_write_propose_a@example.com", org_a)

    label = db.query(Label).filter(Label.label_id == "LBL-CWP-001").first()
    if not label:
        label = Label(label_id="LBL-CWP-001", name="Core Write Propose Label")
        db.add(label)

    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-CWP-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-CWP-001", name="Core Write Propose Publisher")
        db.add(publisher)

    pro = db.query(PRO).filter(PRO.pro_id == "PRO-CWP-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-CWP-001", name="Core Write Propose PRO")
        db.add(pro)

    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist_a = db.query(Artist).filter(Artist.artist_id == "ART-CWP-A").first()
    if not artist_a:
        artist_a = Artist(
            organization_id=org_a,
            artist_id="ART-CWP-A",
            name="Core Write Artist A",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_a)

    artist_b = db.query(Artist).filter(Artist.artist_id == "ART-CWP-B").first()
    if not artist_b:
        artist_b = Artist(
            organization_id=org_b,
            artist_id="ART-CWP-B",
            name="Core Write Artist B ORG_B_CORE_WRITE_PROPOSE_TOKEN",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_b)

    db.commit()
    db.refresh(artist_a)

    work_a = db.query(Work).filter(Work.work_id == "WORK-CWP-A").first()
    if not work_a:
        work_a = Work(
            organization_id=org_a,
            work_id="WORK-CWP-A",
            title="Core Write Work A",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_a)

    work_b = db.query(Work).filter(Work.work_id == "WORK-CWP-B").first()
    if not work_b:
        work_b = Work(
            organization_id=org_b,
            work_id="WORK-CWP-B",
            title="Core Write Work B ORG_B_CORE_WRITE_PROPOSE_TOKEN",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_b)

    db.commit()
    db.refresh(work_a)

    release_a = db.query(Release).filter(Release.release_id == "REL-CWP-A").first()
    if not release_a:
        release_a = Release(
            organization_id=org_a,
            release_id="REL-CWP-A",
            title="Core Write Release A",
            label_id=label.id,
            artist_id=artist_a.id,
        )
        db.add(release_a)

    release_b = db.query(Release).filter(Release.release_id == "REL-CWP-B").first()
    if not release_b:
        release_b = Release(
            organization_id=org_b,
            release_id="REL-CWP-B",
            title="Core Write Release B ORG_B_CORE_WRITE_PROPOSE_TOKEN",
            label_id=label.id,
            artist_id=artist_b.id,
        )
        db.add(release_b)

    db.commit()

    track_a = db.query(Track).filter(Track.track_id == "TRK-CWP-A").first()
    if not track_a:
        db.add(
            Track(
                organization_id=org_a,
                track_id="TRK-CWP-A",
                title="Core Write Track A",
                release_id=release_a.id,
                work_id=work_a.id,
            )
        )

    if not db.query(Organization).filter(Organization.name == "Core Write Org A").first():
        db.add(Organization(organization_id=org_a, name="Core Write Org A", org_type="Label"))

    if not db.query(Organization).filter(Organization.name == "Core Write Org B ORG_B_CORE_WRITE_PROPOSE_TOKEN").first():
        db.add(
            Organization(
                organization_id=org_b,
                name="Core Write Org B ORG_B_CORE_WRITE_PROPOSE_TOKEN",
                org_type="Label",
            )
        )

    if not db.query(Individual).filter(Individual.email == "core.write.a@example.com").first():
        db.add(Individual(organization_id=org_a, first_name="Core", last_name="WriteA", email="core.write.a@example.com"))

    if not db.query(Individual).filter(Individual.email == "core.write.b@example.com").first():
        db.add(
            Individual(
                organization_id=org_b,
                first_name="Core",
                last_name="WriteB ORG_B_CORE_WRITE_PROPOSE_TOKEN",
                email="core.write.b@example.com",
            )
        )

    contract_a = db.query(Contract).filter(Contract.contract_number == "CON-CWP-A").first()
    if not contract_a:
        contract_a = Contract(
            contract_number="CON-CWP-A",
            organization_id=org_a,
            title="Core Write Contract A",
            status="Active",
        )
        db.add(contract_a)

    contract_b = db.query(Contract).filter(Contract.contract_number == "CON-CWP-B").first()
    if not contract_b:
        contract_b = Contract(
            contract_number="CON-CWP-B",
            organization_id=org_b,
            title="Core Write Contract B ORG_B_CORE_WRITE_PROPOSE_TOKEN",
            status="Active",
        )
        db.add(contract_b)

    db.commit()
    db.refresh(contract_a)
    db.refresh(release_a)

    return {"org_a": org_a, "org_b": org_b, "user_a": user_a, "contract_a": contract_a, "release_a": release_a}


def core_counts(db):
    return {
        "artists": db.query(Artist).count(),
        "tracks": db.query(Track).count(),
        "works": db.query(Work).count(),
        "releases": db.query(Release).count(),
        "organizations": db.query(Organization).count(),
        "individuals": db.query(Individual).count(),
        "contracts": db.query(Contract).count(),
    }


def proposal_extract_payload():
    return {
        "contract_title": "Core Write Proposal Contract",
        "territory": "Worldwide",
        "parties": [{"display_name": "Core Write Artist A", "role": "Artist"}],
        "splits": [{"split_type": "MASTER", "party_name": "Core Write Artist A", "percent": 100.0}],
        "splits_total": 100.0,
        "works_hints": {
            "artists": ["Core Write Artist A"],
            "tracks": ["Core Write Track A"],
            "releases": ["Core Write Work A"],
        },
        "warnings": [],
        "parser_version": "deterministic_v1",
    }


def test_propose_enabled_and_non_destructive_and_org_scoped(client, db, monkeypatch):
    seed = seed_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CORE_WRITE_ENABLED", True)

    before_core = core_counts(db)
    before_runs = db.query(AICoreWriteProposalRun).count()
    before_items = db.query(AICoreWriteProposalItem).count()

    response = client.post(
        "/api/ai/core_write/propose",
        json={
            "contract_id": seed["contract_a"].id,
            "release_id": seed["release_a"].id,
            "contract_extract": proposal_extract_payload(),
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["run_id"] > 0
    assert payload["requires_user_review"] is True
    assert isinstance(payload["proposals"], list)

    after_core = core_counts(db)
    after_runs = db.query(AICoreWriteProposalRun).count()
    after_items = db.query(AICoreWriteProposalItem).count()

    assert before_core == after_core
    assert after_runs == before_runs + 1
    assert after_items >= before_items

    serialized = str(payload)
    assert "ORG_B_CORE_WRITE_PROPOSE_TOKEN" not in serialized


def test_propose_disabled_returns_404(client, db, monkeypatch):
    seed = seed_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CORE_WRITE_ENABLED", False)

    response = client.post(
        "/api/ai/core_write/propose",
        json={"contract_id": seed["contract_a"].id, "contract_extract": proposal_extract_payload()},
    )
    assert response.status_code == 404

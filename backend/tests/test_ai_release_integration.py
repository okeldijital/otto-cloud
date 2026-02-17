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


TEST_DB_FILE = "./test_ai_release_integration.db"


@pytest.fixture(scope="module")
def engine():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

    db_url = f"sqlite:///{TEST_DB_FILE}"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
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
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.organization_id = org_id
    else:
        user = User(
            email=email,
            hashed_password="...",
            full_name=f"User {email}",
            organization_id=org_id,
            role="admin",
            is_active=True,
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


def seed_release_integration_data(db):
    org_a = uuid.UUID(int=9801)
    org_b = uuid.UUID(int=9802)

    user_a = upsert_user(db, "release_integration_a@example.com", org_a)
    _ = upsert_user(db, "release_integration_b@example.com", org_b)

    label = db.query(Label).filter(Label.label_id == "LBL-RIP-001").first()
    if not label:
        label = Label(label_id="LBL-RIP-001", name="RI Plan Label")
        db.add(label)

    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-RIP-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-RIP-001", name="RI Plan Publisher")
        db.add(publisher)

    pro = db.query(PRO).filter(PRO.pro_id == "PRO-RIP-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-RIP-001", name="RI Plan PRO")
        db.add(pro)

    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist_a = db.query(Artist).filter(Artist.artist_id == "ART-RIP-A").first()
    if not artist_a:
        artist_a = Artist(
            organization_id=org_a,
            artist_id="ART-RIP-A",
            name="Shared Artist Name",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_a)

    artist_b = db.query(Artist).filter(Artist.artist_id == "ART-RIP-B").first()
    if not artist_b:
        artist_b = Artist(
            organization_id=org_b,
            artist_id="ART-RIP-B",
            name="Shared Artist Name B ORG TOKEN",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_b)

    work_a = db.query(Work).filter(Work.work_id == "WORK-RIP-A").first()
    if not work_a:
        work_a = Work(
            organization_id=org_a,
            work_id="WORK-RIP-A",
            title="Shared Work Name",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_a)

    work_b = db.query(Work).filter(Work.work_id == "WORK-RIP-B").first()
    if not work_b:
        work_b = Work(
            organization_id=org_b,
            work_id="WORK-RIP-B",
            title="Shared Work Name B ORG TOKEN",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_b)

    db.commit()
    db.refresh(artist_a)
    db.refresh(work_a)

    release_a = db.query(Release).filter(Release.release_id == "REL-RIP-A").first()
    if not release_a:
        release_a = Release(
            organization_id=org_a,
            release_id="REL-RIP-A",
            title="Release Integration Plan A",
            label_id=label.id,
            artist_id=artist_a.id,
        )
        db.add(release_a)

    release_b = db.query(Release).filter(Release.release_id == "REL-RIP-B").first()
    if not release_b:
        release_b = Release(
            organization_id=org_b,
            release_id="REL-RIP-B",
            title="Release Integration Plan B ORG TOKEN",
            label_id=label.id,
            artist_id=artist_b.id if artist_b else None,
        )
        db.add(release_b)

    db.commit()
    db.refresh(release_a)
    db.refresh(release_b)

    track_a = db.query(Track).filter(Track.track_id == "TRK-RIP-A").first()
    if not track_a:
        track_a = Track(
            organization_id=org_a,
            track_id="TRK-RIP-A",
            title="Shared Track Name",
            release_id=release_a.id,
            work_id=work_a.id,
        )
        db.add(track_a)

    track_b = db.query(Track).filter(Track.track_id == "TRK-RIP-B").first()
    if not track_b:
        track_b = Track(
            organization_id=org_b,
            track_id="TRK-RIP-B",
            title="Shared Track Name B ORG TOKEN",
            release_id=release_b.id,
            work_id=work_b.id if work_b else None,
        )
        db.add(track_b)

    org_a_row = db.query(Organization).filter(Organization.name == "RI Org A").first()
    if not org_a_row:
        org_a_row = Organization(organization_id=org_a, name="RI Org A", org_type="Label")
        db.add(org_a_row)

    org_b_row = db.query(Organization).filter(Organization.name == "RI Org B ORG TOKEN").first()
    if not org_b_row:
        org_b_row = Organization(organization_id=org_b, name="RI Org B ORG TOKEN", org_type="Label")
        db.add(org_b_row)

    ind_a = db.query(Individual).filter(Individual.email == "ri.a@example.com").first()
    if not ind_a:
        ind_a = Individual(
            organization_id=org_a,
            first_name="RI",
            last_name="Alpha",
            email="ri.a@example.com",
            role="Manager",
        )
        db.add(ind_a)

    ind_b = db.query(Individual).filter(Individual.email == "ri.b@example.com").first()
    if not ind_b:
        ind_b = Individual(
            organization_id=org_b,
            first_name="RI",
            last_name="Beta ORG TOKEN",
            email="ri.b@example.com",
            role="Manager",
        )
        db.add(ind_b)

    contract = db.query(Contract).filter(Contract.contract_number == "CON-RIP-A").first()
    if not contract:
        contract = Contract(
            contract_number="CON-RIP-A",
            organization_id=org_a,
            title="Contract A",
            status="Active",
        )
        db.add(contract)

    db.commit()

    return {
        "org_a": org_a,
        "org_b": org_b,
        "user_a": user_a,
        "release_a": release_a,
        "release_b": release_b,
    }


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


def sample_extract():
    return {
        "contract_title": "Integration Contract",
        "parties": [
            {"display_name": "Shared Artist Name", "role": "Artist"},
            {"display_name": "RI Org A", "role": "Label"},
        ],
        "splits": [{"split_type": "MASTER", "party_name": "Shared Artist Name", "percent": 100.0}],
        "splits_total": 100.0,
        "works_hints": {
            "artists": ["Shared Artist Name"],
            "tracks": ["Shared Track Name"],
            "releases": ["Shared Work Name"],
        },
        "warnings": [],
        "parser_version": "deterministic_v1",
    }


def test_release_integration_disabled_returns_404_and_health_200(client, db, monkeypatch):
    seeded = seed_release_integration_data(db)
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", False)

    health = client.get("/api/ai/release_integration/health")
    assert health.status_code == 200

    response = client.post(
        "/api/ai/release_integration/plan",
        json={
            "release_id": seeded["release_a"].id,
            "contract_extract": sample_extract(),
            "mode": "readonly",
        },
    )
    assert response.status_code == 404


def test_release_integration_enabled_returns_200(client, db, monkeypatch):
    seeded = seed_release_integration_data(db)
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)

    response = client.post(
        "/api/ai/release_integration/plan",
        json={
            "release_id": seeded["release_a"].id,
            "contract_extract": sample_extract(),
            "mode": "readonly",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["integration_version"] == "release_integration_v1"
    assert payload["org_id"] == str(seeded["org_a"])
    assert payload["release"]["id"] == seeded["release_a"].id


def test_release_integration_org_isolation(client, db, monkeypatch):
    seeded = seed_release_integration_data(db)
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)

    response = client.post(
        "/api/ai/release_integration/plan",
        json={
            "release_id": seeded["release_a"].id,
            "contract_extract": sample_extract(),
            "mode": "readonly",
        },
    )
    assert response.status_code == 200
    payload = response.json()

    org_b_tokens = {"ORG TOKEN", "RI Org B ORG TOKEN", "RI Beta ORG TOKEN"}

    action_ids = {str(item["candidate_id"]) for item in payload["suggested_actions"]}
    org_b_entity_ids = {
        str(item.id)
        for item in db.query(Artist).filter(Artist.organization_id == seeded["org_b"]).all()
    } | {
        str(item.id)
        for item in db.query(Track).filter(Track.organization_id == seeded["org_b"]).all()
    } | {
        str(item.id)
        for item in db.query(Work).filter(Work.organization_id == seeded["org_b"]).all()
    } | {
        str(item.id)
        for item in db.query(Organization).filter(Organization.organization_id == seeded["org_b"]).all()
    } | {
        str(item.id)
        for item in db.query(Individual).filter(Individual.organization_id == seeded["org_b"]).all()
    }

    assert action_ids.isdisjoint(org_b_entity_ids)

    response_blob = str(payload)
    for token in org_b_tokens:
        assert token not in response_blob


def test_release_integration_non_destructive(client, db, monkeypatch):
    seeded = seed_release_integration_data(db)
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)

    before = core_counts(db)
    response = client.post(
        "/api/ai/release_integration/plan",
        json={
            "release_id": seeded["release_a"].id,
            "contract_extract": sample_extract(),
            "mode": "readonly",
        },
    )
    after = core_counts(db)

    assert response.status_code == 200
    assert before == after

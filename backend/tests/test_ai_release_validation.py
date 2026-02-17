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
from models.contract import Contract, ContractAsset, ContractParty, ContractSplit, ContractSplitGroup
from models.label import Label
from models.network import Individual, Organization
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work


TEST_DB_FILE = "./test_ai_release_validation.db"


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


def seed_release_validation_data(db):
    org_a = uuid.UUID(int=9401)
    org_b = uuid.UUID(int=9402)
    user_a = upsert_user(db, "release_validation_a@example.com", org_a)
    user_b = upsert_user(db, "release_validation_b@example.com", org_b)

    label = db.query(Label).filter(Label.label_id == "LBL-RV-001").first()
    if not label:
        label = Label(label_id="LBL-RV-001", name="Release Validation Label")
        db.add(label)

    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-RV-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-RV-001", name="Release Validation Publisher")
        db.add(publisher)

    pro = db.query(PRO).filter(PRO.pro_id == "PRO-RV-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-RV-001", name="Release Validation PRO")
        db.add(pro)

    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist_a = db.query(Artist).filter(Artist.artist_id == "ART-RV-001").first()
    if not artist_a:
        artist_a = Artist(
            organization_id=org_a,
            artist_id="ART-RV-001",
            name="Release Validation Artist A",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_a)

    artist_b = db.query(Artist).filter(Artist.artist_id == "ART-RV-002").first()
    if not artist_b:
        artist_b = Artist(
            organization_id=org_b,
            artist_id="ART-RV-002",
            name="Release Validation Artist B",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_b)

    org_row = db.query(Organization).filter(Organization.name == "RV Org A").first()
    if not org_row:
        org_row = Organization(organization_id=org_a, name="RV Org A", org_type="Label")
        db.add(org_row)

    ind_row = db.query(Individual).filter(Individual.email == "rv.individual.a@example.com").first()
    if not ind_row:
        ind_row = Individual(
            organization_id=org_a,
            first_name="RV",
            last_name="Individual",
            email="rv.individual.a@example.com",
            role="Manager",
        )
        db.add(ind_row)

    db.commit()
    db.refresh(artist_a)
    db.refresh(artist_b)

    work_a = db.query(Work).filter(Work.work_id == "WORK-RV-001").first()
    if not work_a:
        work_a = Work(
            organization_id=org_a,
            work_id="WORK-RV-001",
            title="Release Validation Work A",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_a)

    work_b = db.query(Work).filter(Work.work_id == "WORK-RV-002").first()
    if not work_b:
        work_b = Work(
            organization_id=org_b,
            work_id="WORK-RV-002",
            title="Release Validation Work B",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_b)

    db.commit()
    db.refresh(work_a)
    db.refresh(work_b)

    release_a = db.query(Release).filter(Release.release_id == "REL-RV-001").first()
    if not release_a:
        release_a = Release(
            organization_id=org_a,
            release_id="REL-RV-001",
            title="Release Validation Release A",
            label_id=label.id,
            artist_id=artist_a.id,
        )
        db.add(release_a)

    release_b = db.query(Release).filter(Release.release_id == "REL-RV-002").first()
    if not release_b:
        release_b = Release(
            organization_id=org_b,
            release_id="REL-RV-002",
            title="Release Validation Release B",
            label_id=label.id,
            artist_id=artist_b.id,
        )
        db.add(release_b)

    db.commit()
    db.refresh(release_a)
    db.refresh(release_b)

    track_a = db.query(Track).filter(Track.track_id == "TRK-RV-001").first()
    if not track_a:
        track_a = Track(
            organization_id=org_a,
            track_id="TRK-RV-001",
            title="Release Validation Track A",
            release_id=release_a.id,
            work_id=work_a.id,
        )
        db.add(track_a)

    track_b = db.query(Track).filter(Track.track_id == "TRK-RV-002").first()
    if not track_b:
        track_b = Track(
            organization_id=org_b,
            track_id="TRK-RV-002",
            title="Release Validation Track B",
            release_id=release_b.id,
            work_id=work_b.id,
        )
        db.add(track_b)

    db.commit()

    contract = db.query(Contract).filter(Contract.contract_number == "RV-CON-001").first()
    if not contract:
        contract = Contract(
            contract_number="RV-CON-001",
            organization_id=org_a,
            title="Release Validation Contract A",
            status="Active",
        )
        db.add(contract)
        db.commit()
        db.refresh(contract)

        db.add(
            ContractParty(
                contract_id=contract.id,
                organization_id=org_a,
                entity_type="Artist",
                entity_id=artist_a.id,
                role="Primary Artist",
                split_percent=100.0,
            )
        )
        db.add(
            ContractAsset(
                contract_id=contract.id,
                organization_id=org_a,
                asset_type="Track",
                asset_id=track_a.id,
            )
        )
        group = ContractSplitGroup(
            contract_id=contract.id,
            organization_id=org_a,
            group_name="Master",
            group_type="Revenue",
        )
        db.add(group)
        db.commit()
        db.refresh(group)
        db.add(
            ContractSplit(
                group_id=group.id,
                organization_id=org_a,
                external_party_name="Release Validation Artist A",
                percent=100.0,
            )
        )
        db.commit()

    return {
        "org_a": org_a,
        "org_b": org_b,
        "user_a": user_a,
        "user_b": user_b,
        "release_a": release_a,
        "release_b": release_b,
        "contract_a": contract,
    }


def core_counts(db):
    return {
        "artists": db.query(Artist).count(),
        "tracks": db.query(Track).count(),
        "works": db.query(Work).count(),
        "releases": db.query(Release).count(),
    }


def test_release_validation_disabled_and_health(client, db, monkeypatch):
    seed = seed_release_validation_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", False)

    health = client.get("/api/ai/release_validation/health")
    assert health.status_code == 200
    assert health.json()["flags"]["AI_RELEASE_VALIDATION_ENABLED"] is False

    response = client.post(
        "/api/ai/release_validation/plan",
        json={"release_id": seed["release_a"].id, "contract_id": seed["contract_a"].id},
    )
    assert response.status_code == 404


def test_release_validation_enabled_returns_plan(client, db, monkeypatch):
    seed = seed_release_validation_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)

    response = client.post(
        "/api/ai/release_validation/plan",
        json={"release_id": seed["release_a"].id, "contract_id": seed["contract_a"].id},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["org_id"] == str(seed["org_a"])
    assert isinstance(payload["validation_plan"]["flags"]["needs_contract_review"], bool)


def test_release_validation_non_destructive(client, db, monkeypatch):
    seed = seed_release_validation_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)

    before = core_counts(db)
    response = client.post(
        "/api/ai/release_validation/plan",
        json={"release_id": seed["release_a"].id, "contract_id": seed["contract_a"].id},
    )
    after = core_counts(db)

    assert response.status_code == 200
    assert before == after


def test_release_validation_org_isolation(client, db, monkeypatch):
    seed = seed_release_validation_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)

    response = client.post(
        "/api/ai/release_validation/plan",
        json={"release_id": seed["release_b"].id},
    )
    assert response.status_code == 404

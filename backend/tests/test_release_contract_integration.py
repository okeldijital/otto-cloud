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
from models.ai import AIContractResolutionRun
from models.artist import Artist
from models.contract_intake_links import ContractIntakeReleaseLink
from models.label import Label
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work


TEST_DB_FILE = "./test_release_integration.db"


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


def ensure_catalog_seed(db, org_id: uuid.UUID):
    label = db.query(Label).filter(Label.label_id == "LBL-RI-001").first()
    if not label:
        label = Label(label_id="LBL-RI-001", name="Release Integration Label")
        db.add(label)

    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-RI-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-RI-001", name="Release Integration Publisher")
        db.add(publisher)

    pro = db.query(PRO).filter(PRO.pro_id == "PRO-RI-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-RI-001", name="Release Integration PRO")
        db.add(pro)

    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist = db.query(Artist).filter(Artist.artist_id == "ART-RI-001").first()
    if not artist:
        artist = Artist(
            organization_id=org_id,
            artist_id="ART-RI-001",
            name="Release Integration Artist",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist)

    work = db.query(Work).filter(Work.work_id == "WORK-RI-001").first()
    if not work:
        work = Work(
            organization_id=org_id,
            work_id="WORK-RI-001",
            title="Release Integration Work",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work)

    release = db.query(Release).filter(Release.release_id == "REL-RI-001").first()
    if not release:
        release = Release(
            organization_id=org_id,
            release_id="REL-RI-001",
            title="Release Integration Release",
            label_id=label.id,
            artist_id=artist.id if artist.id else None,
        )
        db.add(release)
        db.commit()
        db.refresh(artist)
        release.artist_id = artist.id
        db.commit()
        db.refresh(release)
    else:
        db.refresh(release)

    track = db.query(Track).filter(Track.track_id == "TRK-RI-001").first()
    if not track:
        track = Track(
            organization_id=org_id,
            track_id="TRK-RI-001",
            title="Release Integration Track",
            release_id=release.id,
            work_id=work.id,
        )
        db.add(track)

    db.commit()
    return release


def seed_release_integration_entities(db):
    db.query(ContractIntakeReleaseLink).delete()
    db.query(AIContractResolutionRun).delete()
    db.commit()

    org_a = uuid.UUID(int=9201)
    org_b = uuid.UUID(int=9202)
    user_a = upsert_user(db, "release_int_a@example.com", org_a)
    user_b = upsert_user(db, "release_int_b@example.com", org_b)

    release_a = ensure_catalog_seed(db, org_a)

    release_b = db.query(Release).filter(Release.release_id == "REL-RI-ORG-B").first()
    if not release_b:
        release_b = Release(
            organization_id=org_b,
            release_id="REL-RI-ORG-B",
            title="Release Integration Release Org B",
        )
        db.add(release_b)
        db.commit()
        db.refresh(release_b)

    run_a = AIContractResolutionRun(
        organization_id=org_a,
        user_id=user_a.id,
        contract_hash="release_integration_hash_a",
        extractor_version="ext_v1",
        linker_version="link_v1",
    )
    run_b = AIContractResolutionRun(
        organization_id=org_b,
        user_id=user_b.id,
        contract_hash="release_integration_hash_b",
        extractor_version="ext_v1",
        linker_version="link_v1",
    )
    db.add_all([run_a, run_b])
    db.commit()
    db.refresh(run_a)
    db.refresh(run_b)

    return {
        "org_a": org_a,
        "org_b": org_b,
        "user_a": user_a,
        "user_b": user_b,
        "release_a": release_a,
        "release_b": release_b,
        "run_a": run_a,
        "run_b": run_b,
    }


def core_counts(db):
    return {
        "artists": db.query(Artist).count(),
        "tracks": db.query(Track).count(),
        "works": db.query(Work).count(),
        "releases": db.query(Release).count(),
    }


def test_release_integration_disabled_returns_404(client, db, monkeypatch):
    seeded = seed_release_integration_entities(db)
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_RESOLVE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ENABLED", False)

    response = client.post(
        "/api/ai/release-integration/attach",
        json={"run_id": seeded["run_a"].id, "release_id": seeded["release_a"].id},
    )
    assert response.status_code == 404


def test_release_integration_enabled_returns_200(client, db, monkeypatch):
    seeded = seed_release_integration_entities(db)
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_RESOLVE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ENABLED", True)

    response = client.post(
        "/api/ai/release-integration/attach",
        json={"run_id": seeded["run_a"].id, "release_id": seeded["release_a"].id},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "attached"
    assert payload["org_id"] == str(seeded["org_a"])
    assert payload["run_id"] == seeded["run_a"].id
    assert payload["release_id"] == seeded["release_a"].id
    assert db.query(ContractIntakeReleaseLink).count() == 1

    get_response = client.get("/api/ai/release-integration/attach")
    assert get_response.status_code == 404


def test_org_a_cannot_attach_to_org_b_release(client, db, monkeypatch):
    seeded = seed_release_integration_entities(db)
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_RESOLVE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ENABLED", True)

    response = client.post(
        "/api/ai/release-integration/attach",
        json={"run_id": seeded["run_a"].id, "release_id": seeded["release_b"].id},
    )
    assert response.status_code == 404
    assert db.query(ContractIntakeReleaseLink).count() == 0


def test_release_integration_does_not_mutate_core_tables(client, db, monkeypatch):
    seeded = seed_release_integration_entities(db)
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_RESOLVE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ENABLED", True)

    before = core_counts(db)
    response = client.post(
        "/api/ai/release-integration/attach",
        json={"run_id": seeded["run_a"].id, "release_id": seeded["release_a"].id},
    )
    after = core_counts(db)

    assert response.status_code == 200
    assert before == after

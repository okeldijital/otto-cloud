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
from models.ai_royalty import AIRoyaltySimulationRun
from models.artist import Artist
from models.contract_documents import AIContractDocument, AIContractWorkLink
from models.label import Label
from models.network import Individual, Organization
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.release_integration import AIReleaseIntegrationLink, AIReleaseIntegrationRun
from models.track import Track
from models.user import User
from models.work import Work


TEST_DB_FILE = "./test_ai_royalty.db"


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


def seed_royalty_data(db):
    db.query(AIRoyaltySimulationRun).delete()
    db.query(AIContractWorkLink).delete()
    db.query(AIContractDocument).delete()
    db.query(AIReleaseIntegrationLink).delete()
    db.query(AIReleaseIntegrationRun).delete()
    db.commit()

    org_a = uuid.UUID(int=9931)
    org_b = uuid.UUID(int=9932)
    user_a = upsert_user(db, "royalty_a@example.com", org_a)

    label = db.query(Label).filter(Label.label_id == "LBL-RY-001").first()
    if not label:
        label = Label(label_id="LBL-RY-001", name="Royalty Label")
        db.add(label)
    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-RY-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-RY-001", name="Royalty Publisher")
        db.add(publisher)
    pro = db.query(PRO).filter(PRO.pro_id == "PRO-RY-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-RY-001", name="Royalty PRO")
        db.add(pro)
    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist_a = db.query(Artist).filter(Artist.artist_id == "ART-RY-A").first()
    if not artist_a:
        artist_a = Artist(
            organization_id=org_a,
            artist_id="ART-RY-A",
            name="Royalty Artist A",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_a)

    artist_b = db.query(Artist).filter(Artist.artist_id == "ART-RY-B").first()
    if not artist_b:
        artist_b = Artist(
            organization_id=org_b,
            artist_id="ART-RY-B",
            name="Royalty Artist B ORG_B_ROYALTY_TOKEN",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_b)
    db.commit()
    db.refresh(artist_a)

    work_a = db.query(Work).filter(Work.work_id == "WORK-RY-A").first()
    if not work_a:
        work_a = Work(
            organization_id=org_a,
            work_id="WORK-RY-A",
            title="Royalty Work A",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_a)

    work_b = db.query(Work).filter(Work.work_id == "WORK-RY-B").first()
    if not work_b:
        work_b = Work(
            organization_id=org_b,
            work_id="WORK-RY-B",
            title="Royalty Work B ORG_B_ROYALTY_TOKEN",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_b)
    db.commit()
    db.refresh(work_a)

    release_a = db.query(Release).filter(Release.release_id == "REL-RY-A").first()
    if not release_a:
        release_a = Release(
            organization_id=org_a,
            release_id="REL-RY-A",
            title="Royalty Release A",
            label_id=label.id,
            artist_id=artist_a.id,
        )
        db.add(release_a)

    release_b = db.query(Release).filter(Release.release_id == "REL-RY-B").first()
    if not release_b:
        release_b = Release(
            organization_id=org_b,
            release_id="REL-RY-B",
            title="Royalty Release B ORG_B_ROYALTY_TOKEN",
            label_id=label.id,
            artist_id=artist_b.id,
        )
        db.add(release_b)

    db.commit()
    db.refresh(release_a)
    db.refresh(release_b)

    if not db.query(Track).filter(Track.track_id == "TRK-RY-A").first():
        db.add(
            Track(
                organization_id=org_a,
                track_id="TRK-RY-A",
                title="Royalty Track A",
                release_id=release_a.id,
                work_id=work_a.id,
            )
        )
    if not db.query(Track).filter(Track.track_id == "TRK-RY-B").first():
        db.add(
            Track(
                organization_id=org_b,
                track_id="TRK-RY-B",
                title="Royalty Track B ORG_B_ROYALTY_TOKEN",
                release_id=release_b.id,
                work_id=work_b.id,
            )
        )

    if not db.query(Organization).filter(Organization.name == "Royalty Org A").first():
        db.add(Organization(organization_id=org_a, name="Royalty Org A", org_type="Label"))
    if not db.query(Organization).filter(Organization.name == "Royalty Org B ORG_B_ROYALTY_TOKEN").first():
        db.add(Organization(organization_id=org_b, name="Royalty Org B ORG_B_ROYALTY_TOKEN", org_type="Label"))

    if not db.query(Individual).filter(Individual.email == "royalty.a@example.com").first():
        db.add(Individual(organization_id=org_a, first_name="Royalty", last_name="A", email="royalty.a@example.com"))
    if not db.query(Individual).filter(Individual.email == "royalty.b@example.com").first():
        db.add(Individual(organization_id=org_b, first_name="Royalty", last_name="B ORG_B_ROYALTY_TOKEN", email="royalty.b@example.com"))

    db.commit()

    run = AIReleaseIntegrationRun(
        organization_id=org_a,
        user_id=user_a.id,
        release_id=release_a.id,
        request_hash="royalty_seed_hash",
        planner_version="release_integration_v1",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    db.add(
        AIReleaseIntegrationLink(
            organization_id=org_a,
            run_id=run.id,
            entity_type="artist",
            entity_id=artist_a.id,
            display_name=artist_a.name,
            action="attach",
            confidence=1.0,
            match_strategy="exact",
        )
    )
    db.add(
        AIReleaseIntegrationLink(
            organization_id=org_a,
            run_id=run.id,
            entity_type="work",
            entity_id=work_a.id,
            display_name=work_a.title,
            action="attach",
            confidence=0.9,
            match_strategy="normalized",
        )
    )

    doc = AIContractDocument(
        organization_id=org_a,
        release_id=release_a.id,
        file_path="/tmp/royalty_seed.pdf",
        file_hash="deadbeef" * 8,
        uploaded_by=user_a.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    db.add(
        AIContractWorkLink(
            organization_id=org_a,
            contract_document_id=doc.id,
            work_id=work_a.id,
            confidence=0.91,
            match_strategy="normalized",
        )
    )
    db.commit()

    return {
        "org_a": org_a,
        "org_b": org_b,
        "user_a": user_a,
        "release_a": release_a,
        "release_b": release_b,
        "contract_document_a": doc,
    }


def core_counts(db):
    return {
        "artists": db.query(Artist).count(),
        "tracks": db.query(Track).count(),
        "works": db.query(Work).count(),
        "releases": db.query(Release).count(),
    }


def core_checksum(db):
    artists = [f"{x.id}:{x.name}" for x in db.query(Artist).order_by(Artist.id.asc()).all()]
    tracks = [f"{x.id}:{x.title}:{x.isrc_code or ''}" for x in db.query(Track).order_by(Track.id.asc()).all()]
    works = [f"{x.id}:{x.title}" for x in db.query(Work).order_by(Work.id.asc()).all()]
    releases = [f"{x.id}:{x.title}" for x in db.query(Release).order_by(Release.id.asc()).all()]
    return "|".join(artists + tracks + works + releases)


def test_royalty_disabled_gate_behavior(client, db, monkeypatch):
    seed = seed_royalty_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_ENABLED", False)

    health = client.get("/api/ai/royalty/health")
    assert health.status_code == 200

    response = client.post("/api/ai/royalty/simulate", json={"release_id": seed["release_a"].id})
    assert response.status_code == 404


def test_royalty_enabled_simulate_returns_200(client, db, monkeypatch):
    seed = seed_royalty_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_PERSIST_ENABLED", False)

    response = client.post(
        "/api/ai/royalty/simulate",
        json={
            "release_id": seed["release_a"].id,
            "contract_document_id": seed["contract_document_a"].id,
            "mode": "simulate",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["royalty_version"] == "royalty_sim_v1_deterministic"
    assert "integrity" in payload
    assert "splits_total" in payload


def test_royalty_org_isolation_and_no_leakage(client, db, monkeypatch):
    seed = seed_royalty_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_PERSIST_ENABLED", False)

    response = client.post("/api/ai/royalty/simulate", json={"release_id": seed["release_b"].id})
    assert response.status_code == 404

    ok_response = client.post("/api/ai/royalty/simulate", json={"release_id": seed["release_a"].id})
    assert ok_response.status_code == 200
    blob = str(ok_response.json())
    assert "ORG_B_ROYALTY_TOKEN" not in blob


def test_royalty_non_destructive_and_persistence_only_ai_table(client, db, monkeypatch):
    seed = seed_royalty_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_PERSIST_ENABLED", True)

    before_counts = core_counts(db)
    before_checksum = core_checksum(db)
    before_runs = db.query(AIRoyaltySimulationRun).count()

    response = client.post("/api/ai/royalty/simulate", json={"release_id": seed["release_a"].id})
    assert response.status_code == 200
    payload = response.json()
    assert payload["persisted"] is True
    assert payload["run_id"] is not None

    after_counts = core_counts(db)
    after_checksum = core_checksum(db)
    after_runs = db.query(AIRoyaltySimulationRun).count()

    assert before_counts == after_counts
    assert before_checksum == after_checksum
    assert after_runs == before_runs + 1

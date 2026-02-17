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
from models.contract import Contract
from models.contract_documents import AIContractDocument
from models.label import Label
from models.network import Individual, Organization
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.release_integration import AIReleaseIntegrationLink, AIReleaseIntegrationRun
from models.track import Track
from models.user import User
from models.work import Work

TEST_DB_FILE = "./test_ai_royalty_ui_contract.db"


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
    db.query(AIRoyaltySimulationRun).delete()
    db.query(AIContractDocument).delete()
    db.query(AIReleaseIntegrationLink).delete()
    db.query(AIReleaseIntegrationRun).delete()
    db.commit()

    org_a = uuid.UUID(int=9821)
    org_b = uuid.UUID(int=9822)
    user_a = upsert_user(db, "royalty_ui_a@example.com", org_a)

    label = db.query(Label).filter(Label.label_id == "LBL-RYUI-001").first()
    if not label:
        label = Label(label_id="LBL-RYUI-001", name="Royalty UI Label")
        db.add(label)
    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-RYUI-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-RYUI-001", name="Royalty UI Publisher")
        db.add(publisher)
    pro = db.query(PRO).filter(PRO.pro_id == "PRO-RYUI-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-RYUI-001", name="Royalty UI PRO")
        db.add(pro)
    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist_a = db.query(Artist).filter(Artist.artist_id == "ART-RYUI-A").first()
    if not artist_a:
        artist_a = Artist(
            organization_id=org_a,
            artist_id="ART-RYUI-A",
            name="Royalty UI Artist A",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_a)
    artist_b = db.query(Artist).filter(Artist.artist_id == "ART-RYUI-B").first()
    if not artist_b:
        artist_b = Artist(
            organization_id=org_b,
            artist_id="ART-RYUI-B",
            name="Royalty UI Artist B ORG_B_ROYALTY_UI_TOKEN",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_b)
    db.commit()
    db.refresh(artist_a)
    db.refresh(artist_b)

    work_a = db.query(Work).filter(Work.work_id == "WORK-RYUI-A").first()
    if not work_a:
        work_a = Work(
            organization_id=org_a,
            work_id="WORK-RYUI-A",
            title="Royalty UI Work A",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_a)
    work_b = db.query(Work).filter(Work.work_id == "WORK-RYUI-B").first()
    if not work_b:
        work_b = Work(
            organization_id=org_b,
            work_id="WORK-RYUI-B",
            title="Royalty UI Work B ORG_B_ROYALTY_UI_TOKEN",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_b)
    db.commit()
    db.refresh(work_a)
    db.refresh(work_b)

    release_a = db.query(Release).filter(Release.release_id == "REL-RYUI-A").first()
    if not release_a:
        release_a = Release(
            organization_id=org_a,
            release_id="REL-RYUI-A",
            title="Royalty UI Release A",
            label_id=label.id,
            artist_id=artist_a.id,
        )
        db.add(release_a)
    release_b = db.query(Release).filter(Release.release_id == "REL-RYUI-B").first()
    if not release_b:
        release_b = Release(
            organization_id=org_b,
            release_id="REL-RYUI-B",
            title="Royalty UI Release B ORG_B_ROYALTY_UI_TOKEN",
            label_id=label.id,
            artist_id=artist_b.id,
        )
        db.add(release_b)
    db.commit()
    db.refresh(release_a)
    db.refresh(release_b)

    if not db.query(Track).filter(Track.track_id == "TRK-RYUI-A").first():
        db.add(
            Track(
                organization_id=org_a,
                track_id="TRK-RYUI-A",
                title="Royalty UI Track A",
                release_id=release_a.id,
                work_id=work_a.id,
                isrc_code="ISRC-RYUI-A",
            )
        )
    if not db.query(Track).filter(Track.track_id == "TRK-RYUI-B").first():
        db.add(
            Track(
                organization_id=org_b,
                track_id="TRK-RYUI-B",
                title="Royalty UI Track B ORG_B_ROYALTY_UI_TOKEN",
                release_id=release_b.id,
                work_id=work_b.id,
                isrc_code="ISRC-RYUI-B",
            )
        )

    if not db.query(Organization).filter(Organization.name == "Royalty UI Org A").first():
        db.add(Organization(organization_id=org_a, name="Royalty UI Org A", org_type="Label"))
    if not db.query(Organization).filter(Organization.name == "Royalty UI Org B ORG_B_ROYALTY_UI_TOKEN").first():
        db.add(Organization(organization_id=org_b, name="Royalty UI Org B ORG_B_ROYALTY_UI_TOKEN", org_type="Label"))
    if not db.query(Individual).filter(Individual.email == "royalty.ui.a@example.com").first():
        db.add(Individual(organization_id=org_a, first_name="Royalty", last_name="UIA", email="royalty.ui.a@example.com"))
    if not db.query(Individual).filter(Individual.email == "royalty.ui.b@example.com").first():
        db.add(Individual(organization_id=org_b, first_name="Royalty", last_name="UIB ORG_B_ROYALTY_UI_TOKEN", email="royalty.ui.b@example.com"))
    if not db.query(Contract).filter(Contract.contract_number == "CON-RYUI-A").first():
        db.add(Contract(contract_number="CON-RYUI-A", organization_id=org_a, title="Royalty UI Contract A", status="Active"))
    if not db.query(Contract).filter(Contract.contract_number == "CON-RYUI-B").first():
        db.add(
            Contract(
                contract_number="CON-RYUI-B",
                organization_id=org_b,
                title="Royalty UI Contract B ORG_B_ROYALTY_UI_TOKEN",
                status="Active",
            )
        )
    db.commit()

    run = AIReleaseIntegrationRun(
        organization_id=org_a,
        user_id=user_a.id,
        release_id=release_a.id,
        request_hash="royalty_ui_seed_hash",
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
    db.commit()

    doc = AIContractDocument(
        organization_id=org_a,
        release_id=release_a.id,
        file_path="/tmp/royalty_ui_seed.pdf",
        file_hash="beaded01" * 8,
        uploaded_by=user_a.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {"user_a": user_a, "release_a": release_a, "release_b": release_b, "doc_a": doc}


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


def test_royalty_ui_contract_disabled_and_enabled(client, db, monkeypatch):
    seed = seed_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_ENABLED", False)
    health = client.get("/api/ai/royalty/health")
    assert health.status_code == 200
    disabled = client.post("/api/ai/royalty/simulate", json={"release_id": seed["release_a"].id})
    assert disabled.status_code == 404

    monkeypatch.setattr("config.settings.AI_ROYALTY_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_PERSIST_ENABLED", False)
    enabled = client.post(
        "/api/ai/royalty/simulate",
        json={"release_id": seed["release_a"].id, "contract_document_id": seed["doc_a"].id, "gross_revenue": 1000.0},
    )
    assert enabled.status_code == 200
    payload = enabled.json()
    assert payload["status"] == "ok"
    assert payload["simulation_version"] == "royalty_sim_v1_deterministic"
    assert isinstance(payload["results"], list)


def test_royalty_ui_org_isolation_and_non_destructive(client, db, monkeypatch):
    seed = seed_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_PERSIST_ENABLED", False)

    before = core_counts(db)
    denied = client.post("/api/ai/royalty/simulate", json={"release_id": seed["release_b"].id})
    assert denied.status_code == 404

    ok = client.post("/api/ai/royalty/simulate", json={"release_id": seed["release_a"].id, "gross_revenue": 1234.56})
    assert ok.status_code == 200
    assert "ORG_B_ROYALTY_UI_TOKEN" not in str(ok.json())
    assert before == core_counts(db)


def test_royalty_ui_persistence_toggle_behavior(client, db, monkeypatch):
    seed = seed_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_ROYALTY_ENABLED", True)

    before_runs = db.query(AIRoyaltySimulationRun).count()

    monkeypatch.setattr("config.settings.AI_ROYALTY_PERSIST_ENABLED", False)
    no_persist = client.post("/api/ai/royalty/simulate", json={"release_id": seed["release_a"].id})
    assert no_persist.status_code == 200
    assert no_persist.json()["persisted"] is False
    assert db.query(AIRoyaltySimulationRun).count() == before_runs

    monkeypatch.setattr("config.settings.AI_ROYALTY_PERSIST_ENABLED", True)
    persist = client.post("/api/ai/royalty/simulate", json={"release_id": seed["release_a"].id})
    assert persist.status_code == 200
    body = persist.json()
    assert body["persisted"] is True
    assert body["run_id"] is not None
    assert db.query(AIRoyaltySimulationRun).count() == before_runs + 1

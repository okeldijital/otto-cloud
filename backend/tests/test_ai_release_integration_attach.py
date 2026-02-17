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
from models.release_integration import AIReleaseIntegrationLink, AIReleaseIntegrationRun
from models.track import Track
from models.user import User
from models.work import Work


TEST_DB_FILE = "./test_ai_release_integration_attach.db"


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


def seed_attach_data(db):
    db.query(AIReleaseIntegrationLink).delete()
    db.query(AIReleaseIntegrationRun).delete()
    db.commit()

    org_a = uuid.UUID(int=9951)
    org_b = uuid.UUID(int=9952)

    user_a = upsert_user(db, "attach_a@example.com", org_a)

    label = db.query(Label).filter(Label.label_id == "LBL-RIA-001").first()
    if not label:
        label = Label(label_id="LBL-RIA-001", name="RIA Label")
        db.add(label)

    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-RIA-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-RIA-001", name="RIA Publisher")
        db.add(publisher)

    pro = db.query(PRO).filter(PRO.pro_id == "PRO-RIA-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-RIA-001", name="RIA PRO")
        db.add(pro)

    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist_a = db.query(Artist).filter(Artist.artist_id == "ART-RIA-A").first()
    if not artist_a:
        artist_a = Artist(
            organization_id=org_a,
            artist_id="ART-RIA-A",
            name="Attach Shared Artist",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_a)

    artist_b = db.query(Artist).filter(Artist.artist_id == "ART-RIA-B").first()
    if not artist_b:
        artist_b = Artist(
            organization_id=org_b,
            artist_id="ART-RIA-B",
            name="Attach Shared Artist ORG_B_ATTACH_TOKEN",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_b)

    work_a = db.query(Work).filter(Work.work_id == "WORK-RIA-A").first()
    if not work_a:
        work_a = Work(
            organization_id=org_a,
            work_id="WORK-RIA-A",
            title="Attach Shared Work",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_a)

    work_b = db.query(Work).filter(Work.work_id == "WORK-RIA-B").first()
    if not work_b:
        work_b = Work(
            organization_id=org_b,
            work_id="WORK-RIA-B",
            title="Attach Shared Work ORG_B_ATTACH_TOKEN",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_b)

    db.commit()
    db.refresh(artist_a)
    db.refresh(work_a)

    release_a = db.query(Release).filter(Release.release_id == "REL-RIA-A").first()
    if not release_a:
        release_a = Release(
            organization_id=org_a,
            release_id="REL-RIA-A",
            title="Attach Release A",
            label_id=label.id,
            artist_id=artist_a.id,
        )
        db.add(release_a)

    release_b = db.query(Release).filter(Release.release_id == "REL-RIA-B").first()
    if not release_b:
        release_b = Release(
            organization_id=org_b,
            release_id="REL-RIA-B",
            title="Attach Release B ORG_B_ATTACH_TOKEN",
            label_id=label.id,
            artist_id=artist_b.id,
        )
        db.add(release_b)

    db.commit()
    db.refresh(release_a)
    db.refresh(release_b)

    track_a = db.query(Track).filter(Track.track_id == "TRK-RIA-A").first()
    if not track_a:
        track_a = Track(
            organization_id=org_a,
            track_id="TRK-RIA-A",
            title="Attach Shared Track",
            release_id=release_a.id,
            work_id=work_a.id,
        )
        db.add(track_a)

    track_b = db.query(Track).filter(Track.track_id == "TRK-RIA-B").first()
    if not track_b:
        track_b = Track(
            organization_id=org_b,
            track_id="TRK-RIA-B",
            title="Attach Shared Track ORG_B_ATTACH_TOKEN",
            release_id=release_b.id,
            work_id=work_b.id,
        )
        db.add(track_b)

    org_a_row = db.query(Organization).filter(Organization.name == "Attach Org A").first()
    if not org_a_row:
        db.add(Organization(organization_id=org_a, name="Attach Org A", org_type="Label"))

    org_b_row = db.query(Organization).filter(Organization.name == "Attach Org B ORG_B_ATTACH_TOKEN").first()
    if not org_b_row:
        db.add(Organization(organization_id=org_b, name="Attach Org B ORG_B_ATTACH_TOKEN", org_type="Label"))

    ind_a = db.query(Individual).filter(Individual.email == "attach.a@example.com").first()
    if not ind_a:
        db.add(Individual(organization_id=org_a, first_name="Attach", last_name="Alpha", email="attach.a@example.com"))

    ind_b = db.query(Individual).filter(Individual.email == "attach.b@example.com").first()
    if not ind_b:
        db.add(Individual(organization_id=org_b, first_name="Attach", last_name="Beta ORG_B_ATTACH_TOKEN", email="attach.b@example.com"))

    contract = db.query(Contract).filter(Contract.contract_number == "CON-RIA-A").first()
    if not contract:
        contract = Contract(
            contract_number="CON-RIA-A",
            organization_id=org_a,
            title="Attach Contract A",
            status="Active",
        )
        db.add(contract)

    db.commit()
    db.refresh(contract)

    return {
        "org_a": org_a,
        "org_b": org_b,
        "user_a": user_a,
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
        "organizations": db.query(Organization).count(),
        "individuals": db.query(Individual).count(),
        "contracts": db.query(Contract).count(),
    }


def extract_payload():
    return {
        "contract_title": "Attach Contract",
        "parties": [
            {"display_name": "Attach Shared Artist", "role": "Artist"},
            {"display_name": "Attach Org A", "role": "Label"},
        ],
        "splits": [{"split_type": "MASTER", "party_name": "Attach Shared Artist", "percent": 100.0}],
        "splits_total": 100.0,
        "works_hints": {
            "artists": ["Attach Shared Artist"],
            "tracks": ["Attach Shared Track"],
            "releases": ["Attach Shared Work"],
        },
        "warnings": [],
        "parser_version": "deterministic_v1",
    }


def plan_payload(client, release_id, extract, review_ready=True):
    resp = client.post(
        "/api/ai/release_integration/plan",
        json={"release_id": release_id, "contract_extract": extract, "mode": "readonly"},
    )
    payload = resp.json()
    if review_ready:
        payload["needs_review"] = False
    return resp.status_code, payload


def test_attach_disabled_returns_404(client, db, monkeypatch):
    seed = seed_attach_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED", False)

    _, plan = plan_payload(client, seed["release_a"].id, extract_payload())

    response = client.post(
        "/api/ai/release_integration/attach",
        json={
            "release_id": seed["release_a"].id,
            "wizard_plan": plan,
            "contract_extract": extract_payload(),
            "reviewed_mismatches": True,
        },
    )
    assert response.status_code == 404


def test_attach_enabled_creates_ai_rows_and_not_core_mutation(client, db, monkeypatch):
    seed = seed_attach_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED", True)

    before_core = core_counts(db)
    ai_before = {
        "runs": db.query(AIReleaseIntegrationRun).count(),
        "links": db.query(AIReleaseIntegrationLink).count(),
    }

    plan_status, plan = plan_payload(client, seed["release_a"].id, extract_payload())
    assert plan_status == 200

    response = client.post(
        "/api/ai/release_integration/attach",
        json={
            "release_id": seed["release_a"].id,
            "wizard_plan": plan,
            "contract_extract": extract_payload(),
            "contract_id": seed["contract_a"].id,
            "reviewed_mismatches": True,
        },
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["status"] == "attached"
    assert payload["run_id"] > 0

    after_core = core_counts(db)
    ai_after = {
        "runs": db.query(AIReleaseIntegrationRun).count(),
        "links": db.query(AIReleaseIntegrationLink).count(),
    }

    assert before_core == after_core
    assert ai_after["runs"] > ai_before["runs"]
    assert ai_after["links"] > ai_before["links"]


def test_attach_org_isolation_and_response_leak_check(client, db, monkeypatch):
    seed = seed_attach_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED", True)

    plan_status, _ = plan_payload(client, seed["release_b"].id, extract_payload())
    assert plan_status == 404

    plan_status, plan = plan_payload(client, seed["release_a"].id, extract_payload())
    assert plan_status == 200

    response = client.post(
        "/api/ai/release_integration/attach",
        json={
            "release_id": seed["release_a"].id,
            "wizard_plan": plan,
            "contract_extract": extract_payload(),
            "reviewed_mismatches": True,
        },
    )
    assert response.status_code == 200

    blob = str(response.json())
    assert "ORG_B_ATTACH_TOKEN" not in blob


def test_attach_idempotency_same_payload_no_duplication(client, db, monkeypatch):
    seed = seed_attach_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED", True)

    plan_status, plan = plan_payload(client, seed["release_a"].id, extract_payload())
    assert plan_status == 200

    before_runs = db.query(AIReleaseIntegrationRun).count()
    before_links = db.query(AIReleaseIntegrationLink).count()

    payload = {
        "release_id": seed["release_a"].id,
        "wizard_plan": plan,
        "contract_extract": extract_payload(),
        "reviewed_mismatches": True,
    }

    first = client.post("/api/ai/release_integration/attach", json=payload)
    second = client.post("/api/ai/release_integration/attach", json=payload)

    assert first.status_code == 200
    assert second.status_code == 200

    first_json = first.json()
    second_json = second.json()

    assert first_json["run_id"] == second_json["run_id"]

    after_runs = db.query(AIReleaseIntegrationRun).count()
    after_links = db.query(AIReleaseIntegrationLink).count()

    assert after_runs == before_runs + 1
    assert after_links > before_links
    assert second_json["attached_counts"]["runs_created"] == 0
    assert second_json["attached_counts"]["links_created"] == 0

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


TEST_DB_FILE = "./test_contract_ingest_ui_flow_contract.db"


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


def seed(db):
    db.query(AIContractWorkLink).delete()
    db.query(AIContractDocument).delete()
    db.query(AIReleaseIntegrationLink).delete()
    db.query(AIReleaseIntegrationRun).delete()
    db.commit()

    org_a = uuid.UUID(int=9961)
    org_b = uuid.UUID(int=9962)
    user_a = upsert_user(db, "ui_ingest_a@example.com", org_a)

    label = db.query(Label).filter(Label.label_id == "LBL-UI-ING-001").first()
    if not label:
        label = Label(label_id="LBL-UI-ING-001", name="UI Ingest Label")
        db.add(label)
    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-UI-ING-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-UI-ING-001", name="UI Ingest Publisher")
        db.add(publisher)
    pro = db.query(PRO).filter(PRO.pro_id == "PRO-UI-ING-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-UI-ING-001", name="UI Ingest PRO")
        db.add(pro)
    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist_a = db.query(Artist).filter(Artist.artist_id == "ART-UI-ING-A").first()
    if not artist_a:
        artist_a = Artist(
            organization_id=org_a,
            artist_id="ART-UI-ING-A",
            name="UI Ingest Artist A",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_a)
    artist_b = db.query(Artist).filter(Artist.artist_id == "ART-UI-ING-B").first()
    if not artist_b:
        artist_b = Artist(
            organization_id=org_b,
            artist_id="ART-UI-ING-B",
            name="UI Ingest Artist B ORG_B_UI_INGEST_TOKEN",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_b)
    db.commit()
    db.refresh(artist_a)

    work_a = db.query(Work).filter(Work.work_id == "WORK-UI-ING-A").first()
    if not work_a:
        work_a = Work(
            organization_id=org_a,
            work_id="WORK-UI-ING-A",
            title="UI Ingest Work A",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_a)
    work_b = db.query(Work).filter(Work.work_id == "WORK-UI-ING-B").first()
    if not work_b:
        work_b = Work(
            organization_id=org_b,
            work_id="WORK-UI-ING-B",
            title="UI Ingest Work B ORG_B_UI_INGEST_TOKEN",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_b)
    db.commit()
    db.refresh(work_a)

    release_a = db.query(Release).filter(Release.release_id == "REL-UI-ING-A").first()
    if not release_a:
        release_a = Release(
            organization_id=org_a,
            release_id="REL-UI-ING-A",
            title="UI Ingest Release A",
            label_id=label.id,
            artist_id=artist_a.id,
        )
        db.add(release_a)
    release_b = db.query(Release).filter(Release.release_id == "REL-UI-ING-B").first()
    if not release_b:
        release_b = Release(
            organization_id=org_b,
            release_id="REL-UI-ING-B",
            title="UI Ingest Release B ORG_B_UI_INGEST_TOKEN",
            label_id=label.id,
            artist_id=artist_b.id,
        )
        db.add(release_b)
    db.commit()
    db.refresh(release_a)
    db.refresh(release_b)

    track_a = db.query(Track).filter(Track.track_id == "TRK-UI-ING-A").first()
    if not track_a:
        track_a = Track(
            organization_id=org_a,
            track_id="TRK-UI-ING-A",
            title="UI Ingest Track A",
            release_id=release_a.id,
            work_id=work_a.id,
        )
        db.add(track_a)

    org_a_row = db.query(Organization).filter(Organization.name == "UI Ingest Org A").first()
    if not org_a_row:
        db.add(Organization(organization_id=org_a, name="UI Ingest Org A", org_type="Label"))

    org_b_row = db.query(Organization).filter(Organization.name == "UI Ingest Org B ORG_B_UI_INGEST_TOKEN").first()
    if not org_b_row:
        db.add(Organization(organization_id=org_b, name="UI Ingest Org B ORG_B_UI_INGEST_TOKEN", org_type="Label"))

    ind_a = db.query(Individual).filter(Individual.email == "ui.ingest.a@example.com").first()
    if not ind_a:
        db.add(Individual(organization_id=org_a, first_name="UI", last_name="IngestA", email="ui.ingest.a@example.com"))

    ind_b = db.query(Individual).filter(Individual.email == "ui.ingest.b@example.com").first()
    if not ind_b:
        db.add(Individual(organization_id=org_b, first_name="UI", last_name="IngestB ORG_B_UI_INGEST_TOKEN", email="ui.ingest.b@example.com"))

    db.commit()
    return {"org_a": org_a, "org_b": org_b, "user_a": user_a, "release_a": release_a, "release_b": release_b}


def core_counts(db):
    return {
        "releases": db.query(Release).count(),
        "works": db.query(Work).count(),
        "tracks": db.query(Track).count(),
        "artists": db.query(Artist).count(),
    }


def ai_counts(db):
    return {
        "docs": db.query(AIContractDocument).count(),
        "work_links": db.query(AIContractWorkLink).count(),
        "runs": db.query(AIReleaseIntegrationRun).count(),
        "links": db.query(AIReleaseIntegrationLink).count(),
    }


def plan_extract_payload():
    return {
        "contract_title": "UI Ingest Contract",
        "parties": [{"display_name": "UI Ingest Artist A", "role": "Artist"}],
        "splits": [{"split_type": "MASTER", "party_name": "UI Ingest Artist A", "percent": 100.0}],
        "splits_total": 100.0,
        "works_hints": {"artists": ["UI Ingest Artist A"], "tracks": ["UI Ingest Track A"], "releases": ["UI Ingest Work A"]},
        "warnings": [],
        "parser_version": "deterministic_v1",
    }


def test_ui_contract_flow_plan_to_ingest_idempotent_and_non_destructive(client, db, monkeypatch):
    s = seed(db)
    app.dependency_overrides[get_current_user] = lambda: s["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INGEST_ENABLED", True)

    plan_resp = client.post(
        "/api/ai/release_integration/plan",
        json={"release_id": s["release_a"].id, "contract_extract": plan_extract_payload(), "mode": "readonly"},
    )
    assert plan_resp.status_code == 200

    before_core = core_counts(db)
    before_ai = ai_counts(db)

    pdf = _pdf_bytes("ui flow pdf")
    first = client.post(
        "/api/ai/release_integration/ingest",
        data={"release_id": str(s["release_a"].id)},
        files={"file": ("ui.pdf", pdf, "application/pdf")},
    )
    second = client.post(
        "/api/ai/release_integration/ingest",
        data={"release_id": str(s["release_a"].id)},
        files={"file": ("ui.pdf", pdf, "application/pdf")},
    )

    assert first.status_code == 200
    assert second.status_code == 200

    p1 = first.json()
    p2 = second.json()

    assert p1["contract_document_id"] > 0
    assert p1["run_id"] > 0
    assert p1["idempotent_hit"] is False
    assert p2["idempotent_hit"] is True
    assert p1["run_id"] == p2["run_id"]

    after_core = core_counts(db)
    after_ai = ai_counts(db)

    assert before_core == after_core
    assert after_ai["docs"] == before_ai["docs"] + 1
    assert after_ai["runs"] == before_ai["runs"] + 1


def test_ui_contract_flow_org_isolation(client, db, monkeypatch):
    s = seed(db)
    app.dependency_overrides[get_current_user] = lambda: s["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INGEST_ENABLED", True)

    resp = client.post(
        "/api/ai/release_integration/ingest",
        data={"release_id": str(s["release_b"].id)},
        files={"file": ("ui_b.pdf", _pdf_bytes("org b"), "application/pdf")},
    )
    assert resp.status_code == 404

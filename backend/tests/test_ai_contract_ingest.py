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
from models.contract import Contract
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


TEST_DB_FILE = "./test_ai_contract_ingest.db"


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
def client(db, tmp_path):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _make_pdf_bytes(text: str) -> bytes:
    buf = io.BytesIO()
    pdf = canvas.Canvas(buf)
    pdf.drawString(72, 750, text)
    pdf.showPage()
    pdf.save()
    return buf.getvalue()


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


def seed_ingest_data(db):
    db.query(AIContractWorkLink).delete()
    db.query(AIContractDocument).delete()
    db.query(AIReleaseIntegrationLink).delete()
    db.query(AIReleaseIntegrationRun).delete()
    db.commit()

    org_a = uuid.UUID(int=9981)
    org_b = uuid.UUID(int=9982)
    user_a = upsert_user(db, "ingest_a@example.com", org_a)

    label = db.query(Label).filter(Label.label_id == "LBL-ING-001").first()
    if not label:
        label = Label(label_id="LBL-ING-001", name="Ingest Label")
        db.add(label)

    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-ING-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-ING-001", name="Ingest Publisher")
        db.add(publisher)

    pro = db.query(PRO).filter(PRO.pro_id == "PRO-ING-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-ING-001", name="Ingest PRO")
        db.add(pro)

    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist_a = db.query(Artist).filter(Artist.artist_id == "ART-ING-A").first()
    if not artist_a:
        artist_a = Artist(
            organization_id=org_a,
            artist_id="ART-ING-A",
            name="Ingest Artist A",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_a)

    artist_b = db.query(Artist).filter(Artist.artist_id == "ART-ING-B").first()
    if not artist_b:
        artist_b = Artist(
            organization_id=org_b,
            artist_id="ART-ING-B",
            name="Ingest Artist B ORG_B_INGEST_TOKEN",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_b)

    work_a = db.query(Work).filter(Work.work_id == "WORK-ING-A").first()
    if not work_a:
        work_a = Work(
            organization_id=org_a,
            work_id="WORK-ING-A",
            title="Ingest Work A",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_a)

    work_b = db.query(Work).filter(Work.work_id == "WORK-ING-B").first()
    if not work_b:
        work_b = Work(
            organization_id=org_b,
            work_id="WORK-ING-B",
            title="Ingest Work B ORG_B_INGEST_TOKEN",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_b)

    db.commit()
    db.refresh(artist_a)
    db.refresh(work_a)

    release_a = db.query(Release).filter(Release.release_id == "REL-ING-A").first()
    if not release_a:
        release_a = Release(
            organization_id=org_a,
            release_id="REL-ING-A",
            title="Ingest Release A",
            label_id=label.id,
            artist_id=artist_a.id,
        )
        db.add(release_a)

    release_b = db.query(Release).filter(Release.release_id == "REL-ING-B").first()
    if not release_b:
        release_b = Release(
            organization_id=org_b,
            release_id="REL-ING-B",
            title="Ingest Release B ORG_B_INGEST_TOKEN",
            label_id=label.id,
            artist_id=artist_b.id,
        )
        db.add(release_b)

    db.commit()
    db.refresh(release_a)
    db.refresh(release_b)

    track_a = db.query(Track).filter(Track.track_id == "TRK-ING-A").first()
    if not track_a:
        track_a = Track(
            organization_id=org_a,
            track_id="TRK-ING-A",
            title="Ingest Track A",
            release_id=release_a.id,
            work_id=work_a.id,
        )
        db.add(track_a)

    track_b = db.query(Track).filter(Track.track_id == "TRK-ING-B").first()
    if not track_b:
        track_b = Track(
            organization_id=org_b,
            track_id="TRK-ING-B",
            title="Ingest Track B ORG_B_INGEST_TOKEN",
            release_id=release_b.id,
            work_id=work_b.id,
        )
        db.add(track_b)

    org_a_row = db.query(Organization).filter(Organization.name == "Ingest Org A").first()
    if not org_a_row:
        db.add(Organization(organization_id=org_a, name="Ingest Org A", org_type="Label"))

    org_b_row = db.query(Organization).filter(Organization.name == "Ingest Org B ORG_B_INGEST_TOKEN").first()
    if not org_b_row:
        db.add(Organization(organization_id=org_b, name="Ingest Org B ORG_B_INGEST_TOKEN", org_type="Label"))

    ind_a = db.query(Individual).filter(Individual.email == "ingest.a@example.com").first()
    if not ind_a:
        db.add(Individual(organization_id=org_a, first_name="Ingest", last_name="Alpha", email="ingest.a@example.com"))

    ind_b = db.query(Individual).filter(Individual.email == "ingest.b@example.com").first()
    if not ind_b:
        db.add(Individual(organization_id=org_b, first_name="Ingest", last_name="Beta ORG_B_INGEST_TOKEN", email="ingest.b@example.com"))

    contract = db.query(Contract).filter(Contract.contract_number == "CON-ING-A").first()
    if not contract:
        contract = Contract(
            contract_number="CON-ING-A",
            organization_id=org_a,
            title="Ingest Contract A",
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
        "releases": db.query(Release).count(),
        "works": db.query(Work).count(),
        "tracks": db.query(Track).count(),
        "artists": db.query(Artist).count(),
    }


def ai_counts(db):
    return {
        "ai_contract_documents": db.query(AIContractDocument).count(),
        "ai_contract_work_links": db.query(AIContractWorkLink).count(),
        "ai_release_integration_runs": db.query(AIReleaseIntegrationRun).count(),
        "ai_release_integration_links": db.query(AIReleaseIntegrationLink).count(),
    }


def _ingest_call(client, release_id: int, pdf_bytes: bytes):
    return client.post(
        "/api/ai/release_integration/ingest",
        data={"release_id": str(release_id)},
        files={"file": ("contract.pdf", pdf_bytes, "application/pdf")},
    )


def test_ingest_disabled_returns_404(client, db, monkeypatch):
    seed = seed_ingest_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INGEST_ENABLED", False)

    response = _ingest_call(client, seed["release_a"].id, _make_pdf_bytes("disabled ingest"))
    assert response.status_code == 404


def test_ingest_enabled_200_and_non_destructive(client, db, monkeypatch):
    seed = seed_ingest_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INGEST_ENABLED", True)

    before_core = core_counts(db)
    before_ai = ai_counts(db)

    response = _ingest_call(client, seed["release_a"].id, _make_pdf_bytes("enabled ingest"))

    after_core = core_counts(db)
    after_ai = ai_counts(db)

    assert response.status_code == 200
    payload = response.json()
    assert payload["release_id"] == seed["release_a"].id
    assert payload["contract_document_id"] > 0
    assert payload["run_id"] > 0

    assert before_core == after_core
    assert after_ai["ai_contract_documents"] > before_ai["ai_contract_documents"]
    assert after_ai["ai_release_integration_runs"] > before_ai["ai_release_integration_runs"]
    assert after_ai["ai_release_integration_links"] > before_ai["ai_release_integration_links"]


def test_ingest_org_isolation(client, db, monkeypatch):
    seed = seed_ingest_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INGEST_ENABLED", True)

    response = _ingest_call(client, seed["release_b"].id, _make_pdf_bytes("org b ingest"))
    assert response.status_code == 404


def test_ingest_idempotency_same_pdf_no_duplicate_runs(client, db, monkeypatch):
    seed = seed_ingest_data(db)
    app.dependency_overrides[get_current_user] = lambda: seed["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_INTEGRATION_ATTACH_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INGEST_ENABLED", True)

    pdf_bytes = _make_pdf_bytes("same file ingest")

    before = ai_counts(db)
    first = _ingest_call(client, seed["release_a"].id, pdf_bytes)
    second = _ingest_call(client, seed["release_a"].id, pdf_bytes)
    after = ai_counts(db)

    assert first.status_code == 200
    assert second.status_code == 200

    first_json = first.json()
    second_json = second.json()

    assert first_json["run_id"] == second_json["run_id"]
    assert first_json["contract_document_id"] == second_json["contract_document_id"]

    assert after["ai_contract_documents"] == before["ai_contract_documents"] + 1
    assert after["ai_release_integration_runs"] == before["ai_release_integration_runs"] + 1

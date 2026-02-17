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
from models.label import Label
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.user import User
from models.work import Work
from models.track import Track


TEST_DB_FILE = "./test_ai_contract_intake_wizard_plan.db"


def _make_pdf_bytes(text: str) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(72, 750, text)
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


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


def _upsert_user(db, email: str, org_id: uuid.UUID):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password="...",
            full_name=email,
            organization_id=org_id,
            role="admin",
            is_active=True,
        )
        db.add(user)
    else:
        user.organization_id = org_id
    db.commit()
    db.refresh(user)
    return user


def _seed_release(db, org_id: uuid.UUID, release_code: str, artist_code: str):
    label = db.query(Label).filter(Label.label_id == "LBL-WIZ-001").first()
    if not label:
        label = Label(label_id="LBL-WIZ-001", name="Wizard Label")
        db.add(label)
    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-WIZ-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-WIZ-001", name="Wizard Publisher")
        db.add(publisher)
    pro = db.query(PRO).filter(PRO.pro_id == "PRO-WIZ-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-WIZ-001", name="Wizard PRO")
        db.add(pro)
    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist = db.query(Artist).filter(Artist.artist_id == artist_code).first()
    if not artist:
        artist = Artist(
            organization_id=org_id,
            artist_id=artist_code,
            name=f"Wizard Artist {artist_code}",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist)
    db.commit()
    db.refresh(artist)

    work = db.query(Work).filter(Work.work_id == f"WORK-{release_code}").first()
    if not work:
        work = Work(
            organization_id=org_id,
            work_id=f"WORK-{release_code}",
            title=f"Work {release_code}",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work)
    db.commit()
    db.refresh(work)

    release = db.query(Release).filter(Release.release_id == release_code).first()
    if not release:
        release = Release(
            organization_id=org_id,
            release_id=release_code,
            title=f"Release {release_code}",
            label_id=label.id,
            artist_id=artist.id,
        )
        db.add(release)
    db.commit()
    db.refresh(release)

    track = db.query(Track).filter(Track.track_id == f"TRK-{release_code}").first()
    if not track:
        track = Track(
            organization_id=org_id,
            track_id=f"TRK-{release_code}",
            title=f"Track {release_code}",
            release_id=release.id,
            work_id=work.id,
        )
        db.add(track)
        db.commit()

    return release


def test_wizard_plan_disabled_returns_404(client, db, monkeypatch):
    org_a = uuid.UUID(int=9701)
    user_a = _upsert_user(db, "wizard_a@example.com", org_a)
    release_a = _seed_release(db, org_a, "REL-WIZ-A", "ART-WIZ-A")
    app.dependency_overrides[get_current_user] = lambda: user_a

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", False)

    response = client.post(
        "/api/ai/contracts/intake/wizard_plan",
        data={"release_id": str(release_a.id)},
    )
    assert response.status_code == 404


def test_wizard_plan_enabled_returns_200(client, db, monkeypatch):
    org_a = uuid.UUID(int=9701)
    user_a = _upsert_user(db, "wizard_a@example.com", org_a)
    release_a = _seed_release(db, org_a, "REL-WIZ-A", "ART-WIZ-A")
    app.dependency_overrides[get_current_user] = lambda: user_a

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)

    pdf_bytes = _make_pdf_bytes("Wizard plan PDF body")
    response = client.post(
        "/api/ai/contracts/intake/wizard_plan",
        data={"release_id": str(release_a.id)},
        files={"file": ("wizard.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["release"]["id"] == release_a.id
    assert "suggestions" in payload


def test_wizard_plan_org_isolation(client, db, monkeypatch):
    org_a = uuid.UUID(int=9701)
    org_b = uuid.UUID(int=9702)
    user_a = _upsert_user(db, "wizard_a@example.com", org_a)
    _seed_release(db, org_a, "REL-WIZ-A", "ART-WIZ-A")
    release_b = _seed_release(db, org_b, "REL-WIZ-B", "ART-WIZ-B")
    app.dependency_overrides[get_current_user] = lambda: user_a

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)

    response = client.post(
        "/api/ai/contracts/intake/wizard_plan",
        data={"release_id": str(release_b.id)},
    )
    assert response.status_code == 404

import json
import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.artist import Artist
from models.contract import Contract, ContractDocument
from models.label import Label
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work

TEST_DB_FILE = "./test_contract_create_from_extract.db"


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
def db(engine, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path / "uploads"), raising=False)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
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


def _upsert_user(db, email, org_id):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password="...",
            full_name=email,
            role="admin",
            is_active=True,
            organization_id=org_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.organization_id = org_id
        db.commit()
        db.refresh(user)
    return user


def _seed(db):
    org_a = uuid.UUID(int=9911)
    org_b = uuid.UUID(int=9912)
    user_a = _upsert_user(db, "extract.a@example.com", org_a)
    user_b = _upsert_user(db, "extract.b@example.com", org_b)

    label = db.query(Label).first()
    if not label:
        label = Label(label_id="LBL-CFE", name="CreateFromExtract Label")
        db.add(label)
        db.commit()
        db.refresh(label)

    publisher = db.query(Publisher).first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-CFE", name="CreateFromExtract Publisher")
        db.add(publisher)
        db.commit()
        db.refresh(publisher)

    pro = db.query(PRO).first()
    if not pro:
        pro = PRO(pro_id="PRO-CFE", name="CreateFromExtract PRO")
        db.add(pro)
        db.commit()
        db.refresh(pro)

    if not db.query(Artist).filter(Artist.artist_id == "ART-CFE-A").first():
        db.add(
            Artist(
                organization_id=org_a,
                artist_id="ART-CFE-A",
                name="Extract Artist A",
                label_id=label.id,
                publisher_id=publisher.id,
                pro_id=pro.id,
            )
        )
        db.commit()

    if not db.query(Work).filter(Work.work_id == "WRK-CFE-A").first():
        db.add(
            Work(
                organization_id=org_a,
                work_id="WRK-CFE-A",
                title="Extract Work A",
                publisher_id=publisher.id,
                pro_id=pro.id,
            )
        )
        db.commit()

    artist = db.query(Artist).filter(Artist.artist_id == "ART-CFE-A").first()
    work = db.query(Work).filter(Work.work_id == "WRK-CFE-A").first()
    if not db.query(Release).filter(Release.release_id == "REL-CFE-A").first():
        release = Release(
            organization_id=org_a,
            release_id="REL-CFE-A",
            title="Extract Release A",
            label_id=label.id,
            artist_id=artist.id,
        )
        db.add(release)
        db.commit()
    release = db.query(Release).filter(Release.release_id == "REL-CFE-A").first()

    if not db.query(Track).filter(Track.track_id == "TRK-CFE-A").first():
        db.add(
            Track(
                organization_id=org_a,
                track_id="TRK-CFE-A",
                title="Extract Track A",
                release_id=release.id,
                work_id=work.id,
            )
        )
        db.commit()

    return {"org_a": org_a, "org_b": org_b, "user_a": user_a, "user_b": user_b}


def _set_user(user):
    app.dependency_overrides[get_current_user] = lambda: user


def _core_counts(db):
    return {
        "artists": db.query(Artist).count(),
        "tracks": db.query(Track).count(),
        "works": db.query(Work).count(),
        "releases": db.query(Release).count(),
        "contracts": db.query(Contract).count(),
        "contract_documents": db.query(ContractDocument).count(),
    }


def test_disabled_flags_404_and_ai_health_200(client, db, monkeypatch):
    seeded = _seed(db)
    _set_user(seeded["user_a"])
    monkeypatch.setattr(settings, "AI_CONTRACT_WIZARD_ENABLED", False, raising=False)

    health_res = client.get("/api/ai/health")
    assert health_res.status_code == 200

    payload = {"contract_type": "Remix", "status": "Draft", "confirm_non_destructive": True, "user_overrides": {"title": "x"}}
    res = client.post(
        "/api/contracts/from_extract",
        files={"file": ("x.pdf", b"%PDF-1.4 abc", "application/pdf")},
        data={"payload": json.dumps(payload)},
        headers={"X-Organization-ID": str(seeded["org_a"])},
    )
    assert res.status_code == 404


def test_create_from_extract_and_core_counts(client, db, monkeypatch):
    seeded = _seed(db)
    _set_user(seeded["user_a"])
    monkeypatch.setattr(settings, "AI_CONTRACT_WIZARD_ENABLED", True, raising=False)

    before = _core_counts(db)

    payload = {
        "contract_type": "Remix",
        "status": "Draft",
        "confirm_non_destructive": True,
        "user_overrides": {
            "title": "KAARGO M2KR Remix Agreement",
            "start_date": "2024-03-15",
            "end_date": None,
        },
    }
    res = client.post(
        "/api/contracts/from_extract",
        files={"file": ("KAARGO M2KR Remix Agreement.pdf", b"%PDF-1.4 body", "application/pdf")},
        data={"payload": json.dumps(payload)},
        headers={"X-Organization-ID": str(seeded["org_a"])},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["created"] is True
    assert body["contract"]["id"] > 0
    assert body["contract"]["title"] == "KAARGO M2KR Remix Agreement"
    assert body["contract"]["effective_date"] == "2024-03-15"
    assert body["links"]["documents_created"] == 1

    after = _core_counts(db)
    assert after["artists"] == before["artists"]
    assert after["tracks"] == before["tracks"]
    assert after["works"] == before["works"]
    assert after["releases"] == before["releases"]
    assert after["contracts"] == before["contracts"] + 1
    assert after["contract_documents"] == before["contract_documents"] + 1


def test_org_isolation_for_created_contract(client, db, monkeypatch):
    seeded = _seed(db)
    monkeypatch.setattr(settings, "AI_CONTRACT_WIZARD_ENABLED", True, raising=False)

    _set_user(seeded["user_a"])
    payload = {
        "contract_type": "Recording",
        "status": "Draft",
        "confirm_non_destructive": True,
        "user_overrides": {"title": "Org A Private Contract"},
    }
    create_res = client.post(
        "/api/contracts/from_extract",
        files={"file": ("org_a.pdf", b"%PDF-1.4 orga", "application/pdf")},
        data={"payload": json.dumps(payload)},
        headers={"X-Organization-ID": str(seeded["org_a"])},
    )
    assert create_res.status_code == 200
    contract_id = create_res.json()["contract"]["id"]

    _set_user(seeded["user_b"])
    forbidden = client.get(
        f"/api/contracts/{contract_id}",
        headers={"X-Organization-ID": str(seeded["org_b"])},
    )
    assert forbidden.status_code == 404

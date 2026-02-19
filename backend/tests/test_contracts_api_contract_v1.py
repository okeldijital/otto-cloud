import json
import os
import sys
import uuid
from pathlib import Path

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
from models.contract import Contract, ContractDocument, ContractParty, ContractAsset
from models.contract_track_links import ContractTrackLink
from models.label import Label
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work

TEST_DB_FILE = "./test_contracts_api_contract_v1.db"
FIXTURE = Path(__file__).resolve().parent / "fixtures" / "contracts" / "black_motion_abangoma.pdf"


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
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _seed(db):
    org = uuid.UUID(int=17501)
    user = db.query(User).filter(User.email == "contracts.contract@example.com").first()
    if not user:
        user = User(email="contracts.contract@example.com", hashed_password="x", full_name="C", organization_id=org, role="admin", is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)

    label = db.query(Label).first()
    if not label:
        label = Label(label_id="LBL-CCV1", name="Label CCV1")
        db.add(label)
        db.commit()
        db.refresh(label)

    publisher = db.query(Publisher).first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-CCV1", name="Publisher CCV1")
        db.add(publisher)
        db.commit()
        db.refresh(publisher)

    pro = db.query(PRO).first()
    if not pro:
        pro = PRO(pro_id="PRO-CCV1", name="PRO CCV1")
        db.add(pro)
        db.commit()
        db.refresh(pro)

    artist = db.query(Artist).filter(Artist.artist_id == "ART-CCV1").first()
    if not artist:
        artist = Artist(organization_id=org, artist_id="ART-CCV1", name="Artist CCV1", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
        db.add(artist)
        db.commit()
        db.refresh(artist)

    work = db.query(Work).filter(Work.work_id == "WORK-CCV1").first()
    if not work:
        work = Work(organization_id=org, work_id="WORK-CCV1", title="Work CCV1", publisher_id=publisher.id, pro_id=pro.id)
        db.add(work)
        db.commit()
        db.refresh(work)

    release = db.query(Release).filter(Release.release_id == "REL-CCV1").first()
    if not release:
        release = Release(organization_id=org, release_id="REL-CCV1", title="Release CCV1", artist_id=artist.id, label_id=label.id)
        db.add(release)
        db.commit()
        db.refresh(release)

    track = db.query(Track).filter(Track.track_id == "TRK-CCV1").first()
    if not track:
        track = Track(organization_id=org, track_id="TRK-CCV1", title="Track CCV1", release_id=release.id, work_id=work.id)
        db.add(track)
        db.commit()
        db.refresh(track)

    return {"org": org, "user": user, "track": track}


def _set_user(user):
    app.dependency_overrides[get_current_user] = lambda: user


def test_contracts_list_envelope_and_completeness(client, db):
    seeded = _seed(db)
    _set_user(seeded["user"])

    contract = Contract(contract_number="CTR-CCV1", organization_id=seeded["org"], title="Contract Envelope", status="Draft", created_by=seeded["user"].id)
    db.add(contract)
    db.commit()
    db.refresh(contract)

    db.add(ContractDocument(contract_id=contract.id, organization_id=seeded["org"], file_path="/uploads/c.pdf", file_name="c.pdf", version=1, uploaded_by=seeded["user"].id))
    db.add(ContractAsset(contract_id=contract.id, organization_id=seeded["org"], asset_type="Track", asset_id=seeded["track"].id, scope_type="INCLUSION"))
    db.add(ContractTrackLink(contract_id=contract.id, organization_id=seeded["org"], track_id=seeded["track"].id))
    db.commit()

    res = client.get("/api/contracts", headers={"X-Organization-ID": str(seeded["org"])})
    assert res.status_code == 200
    body = res.json()
    assert "contracts" in body and isinstance(body["contracts"], list)
    assert "counts" in body and isinstance(body["counts"], dict)
    assert "meta" in body and isinstance(body["meta"], dict)
    assert "items" in body and "page" in body  # backward compatibility
    row = next(r for r in body["contracts"] if r["id"] == contract.id)
    assert row["counts"]["documents"] >= 1
    assert row["counts"]["tracks"] >= 1
    assert row["counts"]["parties"] == 0
    assert row["completeness"]["status_quo"] == "red"
    assert "score" in row["completeness"]
    assert "color" in row["completeness"]
    assert "missing" in row["completeness"]
    assert any(r["code"] == "missing_parties" for r in row["completeness"]["reasons"])


def test_extract_bulk_contract(client, db, monkeypatch):
    seeded = _seed(db)
    _set_user(seeded["user"])
    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_INTEL_ENABLED", True, raising=False)

    bad = client.post(
        "/api/ai/contracts/extract_bulk",
        files=[("files", ("x.txt", b"hello", "text/plain"))],
    )
    assert bad.status_code == 422

    if not FIXTURE.exists():
        pytest.skip("fixture missing")

    with open(FIXTURE, "rb") as fh:
        ok = client.post(
            "/api/ai/contracts/extract_bulk",
            files=[("files", ("black_motion_abangoma.pdf", fh.read(), "application/pdf"))],
        )
    assert ok.status_code == 200
    out = ok.json()
    assert out["version"] == "bulk_extract_v1"
    assert out["results"][0]["status"] in {"ok", "error"}


def test_from_extract_idempotency(client, db, monkeypatch):
    seeded = _seed(db)
    _set_user(seeded["user"])
    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_WIZARD_ENABLED", True, raising=False)

    payload = {
        "confirm_non_destructive": True,
        "idempotency_key": "sha256:test-idempotent",
        "track_ids": [seeded["track"].id],
        "extract_version": "v2",
        "extract": {
            "title": "Idempotent Contract",
            "type": "recording",
            "dates": {"effective_date": None, "end_date": None, "end_date_specified": False},
            "key_terms": {"territory": "Worldwide", "governing_law": None, "term_text": "term text"},
        },
    }

    first = client.post(
        "/api/contracts/from_extract",
        files={"file": ("idem.pdf", b"%PDF-1.4 body", "application/pdf")},
        data={"payload": json.dumps(payload)},
        headers={"X-Organization-ID": str(seeded["org"])}
    )
    assert first.status_code == 200
    assert first.json()["created"] is True

    second = client.post(
        "/api/contracts/from_extract",
        files={"file": ("idem.pdf", b"%PDF-1.4 body", "application/pdf")},
        data={"payload": json.dumps(payload)},
        headers={"X-Organization-ID": str(seeded["org"])}
    )
    assert second.status_code == 200
    assert second.json()["created"] is False
    assert second.json().get("idempotent_hit") is True

    modified = dict(payload)
    modified["extract"] = dict(payload["extract"])
    modified["extract"]["title"] = "Different Title"
    conflict = client.post(
        "/api/contracts/from_extract",
        files={"file": ("idem.pdf", b"%PDF-1.4 body", "application/pdf")},
        data={"payload": json.dumps(modified)},
        headers={"X-Organization-ID": str(seeded["org"])}
    )
    assert conflict.status_code == 409

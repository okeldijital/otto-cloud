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
from models.admin_backup import AdminBackupArtifact
from models.artist import Artist
from models.contract import Contract, ContractDocument
from models.contract_wizard import AIContractAttachLink, AIContractAttachRun, AIContractDraft
from models.label import Label
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work

TEST_DB_FILE = "./test_contract_wizard_flow.db"


@pytest.fixture(scope="module")
def engine(tmp_path_factory):
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


def _upsert_user(db, email: str, org_id: uuid.UUID):
    row = db.query(User).filter(User.email == email).first()
    if not row:
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
    else:
        row.organization_id = org_id
        db.commit()
        db.refresh(row)
    return row


def _seed(db):
    org_a = uuid.UUID(int=9801)
    org_b = uuid.UUID(int=9802)

    user_a = _upsert_user(db, "wizard.a@example.com", org_a)
    user_b = _upsert_user(db, "wizard.b@example.com", org_b)

    label = db.query(Label).first()
    if not label:
        label = Label(label_id="LBL-WIZ-1", name="Wizard Label")
        db.add(label)
        db.commit()
        db.refresh(label)

    publisher = db.query(Publisher).first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-WIZ-1", name="Wizard Publisher")
        db.add(publisher)
        db.commit()
        db.refresh(publisher)

    pro = db.query(PRO).first()
    if not pro:
        pro = PRO(pro_id="PRO-WIZ-1", name="Wizard PRO")
        db.add(pro)
        db.commit()
        db.refresh(pro)

    artist_a = db.query(Artist).filter(Artist.artist_id == "ART-WIZ-A").first()
    if not artist_a:
        artist_a = Artist(
            organization_id=org_a,
            artist_id="ART-WIZ-A",
            name="M2KR Records",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_a)
        db.commit()
        db.refresh(artist_a)

    release_a = db.query(Release).filter(Release.release_id == "REL-WIZ-A").first()
    if not release_a:
        release_a = Release(
            organization_id=org_a,
            release_id="REL-WIZ-A",
            title="Wizard Release A",
            label_id=label.id,
            artist_id=artist_a.id,
        )
        db.add(release_a)
        db.commit()
        db.refresh(release_a)

    if not db.query(Work).filter(Work.work_id == "WRK-WIZ-A").first():
        db.add(
            Work(
                organization_id=org_a,
                work_id="WRK-WIZ-A",
                title="Wizard Work A",
                publisher_id=publisher.id,
                pro_id=pro.id,
            )
        )
        db.commit()

    if not db.query(Track).filter(Track.track_id == "TRK-WIZ-A").first():
        work = db.query(Work).filter(Work.work_id == "WRK-WIZ-A").first()
        db.add(
            Track(
                organization_id=org_a,
                track_id="TRK-WIZ-A",
                title="Wizard Track A",
                release_id=release_a.id,
                work_id=work.id if work else None,
            )
        )
        db.commit()

    return {
        "org_a": org_a,
        "org_b": org_b,
        "user_a": user_a,
        "user_b": user_b,
        "release_a": release_a,
    }


def _set_user(org_user):
    app.dependency_overrides[get_current_user] = lambda: org_user


def _core_counts(db):
    return {
        "artists": db.query(Artist).count(),
        "tracks": db.query(Track).count(),
        "works": db.query(Work).count(),
        "releases": db.query(Release).count(),
        "contracts": db.query(Contract).count(),
    }


def test_contract_draft_create_disabled_404(client, db, monkeypatch):
    seeded = _seed(db)
    _set_user(seeded["user_a"])
    monkeypatch.setattr(settings, "AI_CONTRACT_WIZARD_ENABLED", False, raising=False)
    response = client.post(
        "/api/contracts/drafts",
        files={"file": ("test.pdf", b"%PDF-1.4 mock", "application/pdf")},
    )
    assert response.status_code == 404


def test_contract_wizard_flow_create_plan_apply(client, db, monkeypatch):
    seeded = _seed(db)
    _set_user(seeded["user_a"])
    monkeypatch.setattr(settings, "AI_CONTRACT_WIZARD_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_ATTACH_PLAN_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_ATTACH_APPLY_ENABLED", True, raising=False)

    before = _core_counts(db)

    draft_res = client.post(
        "/api/contracts/drafts",
        files={"file": ("wizard.pdf", b"%PDF-1.4 contract body", "application/pdf")},
    )
    assert draft_res.status_code == 200
    draft_id = draft_res.json()["draft_id"]

    assert db.query(AIContractDraft).filter(AIContractDraft.organization_id == seeded["org_a"]).count() >= 1

    create_res = client.post(
        "/api/contracts",
        json={
            "draft_id": draft_id,
            "overrides": {
                "title": "KAARGO M2KR Remix Agreement",
                "contract_date": "2024-03-15",
                "effective_date": "2024-03-15",
                "territory": "Worldwide",
            },
        },
        headers={"X-Organization-ID": str(seeded["org_a"])},
    )
    assert create_res.status_code == 201
    created_payload = create_res.json()
    assert created_payload["status"] == "created"
    contract_id = created_payload["contract_id"]

    plan_res = client.post(
        f"/api/contracts/{contract_id}/attach/plan",
        json={"release_id": seeded["release_a"].id},
    )
    assert plan_res.status_code == 200
    assert "missing_flags" in plan_res.json()

    apply_422 = client.post(
        f"/api/contracts/{contract_id}/attach/apply",
        json={
            "release_id": seeded["release_a"].id,
            "confirm": False,
            "overwrite": {"territory": False},
            "actions": [{"type": "link_release", "release_id": seeded["release_a"].id}],
        },
    )
    assert apply_422.status_code == 422

    monkeypatch.setattr(settings, "AI_ATTACH_REQUIRE_BACKUP", True, raising=False)
    no_backup = client.post(
        f"/api/contracts/{contract_id}/attach/apply",
        json={
            "release_id": seeded["release_a"].id,
            "confirm": True,
            "overwrite": {"territory": False},
            "actions": [{"type": "link_release", "release_id": seeded["release_a"].id}],
        },
    )
    assert no_backup.status_code == 409

    db.add(
        AdminBackupArtifact(
            organization_id=seeded["org_a"],
            created_by=seeded["user_a"].id,
            backup_kind="manual",
            filename="pre_apply.zip",
            file_path="/tmp/pre_apply.zip",
            sha256="abc123",
            size_bytes=1,
        )
    )
    db.commit()

    ok_apply = client.post(
        f"/api/contracts/{contract_id}/attach/apply",
        json={
            "release_id": seeded["release_a"].id,
            "confirm": True,
            "overwrite": {"territory": False},
            "actions": [
                {"type": "link_release", "release_id": seeded["release_a"].id},
                {"type": "ignore_party", "party_display_name": "Kaargo"},
            ],
        },
    )
    assert ok_apply.status_code == 200
    body = ok_apply.json()
    assert body["status"] == "applied"
    assert body["core_mutations"]["core_tables_changed"] is False

    again = client.post(
        f"/api/contracts/{contract_id}/attach/apply",
        json={
            "release_id": seeded["release_a"].id,
            "confirm": True,
            "overwrite": {"territory": False},
            "actions": [
                {"type": "link_release", "release_id": seeded["release_a"].id},
                {"type": "ignore_party", "party_display_name": "Kaargo"},
            ],
        },
    )
    assert again.status_code == 200
    assert again.json()["idempotent_hit"] is True

    after = _core_counts(db)
    assert after["artists"] == before["artists"]
    assert after["tracks"] == before["tracks"]
    assert after["works"] == before["works"]
    assert after["releases"] == before["releases"]
    assert after["contracts"] == before["contracts"] + 1

    assert db.query(ContractDocument).filter(ContractDocument.contract_id == contract_id).count() == 1
    assert db.query(AIContractAttachRun).filter(AIContractAttachRun.organization_id == seeded["org_a"]).count() >= 1
    assert db.query(AIContractAttachLink).filter(AIContractAttachLink.organization_id == seeded["org_a"]).count() >= 1


def test_contract_draft_is_org_scoped(client, db, monkeypatch):
    seeded = _seed(db)
    monkeypatch.setattr(settings, "AI_CONTRACT_WIZARD_ENABLED", True, raising=False)

    _set_user(seeded["user_a"])
    draft_res = client.post(
        "/api/contracts/drafts",
        files={"file": ("scope.pdf", b"%PDF-1.4 scope", "application/pdf")},
    )
    assert draft_res.status_code == 200
    draft_id = draft_res.json()["draft_id"]

    _set_user(seeded["user_b"])
    forbidden = client.get(f"/api/contracts/drafts/{draft_id}")
    assert forbidden.status_code == 404

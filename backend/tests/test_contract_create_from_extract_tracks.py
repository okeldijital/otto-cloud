import json
import os
import sys
import uuid

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
from models.contract_track_links import ContractTrackLink
from models.label import Label
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work

TEST_DB_FILE = "./test_contract_create_from_extract_tracks.db"


def _seed(db):
    org_a = uuid.UUID(int=14201)
    org_b = uuid.UUID(int=14202)

    user_a = User(email="cfe.track.a@example.com", hashed_password="...", full_name="A", organization_id=org_a, role="admin", is_active=True)
    user_b = User(email="cfe.track.b@example.com", hashed_password="...", full_name="B", organization_id=org_b, role="admin", is_active=True)
    db.add_all([user_a, user_b])

    label = Label(label_id="LBL-CFET", name="Label CFET")
    publisher = Publisher(publisher_id="PUB-CFET", name="Publisher CFET")
    pro = PRO(pro_id="PRO-CFET", name="PRO CFET")
    db.add_all([label, publisher, pro])
    db.commit()

    artist = Artist(organization_id=org_a, artist_id="ART-CFET-A", name="Artist CFET A", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    work = Work(organization_id=org_a, work_id="WORK-CFET-A", title="Work CFET A", publisher_id=publisher.id, pro_id=pro.id)
    rel = Release(organization_id=org_a, release_id="REL-CFET-A", title="Release CFET A", artist_id=artist.id, label_id=label.id)
    db.add_all([artist, work, rel])
    db.commit()
    db.refresh(rel)
    db.refresh(work)

    tr1 = Track(organization_id=org_a, track_id="TRK-CFET-A1", title="Track CFET A1", release_id=rel.id, work_id=work.id)
    tr2 = Track(organization_id=org_a, track_id="TRK-CFET-A2", title="Track CFET A2", release_id=rel.id, work_id=work.id)
    trb = Track(organization_id=org_b, track_id="TRK-CFET-B1", title="Track CFET B1")
    db.add_all([tr1, tr2, trb])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)
    db.refresh(tr1)
    db.refresh(tr2)
    db.refresh(trb)

    return {"org_a": org_a, "org_b": org_b, "user_a": user_a, "user_b": user_b, "tr1": tr1, "tr2": tr2, "trb": trb}


def _counts(db):
    return {
        "artists": db.query(Artist).count(),
        "tracks": db.query(Track).count(),
        "works": db.query(Work).count(),
        "releases": db.query(Release).count(),
        "contracts": db.query(Contract).count(),
        "contract_documents": db.query(ContractDocument).count(),
        "contract_track_links": db.query(ContractTrackLink).count(),
    }


def test_create_from_extract_with_tracks_and_confirm_guard(monkeypatch, tmp_path):
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    seeded = _seed(db)

    settings.UPLOAD_DIR = str(tmp_path / "uploads")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr(settings, "AI_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AI_CONTRACT_WIZARD_ENABLED", True, raising=False)

    before = _counts(db)

    with TestClient(app) as client:
        no_confirm = client.post(
            "/api/contracts/from_extract",
            files={"file": ("a.pdf", b"%PDF-1.4 body", "application/pdf")},
            data={"payload": json.dumps({"type": "Remix", "status": "Draft", "title": "No Confirm"})},
            headers={"X-Organization-ID": str(seeded["org_a"])},
        )
        assert no_confirm.status_code == 422

        cross_org = client.post(
            "/api/contracts/from_extract",
            files={"file": ("a.pdf", b"%PDF-1.4 body", "application/pdf")},
            data={
                "payload": json.dumps(
                    {
                        "type": "Remix",
                        "status": "Draft",
                        "title": "Cross Org",
                        "confirm_non_destructive": True,
                        "track_ids": [seeded["trb"].id],
                    }
                )
            },
            headers={"X-Organization-ID": str(seeded["org_a"])},
        )
        assert cross_org.status_code in {403, 404}

        ok = client.post(
            "/api/contracts/from_extract",
            files={"file": ("a.pdf", b"%PDF-1.4 body", "application/pdf")},
            data={
                "payload": json.dumps(
                    {
                        "type": "Remix",
                        "status": "Draft",
                        "title": "Track Linked Contract",
                        "confirm_non_destructive": True,
                        "track_ids": [seeded["tr1"].id, seeded["tr2"].id, seeded["tr2"].id],
                    }
                )
            },
            headers={"X-Organization-ID": str(seeded["org_a"])},
        )

        assert ok.status_code == 200
        body = ok.json()
        assert body["status"] == "ok"
        assert body["created"] is True
        assert body["contract"]["id"] > 0
        assert body["links"]["documents_created"] == 1
        assert body["links"]["tracks_linked"] == 2

    after = _counts(db)
    assert after["artists"] == before["artists"]
    assert after["tracks"] == before["tracks"]
    assert after["works"] == before["works"]
    assert after["releases"] == before["releases"]
    assert after["contracts"] == before["contracts"] + 1
    assert after["contract_documents"] == before["contract_documents"] + 1
    assert after["contract_track_links"] == before["contract_track_links"] + 2

    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

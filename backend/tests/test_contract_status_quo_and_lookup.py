import os
import sys
import uuid
from io import BytesIO
from pathlib import Path

import PyPDF2
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.artist import Artist
from models.contract import Contract, ContractDocument, ContractParty, ContractAsset
from models.label import Label
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work
from config import settings

TEST_DB = "./test_contract_status_quo_lookup.db"


def _pdf_bytes():
    writer = PyPDF2.PdfWriter()
    writer.add_blank_page(width=300, height=200)
    buf = BytesIO()
    writer.write(buf)
    buf.seek(0)
    return buf.read()


def _seed(db):
    org = uuid.UUID(int=16001)
    user = User(email="statusquo@example.com", hashed_password="x", full_name="SQ", organization_id=org, role="admin", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    label = Label(label_id="LBL-SQ", name="Label SQ")
    publisher = Publisher(publisher_id="PUB-SQ", name="Publisher SQ")
    pro = PRO(pro_id="PRO-SQ", name="PRO SQ")
    db.add_all([label, publisher, pro])
    db.commit()

    artist = Artist(organization_id=org, artist_id="ART-SQ", name="Black Motion", label_id=label.id, publisher_id=publisher.id, pro_id=pro.id)
    work = Work(organization_id=org, work_id="WORK-SQ", title="Work SQ", publisher_id=publisher.id, pro_id=pro.id)
    db.add_all([artist, work])
    db.commit()
    db.refresh(artist)
    db.refresh(work)

    rel = Release(organization_id=org, release_id="REL-SQ", title="Release SQ", label_id=label.id, artist_id=artist.id)
    db.add(rel)
    db.commit()
    db.refresh(rel)

    track = Track(organization_id=org, track_id="TRK-SQ", title="Track SQ", release_id=rel.id, work_id=work.id)
    db.add(track)
    db.commit()
    db.refresh(track)

    contract = Contract(contract_number="CTR-SQ-1", organization_id=org, title="Contract SQ", status="Draft", created_by=user.id)
    db.add(contract)
    db.commit()
    db.refresh(contract)

    return {"org": org, "user": user, "artist": artist, "track": track, "contract": contract}


def test_status_quo_red_to_green_and_lookup(monkeypatch, tmp_path):
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    engine = create_engine(f"sqlite:///{TEST_DB}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    seeded = _seed(db)

    settings.UPLOAD_DIR = str(tmp_path / "uploads")
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: seeded["user"]

    with TestClient(app) as client:
        # list: starts RED
        lst = client.get("/api/contracts", headers={"X-Organization-ID": str(seeded["org"])})
        assert lst.status_code == 200
        row = [r for r in (lst.json() or []) if str(r.get("id")) == str(seeded["contract"].id)][0]
        assert row["status_quo"] == "red"
        assert "missing_parties" in row["status_quo_reasons"]
        assert "missing_assets" in row["status_quo_reasons"]

        # party lookup
        lookup = client.get("/api/party_lookup", params={"q": "Black", "types": "artist", "limit": 10}, headers={"X-Organization-ID": str(seeded["org"])})
        assert lookup.status_code == 200
        assert any(r["display_name"] == "Black Motion" for r in lookup.json().get("results", []))

        # add party -> still not green
        p = client.post(
            f"/api/contracts/{seeded['contract'].id}/parties",
            json={"entity_type": "Artist", "entity_id": seeded["artist"].id, "role": "Artist"},
            headers={"X-Organization-ID": str(seeded["org"])}
        )
        assert p.status_code == 200

        # add asset twice (idempotent)
        a1 = client.post(
            f"/api/contracts/{seeded['contract'].id}/assets",
            json={"asset_type": "Track", "asset_id": seeded["track"].id, "scope_type": "INCLUSION"},
            headers={"X-Organization-ID": str(seeded["org"])}
        )
        assert a1.status_code == 200
        assets_after_first = (a1.json().get("counts") or {}).get("assets")

        a2 = client.post(
            f"/api/contracts/{seeded['contract'].id}/assets",
            json={"asset_type": "Track", "asset_id": seeded["track"].id, "scope_type": "INCLUSION"},
            headers={"X-Organization-ID": str(seeded["org"])}
        )
        assert a2.status_code == 200
        assets_after_second = (a2.json().get("counts") or {}).get("assets")
        assert assets_after_first == assets_after_second

        # upload doc -> now GREEN
        d = client.post(
            f"/api/contracts/{seeded['contract'].id}/documents",
            files={"file": ("sq.pdf", _pdf_bytes(), "application/pdf")},
            headers={"X-Organization-ID": str(seeded["org"])}
        )
        assert d.status_code == 200
        detail = client.get(f"/api/contracts/{seeded['contract'].id}", headers={"X-Organization-ID": str(seeded["org"])})
        assert detail.status_code == 200
        status = (detail.json().get("status_quo") or {}).get("status")
        assert status == "GREEN"

    # extra DB idempotency check
    assert db.query(ContractAsset).filter(ContractAsset.contract_id == seeded["contract"].id).count() == 1

    db.close()
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

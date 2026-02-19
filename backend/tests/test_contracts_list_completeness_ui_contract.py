import os
import sys
import uuid
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.contract import Contract, ContractAsset, ContractDocument, ContractParty
from models.contract_track_links import ContractTrackLink
from models.track import Track
from models.user import User

TEST_DB_FILE = "./test_contracts_list_completeness_ui_contract.db"


def _seed(db):
    org = uuid.UUID(int=19101)
    user = User(
        email="contracts.list.ui@example.com",
        hashed_password="x",
        full_name="Contracts UI",
        organization_id=org,
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    track = Track(organization_id=org, track_id="TRK-CLUI-1", title="Contracts UI Track")
    db.add(track)
    db.commit()
    db.refresh(track)

    red = Contract(
        contract_number="CTR-CLUI-RED",
        organization_id=org,
        title="Completeness Red",
        status="Draft",
        type="recording",
        created_by=user.id,
    )
    db.add(red)
    db.commit()
    db.refresh(red)
    db.add(ContractDocument(contract_id=red.id, organization_id=org, file_path="/uploads/red.pdf", file_name="red.pdf", version=1, uploaded_by=user.id))
    db.add(ContractAsset(contract_id=red.id, organization_id=org, asset_type="Track", asset_id=track.id, scope_type="INCLUSION"))
    db.add(ContractTrackLink(contract_id=red.id, organization_id=org, track_id=track.id))

    amber = Contract(
        contract_number="CTR-CLUI-AMBER",
        organization_id=org,
        title="Completeness Amber",
        status="Draft",
        type="recording",
        start_date=None,
        territory=None,
        created_by=user.id,
    )
    db.add(amber)
    db.commit()
    db.refresh(amber)
    db.add(ContractDocument(contract_id=amber.id, organization_id=org, file_path="/uploads/amber.pdf", file_name="amber.pdf", version=1, uploaded_by=user.id))
    db.add(ContractAsset(contract_id=amber.id, organization_id=org, asset_type="Track", asset_id=track.id, scope_type="INCLUSION"))
    db.add(ContractTrackLink(contract_id=amber.id, organization_id=org, track_id=track.id))
    db.add(ContractParty(contract_id=amber.id, organization_id=org, entity_type="External", external_name="Party A", role="Licensor"))

    green = Contract(
        contract_number="CTR-CLUI-GREEN",
        organization_id=org,
        title="Completeness Green",
        status="Draft",
        type="recording",
        start_date=date(2024, 1, 1),
        territory="Worldwide",
        created_by=user.id,
        notes="\n[OTTO_META]{\"term_summary\":\"2 years\"}",
    )
    db.add(green)
    db.commit()
    db.refresh(green)
    db.add(ContractDocument(contract_id=green.id, organization_id=org, file_path="/uploads/green.pdf", file_name="green.pdf", version=1, uploaded_by=user.id))
    db.add(ContractAsset(contract_id=green.id, organization_id=org, asset_type="Track", asset_id=track.id, scope_type="INCLUSION"))
    db.add(ContractTrackLink(contract_id=green.id, organization_id=org, track_id=track.id))
    db.add(ContractParty(contract_id=green.id, organization_id=org, entity_type="External", external_name="Party B", role="Licensor"))
    db.commit()
    return org, user


def test_contracts_list_completeness_colors():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    org, user = _seed(db)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user

    with TestClient(app) as client:
        res = client.get("/api/contracts", headers={"X-Organization-ID": str(org)})
        assert res.status_code == 200
        payload = res.json()
        assert isinstance(payload.get("items"), list)
        assert payload.get("total", 0) >= 3

        by_title = {row["title"]: row for row in payload["items"]}
        red = by_title["Completeness Red"]["completeness"]
        amber = by_title["Completeness Amber"]["completeness"]
        green = by_title["Completeness Green"]["completeness"]

        assert red["color"] == "red"
        assert "missing_parties" in red["missing"]
        assert amber["color"] == "amber"
        assert green["color"] == "green"

    app.dependency_overrides.clear()
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

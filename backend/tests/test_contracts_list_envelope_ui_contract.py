import os
import sys
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_organization_id, get_current_user
from main import app
from models.contract import Contract
from models.user import User

TEST_DB_FILE = "./test_contracts_list_envelope_ui_contract.db"


def test_contracts_list_returns_items_envelope():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    org = uuid.UUID(int=22101)
    user = User(
        email="contracts.envelope.ui@example.com",
        hashed_password="x",
        full_name="Contracts Envelope",
        organization_id=org,
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    contract = Contract(
        contract_number="CTR-ENV-1",
        organization_id=org,
        title="Envelope Contract",
        status="Draft",
        created_by=user.id,
    )
    db.add(contract)
    db.commit()

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_organization_id] = lambda: org

    with TestClient(app) as client:
        res = client.get("/api/contracts")
        assert res.status_code == 200
        payload = res.json()
        assert isinstance(payload.get("items"), list)
        assert isinstance(payload.get("contracts"), list)
        assert payload.get("total", 0) >= 1
        assert any(item.get("id") == contract.id for item in payload["items"])

    app.dependency_overrides.clear()
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

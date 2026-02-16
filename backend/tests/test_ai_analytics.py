import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.ai import AIAuditLog, AIContractResolutionLink, AIContractResolutionRun
from models.user import User


TEST_DB_FILE = "./test_ai_analytics.db"


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


def clear_ai_tables(db):
    db.query(AIContractResolutionLink).delete()
    db.query(AIContractResolutionRun).delete()
    db.query(AIAuditLog).delete()
    db.commit()


def seed_org_data(db, org_a: uuid.UUID, org_b: uuid.UUID):
    clear_ai_tables(db)

    user_a = upsert_user(db, "analytics_a@example.com", org_a)
    user_b = upsert_user(db, "analytics_b@example.com", org_b)

    db.add_all(
        [
            AIAuditLog(
                organization_id=org_a,
                user_id=user_a.id,
                action="contract_extraction",
                tool="pdf_extract",
                request_hash="a" * 64,
                parser_version="v1",
            ),
            AIAuditLog(
                organization_id=org_a,
                user_id=user_a.id,
                action="contract_extraction",
                tool="pdf_extract",
                request_hash="b" * 64,
                parser_version="v1",
            ),
            AIAuditLog(
                organization_id=org_b,
                user_id=user_b.id,
                action="contract_extraction",
                tool="pdf_extract",
                request_hash="c" * 64,
                parser_version="v1",
            ),
        ]
    )
    db.commit()

    run_a_with_link = AIContractResolutionRun(
        organization_id=org_a,
        user_id=user_a.id,
        contract_hash="hash_a_1",
        extractor_version="ext_v1",
        linker_version="link_v1",
    )
    run_a_unresolved = AIContractResolutionRun(
        organization_id=org_a,
        user_id=user_a.id,
        contract_hash="hash_a_2",
        extractor_version="ext_v1",
        linker_version="link_v1",
    )
    run_b_with_link = AIContractResolutionRun(
        organization_id=org_b,
        user_id=user_b.id,
        contract_hash="hash_b_1",
        extractor_version="ext_v1",
        linker_version="link_v1",
    )
    db.add_all([run_a_with_link, run_a_unresolved, run_b_with_link])
    db.commit()
    db.refresh(run_a_with_link)
    db.refresh(run_a_unresolved)
    db.refresh(run_b_with_link)

    db.add_all(
        [
            AIContractResolutionLink(
                run_id=run_a_with_link.id,
                entity_type="party",
                entity_id=None,
                action="link",
                confidence=95,
                rationale="match",
            ),
            AIContractResolutionLink(
                run_id=run_b_with_link.id,
                entity_type="party",
                entity_id=None,
                action="link",
                confidence=90,
                rationale="match",
            ),
        ]
    )
    db.commit()

    return user_a


def ai_table_counts(db):
    return {
        "audit": db.query(AIAuditLog).count(),
        "runs": db.query(AIContractResolutionRun).count(),
        "links": db.query(AIContractResolutionLink).count(),
    }


def test_analytics_summary_disabled_returns_404(client, db, monkeypatch):
    monkeypatch.setattr("config.settings.AI_ENABLED", False)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", False)

    user = upsert_user(db, "analytics_disabled@example.com", uuid.UUID(int=7001))
    app.dependency_overrides[get_current_user] = lambda: user

    response = client.get("/api/ai/analytics/summary")
    assert response.status_code == 404


def test_analytics_enabled_org_scoped_summary_and_contracts(client, db, monkeypatch):
    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)

    org_a = uuid.UUID(int=8001)
    org_b = uuid.UUID(int=8002)
    user_a = seed_org_data(db, org_a, org_b)
    app.dependency_overrides[get_current_user] = lambda: user_a

    summary_response = client.get("/api/ai/analytics/summary")
    assert summary_response.status_code == 200
    summary = summary_response.json()

    assert summary["analytics_version"] == "analytics_v1"
    assert summary["org_id"] == str(org_a)
    assert summary["contracts_processed_count"] == 2
    assert summary["resolution_runs_count"] == 2
    assert summary["links_persisted_count"] == 1
    assert summary["unresolved_count"] == 1

    contracts_response = client.get("/api/ai/analytics/contracts?limit=50")
    assert contracts_response.status_code == 200
    contracts_payload = contracts_response.json()

    assert contracts_payload["org_id"] == str(org_a)
    contracts = contracts_payload["contracts"]
    assert len(contracts) == 2
    assert all(item["contract_id"] is None for item in contracts)
    assert all(item["links_count"] in (0, 1) for item in contracts)
    assert any(item["needs_review"] is True for item in contracts)
    assert any(item["needs_review"] is False for item in contracts)

    org_a_run_ids = {
        row.id
        for row in db.query(AIContractResolutionRun).filter(
            AIContractResolutionRun.organization_id == org_a
        ).all()
    }
    response_run_ids = {item["run_id"] for item in contracts}
    assert response_run_ids == org_a_run_ids


def test_analytics_endpoints_are_read_only(client, db, monkeypatch):
    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)

    org_a = uuid.UUID(int=8101)
    org_b = uuid.UUID(int=8102)
    user_a = seed_org_data(db, org_a, org_b)
    app.dependency_overrides[get_current_user] = lambda: user_a

    before_counts = ai_table_counts(db)

    summary_response = client.get("/api/ai/analytics/summary")
    contracts_response = client.get("/api/ai/analytics/contracts?limit=5")
    assert summary_response.status_code == 200
    assert contracts_response.status_code == 200

    after_counts = ai_table_counts(db)
    assert after_counts == before_counts

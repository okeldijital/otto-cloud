import os
import sys
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.artist import Artist
from models.contract import Contract
from models.label import Label
from models.network import Individual, Organization
from models.pro import PRO
from models.publisher import Publisher
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work


TEST_DB_FILE = "./test_ai_release_mapping_plan.db"


def upsert_user(db, email: str, org_id: uuid.UUID):
    row = db.query(User).filter(User.email == email).first()
    if row:
        row.organization_id = org_id
    else:
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
    return row


def seed(db):
    org_a = uuid.UUID(int=12001)
    org_b = uuid.UUID(int=12002)

    user_a = upsert_user(db, "map_plan_a@example.com", org_a)
    user_b = upsert_user(db, "map_plan_b@example.com", org_b)

    label = db.query(Label).filter(Label.label_id == "LBL-MAP-001").first()
    if not label:
        label = Label(label_id="LBL-MAP-001", name="Map Label")
        db.add(label)

    publisher = db.query(Publisher).filter(Publisher.publisher_id == "PUB-MAP-001").first()
    if not publisher:
        publisher = Publisher(publisher_id="PUB-MAP-001", name="Map Publisher")
        db.add(publisher)

    pro = db.query(PRO).filter(PRO.pro_id == "PRO-MAP-001").first()
    if not pro:
        pro = PRO(pro_id="PRO-MAP-001", name="Map PRO")
        db.add(pro)

    db.commit()
    db.refresh(label)
    db.refresh(publisher)
    db.refresh(pro)

    artist_a = db.query(Artist).filter(Artist.artist_id == "ART-MAP-A").first()
    if not artist_a:
        artist_a = Artist(
            organization_id=org_a,
            artist_id="ART-MAP-A",
            name="Map Artist",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_a)

    artist_b = db.query(Artist).filter(Artist.artist_id == "ART-MAP-B").first()
    if not artist_b:
        artist_b = Artist(
            organization_id=org_b,
            artist_id="ART-MAP-B",
            name="Map Artist ORG_B_TOKEN",
            label_id=label.id,
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(artist_b)

    work_a = db.query(Work).filter(Work.work_id == "WORK-MAP-A").first()
    if not work_a:
        work_a = Work(
            organization_id=org_a,
            work_id="WORK-MAP-A",
            title="Map Work",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_a)

    work_b = db.query(Work).filter(Work.work_id == "WORK-MAP-B").first()
    if not work_b:
        work_b = Work(
            organization_id=org_b,
            work_id="WORK-MAP-B",
            title="Map Work ORG_B_TOKEN",
            publisher_id=publisher.id,
            pro_id=pro.id,
        )
        db.add(work_b)

    db.commit()
    db.refresh(artist_a)
    db.refresh(artist_b)
    db.refresh(work_a)

    release_a = db.query(Release).filter(Release.release_id == "REL-MAP-A").first()
    if not release_a:
        release_a = Release(
            organization_id=org_a,
            release_id="REL-MAP-A",
            title="Map Release A",
            label_id=label.id,
            artist_id=artist_a.id,
        )
        db.add(release_a)

    release_b = db.query(Release).filter(Release.release_id == "REL-MAP-B").first()
    if not release_b:
        release_b = Release(
            organization_id=org_b,
            release_id="REL-MAP-B",
            title="Map Release B ORG_B_TOKEN",
            label_id=label.id,
            artist_id=artist_b.id,
        )
        db.add(release_b)

    db.commit()
    db.refresh(release_a)

    track_a = db.query(Track).filter(Track.track_id == "TRK-MAP-A").first()
    if not track_a:
        track_a = Track(
            organization_id=org_a,
            track_id="TRK-MAP-A",
            title="Map Track",
            release_id=release_a.id,
            work_id=work_a.id,
        )
        db.add(track_a)

    track_b = db.query(Track).filter(Track.track_id == "TRK-MAP-B").first()
    if not track_b:
        track_b = Track(
            organization_id=org_b,
            track_id="TRK-MAP-B",
            title="Map Track ORG_B_TOKEN",
            release_id=release_b.id if release_b else None,
            work_id=work_b.id if work_b else None,
        )
        db.add(track_b)

    org_a_row = db.query(Organization).filter(Organization.name == "Map Org A").first()
    if not org_a_row:
        org_a_row = Organization(organization_id=org_a, name="Map Org A", org_type="Label")
        db.add(org_a_row)

    org_b_row = db.query(Organization).filter(Organization.name == "Map Org B ORG_B_TOKEN").first()
    if not org_b_row:
        org_b_row = Organization(organization_id=org_b, name="Map Org B ORG_B_TOKEN", org_type="Label")
        db.add(org_b_row)

    ind_a = db.query(Individual).filter(Individual.email == "map.a@example.com").first()
    if not ind_a:
        ind_a = Individual(
            organization_id=org_a,
            first_name="Map",
            last_name="Alpha",
            email="map.a@example.com",
            role="Manager",
        )
        db.add(ind_a)

    ind_b = db.query(Individual).filter(Individual.email == "map.b@example.com").first()
    if not ind_b:
        ind_b = Individual(
            organization_id=org_b,
            first_name="Map",
            last_name="Beta ORG_B_TOKEN",
            email="map.b@example.com",
            role="Manager",
        )
        db.add(ind_b)

    contract = db.query(Contract).filter(Contract.contract_number == "CON-MAP-A").first()
    if not contract:
        contract = Contract(
            contract_number="CON-MAP-A",
            organization_id=org_a,
            title="Map Contract A",
            status="Active",
        )
        db.add(contract)

    db.commit()

    return {
        "org_a": org_a,
        "org_b": org_b,
        "user_a": user_a,
        "user_b": user_b,
        "release_a": release_a,
        "release_b": release_b,
    }


def extract_payload_v2():
    return {
        "contract_title": "Map Plan Contract",
        "effective_date": "2024-03-15",
        "expiration_date": None,
        "expiration_label": "no_end_date_specified",
        "parties": [
            {"display_name": "Map Artist", "role": "artist", "confidence": 0.9},
            {"display_name": "Map Org A", "role": "label", "confidence": 0.85},
        ],
        "splits": [
            {"split_type": "MASTER", "party_display_name": "Map Artist", "percent": 30.0, "basis": "net", "notes": "sample"},
            {"split_type": "MASTER", "party_display_name": None, "percent": 70.0, "basis": "net", "notes": "unbound"},
        ],
        "terms": [
            {"term_type": "territory", "text": "Worldwide"},
        ],
        "tracks": [
            {"title": "Map Track", "artist": "Map Artist", "confidence": 0.8},
        ],
        "warnings": [],
        "raw_confidence": 0.75,
        "parser_version": "deterministic_v2",
    }


def extract_payload_v2_org_b():
    return {
        "contract_title": "Map Plan Contract Org B",
        "effective_date": "2024-03-15",
        "expiration_date": None,
        "expiration_label": "no_end_date_specified",
        "parties": [
            {"display_name": "Map Artist ORG_B_TOKEN", "role": "artist", "confidence": 0.9},
            {"display_name": "Map Org B ORG_B_TOKEN", "role": "label", "confidence": 0.85},
        ],
        "splits": [
            {"split_type": "MASTER", "party_display_name": "Map Artist ORG_B_TOKEN", "percent": 50.0, "basis": "net", "notes": "sample"},
            {"split_type": "MASTER", "party_display_name": None, "percent": 50.0, "basis": "net", "notes": "unbound"},
        ],
        "terms": [
            {"term_type": "territory", "text": "Worldwide"},
        ],
        "tracks": [
            {"title": "Map Track ORG_B_TOKEN", "artist": "Map Artist ORG_B_TOKEN", "confidence": 0.8},
        ],
        "warnings": [],
        "raw_confidence": 0.75,
        "parser_version": "deterministic_v2",
    }


def core_counts(db):
    return {
        "artists": db.query(Artist).count(),
        "tracks": db.query(Track).count(),
        "works": db.query(Work).count(),
        "releases": db.query(Release).count(),
        "organizations": db.query(Organization).count(),
        "individuals": db.query(Individual).count(),
        "contracts": db.query(Contract).count(),
    }


def _contains_string_value(payload, target: str) -> bool:
    if isinstance(payload, dict):
        return any(_contains_string_value(v, target) for v in payload.values())
    if isinstance(payload, list):
        return any(_contains_string_value(v, target) for v in payload)
    return isinstance(payload, str) and payload == target


def _client_with_db(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def test_release_mapping_plan_disabled_returns_404_and_health_200(monkeypatch):
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    seeded = seed(db)
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", False)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)

    with _client_with_db(db) as client:
        health = client.get("/api/ai/release_integration/health")
        assert health.status_code == 200

        response = client.post(
            "/api/ai/release_integration/map_plan",
            json={"release_id": seeded["release_a"].id, "extract_v2": extract_payload_v2()},
        )
        assert response.status_code == 404

    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)


def test_release_mapping_plan_enabled_200_org_isolation_and_non_destructive(monkeypatch):
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    seeded = seed(db)
    app.dependency_overrides[get_current_user] = lambda: seeded["user_a"]

    monkeypatch.setattr("config.settings.AI_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTEL_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_CONTRACT_INTAKE_ENABLED", True)
    monkeypatch.setattr("config.settings.AI_RELEASE_VALIDATION_ENABLED", True)

    before = core_counts(db)

    with _client_with_db(db) as client:
        response_a = client.post(
            "/api/ai/release_integration/map_plan",
            json={"release_id": seeded["release_a"].id, "extract_v2": extract_payload_v2()},
        )
        app.dependency_overrides[get_current_user] = lambda: seeded["user_b"]
        response_b = client.post(
            "/api/ai/release_integration/map_plan",
            json={"release_id": seeded["release_b"].id, "extract_v2": extract_payload_v2_org_b()},
        )

    assert response_a.status_code == 200
    payload_a = response_a.json()
    assert payload_a["mapping_version"] == "map_plan_v1"
    assert payload_a["org_id"] == str(seeded["org_a"])
    assert payload_a["release"]["id"] == seeded["release_a"].id

    assert response_b.status_code == 200
    payload_b = response_b.json()
    assert payload_b["mapping_version"] == "map_plan_v1"
    assert payload_b["org_id"] == str(seeded["org_b"])
    assert payload_b["release"]["id"] == seeded["release_b"].id

    # Missing bucket correctness (no swapped types)
    assert "Map Artist" not in (payload_a["missing"]["organizations"] or [])
    assert "Map Org A" not in (payload_a["missing"]["artists"] or [])

    # Bidirectional org isolation (exact value checks avoid substring false positives)
    assert not _contains_string_value(payload_a, "Map Artist ORG_B_TOKEN")
    assert not _contains_string_value(payload_a, "Map Org B ORG_B_TOKEN")
    assert not _contains_string_value(payload_a, "Map Release B ORG_B_TOKEN")
    assert not _contains_string_value(payload_a, "Map Track ORG_B_TOKEN")

    assert not _contains_string_value(payload_b, "Map Artist")
    assert not _contains_string_value(payload_b, "Map Org A")
    assert not _contains_string_value(payload_b, "Map Release A")
    assert not _contains_string_value(payload_b, "Map Track")

    after = core_counts(db)
    assert before == after

    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

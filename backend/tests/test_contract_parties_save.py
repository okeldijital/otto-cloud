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
from models.contract import Contract, ContractParty
from models.network import Organization
from models.release import Release
from models.track import Track
from models.user import User
from models.work import Work
from models.artist import Artist

TEST_DB = './test_contract_parties_save.db'


def _seed(db):
    org_a = uuid.UUID(int=21001)
    org_b = uuid.UUID(int=21002)

    user_a = User(
        email='party.save.a@example.com',
        hashed_password='x',
        full_name='Party Save A',
        organization_id=org_a,
        role='admin',
        is_active=True,
    )
    db.add(user_a)
    db.commit()
    db.refresh(user_a)

    contract_a = Contract(
        contract_number='CTR-PARTY-SAVE-A',
        organization_id=org_a,
        title='Party Save Contract A',
        status='Draft',
        created_by=user_a.id,
    )
    db.add(contract_a)

    org_entity_a = Organization(organization_id=org_a, name='Party Save Org A', org_type='Label')
    org_entity_b = Organization(organization_id=org_b, name='Party Save Org B', org_type='Label')
    db.add_all([org_entity_a, org_entity_b])
    db.commit()
    db.refresh(contract_a)
    db.refresh(org_entity_a)
    db.refresh(org_entity_b)

    return {
        'org_a': org_a,
        'org_b': org_b,
        'user_a': user_a,
        'contract_a': contract_a,
        'org_entity_a': org_entity_a,
        'org_entity_b': org_entity_b,
    }


def _catalog_counts(db):
    return {
        'artists': db.query(Artist).count(),
        'tracks': db.query(Track).count(),
        'works': db.query(Work).count(),
        'releases': db.query(Release).count(),
    }


def test_contract_parties_save_governed():
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

    engine = create_engine(f'sqlite:///{TEST_DB}', connect_args={'check_same_thread': False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    seeded = _seed(db)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: seeded['user_a']

    with TestClient(app) as client:
        before_catalog = _catalog_counts(db)

        # 422 without confirmation
        r_422 = client.post(
            '/api/contracts/parties/save',
            json={
                'contract_id': seeded['contract_a'].id,
                'confirm_non_destructive': False,
                'parties': [
                    {
                        'role': 'Label',
                        'entity_type': 'external',
                        'display_name': 'External Label X',
                    }
                ],
            },
        )
        assert r_422.status_code == 422

        # 404 for cross-org linked entity
        r_404 = client.post(
            '/api/contracts/parties/save',
            json={
                'contract_id': seeded['contract_a'].id,
                'confirm_non_destructive': True,
                'parties': [
                    {
                        'role': 'Label',
                        'entity_type': 'organization',
                        'entity_id': seeded['org_entity_b'].id,
                        'display_name': seeded['org_entity_b'].name,
                    }
                ],
            },
        )
        assert r_404.status_code == 404

        # 200 save success
        r_200 = client.post(
            '/api/contracts/parties/save',
            json={
                'contract_id': seeded['contract_a'].id,
                'confirm_non_destructive': True,
                'parties': [
                    {
                        'role': 'Label',
                        'entity_type': 'organization',
                        'entity_id': seeded['org_entity_a'].id,
                        'display_name': seeded['org_entity_a'].name,
                        'split_percent': 30,
                    },
                    {
                        'role': 'Artist',
                        'entity_type': 'external',
                        'display_name': 'External Artist A',
                        'split_percent': 70,
                    },
                ],
            },
        )
        assert r_200.status_code == 200, r_200.text
        body = r_200.json()
        assert body['status'] == 'ok'
        assert body['parties_saved_count'] > 0

        # idempotent behavior on exact repeats
        r_repeat = client.post(
            '/api/contracts/parties/save',
            json={
                'contract_id': seeded['contract_a'].id,
                'confirm_non_destructive': True,
                'parties': [
                    {
                        'role': 'Label',
                        'entity_type': 'organization',
                        'entity_id': seeded['org_entity_a'].id,
                        'display_name': seeded['org_entity_a'].name,
                        'split_percent': 30,
                    },
                    {
                        'role': 'Artist',
                        'entity_type': 'external',
                        'display_name': 'External Artist A',
                        'split_percent': 70,
                    },
                ],
            },
        )
        assert r_repeat.status_code == 200
        assert r_repeat.json()['parties_saved_count'] == 0

        after_catalog = _catalog_counts(db)
        assert before_catalog == after_catalog

        assert db.query(ContractParty).filter(ContractParty.contract_id == seeded['contract_a'].id).count() == 2

    db.close()
    app.dependency_overrides.clear()
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

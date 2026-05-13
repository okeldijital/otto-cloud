"""fix_users_fk_and_data_integrity

Revision ID: 83b367406e97
Revises: 05e48294ecdc
Create Date: 2026-02-10 12:53:44.117430

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '83b367406e97'
down_revision: Union[str, None] = '05e48294ecdc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    is_pg = bind.dialect.name == 'postgresql'

    # 1. Ensure Default Organization exists (ID=1) to satisfy Foreign Key
    if is_pg:
        op.execute("INSERT INTO organizations (id, name, org_type) VALUES (1, 'System Organization', 'Internal') ON CONFLICT DO NOTHING")
    else:
        op.execute("INSERT OR IGNORE INTO organizations (id, name, org_type) VALUES (1, 'System Organization', 'Internal')")

    # 2. Add Foreign Key constraint to users table (only if not already present, and only on SQLite)
    # On PostgreSQL, organization_id is UUID and organizations.id is integer — incompatible, skip.
    if not is_pg:
        fks = inspector.get_foreign_keys('users')
        if not any(fk.get('name') == 'fk_users_organization_id_organizations' for fk in fks):
            with op.batch_alter_table('users', schema=None) as batch_op:
                batch_op.create_foreign_key(
                    'fk_users_organization_id_organizations',
                    'organizations',
                    ['organization_id'],
                    ['id']
                )


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('fk_users_organization_id_organizations', type_='foreignkey')

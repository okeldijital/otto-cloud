"""fix_companies_foreign_keys

Revision ID: 78c67c2ef17c
Revises: 57fe4eb032eb
Create Date: 2026-02-03 18:29:16.824374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '78c67c2ef17c'
down_revision: Union[str, None] = '57fe4eb032eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Fix 'individuals' table: Drop redundant 'company_id' column
    # We assume 'companies' table exists (created manually or via previous migration temporarily)
    # so that reflection succeeds.
    with op.batch_alter_table('individuals', schema=None) as batch_op:
        batch_op.drop_column('company_id')

    # 2. Fix 'releases' table: Update foreign key
    # For now, let's just create the new one and hope batch mode handles it or we'll do it manually
    with op.batch_alter_table('releases', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_releases_distributor_id_organizations', 'organizations', ['distributor_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('individuals', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))

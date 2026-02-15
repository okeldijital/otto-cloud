"""add_org_scoping_to_network

Revision ID: 1b8bbe8cb2e9
Revises: b49295526708
Create Date: 2026-02-15 15:35:58.920909

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1b8bbe8cb2e9'
down_revision: Union[str, None] = 'b49295526708'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add columns as nullable first to allow existing rows
    with op.batch_alter_table('organizations') as batch_op:
        batch_op.add_column(sa.Column('organization_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_organizations_organization_id'), ['organization_id'], unique=False)
        
    with op.batch_alter_table('individuals') as batch_op:
        batch_op.add_column(sa.Column('organization_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_individuals_organization_id'), ['organization_id'], unique=False)

    # 2. Backfill with DEV_ORG_ID = 1
    op.execute("UPDATE organizations SET organization_id = 1 WHERE organization_id IS NULL")
    op.execute("UPDATE individuals SET organization_id = 1 WHERE organization_id IS NULL")

    # 3. Set NOT NULL
    with op.batch_alter_table('organizations') as batch_op:
        batch_op.alter_column('organization_id', nullable=False)
        
    with op.batch_alter_table('individuals') as batch_op:
        batch_op.alter_column('organization_id', nullable=False)


def downgrade() -> None:
    with op.batch_alter_table('individuals') as batch_op:
        batch_op.drop_index(batch_op.f('ix_individuals_organization_id'))
        batch_op.drop_column('organization_id')

    with op.batch_alter_table('organizations') as batch_op:
        batch_op.drop_index(batch_op.f('ix_organizations_organization_id'))
        batch_op.drop_column('organization_id')

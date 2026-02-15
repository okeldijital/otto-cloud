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


import uuid

DEV_ORG_UUID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEV_ORG_INT = DEV_ORG_UUID.int  # SafeUuid stores UUIDs as int in SQLite


def upgrade() -> None:
    # 1. Add columns as nullable first
    op.add_column("organizations", sa.Column("organization_id", sa.Integer(), nullable=True))
    op.add_column("individuals", sa.Column("organization_id", sa.Integer(), nullable=True))

    # 2. Backfill with UUID constant
    op.execute(
        sa.text("UPDATE organizations SET organization_id = :org WHERE organization_id IS NULL")
        .bindparams(org=DEV_ORG_INT)
    )
    op.execute(
        sa.text("UPDATE individuals SET organization_id = :org WHERE organization_id IS NULL")
        .bindparams(org=DEV_ORG_INT)
    )

    # 3. Set NOT NULL (requires batch for SQLite)
    with op.batch_alter_table("organizations") as batch_op:
        batch_op.alter_column("organization_id", existing_type=sa.Integer(), nullable=False)
    
    with op.batch_alter_table("individuals") as batch_op:
        batch_op.alter_column("organization_id", existing_type=sa.Integer(), nullable=False)

    # 4. Create Indexes
    op.create_index("ix_organizations_organization_id", "organizations", ["organization_id"])
    op.create_index("ix_individuals_organization_id", "individuals", ["organization_id"])


def downgrade() -> None:
    with op.batch_alter_table('individuals') as batch_op:
        batch_op.drop_index(batch_op.f('ix_individuals_organization_id'))
        batch_op.drop_column('organization_id')

    with op.batch_alter_table('organizations') as batch_op:
        batch_op.drop_index(batch_op.f('ix_organizations_organization_id'))
        batch_op.drop_column('organization_id')

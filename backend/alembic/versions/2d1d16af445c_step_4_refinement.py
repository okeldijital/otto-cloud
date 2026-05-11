"""step_4_refinement

Revision ID: 2d1d16af445c
Revises: 249c1aaad04e
Create Date: 2026-02-03 12:49:47.643448

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2d1d16af445c'
down_revision: Union[str, None] = '249c1aaad04e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Contract Documents - Fix uploaded_by type and add missing indexes
    with op.batch_alter_table('contract_documents', schema=None) as batch_op:
        batch_op.alter_column('uploaded_by',
                existing_type=sa.Uuid(),
                type_=sa.Integer(),
                existing_nullable=True,
                postgresql_using='(uploaded_by::text)::integer')
        # Only create if not exists - but in batch mode recreate, we usually define the target state
        # For simplicity, I'll only add what's missing
        batch_op.create_index('ix_contract_documents_organization_id', ['organization_id'], unique=False)
        batch_op.create_index('ix_contract_documents_org_contract', ['organization_id', 'contract_id'], unique=False)
        batch_op.create_index('ix_contract_documents_unique_version', ['contract_id', 'version'], unique=True)

    # 2. Contract Parties - Fix split_percent and add missing indexes
    with op.batch_alter_table('contract_parties', schema=None) as batch_op:
        batch_op.alter_column('split_percent',
               existing_type=sa.NUMERIC(precision=5, scale=2),
               type_=sa.Numeric(precision=6, scale=3),
               existing_nullable=True)
        batch_op.create_index('ix_contract_parties_organization_id', ['organization_id'], unique=False)
        batch_op.create_index('ix_contract_parties_org_contract', ['organization_id', 'contract_id'], unique=False)

    # 3. Contract Split Groups
    with op.batch_alter_table('contract_split_groups', schema=None) as batch_op:
        batch_op.create_index('ix_contract_split_groups_org_contract', ['organization_id', 'contract_id'], unique=False)

    # 4. Contract Splits
    with op.batch_alter_table('contract_splits', schema=None) as batch_op:
        batch_op.create_index('ix_contract_splits_org_group', ['organization_id', 'group_id'], unique=False)

    # 5. Contracts - Rename column and fix indexes
    with op.batch_alter_table('contracts', schema=None) as batch_op:
        batch_op.alter_column('contract_type', new_column_name='type')
        # Drop old index names (from previous versions if they exist)
        try:
            batch_op.drop_index('ix_contracts_v1_organization_id')
            batch_op.drop_index('ix_contracts_v1_org_number')
            batch_op.drop_index('ix_contracts_v1_created_by')
        except:
            pass
        batch_op.create_index('ix_contracts_organization_id', ['organization_id'], unique=False)
        batch_op.create_index('ix_contracts_org_number', ['organization_id', 'contract_number'], unique=True)
        batch_op.create_index('ix_contracts_created_by', ['created_by'], unique=False)

    # 6. Works Admin - fix unique constraint
    with op.batch_alter_table('works_admin', schema=None) as batch_op:
        # We want unique(organization_id, work_id)
        # Drop old global unique on work_id if it exists
        # In SQLite, this is usually managed via index or constraint
        batch_op.create_index('ix_works_admin_org_work', ['organization_id', 'work_id'], unique=True)


def downgrade() -> None:
    pass

"""rename_crm_to_network

Revision ID: 57fe4eb032eb
Revises: 2d1d16af445c
Create Date: 2026-02-03 16:56:44.438386

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '57fe4eb032eb'
down_revision: Union[str, None] = '2d1d16af445c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename tables
    op.rename_table('companies', 'organizations')
    op.rename_table('contacts', 'individuals')
    
    # 2. Update organizations table (formerly companies)
    # Add org_type if it doesn't exist (it was 'type' before)
    # We rename 'type' to 'org_type' to match the new model
    op.alter_column('organizations', 'type', new_column_name='org_type')
    
    # 3. Update individuals table (formerly contacts)
    op.add_column('individuals', sa.Column('relationship_strength', sa.String(length=50), nullable=True, server_default='Regular'))
    
    # 4. Create M2M table for individuals and organizations
    op.create_table('individual_organizations',
        sa.Column('individual_id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['individual_id'], ['individuals.id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('individual_id', 'organization_id')
    )
    
    # 5. Migrate existing data from individuals.company_id to M2M table
    # Use a raw SQL insert for existing relationships
    op.execute("""
        INSERT INTO individual_organizations (individual_id, organization_id)
        SELECT id, company_id FROM individuals WHERE company_id IS NOT NULL
    """)
    
    # 6. Create platforms table
    op.create_table('platforms',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('platform_type', sa.String(length=100), nullable=True),
        sa.Column('portal_url', sa.String(length=255), nullable=True),
        sa.Column('account_reference', sa.String(length=255), nullable=True),
        sa.Column('territory_coverage', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_platforms_id'), 'platforms', ['id'], unique=False)
    op.create_index(op.f('ix_platforms_name'), 'platforms', ['name'], unique=False)
    op.create_index(op.f('ix_platforms_platform_type'), 'platforms', ['platform_type'], unique=False)
    
    # 7. Create network_relationships table
    op.create_table('network_relationships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('relationship_type', sa.String(length=100), nullable=True),
        sa.Column('source_type', sa.String(length=50), nullable=True),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('target_type', sa.String(length=50), nullable=True),
        sa.Column('target_id', sa.Integer(), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_network_relationships_id'), 'network_relationships', ['id'], unique=False)


def downgrade() -> None:
    # Reverse renames and drops
    op.drop_table('network_relationships')
    op.drop_table('platforms')
    op.drop_table('individual_organizations')
    
    op.drop_column('individuals', 'relationship_strength')
    op.alter_column('organizations', 'org_type', new_column_name='type')
    
    op.rename_table('individuals', 'contacts')
    op.rename_table('organizations', 'companies')

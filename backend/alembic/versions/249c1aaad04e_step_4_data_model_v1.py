"""step_4_data_model_v1

Revision ID: 249c1aaad04e
Revises: b7c2e4f6d8a9
Create Date: 2026-02-03 12:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '249c1aaad04e'
down_revision: Union[str, None] = 'b7c2e4f6d8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add missing fields to contract_documents
    with op.batch_alter_table('contract_documents', schema=None) as batch_op:
        batch_op.add_column(sa.Column('checksum', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('mime_type', sa.String(length=100), server_default='application/pdf', nullable=True))
        batch_op.add_column(sa.Column('size_bytes', sa.Integer(), nullable=True))

    # 2. Add works_admin and works_admin_documents tables
    op.create_table('works_admin',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('work_id', sa.Integer(), nullable=False),
        sa.Column('registration_status', sa.String(length=50), server_default='Unknown', nullable=False),
        sa.Column('registered_with', sa.String(length=255), nullable=True),
        sa.Column('registration_date', sa.Date(), nullable=True),
        sa.Column('registration_reference', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['work_id'], ['works.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('work_id')
    )
    with op.batch_alter_table('works_admin', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_works_admin_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_works_admin_created_by'), ['created_by'], unique=False)

    op.create_table('works_admin_documents',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('works_admin_id', sa.Uuid(), nullable=False),
        sa.Column('doc_type', sa.String(length=100), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('mime_type', sa.String(length=100), server_default='application/pdf', nullable=True),
        sa.Column('size_bytes', sa.Integer(), nullable=True),
        sa.Column('checksum', sa.String(length=64), nullable=True),
        sa.Column('uploaded_by', sa.Integer(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['works_admin_id'], ['works_admin.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('works_admin_documents', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_works_admin_documents_organization_id'), ['organization_id'], unique=False)


def downgrade() -> None:
    op.drop_table('works_admin_documents')
    op.drop_table('works_admin')
    
    with op.batch_alter_table('contract_documents', schema=None) as batch_op:
        batch_op.drop_column('size_bytes')
        batch_op.drop_column('mime_type')
        batch_op.drop_column('checksum')

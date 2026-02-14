"""add_ai_tables

Revision ID: f3fd1345ac5b
Revises: efb81ae1cbf3
Create Date: 2026-02-14 02:22:24.474589

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3fd1345ac5b'
down_revision: Union[str, None] = 'efb81ae1cbf3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ai_sessions table
    op.create_table(
        'ai_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_sessions_id'), 'ai_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_ai_sessions_organization_id'), 'ai_sessions', ['organization_id'], unique=False)
    
    # Create ai_messages table
    op.create_table(
        'ai_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['ai_sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_messages_id'), 'ai_messages', ['id'], unique=False)
    op.create_index(op.f('ix_ai_messages_session_id'), 'ai_messages', ['session_id'], unique=False)
    
    # Create ai_audit_log table
    op.create_table(
        'ai_audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('tool', sa.String(length=50), nullable=True),
        sa.Column('request_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_audit_log_created_at'), 'ai_audit_log', ['created_at'], unique=False)
    op.create_index(op.f('ix_ai_audit_log_id'), 'ai_audit_log', ['id'], unique=False)
    op.create_index(op.f('ix_ai_audit_log_organization_id'), 'ai_audit_log', ['organization_id'], unique=False)
    op.create_index(op.f('ix_ai_audit_log_user_id'), 'ai_audit_log', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_ai_audit_log_user_id'), table_name='ai_audit_log')
    op.drop_index(op.f('ix_ai_audit_log_organization_id'), table_name='ai_audit_log')
    op.drop_index(op.f('ix_ai_audit_log_id'), table_name='ai_audit_log')
    op.drop_index(op.f('ix_ai_audit_log_created_at'), table_name='ai_audit_log')
    op.drop_table('ai_audit_log')
    
    op.drop_index(op.f('ix_ai_messages_session_id'), table_name='ai_messages')
    op.drop_index(op.f('ix_ai_messages_id'), table_name='ai_messages')
    op.drop_table('ai_messages')
    
    op.drop_index(op.f('ix_ai_sessions_organization_id'), table_name='ai_sessions')
    op.drop_index(op.f('ix_ai_sessions_id'), table_name='ai_sessions')
    op.drop_table('ai_sessions')


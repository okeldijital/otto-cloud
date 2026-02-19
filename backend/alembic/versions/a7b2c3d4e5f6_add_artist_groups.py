"""add artist groups and memberships

Revision ID: a7b2c3d4e5f6
Revises: 2236b5c5c373
Create Date: 2026-02-19 13:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a7b2c3d4e5f6'
down_revision = '2236b5c5c373'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add artist_kind column with default 'solo' (non-breaking)
    op.add_column('artists', sa.Column('artist_kind', sa.String(20), server_default='solo', nullable=False))

    # Create artist_memberships join table
    op.create_table(
        'artist_memberships',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('group_id', sa.Integer(), sa.ForeignKey('artists.id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_id', sa.Integer(), sa.ForeignKey('artists.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('role', sa.String(100), nullable=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_artist_memberships_group_id', 'artist_memberships', ['group_id'])
    op.create_index('ix_artist_memberships_member_id', 'artist_memberships', ['member_id'])
    op.create_index('ix_membership_group_member', 'artist_memberships', ['group_id', 'member_id'], unique=True)
    op.create_index('ix_membership_org_group', 'artist_memberships', ['organization_id', 'group_id'])


def downgrade() -> None:
    op.drop_table('artist_memberships')
    op.drop_column('artists', 'artist_kind')

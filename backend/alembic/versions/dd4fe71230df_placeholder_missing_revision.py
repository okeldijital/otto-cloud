"""placeholder missing revision dd4fe71230df

This is a no-op placeholder migration to satisfy historical alembic_version references
that may exist in local/dev DBs. It must not alter schema or data.

Revision ID: dd4fe71230df
Revises: 6d67ec43a1c2
Create Date: 2026-02-17
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "dd4fe71230df"
down_revision = "6d67ec43a1c2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # no-op
    pass


def downgrade() -> None:
    # no-op
    pass

"""add_parser_version_to_ai_audit_log

Revision ID: b49295526708
Revises: f3fd1345ac5b
Create Date: 2026-02-14 18:09:29.317782

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b49295526708'
down_revision: Union[str, None] = 'f3fd1345ac5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table('ai_audit_log') as batch_op:
        batch_op.add_column(sa.Column('parser_version', sa.String(length=20), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('ai_audit_log') as batch_op:
        batch_op.drop_column('parser_version')

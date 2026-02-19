"""add_legal_name_to_artist

Revision ID: 81856b05857b
Revises: 534928fa0509
Create Date: 2026-02-19 16:20:49.088023

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '81856b05857b'
down_revision: Union[str, None] = '534928fa0509'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('artists', schema=None) as batch_op:
        batch_op.add_column(sa.Column('legal_name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('artists', schema=None) as batch_op:
        batch_op.drop_column('legal_name')

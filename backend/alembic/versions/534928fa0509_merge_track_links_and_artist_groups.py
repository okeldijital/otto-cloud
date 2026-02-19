"""merge_track_links_and_artist_groups

Revision ID: 534928fa0509
Revises: a7b2c3d4e5f6, aa13d8f21c01
Create Date: 2026-02-19 16:19:33.318509

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '534928fa0509'
down_revision: Union[str, None] = ('a7b2c3d4e5f6', 'aa13d8f21c01')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

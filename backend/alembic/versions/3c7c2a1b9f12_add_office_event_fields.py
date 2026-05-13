"""Add org fields to events

Revision ID: 3c7c2a1b9f12
Revises: 2ed402f88c2f
Create Date: 2026-02-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3c7c2a1b9f12"
down_revision: Union[str, None] = "2ed402f88c2f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_pg = bind.dialect.name == 'postgresql'
    bool_false = 'false' if is_pg else '0'

    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "organization_id",
                sa.Uuid(),
                nullable=False,
                server_default=sa.text("'00000000-0000-0000-0000-000000000001'"),
            )
        )
        batch_op.add_column(
            sa.Column(
                "event_type",
                sa.String(length=100),
                nullable=True,
                server_default="Other",
            )
        )
        batch_op.add_column(
            sa.Column(
                "status",
                sa.String(length=50),
                nullable=True,
                server_default="Planned",
            )
        )
        batch_op.add_column(
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text(bool_false),
            )
        )
        batch_op.create_index(batch_op.f("ix_events_organization_id"), ["organization_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_events_event_type"), ["event_type"], unique=False)
        batch_op.create_index(batch_op.f("ix_events_status"), ["status"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_events_status"))
        batch_op.drop_index(batch_op.f("ix_events_event_type"))
        batch_op.drop_index(batch_op.f("ix_events_organization_id"))
        batch_op.drop_column("is_deleted")
        batch_op.drop_column("status")
        batch_op.drop_column("event_type")
        batch_op.drop_column("organization_id")

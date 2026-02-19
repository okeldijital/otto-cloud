"""add_contract_track_links

Revision ID: aa13d8f21c01
Revises: c1f4b8d9e211
Create Date: 2026-02-18 12:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "aa13d8f21c01"
down_revision: Union[str, None] = "c1f4b8d9e211"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("contract_track_links"):
        op.create_table(
            "contract_track_links",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Uuid(), nullable=False),
            sa.Column("contract_id", sa.Integer(), nullable=False),
            sa.Column("track_id", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["contract_id"], ["contracts.id"]),
            sa.ForeignKeyConstraint(["track_id"], ["tracks.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "organization_id",
                "contract_id",
                "track_id",
                name="uq_contract_track_link_org_contract_track",
            ),
        )
        with op.batch_alter_table("contract_track_links", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_contract_track_links_id"), ["id"], unique=False)
            batch_op.create_index(batch_op.f("ix_contract_track_links_organization_id"), ["organization_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_contract_track_links_contract_id"), ["contract_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_contract_track_links_track_id"), ["track_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("contract_track_links"):
        with op.batch_alter_table("contract_track_links", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_contract_track_links_track_id"))
            batch_op.drop_index(batch_op.f("ix_contract_track_links_contract_id"))
            batch_op.drop_index(batch_op.f("ix_contract_track_links_organization_id"))
            batch_op.drop_index(batch_op.f("ix_contract_track_links_id"))
        op.drop_table("contract_track_links")

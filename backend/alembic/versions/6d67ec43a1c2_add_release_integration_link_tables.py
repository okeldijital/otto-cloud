"""add_release_integration_link_tables

Revision ID: 6d67ec43a1c2
Revises: d617c9d5cf5d
Create Date: 2026-02-17 11:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6d67ec43a1c2"
down_revision: Union[str, None] = "d617c9d5cf5d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contract_intake_release_links",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("resolution_run_id", sa.Integer(), nullable=False),
        sa.Column("release_id", sa.Integer(), nullable=False),
        sa.Column("linked_by_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["resolution_run_id"], ["ai_contract_resolution_runs.id"]
        ),
        sa.ForeignKeyConstraint(["release_id"], ["releases.id"]),
        sa.ForeignKeyConstraint(["linked_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "resolution_run_id",
            "release_id",
            name="uq_contract_intake_release_link_org_run_release",
        ),
    )
    with op.batch_alter_table("contract_intake_release_links", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_contract_intake_release_links_id"), ["id"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_contract_intake_release_links_organization_id"),
            ["organization_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_contract_intake_release_links_release_id"),
            ["release_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_contract_intake_release_links_resolution_run_id"),
            ["resolution_run_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_contract_intake_release_links_created_at"),
            ["created_at"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("contract_intake_release_links", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_contract_intake_release_links_created_at"))
        batch_op.drop_index(
            batch_op.f("ix_contract_intake_release_links_resolution_run_id")
        )
        batch_op.drop_index(batch_op.f("ix_contract_intake_release_links_release_id"))
        batch_op.drop_index(
            batch_op.f("ix_contract_intake_release_links_organization_id")
        )
        batch_op.drop_index(batch_op.f("ix_contract_intake_release_links_id"))

    op.drop_table("contract_intake_release_links")

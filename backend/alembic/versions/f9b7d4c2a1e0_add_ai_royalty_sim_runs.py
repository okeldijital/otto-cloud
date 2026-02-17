"""add_ai_royalty_sim_runs

Revision ID: f9b7d4c2a1e0
Revises: c4f8e2a1b7d0
Create Date: 2026-02-17 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f9b7d4c2a1e0"
down_revision: Union[str, None] = "c4f8e2a1b7d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("ai_royalty_simulation_runs"):
        op.create_table(
            "ai_royalty_simulation_runs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("release_id", sa.Integer(), nullable=False),
            sa.Column("contract_document_id", sa.Integer(), nullable=True),
            sa.Column("request_hash", sa.String(length=64), nullable=False),
            sa.Column("royalty_version", sa.String(length=50), nullable=False),
            sa.Column("splits_total", sa.Float(), nullable=False),
            sa.Column("integrity_total_equals_100", sa.Boolean(), nullable=False),
            sa.Column("integrity_over_allocated", sa.Boolean(), nullable=False),
            sa.Column("integrity_under_allocated", sa.Boolean(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "organization_id",
                "release_id",
                "request_hash",
                name="uq_ai_royalty_run_org_release_hash",
            ),
        )
        with op.batch_alter_table("ai_royalty_simulation_runs", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_ai_royalty_simulation_runs_id"), ["id"], unique=False)
            batch_op.create_index(
                batch_op.f("ix_ai_royalty_simulation_runs_organization_id"),
                ["organization_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_royalty_simulation_runs_user_id"),
                ["user_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_royalty_simulation_runs_release_id"),
                ["release_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_royalty_simulation_runs_contract_document_id"),
                ["contract_document_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_royalty_simulation_runs_created_at"),
                ["created_at"],
                unique=False,
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("ai_royalty_simulation_runs"):
        with op.batch_alter_table("ai_royalty_simulation_runs", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_ai_royalty_simulation_runs_created_at"))
            batch_op.drop_index(batch_op.f("ix_ai_royalty_simulation_runs_contract_document_id"))
            batch_op.drop_index(batch_op.f("ix_ai_royalty_simulation_runs_release_id"))
            batch_op.drop_index(batch_op.f("ix_ai_royalty_simulation_runs_user_id"))
            batch_op.drop_index(batch_op.f("ix_ai_royalty_simulation_runs_organization_id"))
            batch_op.drop_index(batch_op.f("ix_ai_royalty_simulation_runs_id"))
        op.drop_table("ai_royalty_simulation_runs")

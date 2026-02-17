"""add_release_integration_attach_tables

Revision ID: 9c2e6b1f4a11
Revises: dd4fe71230df
Create Date: 2026-02-17 13:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c2e6b1f4a11"
down_revision: Union[str, None] = "dd4fe71230df"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("ai_release_integration_runs"):
        op.create_table(
            "ai_release_integration_runs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("release_id", sa.Integer(), nullable=False),
            sa.Column("contract_id", sa.Integer(), nullable=True),
            sa.Column("request_hash", sa.String(length=64), nullable=False),
            sa.Column("planner_version", sa.String(length=50), nullable=False),
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
                name="uq_ai_release_integration_run_org_release_hash",
            ),
        )
        with op.batch_alter_table("ai_release_integration_runs", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_ai_release_integration_runs_id"), ["id"], unique=False)
            batch_op.create_index(
                batch_op.f("ix_ai_release_integration_runs_organization_id"),
                ["organization_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_release_integration_runs_user_id"),
                ["user_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_release_integration_runs_release_id"),
                ["release_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_release_integration_runs_contract_id"),
                ["contract_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_release_integration_runs_created_at"),
                ["created_at"],
                unique=False,
            )

    if not inspector.has_table("ai_release_integration_links"):
        op.create_table(
            "ai_release_integration_links",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column("run_id", sa.Integer(), nullable=False),
            sa.Column("entity_type", sa.String(length=32), nullable=False),
            sa.Column("entity_id", sa.Integer(), nullable=True),
            sa.Column("display_name", sa.String(length=255), nullable=False),
            sa.Column("action", sa.String(length=32), nullable=False),
            sa.Column("confidence", sa.Float(), nullable=True),
            sa.Column("match_strategy", sa.String(length=20), nullable=False),
            sa.Column("rationale", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["run_id"], ["ai_release_integration_runs.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "organization_id",
                "run_id",
                "entity_type",
                "entity_id",
                "action",
                name="uq_ai_release_integration_link_org_run_entity_action",
            ),
        )
        with op.batch_alter_table("ai_release_integration_links", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_ai_release_integration_links_id"), ["id"], unique=False)
            batch_op.create_index(
                batch_op.f("ix_ai_release_integration_links_organization_id"),
                ["organization_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_release_integration_links_run_id"),
                ["run_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_release_integration_links_entity_type"),
                ["entity_type"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_release_integration_links_entity_id"),
                ["entity_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_release_integration_links_action"),
                ["action"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_release_integration_links_created_at"),
                ["created_at"],
                unique=False,
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("ai_release_integration_links"):
        with op.batch_alter_table("ai_release_integration_links", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_links_created_at"))
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_links_action"))
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_links_entity_id"))
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_links_entity_type"))
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_links_run_id"))
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_links_organization_id"))
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_links_id"))
        op.drop_table("ai_release_integration_links")

    if inspector.has_table("ai_release_integration_runs"):
        with op.batch_alter_table("ai_release_integration_runs", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_runs_created_at"))
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_runs_contract_id"))
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_runs_release_id"))
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_runs_user_id"))
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_runs_organization_id"))
            batch_op.drop_index(batch_op.f("ix_ai_release_integration_runs_id"))
        op.drop_table("ai_release_integration_runs")

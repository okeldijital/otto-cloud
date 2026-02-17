"""add_ai_core_write_proposals

Revision ID: c1f4b8d9e211
Revises: b8f2c64d91aa
Create Date: 2026-02-17 23:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c1f4b8d9e211"
down_revision: Union[str, None] = "b8f2c64d91aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("ai_core_write_proposal_runs"):
        op.create_table(
            "ai_core_write_proposal_runs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("contract_id", sa.Integer(), nullable=False),
            sa.Column("release_id", sa.Integer(), nullable=True),
            sa.Column("contract_document_id", sa.Integer(), nullable=True),
            sa.Column("request_hash", sa.String(length=64), nullable=False),
            sa.Column("parser_version", sa.String(length=64), nullable=True),
            sa.Column("linker_version", sa.String(length=64), nullable=True),
            sa.Column("planner_version", sa.String(length=64), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        with op.batch_alter_table("ai_core_write_proposal_runs", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_runs_id"), ["id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_runs_organization_id"), ["organization_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_runs_user_id"), ["user_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_runs_contract_id"), ["contract_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_runs_release_id"), ["release_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_runs_contract_document_id"), ["contract_document_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_runs_request_hash"), ["request_hash"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_runs_created_at"), ["created_at"], unique=False)

    if not inspector.has_table("ai_core_write_proposal_items"):
        op.create_table(
            "ai_core_write_proposal_items",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column("run_id", sa.Integer(), nullable=False),
            sa.Column("entity_type", sa.String(length=64), nullable=False),
            sa.Column("entity_id", sa.Integer(), nullable=True),
            sa.Column("operation", sa.String(length=16), nullable=False),
            sa.Column("patch_json", sa.Text(), nullable=False),
            sa.Column("conflicts_json", sa.Text(), nullable=True),
            sa.Column("safe_defaults_json", sa.Text(), nullable=True),
            sa.Column("requires_user_review", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
            sa.ForeignKeyConstraint(["run_id"], ["ai_core_write_proposal_runs.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        with op.batch_alter_table("ai_core_write_proposal_items", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_items_id"), ["id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_items_organization_id"), ["organization_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_items_run_id"), ["run_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_items_entity_type"), ["entity_type"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_items_entity_id"), ["entity_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_items_operation"), ["operation"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_items_requires_user_review"), ["requires_user_review"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_proposal_items_created_at"), ["created_at"], unique=False)

    if not inspector.has_table("ai_core_write_apply_events"):
        op.create_table(
            "ai_core_write_apply_events",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("run_id", sa.Integer(), nullable=False),
            sa.Column("request_hash", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=16), nullable=False),
            sa.Column("applied_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("conflict_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("details_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
            sa.ForeignKeyConstraint(["run_id"], ["ai_core_write_proposal_runs.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        with op.batch_alter_table("ai_core_write_apply_events", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_ai_core_write_apply_events_id"), ["id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_apply_events_organization_id"), ["organization_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_apply_events_user_id"), ["user_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_apply_events_run_id"), ["run_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_apply_events_request_hash"), ["request_hash"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_apply_events_status"), ["status"], unique=False)
            batch_op.create_index(batch_op.f("ix_ai_core_write_apply_events_created_at"), ["created_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("ai_core_write_apply_events"):
        with op.batch_alter_table("ai_core_write_apply_events", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_ai_core_write_apply_events_created_at"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_apply_events_status"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_apply_events_request_hash"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_apply_events_run_id"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_apply_events_user_id"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_apply_events_organization_id"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_apply_events_id"))
        op.drop_table("ai_core_write_apply_events")

    if inspector.has_table("ai_core_write_proposal_items"):
        with op.batch_alter_table("ai_core_write_proposal_items", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_items_created_at"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_items_requires_user_review"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_items_operation"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_items_entity_id"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_items_entity_type"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_items_run_id"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_items_organization_id"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_items_id"))
        op.drop_table("ai_core_write_proposal_items")

    if inspector.has_table("ai_core_write_proposal_runs"):
        with op.batch_alter_table("ai_core_write_proposal_runs", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_runs_created_at"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_runs_request_hash"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_runs_contract_document_id"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_runs_release_id"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_runs_contract_id"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_runs_user_id"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_runs_organization_id"))
            batch_op.drop_index(batch_op.f("ix_ai_core_write_proposal_runs_id"))
        op.drop_table("ai_core_write_proposal_runs")

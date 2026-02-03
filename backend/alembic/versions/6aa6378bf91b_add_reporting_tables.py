"""add_reporting_tables

Revision ID: 6aa6378bf91b
Revises: 638fe01f2298
Create Date: 2026-02-03 23:07:38.364183

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6aa6378bf91b"
down_revision: Union[str, None] = "638fe01f2298"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "report_definitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("report_type", sa.String(length=100), nullable=False),
        sa.Column("config_json", sa.Text(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", "name", name="uq_report_definitions_org_name"),
    )
    op.create_index("ix_report_definitions_organization_id", "report_definitions", ["organization_id"], unique=False)
    op.create_index("ix_report_definitions_report_type", "report_definitions", ["report_type"], unique=False)

    op.create_table(
        "report_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("report_definition_id", sa.Integer(), sa.ForeignKey("report_definitions.id"), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("requested_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("parameters_json", sa.Text(), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_report_runs_organization_id", "report_runs", ["organization_id"], unique=False)
    op.create_index("ix_report_runs_report_definition_id", "report_runs", ["report_definition_id"], unique=False)
    op.create_index("ix_report_runs_status", "report_runs", ["status"], unique=False)

    op.create_table(
        "report_artifacts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("report_run_id", sa.Integer(), sa.ForeignKey("report_runs.id"), nullable=False),
        sa.Column("format", sa.String(length=10), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_report_artifacts_organization_id", "report_artifacts", ["organization_id"], unique=False)
    op.create_index("ix_report_artifacts_report_run_id", "report_artifacts", ["report_run_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_report_artifacts_report_run_id", table_name="report_artifacts")
    op.drop_index("ix_report_artifacts_organization_id", table_name="report_artifacts")
    op.drop_table("report_artifacts")
    op.drop_index("ix_report_runs_status", table_name="report_runs")
    op.drop_index("ix_report_runs_report_definition_id", table_name="report_runs")
    op.drop_index("ix_report_runs_organization_id", table_name="report_runs")
    op.drop_table("report_runs")
    op.drop_index("ix_report_definitions_report_type", table_name="report_definitions")
    op.drop_index("ix_report_definitions_organization_id", table_name="report_definitions")
    op.drop_table("report_definitions")

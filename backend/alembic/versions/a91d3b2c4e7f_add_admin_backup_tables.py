"""add_admin_backup_tables

Revision ID: a91d3b2c4e7f
Revises: f9b7d4c2a1e0
Create Date: 2026-02-17 20:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a91d3b2c4e7f"
down_revision: Union[str, None] = "f9b7d4c2a1e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("admin_backup_artifacts"):
        op.create_table(
            "admin_backup_artifacts",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column("created_by", sa.Integer(), nullable=False),
            sa.Column("backup_kind", sa.String(length=32), nullable=False),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("file_path", sa.String(length=1000), nullable=False),
            sa.Column("size_bytes", sa.Integer(), nullable=False),
            sa.Column("sha256", sa.String(length=64), nullable=False),
            sa.Column("is_pre_restore_snapshot", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("source_backup_id", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "organization_id",
                "sha256",
                name="uq_admin_backup_artifact_org_sha256",
            ),
        )
        with op.batch_alter_table("admin_backup_artifacts", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_admin_backup_artifacts_id"), ["id"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_backup_artifacts_organization_id"), ["organization_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_backup_artifacts_created_by"), ["created_by"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_backup_artifacts_backup_kind"), ["backup_kind"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_backup_artifacts_sha256"), ["sha256"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_backup_artifacts_is_pre_restore_snapshot"), ["is_pre_restore_snapshot"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_backup_artifacts_source_backup_id"), ["source_backup_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_backup_artifacts_created_at"), ["created_at"], unique=False)

    if not inspector.has_table("admin_restore_audit"):
        op.create_table(
            "admin_restore_audit",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("backup_id", sa.Integer(), nullable=False),
            sa.Column("pre_restore_snapshot_id", sa.Integer(), nullable=True),
            sa.Column("request_hash", sa.String(length=64), nullable=False),
            sa.Column("result", sa.String(length=16), nullable=False),
            sa.Column("error_hash", sa.String(length=64), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        with op.batch_alter_table("admin_restore_audit", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_admin_restore_audit_id"), ["id"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_restore_audit_organization_id"), ["organization_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_restore_audit_user_id"), ["user_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_restore_audit_backup_id"), ["backup_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_restore_audit_pre_restore_snapshot_id"), ["pre_restore_snapshot_id"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_restore_audit_request_hash"), ["request_hash"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_restore_audit_result"), ["result"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_restore_audit_created_at"), ["created_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("admin_restore_audit"):
        with op.batch_alter_table("admin_restore_audit", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_admin_restore_audit_created_at"))
            batch_op.drop_index(batch_op.f("ix_admin_restore_audit_result"))
            batch_op.drop_index(batch_op.f("ix_admin_restore_audit_request_hash"))
            batch_op.drop_index(batch_op.f("ix_admin_restore_audit_pre_restore_snapshot_id"))
            batch_op.drop_index(batch_op.f("ix_admin_restore_audit_backup_id"))
            batch_op.drop_index(batch_op.f("ix_admin_restore_audit_user_id"))
            batch_op.drop_index(batch_op.f("ix_admin_restore_audit_organization_id"))
            batch_op.drop_index(batch_op.f("ix_admin_restore_audit_id"))
        op.drop_table("admin_restore_audit")

    if inspector.has_table("admin_backup_artifacts"):
        with op.batch_alter_table("admin_backup_artifacts", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_admin_backup_artifacts_created_at"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_artifacts_source_backup_id"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_artifacts_is_pre_restore_snapshot"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_artifacts_sha256"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_artifacts_backup_kind"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_artifacts_created_by"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_artifacts_organization_id"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_artifacts_id"))
        op.drop_table("admin_backup_artifacts")

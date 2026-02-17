"""add_admin_backup_restore_events

Revision ID: b8f2c64d91aa
Revises: a91d3b2c4e7f
Create Date: 2026-02-17 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8f2c64d91aa"
down_revision: Union[str, None] = "a91d3b2c4e7f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("admin_backup_restore_events"):
        op.create_table(
            "admin_backup_restore_events",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("backup_id", sa.Integer(), nullable=False),
            sa.Column("snapshot_backup_id", sa.Integer(), nullable=True),
            sa.Column("initiator_user_id", sa.Integer(), nullable=False),
            sa.Column("initiator_org_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=16), nullable=False),
            sa.Column("error", sa.Text(), nullable=True),
            sa.Column("duration_ms", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["initiator_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        with op.batch_alter_table("admin_backup_restore_events", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_admin_backup_restore_events_id"), ["id"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_backup_restore_events_backup_id"), ["backup_id"], unique=False)
            batch_op.create_index(
                batch_op.f("ix_admin_backup_restore_events_snapshot_backup_id"),
                ["snapshot_backup_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_admin_backup_restore_events_initiator_user_id"),
                ["initiator_user_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_admin_backup_restore_events_initiator_org_id"),
                ["initiator_org_id"],
                unique=False,
            )
            batch_op.create_index(batch_op.f("ix_admin_backup_restore_events_status"), ["status"], unique=False)
            batch_op.create_index(batch_op.f("ix_admin_backup_restore_events_created_at"), ["created_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("admin_backup_restore_events"):
        with op.batch_alter_table("admin_backup_restore_events", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_admin_backup_restore_events_created_at"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_restore_events_status"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_restore_events_initiator_org_id"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_restore_events_initiator_user_id"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_restore_events_snapshot_backup_id"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_restore_events_backup_id"))
            batch_op.drop_index(batch_op.f("ix_admin_backup_restore_events_id"))
        op.drop_table("admin_backup_restore_events")

"""add_contract_document_tables

Revision ID: c4f8e2a1b7d0
Revises: 9c2e6b1f4a11
Create Date: 2026-02-17 14:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4f8e2a1b7d0"
down_revision: Union[str, None] = "9c2e6b1f4a11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("ai_contract_documents"):
        op.create_table(
            "ai_contract_documents",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column("release_id", sa.Integer(), nullable=False),
            sa.Column("file_path", sa.String(length=1000), nullable=False),
            sa.Column("file_hash", sa.String(length=64), nullable=False),
            sa.Column("uploaded_by", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "organization_id",
                "release_id",
                "file_hash",
                name="uq_ai_contract_document_org_release_hash",
            ),
        )
        with op.batch_alter_table("ai_contract_documents", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_ai_contract_documents_id"), ["id"], unique=False)
            batch_op.create_index(
                batch_op.f("ix_ai_contract_documents_organization_id"),
                ["organization_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_contract_documents_release_id"),
                ["release_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_contract_documents_file_hash"),
                ["file_hash"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_contract_documents_uploaded_by"),
                ["uploaded_by"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_contract_documents_created_at"),
                ["created_at"],
                unique=False,
            )

    if not inspector.has_table("ai_contract_work_links"):
        op.create_table(
            "ai_contract_work_links",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column("contract_document_id", sa.Integer(), nullable=False),
            sa.Column("work_id", sa.Integer(), nullable=False),
            sa.Column("confidence", sa.Float(), nullable=False),
            sa.Column("match_strategy", sa.String(length=20), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["contract_document_id"], ["ai_contract_documents.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "organization_id",
                "contract_document_id",
                "work_id",
                name="uq_ai_contract_work_link_org_doc_work",
            ),
        )
        with op.batch_alter_table("ai_contract_work_links", schema=None) as batch_op:
            batch_op.create_index(batch_op.f("ix_ai_contract_work_links_id"), ["id"], unique=False)
            batch_op.create_index(
                batch_op.f("ix_ai_contract_work_links_organization_id"),
                ["organization_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_contract_work_links_contract_document_id"),
                ["contract_document_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_contract_work_links_work_id"),
                ["work_id"],
                unique=False,
            )
            batch_op.create_index(
                batch_op.f("ix_ai_contract_work_links_created_at"),
                ["created_at"],
                unique=False,
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("ai_contract_work_links"):
        with op.batch_alter_table("ai_contract_work_links", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_ai_contract_work_links_created_at"))
            batch_op.drop_index(batch_op.f("ix_ai_contract_work_links_work_id"))
            batch_op.drop_index(batch_op.f("ix_ai_contract_work_links_contract_document_id"))
            batch_op.drop_index(batch_op.f("ix_ai_contract_work_links_organization_id"))
            batch_op.drop_index(batch_op.f("ix_ai_contract_work_links_id"))
        op.drop_table("ai_contract_work_links")

    if inspector.has_table("ai_contract_documents"):
        with op.batch_alter_table("ai_contract_documents", schema=None) as batch_op:
            batch_op.drop_index(batch_op.f("ix_ai_contract_documents_created_at"))
            batch_op.drop_index(batch_op.f("ix_ai_contract_documents_uploaded_by"))
            batch_op.drop_index(batch_op.f("ix_ai_contract_documents_file_hash"))
            batch_op.drop_index(batch_op.f("ix_ai_contract_documents_release_id"))
            batch_op.drop_index(batch_op.f("ix_ai_contract_documents_organization_id"))
            batch_op.drop_index(batch_op.f("ix_ai_contract_documents_id"))
        op.drop_table("ai_contract_documents")

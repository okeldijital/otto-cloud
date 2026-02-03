"""add_office_documents

Revision ID: 638fe01f2298
Revises: b62553279b44
Create Date: 2026-02-03 22:54:41.022804

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "638fe01f2298"
down_revision: Union[str, None] = "b62553279b44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "office_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("doc_type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("storage_filename", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("checksum", sa.String(length=64), nullable=True),
        sa.Column("uploaded_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_office_documents_organization_id", "office_documents", ["organization_id"], unique=False)
    op.create_index("ix_office_documents_doc_type", "office_documents", ["doc_type"], unique=False)
    op.create_index("ix_office_documents_org_doc_type", "office_documents", ["organization_id", "doc_type"], unique=False)

    op.create_table(
        "office_document_links",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("office_documents.id"), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.UniqueConstraint("document_id", "entity_type", "entity_id", name="uq_office_document_links_document_entity"),
    )
    op.create_index("ix_office_document_links_organization_id", "office_document_links", ["organization_id"], unique=False)
    op.create_index("ix_office_document_links_document_id", "office_document_links", ["document_id"], unique=False)
    op.create_index("ix_office_document_links_entity_type", "office_document_links", ["entity_type"], unique=False)
    op.create_index("ix_office_document_links_entity_id", "office_document_links", ["entity_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_office_document_links_entity_id", table_name="office_document_links")
    op.drop_index("ix_office_document_links_entity_type", table_name="office_document_links")
    op.drop_index("ix_office_document_links_document_id", table_name="office_document_links")
    op.drop_index("ix_office_document_links_organization_id", table_name="office_document_links")
    op.drop_table("office_document_links")
    op.drop_index("ix_office_documents_org_doc_type", table_name="office_documents")
    op.drop_index("ix_office_documents_doc_type", table_name="office_documents")
    op.drop_index("ix_office_documents_organization_id", table_name="office_documents")
    op.drop_table("office_documents")

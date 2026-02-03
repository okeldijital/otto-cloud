"""add_office_notes

Revision ID: b62553279b44
Revises: 3482fdf79843
Create Date: 2026-02-03 22:41:17.375509

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b62553279b44"
down_revision: Union[str, None] = "3482fdf79843"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "office_notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("tags", sa.String(length=255), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_office_notes_organization_id", "office_notes", ["organization_id"], unique=False)

    op.create_table(
        "office_note_links",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("note_id", sa.Integer(), sa.ForeignKey("office_notes.id"), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("note_id", "entity_type", "entity_id", name="uq_office_note_links_note_entity"),
    )
    op.create_index("ix_office_note_links_organization_id", "office_note_links", ["organization_id"], unique=False)
    op.create_index("ix_office_note_links_note_id", "office_note_links", ["note_id"], unique=False)
    op.create_index("ix_office_note_links_entity_type", "office_note_links", ["entity_type"], unique=False)
    op.create_index("ix_office_note_links_entity_id", "office_note_links", ["entity_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_office_note_links_entity_id", table_name="office_note_links")
    op.drop_index("ix_office_note_links_entity_type", table_name="office_note_links")
    op.drop_index("ix_office_note_links_note_id", table_name="office_note_links")
    op.drop_index("ix_office_note_links_organization_id", table_name="office_note_links")
    op.drop_table("office_note_links")
    op.drop_index("ix_office_notes_organization_id", table_name="office_notes")
    op.drop_table("office_notes")

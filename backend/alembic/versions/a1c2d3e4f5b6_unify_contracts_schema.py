"""Unify contracts schema and add split groups"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite
import uuid


# revision identifiers, used by Alembic.
revision = 'a1c2d3e4f5b6'
down_revision = '406935f9448d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Phase 0 assumes backup already taken.

    # Rename core tables to canonical names if they exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    existing = inspector.get_table_names()

    legacy_conflicts = ["contracts", "contract_parties", "contract_assets", "contract_documents"]
    for tbl in legacy_conflicts:
        if tbl in existing and f"{tbl}_v1" in existing:
            op.drop_table(tbl)

    table_map = {
        "contracts_v1": "contracts",
        "contract_parties_v1": "contract_parties",
        "contract_assets_v1": "contract_assets",
        "contract_documents_v1": "contract_documents",
    }
    for old, new in table_map.items():
        if old in inspector.get_table_names():
            op.execute(sa.text(f'ALTER TABLE {old} RENAME TO {new}'))

    # Add new columns to contracts
    if "contracts" in inspector.get_table_names():
        with op.batch_alter_table("contracts") as batch_op:
            if "signed_date" not in [c["name"] for c in inspector.get_columns("contracts")]:
                batch_op.add_column(sa.Column("signed_date", sa.Date(), nullable=True))
            if "notes" not in [c["name"] for c in inspector.get_columns("contracts")]:
                batch_op.add_column(sa.Column("notes", sa.Text(), nullable=True))

    # Normalize uploaded_by to integer for document versions
    if "contract_documents" in inspector.get_table_names():
        with op.batch_alter_table("contract_documents") as batch_op:
            batch_op.alter_column("uploaded_by", type_=sa.Integer(), existing_type=sa.String(), existing_nullable=True)

    # Normalize scope_type values to uppercase where present
    if "contract_assets" in inspector.get_table_names():
        op.execute(sa.text("UPDATE contract_assets SET scope_type = upper(scope_type)"))

    # Create split tables
    if "contract_split_groups" not in existing:
        op.create_table(
            "contract_split_groups",
            sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("contract_id", sa.Uuid(as_uuid=True), sa.ForeignKey("contracts.id"), nullable=False),
            sa.Column("organization_id", sa.Uuid(as_uuid=True), nullable=False, index=True),
            sa.Column("group_name", sa.String(length=100), nullable=False),
            sa.Column("group_type", sa.String(length=50), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
        )

    if "contract_splits" not in existing:
        op.create_table(
            "contract_splits",
            sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("group_id", sa.Uuid(as_uuid=True), sa.ForeignKey("contract_split_groups.id", ondelete="CASCADE"), nullable=False),
            sa.Column("organization_id", sa.Uuid(as_uuid=True), nullable=False, index=True),
            sa.Column("party_id", sa.Uuid(as_uuid=True), sa.ForeignKey("contract_parties.id", ondelete="SET NULL"), nullable=True),
            sa.Column("external_party_name", sa.String(length=255), nullable=True),
            sa.Column("percent", sa.Numeric(6, 3), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.CheckConstraint("(party_id IS NOT NULL) OR (external_party_name IS NOT NULL)", name="check_split_party_or_name"),
        )

    # Drop lingering legacy tables if they still exist
    legacy_tables = ["contracts_v1", "contract_parties_v1", "contract_assets_v1", "contract_documents_v1", "contract_registry", "contract_registry_items"]
    for t in legacy_tables:
        if t in sa.inspect(conn).get_table_names():
            op.drop_table(t)


def downgrade() -> None:
    # Reverse split tables
    op.drop_table("contract_splits")
    op.drop_table("contract_split_groups")

    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Remove added columns
    if "contracts" in inspector.get_table_names():
        with op.batch_alter_table("contracts") as batch_op:
            cols = [c["name"] for c in inspector.get_columns("contracts")]
            if "signed_date" in cols:
                batch_op.drop_column("signed_date")
            if "notes" in cols:
                batch_op.drop_column("notes")

    # Rename back (best effort)
    rename_back = {
        "contracts": "contracts_v1",
        "contract_parties": "contract_parties_v1",
        "contract_assets": "contract_assets_v1",
        "contract_documents": "contract_documents_v1",
    }
    for old, new in rename_back.items():
        if old in inspector.get_table_names():
            op.execute(sa.text(f'ALTER TABLE {old} RENAME TO {new}'))

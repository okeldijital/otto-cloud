"""Add organization_id to audit_logs"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7c2e4f6d8a9'
down_revision = 'a1c2d3e4f5b6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.add_column(sa.Column("organization_id", sa.Uuid(as_uuid=True), nullable=True))
        batch_op.create_index(batch_op.f("ix_audit_logs_organization_id"), ["organization_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.drop_index(batch_op.f("ix_audit_logs_organization_id"))
        batch_op.drop_column("organization_id")

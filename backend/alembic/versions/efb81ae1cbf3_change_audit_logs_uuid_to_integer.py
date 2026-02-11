"""change_audit_logs_uuid_to_integer

Revision ID: efb81ae1cbf3
Revises: 7c9f40
Create Date: 2026-02-10 15:14:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'efb81ae1cbf3'
down_revision: Union[str, None] = '83b367406e97'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    # First, create a new table with the correct schema
    op.execute('''
        CREATE TABLE audit_logs_new (
            id INTEGER PRIMARY KEY,
            action VARCHAR(50),
            entity_type VARCHAR(50),
            entity_id INTEGER,
            entity_uuid INTEGER,
            entity_name VARCHAR(255),
            organization_id INTEGER,
            changes JSON,
            user_id INTEGER,
            ip_address VARCHAR(45),
            user_agent VARCHAR(500),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Copy data from old table to new table
    op.execute('''
        INSERT INTO audit_logs_new (id, action, entity_type, entity_id, entity_uuid, entity_name, organization_id, changes, user_id, ip_address, user_agent, created_at)
        SELECT id, action, entity_type, entity_id, NULL, entity_name, NULL, changes, user_id, ip_address, user_agent, created_at
        FROM audit_logs
    ''')
    
    # Drop old table
    op.execute('DROP TABLE audit_logs')
    
    # Rename new table to original name
    op.execute('ALTER TABLE audit_logs_new RENAME TO audit_logs')
    
    # Recreate indexes
    op.execute('CREATE INDEX ix_audit_logs_action ON audit_logs(action)')
    op.execute('CREATE INDEX ix_audit_logs_entity_type ON audit_logs(entity_type)')
    op.execute('CREATE INDEX ix_audit_logs_entity_uuid ON audit_logs(entity_uuid)')
    op.execute('CREATE INDEX ix_audit_logs_organization_id ON audit_logs(organization_id)')
    op.execute('CREATE INDEX ix_audit_logs_created_at ON audit_logs(created_at)')


def downgrade() -> None:
    # Downgrade not implemented for this migration
    pass

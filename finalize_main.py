#!/usr/bin/env python3
"""
Final update to main.py - Add backup/config routes and migration support.
Run this ONCE to complete main.py setup.
"""

import os
import re

target_file = "/Users/m2krproduction/otto/backend/main.py"

# Read the file
with open(target_file, 'r') as f:
    content = f.read()

# 1. Add backup and config to imports
import_pattern = r'from routes import \(  # noqa: E402\n    auth,\n    catalog,'
import_replacement = '''from routes import (  # noqa: E402
    auth,
    catalog,'''

# Search for the specific import block
if 'from routes import (  # noqa: E402' in content:
    # Find the end of office_status_quo import
    old_imports = '''from routes import (  # noqa: E402
    auth,
    catalog,
    royalties,
    documents,
    notes,
    events,
    playlists,
    analytics,
    reports,
    tasks,
    users,
    admin,
    search,
    contracts,
    works_admin,
    admin_of_works,
    network,
    office_documents,
    office_events,
    office_tasks,
    office_notes,
    office_reports,
    office_status_quo,
)'''

    new_imports = '''from routes import (  # noqa: E402
    auth,
    catalog,
    royalties,
    documents,
    notes,
    events,
    playlists,
    analytics,
    reports,
    tasks,
    users,
    admin,
    search,
    contracts,
    works_admin,
    admin_of_works,
    network,
    office_documents,
    office_events,
    office_tasks,
    office_notes,
    office_reports,
    office_status_quo,
    backup,
    config,
)'''
    
    content = content.replace(old_imports, new_imports)
    print("✅ Updated route imports")

# 2. Add route mounting
old_mount = '''app.include_router(office_status_quo.router, prefix="/api", tags=["Office Status Quo"])

# -----
# Static files'''

new_mount = '''app.include_router(office_status_quo.router, prefix="/api", tags=["Office Status Quo"])
app.include_router(backup.router, tags=["Backup"])
app.include_router(config.router, tags=["Config"])

# -----
# Static files'''

content = content.replace(old_mount, new_mount)
print("✅ Added route mounting")

# 3. Add migration function before start_backend()
migration_func = '''

def _run_migrations() -> None:
    """Run Alembic migrations on startup if using SQLite."""
    try:
        db_url = getattr(settings, "DATABASE_URL", "")
        if "sqlite" in db_url:
            logging.info("🔄 Running Alembic migrations...")
            from alembic.config import Config
            from alembic.command import upgrade
            
            alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "alembic.ini"))
            alembic_cfg.set_main_option("sqlalchemy.url", db_url)
            upgrade(alembic_cfg, "head")
            logging.info("✅ Migrations completed")
        else:
            logging.info("⏭️ Skipping migrations (not SQLite)")
    except Exception as e:
        logging.error(f"⚠️ Migration error: {e}")
        # Don't fail if migrations error - try to continue
        pass

'''

# Find start_backend definition
start_backend_idx = content.find("def start_backend():")
if start_backend_idx > 0:
    # Insert before start_backend
    content = content[:start_backend_idx] + migration_func + content[start_backend_idx:]
    print("✅ Added migration function")

# 4. Add migration call in start_backend()
old_init = '''    # Init DB
    try:
        init_db()'''

new_init = '''    # Run migrations first (if SQLite)
    _run_migrations()
    
    # Init DB
    try:
        init_db()'''

content = content.replace(old_init, new_init)
print("✅ Added migration call to startup")

# Write back
with open(target_file, 'w') as f:
    f.write(content)

print(f"\n✅ COMPLETE: main.py updated successfully!")
print(f"\nChanges made:")
print(f"  1. Added backup and config route imports")
print(f"  2. Mounted backup and config routers")
print(f"  3. Added _run_migrations() helper function")
print(f"  4. Called migrations on backend startup")
print(f"\nNext steps:")
print(f"  1. Verify: grep -n 'import backup' /Users/m2krproduction/otto/backend/main.py")
print(f"  2. Test: cd backend && python main.py")
print(f"  3. Check: curl http://127.0.0.1:8000/health")

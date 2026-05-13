import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from alembic.config import Config
from alembic import script
from alembic.runtime import migration
from database import engine

def validate():
    print("🔍 Validating Alembic Migrations...")
    
    # 1. Check Dialect
    print(f"ℹ️  Current Database Dialect: {engine.name}")
    
    # 2. Check Migrations
    try:
        # Resolve path to alembic.ini (it's in the backend folder)
        backend_dir = Path(__file__).parent.parent
        ini_path = str(backend_dir / "alembic.ini")
        alembic_cfg = Config(ini_path)
        # Override script_location to be absolute path
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
        script_dir = script.ScriptDirectory.from_config(alembic_cfg)
        
        with engine.connect() as conn:
            context = migration.MigrationContext.configure(conn)
            current_rev = context.get_current_revision()
            head_rev = script_dir.get_current_head()
            
            print(f"ℹ️  Current Revision: {current_rev}")
            print(f"ℹ️  Head Revision:    {head_rev}")
            
            if current_rev == head_rev:
                print("✅ Database is up to date.")
            else:
                print("⚠️  Database is NOT up to date. Please run: alembic upgrade head")
                
            # Check for multiple heads
            heads = script_dir.get_heads()
            if len(heads) > 1:
                print(f"❌ FATAL: Multiple heads detected: {heads}")
                sys.exit(1)
                
    except Exception as e:
        print(f"❌ Migration validation error: {e}")
        sys.exit(1)

    print("✅ Validation complete.")

if __name__ == "__main__":
    validate()

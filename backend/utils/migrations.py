from alembic import command
from alembic.config import Config
from pathlib import Path
import logging

def upgrade_head() -> None:
    """
    Run alembic upgrade head programmatically.
    Safe to call on startup.
    """
    try:
        logging.info("⚖️  Governance: Auto-migrating data schema to HEAD...")
        
        # backend/utils/migrations.py -> backend/alembic.ini
        base_backend = Path(__file__).resolve().parent.parent 
        config_path = base_backend / "alembic.ini"
        
        if not config_path.exists():
            logging.error(f"❌ Governance Error: alembic.ini not found at {config_path}")
            return

        cfg = Config(str(config_path))
        # Ensure script_location is strict
        script_location = str(base_backend / "alembic")
        cfg.set_main_option("script_location", script_location)
        
        command.upgrade(cfg, "head")
        logging.info("✅ Governance: Schema migration complete.")
    except Exception as e:
        # In dev/local this is critical.
        logging.error(f"❌ Governance: Migration failed: {e}")

import os
import sys
import logging
from typing import List
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# -----------------------------
# Optional: load .env early
# -----------------------------
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    # dotenv is optional; environment may already be set via shell
    pass

# -----------------------------
# Core Configuration Imports
# -----------------------------
# NOTE: These imports reflect YOUR current structure shown in the snippet.
# If your project uses app.core.config, etc., adjust accordingly.
from config import settings  # noqa: E402
from database import init_db, SessionLocal, engine  # noqa: E402
from models import *  # noqa: F401,F403,E402  # Ensure all models register

# -----------------------------
# App Init
# -----------------------------
app = FastAPI(title=getattr(settings, "APP_NAME", "OTTO"), version=getattr(settings, "APP_VERSION", "0.1.0"))

# -----------------------------
# CORS (FIXED)
# -----------------------------
DEFAULT_DEV_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "tauri://localhost",
    "http://tauri.localhost",
]

cors_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_env:
    # Merge env origins with defaults and remove duplicates
    env_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
    allow_origins = list(set(DEFAULT_DEV_ORIGINS + env_origins))
else:
    allow_origins = DEFAULT_DEV_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# -----------------------------
# Routers
# -----------------------------
# Your snippet: from routes import auth, catalog, royalties, documents, notes, events, playlists, analytics, crm, reports, tasks, users, admin, search, contracts
from routes import (  # noqa: E402
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
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["Catalog"])

# You had contracts mounted at /api (router defines its own prefixes)
app.include_router(contracts.router, prefix="/api", tags=["Contracts"])

app.include_router(network.router, prefix="/api", tags=["Network"])
app.include_router(royalties.router, prefix="/api/royalties", tags=["Royalties"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(notes.router, prefix="/api/notes", tags=["Notes"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(playlists.router, prefix="/api/playlists", tags=["Playlists"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(works_admin.router, prefix="/api", tags=["Works Administration"])
app.include_router(admin_of_works.router, prefix="/api", tags=["Status Quo"])
app.include_router(office_documents.router, prefix="/api", tags=["Office Documents"])
app.include_router(office_events.router, prefix="/api", tags=["Office Events"])
app.include_router(office_tasks.router, prefix="/api", tags=["Office Tasks"])
app.include_router(office_notes.router, prefix="/api", tags=["Office Notes"])
app.include_router(office_reports.router, prefix="/api", tags=["Office Reports"])
app.include_router(office_status_quo.router, prefix="/api", tags=["Office Status Quo"])
app.include_router(backup.router, prefix="/api", tags=["Backup"])
app.include_router(config.router, prefix="/api", tags=["Configuration"])

# -----------------------------
# Static files (uploads)
# -----------------------------
upload_dir = getattr(settings, "UPLOAD_DIR", None) or os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# -----------------------------
# Health endpoint
# -----------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "env": getattr(settings, "APP_ENV", os.getenv("APP_ENV", "dev"))}


# -----------------------------
# Startup helpers
# -----------------------------
def _run_migrations() -> None:
    """
    Run Alembic migrations if using SQLite.
    Graceful failure—logs warning but continues.
    """
    try:
        db_url = getattr(settings, "DATABASE_URL", os.getenv("DATABASE_URL", ""))
        if "sqlite" not in db_url.lower():
            logging.info("↩️  Skipping Alembic (non-SQLite database)")
            return

        import subprocess
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=True,
            timeout=60,
        )
        if result.returncode == 0:
            logging.info("✅ Alembic migrations completed successfully")
        else:
            logging.warning(f"⚠️  Alembic returned non-zero: {result.stderr.decode()[:200]}")
    except Exception as e:
        logging.warning(f"⚠️  Migration error (non-fatal): {e}")


def _configure_logging() -> None:
    log_file = getattr(settings, "LOG_FILE", None) or os.getenv("LOG_FILE", "./storage/logs/otto.log")
    os.makedirs(os.path.dirname(log_file), exist_ok=True)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)],
    )


def _seed_admin_user() -> None:
    """
    Seeds an admin user if your project has:
      - models.user.User
      - passlib installed
    This function is safe: if dependencies aren't present, it logs and exits cleanly.
    """
    try:
        from models.user import User  # type: ignore
    except Exception as e:
        logging.warning(f"Admin seed skipped (User model import failed): {e}")
        return

    try:
        from passlib.context import CryptContext  # type: ignore
    except Exception as e:
        logging.warning(f"Admin seed skipped (passlib missing): {e}")
        return

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    admin_email = os.getenv("OTTO_ADMIN_EMAIL", "admin@otto.com")
    admin_password = os.getenv("OTTO_ADMIN_PASSWORD", "admin")

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                hashed_password=pwd_context.hash(admin_password),
                full_name="System Admin",
                is_active=True,
                is_superuser=True,
                role="admin",  # keep if your model expects it
            )
            db.add(admin)
            db.commit()
            logging.info("👤 Admin user seeded")
        else:
            logging.info("👤 Admin user already exists")
    except Exception as e:
        logging.error(f"❌ Admin seed error: {e}")
        db.rollback()
    finally:
        db.close()


# -----------------------------
# Desktop/CLI entry point
# -----------------------------
def start_backend():
    _configure_logging()
    port = int(getattr(settings, "PORT", None) or os.getenv("PORT", "8000"))
    env = getattr(settings, "APP_ENV", os.getenv("APP_ENV", "dev"))

    logging.info(f"🚀 OTTO Backend starting on port {port} (env={env})")
    logging.info(f"🌐 CORS allow_origins={allow_origins}")

    # Init DB
    try:
        init_db()
    except Exception as e:
        logging.error(f"❌ DB init failed: {e}")

    # Run migrations (best-effort for SQLite)
    _run_migrations()

    # Seed admin (best-effort)
    _seed_admin_user()

    # Run server
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    start_backend()

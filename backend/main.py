import os
import sys
import logging
from typing import List
from pathlib import Path
import uuid
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

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
from governance import run_preflight_checks, GovernanceError # noqa: E402


# -----------------------------
# App Init
# -----------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Execute startup tasks: logging, DB init, migrations, seeding."""
    _configure_logging()

    try:
        init_db()
    except Exception as e:
        logging.error(f"❌ DB init failed: {e}")

    _run_migrations()

    logging.getLogger("passlib.handlers.bcrypt").setLevel(logging.ERROR)
    _seed_admin_user()

    try:
        run_preflight_checks()
    except Exception as e:
        logging.critical(f"🛑 Preflight checks failed: {e}")
        raise RuntimeError(f"Startup failed: {e}")

    yield

app = FastAPI(
    title=getattr(settings, "APP_NAME", "OTTO"),
    version=getattr(settings, "APP_VERSION", "0.1.0"),
    lifespan=lifespan,
)

@app.get("/api/health")
async def api_health():
    """Alias for /health to support frontend API clients that prefix with /api"""
    return {"status": "ok", "env": getattr(settings, "APP_ENV", os.getenv("APP_ENV", "dev"))}

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
    # allow_origins=allow_origins,  # Replaced by regex for better dev experience
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?",
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
    ai,
    ai_contracts,
    ai_analytics,
    ai_royalty,
    ai_release_integration,
    ai_release_validation,
    ai_core_write,
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

# AI Router - Always mounted, features gated internally
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(ai_contracts.router, prefix="/api/ai/contracts", tags=["AI Contracts"])
app.include_router(ai_analytics.router, prefix="/api/ai/analytics", tags=["AI Analytics"])
app.include_router(ai_royalty.router, prefix="/api/ai/royalty", tags=["AI Royalty"])
app.include_router(
    ai_release_integration.router,
    prefix="/api/ai/release_integration",
    tags=["ai"],
)
app.include_router(
    ai_release_validation.router,
    prefix="/api/ai/release_validation",
    tags=["AI Release Validation"],
)
app.include_router(
    ai_core_write.router,
    prefix="/api/ai/core_write",
    tags=["AI Core Write"],
)
logging.info("🤖 AI modules mounted")

# -----------------------------
# Static files (uploads)
# -----------------------------
# -----------------------------
# Static files (uploads & frontend)
# -----------------------------
upload_dir = getattr(settings, "UPLOAD_DIR", None) or os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")



# Catch-all for SPA client-side routing
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    """Handle 404 errors - return JSON for API routes, HTML for frontend routes."""
    path = request.url.path
    
    # Never serve HTML for API routes, uploads, or special endpoints
    if path.startswith(('/api/', '/uploads/', '/health', '/docs', '/openapi.json')):
        return JSONResponse(
            status_code=404,
            content={"detail": "Not Found"}
        )
    
    # Serve index.html for frontend routes (SPA client-side routing)
    if dist_dir.exists():
        return FileResponse(dist_dir / "index.html")
    return JSONResponse(status_code=404, content={"error": "Frontend not found"})

# -----------------------------
# MOCK Local Server (Dev Mode Only)
# -----------------------------
# Electron handles these in production.
# In pure dev (browser + python), we need these to pass Setup.

from pydantic import BaseModel

class MockConfig(BaseModel):
    nodeRole: str
    node_name: str | None = None
    hub_url: str | None = None
    nodeId: str | None = None

@app.post("/__local__/save-config")
async def mock_save_config(config: MockConfig):
    logging.warning(f"🔧 MOCK: Saved config: {config}")
    # In dev, we might want to actually set the env vars or just pretend?
    # For now, just pretend.
    return {"status": "ok", "message": "Config saved (Mock). Please restart backend manually if needed."}

@app.post("/__local__/reset-config")
async def mock_reset_config():
    logging.warning("🔧 MOCK: Config reset")
    return {"status": "ok", "message": "Config reset (Mock)."}


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
    Run Alembic migrations via Python API (Governance).
    Graceful failure—logs warning but continues.
    """
    try:
        from utils.migrations import upgrade_head
        upgrade_head()
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
        
        # Prepare desired state
        hashed_pw = pwd_context.hash(admin_password)
        target_org_id = uuid.UUID(int=1)
        
        if not admin:
            admin = User(
                email=admin_email,
                hashed_password=hashed_pw,
                full_name="System Admin",
                is_active=True,
                is_superuser=True,
                role="admin",
                organization_id=target_org_id
            )
            db.add(admin)
            logging.info("👤 Admin user seeded")
        else:
            # Check for drift and update if needed
            drift = False
            if not pwd_context.verify(admin_password, admin.hashed_password):
                admin.hashed_password = hashed_pw
                drift = True
            if admin.organization_id != target_org_id:
                admin.organization_id = target_org_id
                drift = True
            
            if drift:
                logging.info("👤 Admin user updated to match canonical state")
            else:
                logging.info("👤 Admin user already up to date")
        
        db.commit()
    except Exception as e:
        logging.error(f"❌ Admin seed error: {e}")
        db.rollback()
    finally:
        db.close()


# -----------------------------
# Serve Frontend (dist-desktop) - MOVED TO END
# -----------------------------
# Logic:
# 1. Dev: usually skipped or handled by Vite, but if we want to test serving:
#    look for ../frontend/dist (if built)
# 2. Prod (PyInstaller):
#    sys.executable is .../backend/sidecar
#    dist-desktop is at .../dist-desktop (sibling of backend folder in Resources)
if getattr(sys, 'frozen', False):
    # Running as PyInstaller bundle
    # sys.executable = .../Contents/Resources/backend/sidecar
    # dist-desktop = .../Contents/Resources/dist-desktop
    base_dir = Path(sys.executable).parent.parent
    dist_dir = base_dir / "dist-desktop"
else:
    # Running from source (backend/main.py)
    # dist-desktop might be at ../dist-desktop if built, or ../frontend/dist
    base_dir = Path(__file__).parent.parent
    dist_dir = base_dir / "dist-desktop"

if dist_dir.exists():
    logging.info(f"📂 Serving frontend from {dist_dir}")
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")
else:
    logging.warning(f"⚠️ Frontend build not found at {dist_dir}")



# -----------------------------
# Desktop/CLI entry point
# -----------------------------
    try:
        run_preflight_checks()
    except GovernanceError as e:
        logging.critical(f"🛑 Governance Check Failed: {e}")
        # In startup event, raising exception will stop the server
        raise e
    except Exception as e:
        logging.critical(f"🛑 Startup Failed: {e}")
        raise e

# -----------------------------
# Desktop/CLI entry point
# -----------------------------
def start_backend():
    # Prefer OTTO_BACKEND_PORT, fallback to PORT or 8000
    port_env = os.getenv("OTTO_BACKEND_PORT")
    if not port_env:
        port_env = getattr(settings, "PORT", None) or os.getenv("PORT", "8000")
    port = int(port_env)
    env = getattr(settings, "APP_ENV", os.getenv("APP_ENV", "dev"))

    logging.info(f"🚀 OTTO Backend starting on port {port} (env={env})")
    
    # NOTE: We rely on the @app.on_event("startup") to handle init/seed/checks.
    # This ensures consistency whether running via `python main.py` OR `uvicorn main:app`.
    
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    start_backend()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from config import settings
from database import init_db
import os
import sys

# Import all models to ensure they're registered with SQLAlchemy
from models import *

# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Comprehensive Record Label Operating System",
    debug=settings.DEBUG
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


from utils.scheduler import start_scheduler

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    current_freq = start_scheduler()
    print(f"✅ {settings.APP_NAME} v{settings.APP_VERSION} started")
    print(f"📊 Database: {settings.DATABASE_URL}")
    print(f"📁 Upload directory: {settings.UPLOAD_DIR}")
    print(f"⏰ Auto-Backup Scheduler: Active ({current_freq})")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

# Standardize frontend serving
from fastapi.responses import FileResponse

# Check for build directory
build_dir = None

# 1. Check if running as PyInstaller bundle (PRIORITY)
if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
    frozen_path = os.path.join(base_path, "dist")
    if os.path.exists(frozen_path):
        build_dir = frozen_path

# 2. Key fallback: Local development directories
if not build_dir:
    possible_dirs = ["dist", "../frontend/dist"]
    for d in possible_dirs:
        # We need to make sure it actually looks like a frontend build (has index.html)
        if os.path.exists(d) and os.path.exists(os.path.join(d, "index.html")):
            build_dir = d
            break

if build_dir:
    print(f"📦 Serving frontend from: {build_dir}")
    app.mount("/assets", StaticFiles(directory=os.path.join(build_dir, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Exclude API routes
        if full_path.startswith("api") or full_path.startswith("uploads"):
            return None # 404 handled by FastAPI
            
        file_path = os.path.join(build_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
             return FileResponse(file_path)
             
        # Fallback to index.html
        return FileResponse(os.path.join(build_dir, "index.html"))


# TODO: Import and mount route modules
from routes import auth, catalog, contracts, royalties, documents, notes, events, playlists, analytics, crm, reports, tasks, users, admin, search

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["Catalog"])
app.include_router(contracts.router, prefix="/api/contracts", tags=["Contracts"])
app.include_router(crm.router, prefix="/api/crm", tags=["CRM"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(royalties.router, prefix="/api/royalties", tags=["Royalties"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(notes.router, prefix="/api/notes", tags=["Notes"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(playlists.router, prefix="/api/playlists", tags=["Playlists"])
app.include_router(users.router, prefix="/api/users", tags=["User Management"])
app.include_router(admin.router, prefix="/api/admin", tags=["System Administration"])
app.include_router(search.router, prefix="/api/search", tags=["Global Search"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)

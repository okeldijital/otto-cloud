from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from config import settings
from database import init_db
import os

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

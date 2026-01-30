import os
import sys
import logging
import threading
import time
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Core Configuration
from config import settings
from database import init_db, SessionLocal
from models import * # Ensure all models register

# Initialize App
app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

# Robust CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
from routes import auth, catalog, contracts, royalties, documents, notes, events, playlists, analytics, crm, reports, tasks, users, admin, search

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["Catalog"])
app.include_router(contracts.router, prefix="/api/contracts", tags=["Contracts"])
app.include_router(crm.router, prefix="/api/crm", tags=["CRM"])
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

# Serve static files (uploads)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}

# Desktop Entry Point Logic
def start_backend():
    # Setup Logging to file
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(settings.LOG_FILE),
            logging.StreamHandler(sys.stdout)
        ]
    )
    logging.info(f"🚀 OTTO Backend starting on port {settings.PORT}")
    
    # Initialize DB and Seed Admin
    try:
        init_db()
        db = SessionLocal()
        from models.user import User
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        admin = db.query(User).filter(User.email == "admin@otto.com").first()
        if not admin:
            admin = User(
                email="admin@otto.com",
                hashed_password=pwd_context.hash("admin"),
                full_name="System Admin",
                is_active=True,
                is_superuser=True,
                role="admin"
            )
            db.add(admin)
            db.commit()
            logging.info("👤 Admin user seeded")
        db.close()
    except Exception as e:
        logging.error(f"❌ Startup error: {e}")

    # Run Server
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT, log_level="info")

if __name__ == "__main__":
    start_backend()

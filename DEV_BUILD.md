# OTTO V1.0.1 Developer Build Guide

Technical guide for building, testing, and releasing OTTO V1.0.1.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  OTTO V1.0.1 Installer                          │
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐   │
│  │ Electron Launcher (main.js)              │   │
│  │ • Dynamic port selection (8000+)         │   │
│  │ • App data dir initialization            │   │
│  │ • Backend process management             │   │
│  │ • Opens default browser                  │   │
│  └──────────────────────────────────────────┘   │
│           │                                      │
│           ├──> http://127.0.0.1:PORT/api/*      │
│           │                                      │
│  ┌────────▼───────────────────────────────────┐ │
│  │ FastAPI Backend (PyInstaller binary)       │ │
│  │ • Alembic migrations (SQLite)              │ │
│  │ • Serves static frontend                   │ │
│  │ • Backup/Restore API                       │ │
│  │ • Hub/Spoke config                         │ │
│  └────────┬───────────────────────────────────┘ │
│           │                                      │
│  ┌────────▼───────────────────────────────────┐ │
│  │ SQLite Database (local, single-file)       │ │
│  │ Location: {APP_DATA_DIR}/otto.db           │ │
│  │ • No server process needed                 │ │
│  │ • Backup-friendly                          │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ React Frontend (Vite-built static)        │   │
│  │ • Served by backend on /                  │   │
│  │ • API calls to /api/* (same origin)       │   │
│  │ • No CORS issues                          │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js** 18+ (for Electron + Vite)
- **Python** 3.12+ (for FastAPI backend)
- **pip** and **venv**
- **Git**
- Platform-specific:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Visual Studio Build Tools
  - **Linux**: build-essential, libfuse-dev

## Development Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/YourOrg/otto.git
cd otto

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cd ..

# Frontend + Electron
npm ci
cd frontend && npm ci && cd ..
```

### 2. Database Setup
```bash
cd backend
# Run migrations
alembic upgrade head

# Or let the app auto-run migrations on first launch
cd ..
```

### 3. Run Development Mode
```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
export APP_ENV=development
export PORT=8000
python main.py

# Terminal 2: Frontend
cd frontend
npm run dev  # Vite dev server on :5173

# Terminal 3: Electron
npm run dev  # or manually: npx electron main.js
```

The app will:
- Open Electron window
- Backend runs on :8000
- Frontend dev server on :5173
- Electron dev tools show console output

## Building

### Full Release Build (All Platforms)

**From repo root:**
```bash
bash build.sh
```

This:
1. Builds Vite frontend → `dist-desktop/frontend/`
2. Builds PyInstaller backend → `dist-desktop/backend/sidecar` (or `.exe`)
3. Builds Electron app with both bundled

**Time**: ~5-10 minutes depending on platform

### Individual Component Builds

**Frontend only:**
```bash
bash build_frontend.sh
# Output: frontend/dist/
```

**Backend only:**
```bash
cd backend && bash build_backend.sh && cd ..
# Output: backend/dist/otto-backend (or .exe)
```

**Electron only (requires dist-desktop/backend and dist-desktop/frontend):**
```bash
cd frontend
npm run build
# Output: dist-electron/ (installers)
```

## Environment Variables

### Development
```bash
APP_ENV=development      # Enables debug, auth disabled
PORT=8000               # Backend port
DATABASE_URL=sqlite:///backend/otto_data/db/otto.db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Production (Desktop)
```bash
APP_ENV=desktop         # Disables debug, auth disabled (still)
PORT=8000+              # Auto-selected free port
DATABASE_URL=sqlite:///{APP_DATA_DIR}/otto.db
STORAGE_ROOT={APP_DATA_DIR}/storage
IMPORT_LOGS_ROOT={APP_DATA_DIR}/import_logs
```

## Testing

### Unit Tests
```bash
cd backend
pytest tests/
```

### E2E Tests (Dev Mode)
1. Run dev setup (see Development Setup)
2. Open http://localhost:5173
3. Manually test:
   - [ ] Create a record
   - [ ] Edit it
   - [ ] Verify it persists after page reload
   - [ ] Create backup
   - [ ] Restore backup
   - [ ] Check config persists

### Build Testing
```bash
# After running build.sh, test the built installer:

# macOS
open dist-electron/OTTO-1.0.1-arm64.dmg

# Windows
dist-electron/OTTO-Setup-1.0.1.exe

# Linux
./dist-electron/OTTO-1.0.1.AppImage
```

**Test checklist:**
- [ ] App launches without errors
- [ ] First-run wizard appears
- [ ] Can set Mode, Node Name, Hub URL
- [ ] Dashboard loads
- [ ] Can create a record
- [ ] Data persists after restart
- [ ] No CORS errors in DevTools
- [ ] Backup button works
- [ ] Restore button works

## Database Migrations

### Creating a New Migration
```bash
cd backend
alembic revision --autogenerate -m "description of change"
# Edit alembic/versions/xxxx_description.py if needed
alembic upgrade head
```

### SQLite Compatibility
- Alembic migrations run on startup (SQLite only)
- Some Postgres features have fallbacks in code
- Test migrations against SQLite before merging

### Checking Migrations
```bash
alembic current       # Show current revision
alembic heads         # Show branch heads
alembic history       # Show all revisions
```

## Release Process

### 1. Prepare Release
```bash
# Update version (already set to 1.0.1 in config)
# Update CHANGELOG (if you have one)
git add -A
git commit -m "chore: prepare v1.0.1 release"
```

### 2. Tag & Push
```bash
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

### 3. GitHub Actions Build
- Tag push triggers `.github/workflows/release.yml`
- Builds macOS (Intel + ARM), Windows, Linux in parallel
- Creates GitHub release with all installers
- **Time**: ~30 minutes

### 4. Post-Release
```bash
# Verify installers on each platform
# Test against real use case
# Document any known issues
# Update website/docs with new version
```

## Debugging

### Electron
```bash
# Enable dev tools in Electron
# Press: Ctrl+Shift+I (or Cmd+Option+I on macOS)
# See:
#  • Console logs from both frontend and backend
#  • Network requests to /api/*
#  • App state
```

### Backend
```bash
# Backend logs to:
# {APP_DATA_DIR}/logs/otto_backend.log

# Also check stderr in Electron console
tail -f ~/Library/Application\ Support/OTTO/logs/otto_backend.log  # macOS
type %APPDATA%\Local\OTTO\logs\otto_backend.log                    # Windows
tail -f ~/.local/share/OTTO/logs/otto_backend.log                  # Linux
```

### Port Conflicts
```bash
# Check what's using a port (macOS/Linux)
lsof -i :8000
# Windows
netstat -ano | findstr :8000

# Kill process if needed
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

## Package Structure

```
otto/
├── main.js                  # Electron launcher
├── preload.js              # IPC bridge
├── build.sh                # Master build script
├── build_frontend.sh        # Vite build
│
├── frontend/
│   ├── src/
│   ├── vite.config.js
│   ├── package.json
│   └── dist/               # Built static files
│
├── backend/
│   ├── main.py             # FastAPI app
│   ├── config.py           # Settings
│   ├── database.py         # SQLAlchemy setup
│   ├── build_backend.py    # PyInstaller spec generator
│   ├── build_backend.sh    # Build script
│   ├── alembic/            # Database migrations
│   │   └── versions/
│   ├── models/             # SQLAlchemy models
│   ├── routes/             # API endpoints
│   │   ├── backup.py       # NEW: Backup/Restore
│   │   └── config.py       # NEW: Hub/Spoke config
│   ├── requirements.txt
│   └── dist/               # PyInstaller output
│
├── .github/
│   └── workflows/
│       └── release.yml     # GitHub Actions build
│
├── RUNBOOK.md              # User guide
├── DEV_BUILD.md            # This file
└── ...other docs
```

## Troubleshooting Builds

### PyInstaller Fails
```
Error: ModuleNotFoundError: 'routes.backup'
```
**Solution**: Ensure routes/__init__.py exists and imports backup, config

### Electron Build Fails
```
Error: Cannot find module 'frontend/dist/index.html'
```
**Solution**: Run `bash build_frontend.sh` first

### Frontend Build Fails
```
VITE v5.x build failed
```
**Solution**: 
```bash
cd frontend
npm ci  # Clean install
npm run build
```

## Performance Notes

- **Startup**: ~3-5 seconds (Electron + backend spawn + health check)
- **First page load**: ~2 seconds (Vite built app is ~500KB)
- **Database operations**: SQLite is fast for single-user (typically <100ms)
- **Large backups**: 500MB+ databases may take >5 seconds to backup

## Security Notes

- **No auth in V1.0.1**: Desktop mode assumes single-user/local network
- **Database**: SQLite file is unencrypted (add if needed for sensitive data)
- **Backups**: Contain full database + files (plain zip, no encryption)
- **Port**: Backend only listens on 127.0.0.1 (local only)

## Next Releases

### V1.1.0 Ideas
- [ ] Multi-user auth
- [ ] Database encryption
- [ ] Backup encryption
- [ ] Sync conflict resolution
- [ ] Auto-backup feature
- [ ] Database compaction
- [ ] Dark mode

### V2.0.0 Ideas
- [ ] Cloud sync (Hub aggregation)
- [ ] Real-time collaboration
- [ ] Full-text search
- [ ] Advanced reporting
- [ ] API authentication
- [ ] Custom fields

---

**Last Updated**: 2026-02-09  
**Version**: 1.0.1  
**Maintainer**: Engineering Team

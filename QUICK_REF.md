# OTTO V1.0.1 Quick Reference

**Fast reference for developers building and releasing OTTO V1.0.1**

## One-Minute Setup

```bash
# Clone
git clone https://github.com/yourorg/otto.git && cd otto

# Install
npm ci                          # Root deps
cd frontend && npm ci && cd ..  # Frontend
cd backend && pip install -r requirements.txt && cd ..  # Backend

# Run dev (3 terminals)
Terminal 1: cd backend && python main.py
Terminal 2: cd frontend && npm run dev
Terminal 3: npm run dev  # Electron
```

## Build Commands

```bash
# Full build (all platforms) - 5-10 minutes
bash build.sh

# Component builds
bash build_frontend.sh           # Vite → frontend/dist/
cd backend && bash build_backend.sh && cd ..  # PyInstaller → backend/dist/

# Verify build outputs
ls dist-desktop/frontend/        # Static frontend
ls dist-desktop/backend/sidecar* # Backend binary
ls dist-electron/*.dmg           # macOS installer
ls dist-electron/*.exe           # Windows installer
ls dist-electron/*.AppImage      # Linux installer
```

## Release to GitHub

```bash
# 1. Verify everything works locally
bash build.sh && test the installer

# 2. Tag and push
git tag v1.0.1
git push origin v1.0.1

# 3. Wait for GitHub Actions (~30 min)
# → Builds all platforms automatically
# → Creates release with installers
# → https://github.com/yourorg/otto/releases/tag/v1.0.1
```

## Test Checklist (2 min each platform)

```
macOS:
[ ] Run .dmg installer
[ ] Open from Applications
[ ] Config wizard appears
[ ] /api/health responds
[ ] Can create a record
[ ] Data persists after restart

Windows:
[ ] Run Setup .exe
[ ] Check Start Menu
[ ] Config wizard appears
[ ] /api/health responds
[ ] Can create a record
[ ] Data persists after restart

Linux:
[ ] chmod +x .AppImage
[ ] ./OTTO*.AppImage
[ ] Config wizard appears
[ ] /api/health responds
[ ] Can create a record
[ ] Data persists after restart
```

## File Locations (Runtime)

```
macOS:     ~/Library/Application Support/OTTO/
           └── otto.db
           └── storage/
           └── logs/
           └── config.json

Windows:   %APPDATA%\Local\OTTO\
           └── otto.db
           └── storage/
           └── logs/
           └── config.json

Linux:     ~/.local/share/OTTO/
           └── otto.db
           └── storage/
           └── logs/
           └── config.json
```

## Key Files Modified

| File | Change | Why |
|------|--------|-----|
| main.js | Dynamic port, app data dirs | Offline operation |
| config.py | SQLite default, env vars | Single-file DB |
| main.py | Migrations, static serve | Auto-setup + browser UI |
| routes/backup.py | NEW | Data protection |
| routes/config.py | NEW | Hub/Spoke setup |
| build.sh | New orchestration | Multi-platform build |
| .github/workflows/release.yml | NEW | Automated release |

## Common Issues

| Issue | Fix |
|-------|-----|
| "Port 8000 in use" | App auto-selects 8001+, check logs |
| "Database locked" | Only one instance at a time |
| "CORS error" | Use relative paths `/api/*` in frontend |
| "Backend won't start" | Check `{APP_DATA_DIR}/logs/otto_backend.log` |
| PyInstaller fails | `pip install --upgrade pyinstaller` |
| Electron build slow | Parallel builds on CI, local sequential ok |

## Useful Commands

```bash
# Check version
grep APP_VERSION backend/config.py

# View backend logs
tail -f ~/Library/Application\ Support/OTTO/logs/otto_backend.log

# Test API
curl http://127.0.0.1:8000/health

# Find port
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Clean rebuild
rm -rf frontend/dist backend/dist dist-desktop dist-electron
bash build.sh

# Database migrations
cd backend && alembic upgrade head && cd ..
```

## Env Variables (Advanced)

```bash
# Development
APP_ENV=development
DATABASE_URL=sqlite:////Users/.../otto.db
PORT=8000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Production (Auto-set by Electron)
APP_ENV=desktop
PORT=8000+  # Auto-discovered
DATABASE_URL=sqlite:///{APP_DATA_DIR}/otto.db
STORAGE_ROOT={APP_DATA_DIR}/storage
IMPORT_LOGS_ROOT={APP_DATA_DIR}/import_logs
```

## Package Sizes

```
Backend:     ~80-120 MB (PyInstaller bundle with Python runtime)
Frontend:    ~3-5 MB (Vite built, gzipped)
Database:    ~10 MB (empty SQLite)
Installer:   ~150-200 MB per platform
```

## Performance Targets

- **Startup**: <5 sec (Electron + backend + health check)
- **First load**: <2 sec (static SPA + API)
- **DB query**: <100ms (SQLite on SSD)
- **Backup 100MB**: <5 sec
- **Restore 100MB**: <10 sec

## Support

| Question | Answer |
|----------|--------|
| Is offline supported? | Yes, fully works offline |
| Is it multi-user? | Not in V1.0.1 (desktop mode) |
| Can I use Postgres? | Yes, set DATABASE_URL=postgresql://... |
| Can I run in cloud? | Yes, Docker/Dockerfile included |
| Is it encrypted? | Database no, can add via full-disk encryption |
| Who can contribute? | See CONTRIBUTING.md (if exists) |

---

**Last Updated**: 2026-02-09  
**Version**: 1.0.1

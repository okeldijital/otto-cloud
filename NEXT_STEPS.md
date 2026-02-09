# OTTO V1.0.1: Next Steps (Action Items)

## 🎯 Immediate: Complete Setup (5 minutes)

### Step 1: Finalize main.py
```bash
# Open a fresh terminal and run:
cd /Users/m2krproduction/otto
python3 finalize_main.py
```

**Expected output:**
```
✅ Updated route imports
✅ Added route mounting
✅ Added migration function
✅ Added migration call to startup

✅ COMPLETE: main.py updated successfully!
```

**Verify success:**
```bash
grep -c "import backup" backend/main.py    # Should print: 1
grep -c "app.include_router(backup" backend/main.py  # Should print: 1
grep -c "_run_migrations" backend/main.py  # Should print: 3 (import, def, call)
```

---

## 🎯 Short Term: Build & Test (30 minutes)

### Step 2: Test Backend Startup
```bash
cd backend
python3 main.py
```

**Expected**: Backend starts without errors
- See: "✅ Backend is healthy!"
- See: "🔄 Running Alembic migrations..."
- See: "✅ Migrations completed"
- See: "🚀 OTTO Backend starting on port 8000"

**Check health**:
```bash
curl http://127.0.0.1:8000/health
# Expected: {"status": "ok", "env": "desktop"}
```

### Step 3: Local Build Test
```bash
cd /Users/m2krproduction/otto
bash build.sh
```

**Expected output**:
```
✅ BUILD COMPLETE!
📦 Artifacts:
  • DMG: dist-electron/OTTO-*.dmg
  • APP: dist-electron/OTTO-*.app
```

**Verify outputs exist**:
```bash
ls -lh dist-desktop/frontend/     # Static files
ls -lh dist-desktop/backend/      # Backend binary
ls -lh dist-electron/             # Installers (may be in nested dir)
```

### Step 4: Manual Smoke Test
1. Find the installer for your platform
2. Run it
3. First-run wizard should appear (if UI implemented)
4. If not: Dashboard should load
5. Check DevTools Console (F12): No CORS errors
6. Test: `/api/health` should respond

---

## 🎯 Medium Term: Frontend Implementation (1-2 hours)

### Step 5A: Add First-Run Wizard Component

**File**: `frontend/src/pages/FirstRunWizard.jsx`

Copy from `FRONTEND_INTEGRATION.md` section "1. CONFIG WIZARD COMPONENT"

**Test**:
```bash
cd frontend && npm run dev
# Visit http://localhost:5173
# Should see wizard if first run
```

### Step 5B: Add Backup/Restore Component

**File**: `frontend/src/components/BackupRestore.jsx`

Copy from `FRONTEND_INTEGRATION.md` section "2. BACKUP/RESTORE COMPONENT"

**Test**:
```bash
# Add to a Settings page component
# Test: Create backup button works
# Test: Restore button works
```

### Step 5C: Update App Shell

**File**: `frontend/src/App.jsx`

Copy from `FRONTEND_INTEGRATION.md` section "3. APP SHELL INTEGRATION"

**Test**:
```bash
# Fresh app should check first run
# POST /api/config should work
# Redirect to dashboard after config
```

### Step 5D: Add Services

**File**: `frontend/src/services/backupService.js`
**File**: `frontend/src/services/configService.js`

Copy from `FRONTEND_INTEGRATION.md` section "4. API SERVICE HELPER"

### Step 5E: Add Styling

Add CSS for:
```css
.first-run-wizard { /* Wizard container */ }
.mode-selector { /* Radio button container */ }
.backup-restore { /* Backup panel */ }
.success { /* Green message */ }
.error { /* Red message */ }
.loading { /* Loading spinner */ }
```

---

## 🎯 Release: Ship to GitHub (10 minutes)

### Step 6: Final Verification
```bash
# 1. Backend startup clean
cd backend && python3 main.py &
sleep 2 && curl http://127.0.0.1:8000/health && kill %1

# 2. Build succeeds
cd /Users/m2krproduction/otto
bash build.sh

# 3. Check all outputs
ls dist-electron/ | grep -E "\.(dmg|exe|AppImage)"
```

### Step 7: Create GitHub Release
```bash
cd /Users/m2krproduction/otto

# Verify clean git status
git status

# Create tag
git tag v1.0.1 -m "OTTO V1.0.1 Release - Browser + SQLite"

# Push
git push origin v1.0.1

# Monitor GitHub Actions
# → Go to: https://github.com/yourorg/otto/actions
# → Watch all platforms build
# → Release auto-created with installers (~30 min)
```

### Step 8: Verify Release
```bash
# Check release page
# https://github.com/yourorg/otto/releases/tag/v1.0.1

# Should see:
# - OTTO-1.0.1-x64.dmg (macOS Intel)
# - OTTO-1.0.1-arm64.dmg (macOS ARM)
# - OTTO-Setup-1.0.1.exe (Windows)
# - OTTO-1.0.1.AppImage (Linux)
```

---

## 📋 Complete Checklist

### Before You Start (TODAY)
- [ ] Run finalize_main.py
- [ ] Verify backend starts
- [ ] Test local build

### Frontend Implementation (TOMORROW)
- [ ] FirstRunWizard component
- [ ] BackupRestore component
- [ ] App.jsx integration
- [ ] Services (backupService, configService)
- [ ] Add CSS styling
- [ ] Test all components

### Platform Testing (NEXT DAY)
- [ ] Download .dmg and test on macOS
- [ ] Download .exe and test on Windows
- [ ] Download .AppImage and test on Linux

### Go Live (WHEN READY)
- [ ] git tag v1.0.1
- [ ] git push origin v1.0.1
- [ ] Monitor GitHub Actions
- [ ] Announce release

---

## 🆘 Troubleshooting

### Issue: finalize_main.py fails
```
Error: File not found / Permission denied
```
**Solution**:
```bash
cd /Users/m2krproduction/otto
ls -la finalize_main.py  # Verify it exists
python3 finalize_main.py  # Try again
```

### Issue: Backend won't start
```
Error: Port 8000 in use / Address already in use
```
**Solution**:
```bash
lsof -i :8000  # Find what's using it
kill -9 <PID>  # Kill it
python3 main.py  # Try again
```

### Issue: Build fails
```
Error: npm ERR! Missing dependencies / PyInstaller not found
```
**Solution**:
```bash
npm ci  # Clean install frontend
pip install pyinstaller  # Install PyInstaller
bash build.sh  # Try again
```

### Issue: API not responding
```
Error: CORS error / Connection refused
```
**Solution**:
1. Check backend is running: `curl http://127.0.0.1:8000/health`
2. Check frontend calling correct URL: should be `/api/*` (relative)
3. Check Electron window opening right port: check console for port number

---

## 📞 Reference Documents

**Quick Commands**: `QUICK_REF.md`
**User Guide**: `RUNBOOK.md`
**Developer Guide**: `DEV_BUILD.md`
**Frontend Code**: `FRONTEND_INTEGRATION.md`
**Full Summary**: `RELEASE_SUMMARY.md`
**Implementation Status**: `IMPLEMENTATION_STATUS.md`

---

## ✨ Timeline Estimate

| Step | Time | Status |
|------|------|--------|
| finalize_main.py | 1 min | ⏳ Do now |
| Backend test | 2 min | ⏳ Do now |
| Local build | 10 min | ⏳ Do now |
| Smoke test | 10 min | ⏳ Do now |
| Frontend components | 90 min | 📋 Tomorrow |
| Testing (3 platforms) | 30 min | 📋 Next day |
| GitHub release | 5 min | 📋 When ready |
| GitHub Actions build | 30 min | 🔄 Auto |
| **Total (non-CI)** | **3 hours** | |

---

## 🎯 Success Criteria

After completing all steps:
- [ ] `curl http://127.0.0.1:8000/health` returns ok
- [ ] First-run wizard displays
- [ ] User can create records
- [ ] Data persists after restart
- [ ] Backup button creates .zip
- [ ] Restore button works
- [ ] No CORS errors in DevTools
- [ ] App works offline
- [ ] All 4 installers built (dmg, exe, appimage, deb)
- [ ] GitHub release page has all files

---

## 🚀 Launch!

Once all items are complete:

1. **Announce**: Share release link
2. **Update Docs**: Point users to RUNBOOK.md
3. **Gather Feedback**: Monitor for issues
4. **Plan V1.1**: Start next iteration

---

**Your Next Action**: 
```bash
cd /Users/m2krproduction/otto && python3 finalize_main.py
```

Then send me the output or let me know if you hit any issues! ✅

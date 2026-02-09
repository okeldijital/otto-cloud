#!/bin/bash
# OTTO Desktop App Builder (Electron + React + Python)

set -e  # Exit on error

# Configuration
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() { echo -e "${BLUE}➜${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }

# 1. Verification
print_step "Verifying environment..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ python3 is required"; exit 1; }

# 2. Build Frontend
print_step "Building Frontend..."
cd frontend
npm install --silent
npm run build
cd ..

# Move frontend build to top-level dist-desktop for Electron to pick up
rm -rf dist-desktop
mv frontend/dist dist-desktop
print_success "Frontend built and moved to dist-desktop"

# 3. Build Backend
print_step "Building Backend..."
cd backend
# Create virtual environment if not exists (optional, but good practice)
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate || true
pip install -r requirements.txt
pip install pyinstaller

# PyInstaller Build
# We include hidden imports that often cause issues
pyinstaller --noconfirm --onefile --windowed --name sidecar \
    --hidden-import "uvicorn.logging" \
    --hidden-import "uvicorn.loops" \
    --hidden-import "uvicorn.loops.auto" \
    --hidden-import "uvicorn.protocols" \
    --hidden-import "uvicorn.protocols.http" \
    --hidden-import "uvicorn.protocols.http.auto" \
    --hidden-import "uvicorn.lifespan" \
    --hidden-import "uvicorn.lifespan.on" \
    --hidden-import "sqlalchemy.sql.default_comparator" \
    --hidden-import "passlib.handlers.bcrypt" \
    --hidden-import "apscheduler" \
    --hidden-import "apscheduler.triggers.date" \
    --hidden-import "apscheduler.triggers.interval" \
    --hidden-import "apscheduler.triggers.cron" \
    --hidden-import "engineio.async_drivers.threading" \
    --clean \
    main.py

# Ensure dist exists
mkdir -p dist

cd ..
print_success "Backend binary built at backend/dist/sidecar"

# 3.5. Pre-Package Validation
print_step "Validating Build Artifacts..."

# Check Frontend
if [ ! -f "dist-desktop/index.html" ]; then
    echo "❌ Error: dist-desktop/index.html missing."
    exit 1
fi

# Check Backend Binary
SIDECAR_PATH="backend/dist/sidecar"
if [ ! -f "$SIDECAR_PATH" ]; then
    echo "❌ Error: Backend binary missing at $SIDECAR_PATH"
    exit 1
fi
chmod +x "$SIDECAR_PATH"
print_success "Build artifacts validated."

# 4. Package Electron App
print_step "Packaging Electron App..."
npm install
npx electron-builder --mac

print_success "Build Complete!"
echo "App is located in dist-electron/"

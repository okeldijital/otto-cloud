#!/bin/bash
# Main build script for Otto V1.0.1 Installer
# Builds complete standalone application with Electron launcher + PyInstaller backend + Vite frontend

set -e

echo "🚀 Otto V1.0.1 Build System"
echo "===================================="
echo "Building: Electron + PyInstaller Backend + Vite Frontend"
echo ""

# Detect platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
    ARCH=$(uname -m)
    if [[ "$ARCH" == "arm64" ]]; then
        ELECTRON_TARGET="arm64-apple-darwin"
    else
        ELECTRON_TARGET="x64-apple-darwin"
    fi
    echo "✅ Target: macOS ($ARCH)"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
    ARCH=$(uname -m)
    ELECTRON_TARGET="$ARCH-unknown-linux-gnu"
    echo "✅ Target: Linux ($ARCH)"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    PLATFORM="windows"
    ARCH=$(uname -m)
    ELECTRON_TARGET="$ARCH-pc-windows-msvc"
    echo "✅ Target: Windows ($ARCH)"
else
    echo "❌ Unknown platform: $OSTYPE"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Clean previous builds
echo ""
echo "🧹 Cleaning previous builds..."
rm -rf dist frontend/dist backend/dist backend/build

# Step 1: Build Frontend
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/3: Building Frontend (Vite)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash build_frontend.sh

# Step 2: Build Backend
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/3: Building Backend (PyInstaller)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash backend/build_backend.sh

# Step 3: Build Electron App
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/3: Building Electron App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd frontend

echo "📦 Installing Electron dependencies..."
npm ci

echo "🔨 Building Electron app for $PLATFORM..."
npm run build

echo "✅ Electron build complete!"

# Results
echo ""
echo "═════════════════════════════════════════════════════"
echo "✅ BUILD COMPLETE!"
echo "═════════════════════════════════════════════════════"
echo ""
echo "📦 Artifacts:"
if [[ "$PLATFORM" == "macos" ]]; then
    echo "  • DMG: dist-electron/OTTO-*.dmg"
    echo "  • APP: dist-electron/OTTO-*.app"
elif [[ "$PLATFORM" == "linux" ]]; then
    echo "  • AppImage: dist-electron/OTTO-*.AppImage"
    echo "  • Deb: dist-electron/OTTO-*.deb"
elif [[ "$PLATFORM" == "windows" ]]; then
    echo "  • EXE: dist-electron/OTTO-*.exe"
    echo "  • Installer: dist-electron/OTTO-Setup-*.exe"
fi

echo ""
echo "Next steps:"
echo "  1. Test the installer on this platform"
echo "  2. Commit and tag: git tag v1.0.1"
echo "  3. Push to GitHub: git push origin v1.0.1"
echo "  4. GitHub Actions will build for all platforms"
source .venv/bin/activate
pyinstaller --clean --noconfirm otto.spec

# 3. Create Distribution Package
echo "📦 Packaging for Distribution..."
cd dist
zip -r ../OTTO-Desktop-Shell-v1.0.0.zip OTTO.app
cd ..

echo "✅ Build Complete!"
echo "👉 Installer Package: OTTO-Installer-v1.0.0.zip"
echo "To install: Unzip and drag OTTO.app to your Applications folder."

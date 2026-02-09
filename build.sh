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

cd "$SCRIPT_DIR"

echo "📦 Installing root dependencies..."
npm install

echo "📦 Setting up Electron packaging..."

# Create distribution output dir
mkdir -p dist-electron

# Copy frontend build to public for Electron packaging
mkdir -p public
cp -r dist-desktop/frontend/* public/ 2>/dev/null || true

# Copy backend binary to resources
mkdir -p resources
cp dist-desktop/backend/sidecar resources/backend 2>/dev/null || true

# Build Electron app with electron-builder
echo "🔨 Building Electron installers..."
electron-builder --publish never

echo "✅ Electron build complete!"

# Results
echo ""
echo "═════════════════════════════════════════════════════"
echo "✅ BUILD COMPLETE!"
echo "═════════════════════════════════════════════════════"
echo ""
echo "📦 Artifacts in dist-electron/:"
ls -lh dist-electron/ 2>/dev/null || echo "  (Building...)"

echo ""
echo "Next steps:"
echo "  1. Test the installer on this platform"
echo "  2. Commit: git add -A && git commit -m 'fixes'"
echo "  3. Tag: git tag -d v1.0.1; git tag v1.0.1"
echo "  4. Push: git push origin v1.0.1 --force"

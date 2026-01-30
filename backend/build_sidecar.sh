#!/bin/bash
set -e

# Detect architecture for Tauri target triple
ARCH=$(uname -m)
if [ "$ARCH" == "arm64" ]; then
  TRIPLE="aarch64-apple-darwin"
elif [ "$ARCH" == "x86_64" ]; then
  TRIPLE="x86_64-apple-darwin"
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi

echo "🚀 Building Backend Sidecar for $TRIPLE..."

# Clean
rm -rf build dist

# Build with PyInstaller
# Ensure we are in backend dir
cd "$(dirname "$0")" || exit
pyinstaller --clean --noconfirm sidecar.spec

# Move and rename binary
# Move and rename binary
if [ -f "dist/backend" ]; then
  # Create binaries directory if it doesn't exist
  mkdir -p "../frontend/src-tauri/binaries"
  
  # Copy for Tauri
  cp "dist/backend" "../frontend/src-tauri/binaries/backend-$TRIPLE"
  echo "✅ Sidecar binary placed at ../frontend/src-tauri/binaries/backend-$TRIPLE"
else
  echo "❌ Error: dist/backend binary not found!"
  exit 1
fi

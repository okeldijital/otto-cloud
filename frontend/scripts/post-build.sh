#!/bin/bash
# Post-build script to fix Tauri bundling issues
# This script copies the executables to the correct location in the app bundle

set -e

echo "🔧 Running post-build fix for Tauri bundle..."

BUNDLE_DIR="src-tauri/target/release/bundle/macos/otto.app"
MACOS_DIR="$BUNDLE_DIR/Contents/MacOS"
RESOURCES_DIR="$BUNDLE_DIR/Contents/Resources"

# Check if bundle exists
if [ ! -d "$BUNDLE_DIR" ]; then
    echo "❌ Bundle directory not found: $BUNDLE_DIR"
    exit 1
fi

# Create MacOS directory if it doesn't exist
mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"

# Copy main app executable
echo "📦 Copying app executable..."
cp src-tauri/target/release/app "$MACOS_DIR/app"
chmod +x "$MACOS_DIR/app"

# Copy backend sidecar
echo "📦 Copying backend executable..."
cp src-tauri/binaries/backend-aarch64-apple-darwin "$MACOS_DIR/backend"
chmod +x "$MACOS_DIR/backend"

# Verify
echo "✅ Verifying executables..."
ls -lh "$MACOS_DIR/"

echo "✅ Post-build fix complete!"
echo "📍 App bundle: $BUNDLE_DIR"

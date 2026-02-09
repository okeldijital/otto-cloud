#!/bin/bash
# Build script for Otto V1.0.1 - Backend binary
# Creates a PyInstaller bundle for the backend

set -e

echo "Otto Backend Build Script"
echo "===================================="

# Detect platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
    ARCH=$(uname -m)
    echo "Platform: macOS $ARCH"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
    ARCH=$(uname -m)
    echo "Platform: Linux $ARCH"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    PLATFORM="windows"
    ARCH=$(uname -m)
    echo "Platform: Windows $ARCH"
else
    echo "ERROR: Unknown platform: $OSTYPE"
    exit 1
fi

cd "$(dirname "$0")"

# Install dependencies if needed
echo "Checking Python dependencies..."
if ! command -v pyinstaller &> /dev/null; then
    echo "Installing PyInstaller..."
    pip3 install pyinstaller
fi

# Generate spec file
echo "Generating PyInstaller spec..."
python3 build_backend.py

# Build the binary
echo "Building backend binary..."
mkdir -p build dist

# PyInstaller command
pyinstaller --onefile \
    --add-data "alembic:alembic" \
    --add-data "alembic.ini:." \
    --collect-all sqlalchemy \
    --collect-all alembic \
    --collect-all pydantic \
    --collect-all fastapi \
    --hidden-import uvicorn.lifespan.on \
    --hidden-import uvicorn.protocols.websocket \
    --hidden-import uvicorn.protocols.websocket_auto \
    --hidden-import uvicorn.protocols.http.auto \
    --hidden-import routes.backup \
    --hidden-import routes.config \
    --name otto-backend \
    main.py

echo "Backend build complete!"
ls -lh dist/

# Create output directory for Electron bundling
OUTPUT_DIR="../dist-desktop/backend"
mkdir -p "$OUTPUT_DIR"

if [[ "$PLATFORM" == "macos" ]]; then
    cp "dist/otto-backend" "$OUTPUT_DIR/sidecar"
    chmod +x "$OUTPUT_DIR/sidecar"
    echo "Copied to: $OUTPUT_DIR/sidecar"
elif [[ "$PLATFORM" == "linux" ]]; then
    cp "dist/otto-backend" "$OUTPUT_DIR/sidecar"
    chmod +x "$OUTPUT_DIR/sidecar"
    echo "Copied to: $OUTPUT_DIR/sidecar"
elif [[ "$PLATFORM" == "windows" ]]; then
    cp "dist/otto-backend.exe" "$OUTPUT_DIR/sidecar.exe"
    echo "Copied to: $OUTPUT_DIR/sidecar.exe"
fi

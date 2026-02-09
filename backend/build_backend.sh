#!/bin/bash
# Build script for Otto V1.0.1 - Backend binary
# Creates a PyInstaller bundle for the backend

set -e

echo "Otto Backend Build Script"
echo "===================================="

# Resolve Python/Pip in a cross-platform way (CI includes Windows runners)
if command -v python3 &> /dev/null; then
    PYTHON="python3"
else
    PYTHON="python"
fi

if "$PYTHON" -m pip --version &> /dev/null; then
    PIP="$PYTHON -m pip"
elif command -v pip3 &> /dev/null; then
    PIP="pip3"
else
    PIP="pip"
fi

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

# Governance + runtime dependency gate
echo "Running dependency governance checks..."
$PYTHON governance_check.py

echo "Installing backend runtime dependencies (single source of truth: backend/requirements.txt)..."
$PIP install -r requirements.txt

echo "Running pre-flight runtime import check..."
$PYTHON preflight_check.py

# Install dependencies if needed
echo "Checking Python dependencies..."
if ! command -v pyinstaller &> /dev/null; then
    echo "Installing PyInstaller..."
    $PIP install pyinstaller
fi

# Build the binary
echo "Building backend binary..."
mkdir -p build dist

echo "Using maintained PyInstaller spec (governance lock)..."
$PYTHON build_backend.py
pyinstaller --clean --noconfirm otto-backend.spec

echo "Backend build complete!"
ls -lh dist/

# Runtime smoke test hard gate
echo "Running backend runtime smoke test (/health)..."
if [[ "$PLATFORM" == "windows" ]]; then
    $PYTHON smoke_test.py "dist/otto-backend.exe"
else
    $PYTHON smoke_test.py "dist/otto-backend"
fi

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

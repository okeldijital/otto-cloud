#!/bin/bash
set -e

cd "$(dirname "$0")"

REPO_ROOT="$(cd ../.. && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"

# Create isolated venv for packaging (deterministic + avoids global site-packages)
PYTHON_BIN="${PYTHON_BIN:-python3.12}"
$PYTHON_BIN -m venv .venv

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  PYTHON=".venv/Scripts/python"
else
  PYTHON=".venv/bin/python"
fi

PIP="$PYTHON -m pip"

echo "Installer Backend Build (PyInstaller) - Otto V1.0.1"
echo "==============================================="

echo "Using single source of truth: backend/requirements.txt"
$PYTHON "$BACKEND_DIR/governance_check.py"
$PIP install -r "$BACKEND_DIR/requirements.txt"
$PYTHON "$BACKEND_DIR/preflight_check.py"

echo "Ensuring PyInstaller is installed..."
$PIP install pyinstaller

echo "Building backend binary via maintained spec..."
rm -rf build dist
mkdir -p build dist

$PYTHON -m PyInstaller --clean --noconfirm \
  --distpath "dist" \
  --workpath "build" \
  otto_backend.spec

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  test -f "dist/otto_backend/otto_backend.exe"
  echo "✅ Built: installer/backend/dist/otto_backend/otto_backend.exe"
else
  test -f "dist/otto_backend/otto_backend"
  echo "✅ Built: installer/backend/dist/otto_backend/otto_backend"
fi

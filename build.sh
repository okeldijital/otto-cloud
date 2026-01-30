#!/bin/bash
set -e

echo "🛑 Stopping any running instances..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

echo "🚀 Starting OTTO Build Process..."

# Clean previous builds
rm -rf dist build

# 1. Build Frontend
echo "📦 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Build Backend (MacOS App Bundle)
echo "🔨 Building MacOS App Bundle with PyInstaller..."
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

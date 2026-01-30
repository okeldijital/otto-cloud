#!/bin/bash
set -e

echo "🚀 Starting OTTO Build Process..."

# 1. Build Frontend
echo "📦 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Build Backend (Executable)
echo "🔨 Building Executable with PyInstaller..."
source backend/venv/bin/activate
pyinstaller --clean otto.spec

echo "✅ Build Complete!"
echo "👉 Executable is located at: dist/otto"

#!/bin/bash
set -e

cd "$(dirname "$0")"

REPO_ROOT="$(cd ../.. && pwd)"

echo "Installer Frontend Build (Vite) - Otto V1.0.1"
echo "============================================"

cd "$REPO_ROOT/frontend"

echo "Installing frontend dependencies..."
npm ci

echo "Building frontend..."
npm run build

cd "$REPO_ROOT/installer/frontend"
rm -rf dist
mkdir -p dist
cp -R "$REPO_ROOT/frontend/dist/." dist/

echo "✅ Built: installer/frontend/dist"


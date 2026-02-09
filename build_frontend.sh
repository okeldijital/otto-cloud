#!/bin/bash
# Build script for Otto V1.0.1 Frontend (Vite)

set -e

echo "Otto Frontend Build Script"
echo "===================================="

cd "$(dirname "$0")/frontend"

echo "Installing frontend dependencies..."
npm ci

echo "Building frontend with Vite..."
npm run build

echo "Frontend build complete!"
echo "Output: ./dist"
ls -lh dist/

# Create output directory
OUTPUT_DIR="../dist-desktop/frontend"
mkdir -p "$OUTPUT_DIR"
cp -r dist/* "$OUTPUT_DIR/"
echo "Copied to: $OUTPUT_DIR"

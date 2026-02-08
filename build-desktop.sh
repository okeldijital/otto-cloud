#!/bin/bash

# OTTO Desktop App - Quick Start Script
# This script helps you quickly test and build the desktop application

set -e  # Exit on error

echo "🚀 OTTO Desktop App Builder"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}➜${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
print_step "Checking prerequisites..."

# Check Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust is not installed"
    echo "Install with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi
print_success "Rust installed: $(rustc --version)"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi
print_success "Node.js installed: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
print_success "npm installed: $(npm --version)"

echo ""
echo "What would you like to do?"
echo "1) Test desktop app in development mode"
echo "2) Build desktop app for production (macOS)"
echo "3) Build backend binary"
echo "4) Full build (backend + desktop app)"
echo "5) Check Tauri info"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        print_step "Starting desktop app in development mode..."
        print_warning "Make sure your backend is running separately!"
        cd frontend
        npm run desktop:dev
        ;;
    
    2)
        print_step "Building desktop app for production..."
        cd frontend
        
        # Build frontend first
        print_step "Building React frontend..."
        npm run build
        print_success "Frontend built"
        
        # Build Tauri app
        print_step "Building Tauri desktop app..."
        npm run desktop:build:mac
        
        print_success "Desktop app built successfully!"
        echo ""
        echo "📦 Your app is ready at:"
        echo "   frontend/src-tauri/target/release/bundle/macos/OTTO.app"
        echo ""
        echo "To test it:"
        echo "   open src-tauri/target/release/bundle/macos/OTTO.app"
        ;;
    
    3)
        print_step "Building backend binary..."
        cd backend
        
        # Check if PyInstaller is installed
        if ! python -c "import PyInstaller" &> /dev/null; then
            print_step "Installing PyInstaller..."
            pip install pyinstaller
        fi
        
        print_step "Creating standalone backend executable..."
        pyinstaller --onefile \
            --name backend \
            --hidden-import uvicorn \
            --hidden-import fastapi \
            --hidden-import sqlalchemy \
            --hidden-import passlib.handlers.bcrypt \
            main.py
        
        print_step "Copying to Tauri binaries folder..."
        mkdir -p ../frontend/src-tauri/binaries
        cp dist/backend ../frontend/src-tauri/binaries/backend-aarch64-apple-darwin
        chmod +x ../frontend/src-tauri/binaries/backend-aarch64-apple-darwin
        
        print_success "Backend binary created!"
        echo "   Location: frontend/src-tauri/binaries/backend-aarch64-apple-darwin"
        ;;
    
    4)
        print_step "Full build: Backend + Desktop App"
        
        # Build backend
        print_step "Step 1/3: Building backend binary..."
        cd backend
        
        if ! python -c "import PyInstaller" &> /dev/null; then
            pip install pyinstaller
        fi
        
        pyinstaller --onefile \
            --name backend \
            --hidden-import uvicorn \
            --hidden-import fastapi \
            --hidden-import sqlalchemy \
            --hidden-import passlib.handlers.bcrypt \
            main.py
        
        mkdir -p ../frontend/src-tauri/binaries
        cp dist/backend ../frontend/src-tauri/binaries/backend-aarch64-apple-darwin
        chmod +x ../frontend/src-tauri/binaries/backend-aarch64-apple-darwin
        print_success "Backend binary created"
        
        # Build frontend
        cd ../frontend
        print_step "Step 2/3: Building React frontend..."
        npm run build
        print_success "Frontend built"
        
        # Build desktop app
        print_step "Step 3/3: Building Tauri desktop app..."
        npm run desktop:build:mac
        
        print_success "🎉 Full build complete!"
        echo ""
        echo "📦 Your desktop app is ready:"
        echo "   frontend/src-tauri/target/release/bundle/macos/OTTO.app"
        echo ""
        echo "📀 Installer DMG:"
        echo "   frontend/src-tauri/target/release/bundle/dmg/OTTO_*.dmg"
        echo ""
        echo "To test:"
        echo "   open src-tauri/target/release/bundle/macos/OTTO.app"
        ;;
    
    5)
        print_step "Checking Tauri system information..."
        cd frontend
        npx tauri info
        ;;
    
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
print_success "Done!"

# OTTO Desktop Application - Shell Creation Guide

## 🎯 Overview

OTTO already has **Tauri v2** integrated for creating native desktop applications! Tauri allows you to package your web app into a native desktop shell for macOS, Windows, and Linux.

## 🛠️ Available Tools

### **1. Tauri (Primary - Already Integrated)**
- **Version**: 2.9.6
- **What it does**: Wraps your React frontend in a native desktop application
- **Platforms**: macOS, Windows, Linux
- **Bundle size**: Small (~10-20MB) - uses system webview
- **Backend**: Bundles your Python FastAPI backend as an executable

### **2. Alternative Options** (Not currently integrated)
- **Electron**: Larger bundle size, includes Chromium
- **NW.js**: Similar to Electron
- **PWA**: Progressive Web App (web-based, not native)

## 📦 Current Tauri Setup

Your project is already configured with:
- ✅ Tauri CLI installed (`@tauri-apps/cli@2.9.6`)
- ✅ Configuration file (`src-tauri/tauri.conf.json`)
- ✅ Build scripts in `package.json`
- ✅ Backend bundling configured
- ✅ App icons prepared

## 🚀 How to Build Desktop App

### **Development Mode** (Test the desktop app)

```bash
cd frontend
npm run desktop:dev
```

**What this does**:
- Starts the Vite dev server
- Launches Tauri in development mode
- Opens a native window with your app
- Hot-reload enabled for frontend changes
- Backend runs separately (you need to start it manually)

### **Production Build** (Create distributable app)

#### **For macOS (Apple Silicon)**
```bash
cd frontend
npm run desktop:build:mac
```

#### **For All Platforms**
```bash
cd frontend
npm run desktop:build
```

**What this creates**:
- **macOS**: `.dmg` and `.app` files
- **Windows**: `.exe` installer and `.msi`
- **Linux**: `.deb`, `.AppImage`, `.rpm`

**Output location**: `frontend/src-tauri/target/release/bundle/`

## 📋 Current Configuration

### App Details (from `tauri.conf.json`)
```json
{
  "productName": "otto",
  "version": "1.0.2",
  "identifier": "com.otto.app",
  "title": "OTTO",
  "width": 1200,
  "height": 800
}
```

### Backend Bundling
- ✅ Backend is bundled as external binary
- ✅ Pre-built binary exists: `backend-aarch64-apple-darwin`
- ✅ Configured in `externalBin: ["backend"]`

## 🔧 Step-by-Step: Building Your First Desktop App

### **Prerequisites**

1. **Install Rust** (required for Tauri)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Verify Rust installation**
   ```bash
   rustc --version
   cargo --version
   ```

3. **macOS specific**: Install Xcode Command Line Tools
   ```bash
   xcode-select --install
   ```

### **Build Process**

#### **Step 1: Build the Backend Binary**

First, ensure your Python backend is packaged as a standalone executable:

```bash
cd backend

# Install PyInstaller
pip install pyinstaller

# Create standalone executable
pyinstaller --onefile \
  --name backend \
  --add-data "otto_data:otto_data" \
  main.py

# Copy to Tauri binaries folder
cp dist/backend ../frontend/src-tauri/binaries/backend-aarch64-apple-darwin
```

#### **Step 2: Build the Frontend**

```bash
cd frontend

# Build the React app
npm run build

# This creates optimized production build in dist/
```

#### **Step 3: Build the Desktop App**

```bash
# Still in frontend directory
npm run desktop:build:mac
```

**Build output**:
```
frontend/src-tauri/target/release/bundle/
├── dmg/
│   └── OTTO_1.0.2_aarch64.dmg       # Installer
├── macos/
│   └── OTTO.app                      # Application bundle
└── ...
```

#### **Step 4: Test the App**

```bash
# Open the built app
open src-tauri/target/release/bundle/macos/OTTO.app
```

## 🎨 Customization Options

### **1. Update App Icon**

Replace icons in `frontend/src-tauri/icons/`:
- `32x32.png` - Small icon
- `128x128.png` - Medium icon
- `128x128@2x.png` - Retina display
- `icon.icns` - macOS icon
- `icon.ico` - Windows icon

**Generate icons from a single image**:
```bash
cd frontend
npm install -g @tauri-apps/cli
tauri icon path/to/your-icon.png
```

### **2. Update App Metadata**

Edit `frontend/src-tauri/tauri.conf.json`:

```json
{
  "productName": "OTTO Music Manager",
  "version": "1.0.2",
  "identifier": "com.m2krproduction.otto",
  "app": {
    "windows": [{
      "title": "OTTO - Music Rights Management",
      "width": 1400,
      "height": 900,
      "minWidth": 1024,
      "minHeight": 768,
      "resizable": true,
      "fullscreen": false,
      "decorations": true,
      "transparent": false
    }]
  }
}
```

### **3. Add Native Features**

Tauri supports native features like:
- File system access
- System notifications
- System tray
- Auto-updates
- Native dialogs
- Clipboard access

Example - Add system tray:
```json
{
  "app": {
    "systemTray": {
      "iconPath": "icons/icon.png",
      "menuOnLeftClick": false
    }
  }
}
```

## 📱 Platform-Specific Builds

### **macOS**
```bash
# Apple Silicon (M1/M2/M3)
npm run desktop:build:mac

# Intel Mac
tauri build --target x86_64-apple-darwin

# Universal Binary (both architectures)
tauri build --target universal-apple-darwin
```

### **Windows** (from macOS using cross-compilation)
```bash
# Install Windows target
rustup target add x86_64-pc-windows-msvc

# Build for Windows
tauri build --target x86_64-pc-windows-msvc
```

### **Linux**
```bash
# Build for Linux
tauri build --target x86_64-unknown-linux-gnu
```

## 🔐 Code Signing & Distribution

### **macOS Code Signing**

1. **Get Apple Developer Certificate**
   - Enroll in Apple Developer Program ($99/year)
   - Create certificates in Xcode

2. **Configure signing**:
   ```json
   {
     "bundle": {
       "macOS": {
         "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
         "entitlements": null,
         "exceptionDomain": "",
         "frameworks": [],
         "providerShortName": null
       }
     }
   }
   ```

3. **Notarize the app**:
   ```bash
   xcrun notarytool submit OTTO.dmg \
     --apple-id your@email.com \
     --password app-specific-password \
     --team-id TEAM_ID
   ```

### **Windows Code Signing**

1. Get a code signing certificate
2. Configure in `tauri.conf.json`:
   ```json
   {
     "bundle": {
       "windows": {
         "certificateThumbprint": "YOUR_THUMBPRINT",
         "digestAlgorithm": "sha256",
         "timestampUrl": "http://timestamp.digicert.com"
       }
     }
   }
   ```

## 📦 Distribution Options

### **1. Direct Download**
- Upload `.dmg`, `.exe`, `.AppImage` to your website
- Users download and install manually

### **2. App Stores**
- **Mac App Store**: Requires Apple Developer account
- **Microsoft Store**: Requires Microsoft Developer account
- **Snap Store** (Linux): Free distribution

### **3. Auto-Updates**
Tauri supports built-in auto-updates:

```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://releases.myapp.com/{{target}}/{{current_version}}"
    ],
    "dialog": true,
    "pubkey": "YOUR_PUBLIC_KEY"
  }
}
```

## 🧪 Testing Checklist

Before distributing:
- [ ] Test on clean machine (no dev tools)
- [ ] Verify backend starts correctly
- [ ] Check database initialization
- [ ] Test file uploads/downloads
- [ ] Verify all features work offline
- [ ] Test window resizing
- [ ] Check app icon displays correctly
- [ ] Verify app quits cleanly
- [ ] Test on different OS versions
- [ ] Check memory usage
- [ ] Verify no console errors

## 🐛 Common Issues & Solutions

### **Issue: Backend doesn't start**
**Solution**: Ensure backend binary is executable
```bash
chmod +x frontend/src-tauri/binaries/backend-aarch64-apple-darwin
```

### **Issue: Build fails with Rust errors**
**Solution**: Update Rust
```bash
rustup update stable
```

### **Issue: App won't open on macOS**
**Solution**: Remove quarantine attribute
```bash
xattr -cr OTTO.app
```

### **Issue: Large bundle size**
**Solution**: 
- Optimize backend dependencies
- Use PyInstaller with `--onefile` and `--strip`
- Remove unused frontend assets

## 📊 Bundle Size Comparison

| Platform | Tauri | Electron |
|----------|-------|----------|
| macOS    | ~15MB | ~150MB   |
| Windows  | ~12MB | ~140MB   |
| Linux    | ~10MB | ~130MB   |

## 🎯 Quick Commands Reference

```bash
# Development
npm run desktop:dev              # Run in dev mode

# Building
npm run desktop:build            # Build for current platform
npm run desktop:build:mac        # Build for macOS (Apple Silicon)

# Tauri CLI
tauri dev                        # Development mode
tauri build                      # Production build
tauri icon <path>                # Generate icons
tauri info                       # System info
```

## 📚 Additional Resources

- **Tauri Docs**: https://tauri.app/v2/
- **Tauri Discord**: https://discord.com/invite/tauri
- **GitHub**: https://github.com/tauri-apps/tauri
- **Examples**: https://github.com/tauri-apps/tauri/tree/dev/examples

## 🚀 Next Steps

1. **Test Development Mode**:
   ```bash
   cd frontend
   npm run desktop:dev
   ```

2. **Build Backend Binary**:
   ```bash
   cd backend
   pip install pyinstaller
   pyinstaller --onefile main.py
   ```

3. **Create Production Build**:
   ```bash
   cd frontend
   npm run desktop:build:mac
   ```

4. **Test the App**:
   ```bash
   open src-tauri/target/release/bundle/macos/OTTO.app
   ```

5. **Distribute**:
   - Upload to your website
   - Submit to app stores
   - Set up auto-updates

---

**You already have everything you need to create a desktop app!** 🎉

Just run `npm run desktop:dev` to see it in action!

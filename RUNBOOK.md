# OTTO V1.0.1 User Runbook

Welcome to OTTO! This guide walks you through installation, setup, and basic operations.

## Installation

### macOS (Intel & Apple Silicon)
1. Download `OTTO-1.0.1-[arch].dmg` from the releases page
2. Double-click the `.dmg` file
3. Drag the OTTO app to the Applications folder
4. Open Applications → OTTO

### Windows
1. Download `OTTO-Setup-1.0.1.exe` from the releases page
2. Run the installer
3. Follow the installation wizard
4. OTTO will launch automatically after installation

### Linux
1. Download `OTTO-1.0.1.AppImage` from the releases page
2. Make it executable: `chmod +x OTTO-1.0.1.AppImage`
3. Run: `./OTTO-1.0.1.AppImage`

## First Launch

On your first launch, OTTO will:
1. Create a database file at:
   - **macOS**: `~/Library/Application Support/OTTO/otto.db`
   - **Windows**: `%APPDATA%\Local\OTTO\otto.db`
   - **Linux**: `~/.local/share/OTTO/otto.db`
2. Show a configuration wizard asking for:
   - **Mode**: Choose "Hub" (main node) or "Spoke" (satellite)
   - **Node Name**: Give your installation a name (e.g., "HQ", "Studio A")
   - **Hub URL** (Spoke only): If you're a Spoke, enter the Hub's URL

Click "Save" and the dashboard will load.

## Creating Your First Record

1. Navigate to the appropriate section (Catalog, Contracts, etc.)
2. Click the "+" button to add a new record
3. Fill in required fields
4. Click "Save"
5. Your data is saved to the local SQLite database immediately

## Backup & Restore

### Creating a Backup
1. Click the **⚙️ Settings** icon (top right)
2. Select **"Backup & Restore"**
3. Click **"Create Backup"**
4. Choose a save location (recommended: external drive or cloud)
5. The backup `.zip` file contains your entire database and uploads

### Restoring from Backup
1. Click the **⚙️ Settings** icon
2. Select **"Backup & Restore"**
3. Click **"Choose Backup File"**
4. Select a `.zip` backup file
5. Click **"Restore"**
6. OTTO will create a safety copy of your current data, then restore
7. The app will restart with the restored data

> **Important**: Always test restores on a non-production instance first!

## Basic Troubleshooting

### "Backend failed to start"
- **macOS**: Check System Settings → Security & Privacy for app permissions
- **Windows**: Ensure port 8000+ is not blocked by firewall
- **Linux**: Run `lsof -i :8000` to check for conflicting processes
- Try restarting the app

### "Database locked" error
- Ensure only one instance of OTTO is running
- Restart the app

### App is slow / freezes
- Check available disk space (OTTO needs ~500MB free)
- Try: Settings → Database → "Optimize" (if available)
- Restart the app

### Data not saving
- Verify you see "✓ Saved" confirmation after editing
- Check the database file exists (see First Launch paths)
- Restore from backup if data is corrupted

## Storage & File Uploads

OTTO stores uploaded files (PDFs, images, audio) in:
- **macOS**: `~/Library/Application Support/OTTO/storage/`
- **Windows**: `%APPDATA%\Local\OTTO\storage\`
- **Linux**: `~/.local/share/OTTO/storage/`

These files are included in your backups automatically.

## Offline Operation

OTTO is fully functional offline. If you're using Hub/Spoke mode:
- **Hub** nodes: Work normally, no internet needed
- **Spoke** nodes: Work offline; sync to Hub when connected

## Uninstallation

### macOS
1. Open Applications folder
2. Drag OTTO to Trash
3. To remove all data: Delete `~/Library/Application Support/OTTO/`

### Windows
1. Settings → Apps → Apps & features
2. Find "OTTO" and click "Uninstall"
3. To remove all data: Delete `%APPDATA%\Local\OTTO\`

### Linux
1. Delete the `.AppImage` file
2. To remove all data: Delete `~/.local/share/OTTO/`

## Need Help?

- Check for updates regularly (Settings → About)
- Report bugs on GitHub: https://github.com/YourOrg/otto/issues
- Documentation: See [DEV_BUILD.md](DEV_BUILD.md) for technical details

## Version

Current version: **OTTO V1.0.1**  
Release date: 2026-02-09  
Database: SQLite (local, single-file)  
Architecture: Electron + Python FastAPI backend

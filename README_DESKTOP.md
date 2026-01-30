# OTTO Desktop Packaging (Electron)

This document outlines how to build and run OTTO as a native desktop application using Electron.

## Architecture

OTTO Desktop uses an **Electron** shell to bundle the React frontend and launch the Python backend as a child process.

- **Frontend**: Vite + React (built static assets).
- **Backend**: FastAPI (Python), compiled into a single-file executable using PyInstaller.
- **Data Persistence**: Data is stored in standard macOS Application Support directory.
  - **Location**: `~/Library/Application Support/OTTO/`
  - **Structure**:
    - `db/app.db`: SQLite database.
    - `storage/`: Uploaded documents and cover art.
    - `otto_backend.log`: Backend logs for troubleshooting.
- **Authentication**: In Desktop Mode, authentication is bypassed, automatically logging in as `admin@otto.com`.

## Prerequisites

1.  **Node.js**: v18+
2.  **Python**: v3.9+ (for development)

## Development

To run the desktop application in development mode:

1.  Start the frontend dev server:
    ```bash
    cd frontend && npm run dev
    ```
2.  In a new terminal, launch Electron from the root:
    ```bash
    npm run desktop:dev
    ```

## Building for Production (macOS)

1.  **Build the Backend**:
    ```bash
    npm run build:backend
    ```
    This creates the executable in `backend/dist/sidecar/`.

2.  **Build the Frontend**:
    ```bash
    npm run build:frontend
    ```

3.  **Build the Installer**:
    ```bash
    # Universal (detects current arch)
    npm run desktop:build:mac
    
    # Specific architectures
    npm run desktop:build:mac:arm64
    npm run desktop:build:mac:x64
    ```

The final DMG will be in `dist-desktop/`.

## Data Management

- **Backup**: Copy the `~/Library/Application Support/OTTO/db/app.db` file.
- **Wipe**: Delete the `~/Library/Application Support/OTTO/` folder to reset the app.
- **Upgrades**: Installing a new DMG preserves your data.

## Troubleshooting

- **Logs**: Check `~/Library/Application Support/OTTO/otto_backend.log`.
- **Backend Issues**: Try running `./scripts/run-backend-desktop.sh` manually to see console errors.

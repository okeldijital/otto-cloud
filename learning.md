# OTTO Learning Log

## Desktop Packaging (Electron)
- **Decision**: Switched from Tauri to Electron for broader ecosystem support and simpler child process management for the Python sidecar.
- **Data Persistence**: Forced application data to `~/Library/Application Support/OTTO/` on macOS to ensure preservation across version upgrades.
- **Routing**: Switched React frontend to `HashRouter` to support `file://` protocol in packaged builds, preventing path resolution errors on manual refreshes.
- **Backend Lifecycle**: Implemented axios polling in the Electron main process to ensure the FastAPI backend is ready before letting the user interact with the UI.
- **Environment Detection**: Used `sys.frozen` in Python and `app.isPackaged` in Electron to differentiate between local development and production distribution.

## Multi-Artist Support
- **Models**: Updated `Release` to include `artist_ids` (JSON) to match `Track` and `Work` structure.
- **UI**: Implemented a multi-select `Autocomplete` component with chip/tag visualization for cleaner management of many-to-many relationships.

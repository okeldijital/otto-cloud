const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onBackendDied: (callback) => ipcRenderer.on('backend-died', (_event, value) => callback(value)),
    getAppVersion: () => process.env.npm_package_version,
    platform: process.platform
});

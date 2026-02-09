const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const treeKill = require('tree-kill');
const net = require('net');
const os = require('os');
const fs = require('fs');

let mainWindow;
let backendProcess;
let currentBackendPort = 8000;

const isDev = !app.isPackaged;

// Get app data directory
function getAppDataDir() {
    const platform = process.platform;
    let basePath;
    
    if (platform === 'darwin') {
        basePath = path.join(os.homedir(), 'Library', 'Application Support', 'OTTO');
    } else if (platform === 'win32') {
        basePath = path.join(os.homedir(), 'AppData', 'Local', 'OTTO');
    } else {
        basePath = path.join(os.homedir(), '.local', 'share', 'OTTO');
    }
    
    return basePath;
}

// Ensure app data directories exist
function initializeAppDataDirs() {
    const appDataDir = getAppDataDir();
    const requiredDirs = [
        appDataDir,
        path.join(appDataDir, 'storage'),
        path.join(appDataDir, 'import_logs'),
        path.join(appDataDir, 'logs'),
    ];
    
    requiredDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    return appDataDir;
}

// Find available port
async function findAvailablePort(startPort = 8000, maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
        const port = startPort + i;
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error('Could not find available port');
}

function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port, '127.0.0.1');
    });
}

function getBackendPath() {
    if (isDev) {
        // In dev, use the python entry point
        return {
            command: 'python3',
            args: [path.join(__dirname, 'backend', 'main.py')]
        };
    } else {
        // In prod, use the sidecar binary in Resources/backend
        const binaryName = process.platform === 'darwin' ? 'sidecar' : 'sidecar.exe';
        const binaryPath = path.join(process.resourcesPath, 'backend', binaryName);
        return {
            command: binaryPath,
            args: []
        };
    }
}

function startBackend() {
    const appDataDir = getAppDataDir();
    const dbPath = path.join(appDataDir, 'otto.db');
    const storagePath = path.join(appDataDir, 'storage');
    const importLogsPath = path.join(appDataDir, 'import_logs');
    
    const { command, args } = getBackendPath();
    console.log(`🚀 Starting backend on port ${currentBackendPort}`);
    console.log(`📁 App Data: ${appDataDir}`);

    const backendEnv = {
        ...process.env,
        APP_ENV: 'desktop',
        PORT: currentBackendPort.toString(),
        DATABASE_URL: `sqlite:///${dbPath}`,
        STORAGE_ROOT: storagePath,
        IMPORT_LOGS_ROOT: importLogsPath,
        APP_DATA_DIR: appDataDir,
    };

    backendProcess = spawn(command, args, {
        env: backendEnv,
        shell: false
    });

    backendProcess.stdout.on('data', (data) => {
        console.log(`[Backend]: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
        console.error(`[Backend Error]: ${data}`);
    });

    backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
        if (code !== 0 && code !== null) {
            // Unexpected exit
            if (mainWindow) {
                mainWindow.webContents.send('backend-died', code);
            }
        }
    });
}

async function waitForBackend(retries = 30) {
    const healthUrl = `http://127.0.0.1:${currentBackendPort}/health`;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(healthUrl);
            if (response.data.status === 'ok') {
                console.log('✅ Backend is healthy!');
                return true;
            }
        } catch (err) {
            console.log(`Waiting for backend... (${i + 1}/${retries})`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "OTTO",
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        // Load from backend server instead of static file
        mainWindow.loadURL(`http://127.0.0.1:${currentBackendPort}/`);
    }

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(async () => {
    // Initialize app data directories
    initializeAppDataDirs();
    
    // Find available port
    try {
        currentBackendPort = await findAvailablePort(8000);
        console.log(`✅ Using port ${currentBackendPort}`);
    } catch (err) {
        console.error('❌ Failed to find available port:', err);
        process.exit(1);
    }

    startBackend();

    // Create window early to show loading state if needed
    createWindow();

    const healthy = await waitForBackend();
    if (!healthy) {
        console.error('❌ Backend failed to start in time.');
        // Could show an error dialog here
    }

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    if (backendProcess) {
        console.log('Stopping backend cleanup...');
        treeKill(backendProcess.pid);
    }
});

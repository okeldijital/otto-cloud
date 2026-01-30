const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const treeKill = require('tree-kill');

let mainWindow;
let backendProcess;
const BACKEND_PORT = 18000;
const HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/health`;

const isDev = !app.isPackaged;

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
    const { command, args } = getBackendPath();
    console.log(`🚀 Starting backend: ${command} ${args.join(' ')}`);

    backendProcess = spawn(command, args, {
        env: { ...process.env, APP_ENV: 'desktop' },
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
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(HEALTH_URL);
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
        mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
    }

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(async () => {
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

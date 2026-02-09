const { app, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const treeKill = require('tree-kill');
const net = require('net');
const os = require('os');
const fs = require('fs');

let backendProcess;
let currentBackendPort = 8001;
const appPort = 8000;

const isDev = !app.isPackaged;

// Get app data directory
function getAppDataDir() {
    const platform = process.platform;
    let basePath;
    
    if (platform === 'darwin') {
        basePath = path.join(os.homedir(), 'Library', 'Application Support', 'OTTO');
    } else if (platform === 'win32') {
        const appData = process.env.APPDATA;
        basePath = appData ? path.join(appData, 'OTTO') : path.join(os.homedir(), 'AppData', 'Roaming', 'OTTO');
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
    const logsPath = path.join(appDataDir, 'logs');
    
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
        LOG_FILE: path.join(logsPath, 'backend.log'),
    };

    backendProcess = spawn(command, args, {
        env: backendEnv,
        shell: false
    });

    const stderrTail = [];
    const maxTailLines = 30;

    backendProcess.stdout.on('data', (data) => {
        console.log(`[Backend]: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
        const text = data.toString();
        console.error(`[Backend Error]: ${text}`);
        text.split('\n').forEach((line) => {
            const trimmed = line.trimEnd();
            if (!trimmed) return;
            stderrTail.push(trimmed);
            if (stderrTail.length > maxTailLines) stderrTail.shift();
        });
    });

    backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
        if (code !== 0 && code !== null) {
            const appDataDir = getAppDataDir();
            const logPath = path.join(appDataDir, 'logs', 'backend.log');
            dialog.showErrorBox(
                'OTTO Backend Failed',
                `The OTTO backend exited unexpectedly (code ${code}).\n\nLast stderr lines:\n${stderrTail.join('\n') || '(no stderr captured)'}\n\nLog file:\n${logPath}\n\nThe app cannot continue.`,
            );
            app.quit();
        }
    });

    return { stderrTail };
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

app.whenReady().then(async () => {
    // Initialize app data directories
    initializeAppDataDirs();
    
    // Backend port (prefer 8001+) and app port (8000+) for logs/docs consistency
    try {
        currentBackendPort = await findAvailablePort(8001);
        console.log(`✅ Using backend port ${currentBackendPort}`);
    } catch (err) {
        console.error('❌ Failed to find available port:', err);
        process.exit(1);
    }

    const { stderrTail } = startBackend();

    const healthy = await waitForBackend();
    if (!healthy) {
        console.error('❌ Backend failed to start in time.');
        const appDataDir = getAppDataDir();
        const logPath = path.join(appDataDir, 'logs', 'backend.log');
        dialog.showErrorBox(
            'OTTO Backend Failed to Start',
            `The OTTO backend did not become healthy in time.\n\nLast stderr lines:\n${stderrTail.join('\n') || '(no stderr captured)'}\n\nLog file:\n${logPath}\n\nThe app cannot continue.`,
        );
        app.quit();
        return;
    }

    const url = isDev ? 'http://localhost:5173' : `http://127.0.0.1:${currentBackendPort}/`;
    console.log(`🌐 Opening default browser: ${url}`);
    await shell.openExternal(url);
    app.quit();
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

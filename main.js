const { app, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const treeKill = require('tree-kill');
const net = require('net');
const os = require('os');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

let backendProcess;
let backendPort = 8001;
const localApiPort = 8000;
let localServer;

const isDev = !app.isPackaged;

// ----------------------------------------------------------------
// 1. CONFIGURATION MANAGEMENT
// ----------------------------------------------------------------

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

function getConfigPath() {
    return path.join(getAppDataDir(), 'config.json');
}

function readConfig() {
    try {
        const configPath = getConfigPath();
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error reading config:', err);
    }
    return null; // Missing or invalid
}

function writeConfig(data) {
    const appDataDir = getAppDataDir();
    if (!fs.existsSync(appDataDir)) {
        fs.mkdirSync(appDataDir, { recursive: true });
    }
    const configPath = getConfigPath();
    const tempPath = configPath + '.tmp';

    // Add metadata
    const finalData = {
        version: 1,
        ...data,
        updatedAt: new Date().toISOString()
    };

    // Atomic write
    fs.writeFileSync(tempPath, JSON.stringify(finalData, null, 2));
    fs.renameSync(tempPath, configPath);
    console.log(`Config written to ${configPath}`);
}

function resetConfig() {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
        console.log('Config deleted.');
    }
}

// ----------------------------------------------------------------
// 2. LOCAL CONTROL SERVER (Config Write / Reset)
// ----------------------------------------------------------------

function startLocalServer() {
    localServer = http.createServer((req, res) => {
        // Headers for CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.method === 'POST' && req.url === '/__local__/save-config') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const payload = JSON.parse(body);
                    // Minimal validation
                    if (!payload.nodeRole || !['hub', 'spoke'].includes(payload.nodeRole)) {
                        throw new Error('Invalid nodeRole');
                    }
                    if (!payload.nodeId) {
                        // Generate ID if missing (though frontend should send it, we ensure it)
                        payload.nodeId = crypto.randomUUID();
                    }
                    if (!payload.createdAt) {
                        payload.createdAt = new Date().toISOString();
                    }

                    console.log('Received config save request:', payload);
                    writeConfig(payload);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', message: 'Config saved. Restarting...' }));

                    // Trigger Restart
                    setTimeout(() => {
                        console.log('Restarting application...');
                        app.relaunch();
                        app.exit(0);
                    }, 1000);

                } catch (err) {
                    console.error('Config save error:', err);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
            return;
        }

        if (req.method === 'POST' && req.url === '/__local__/reset-config') {
            try {
                resetConfig();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', message: 'Config reset. Restarting...' }));
                // Trigger Restart
                setTimeout(() => {
                    console.log('Restarting application (Reset)...');
                    app.relaunch();
                    app.exit(0);
                }, 1000);
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        res.writeHead(404);
        res.end('Not Found');
    });

    localServer.listen(localApiPort, '127.0.0.1', () => {
        console.log(`🔧 Local Control Server listening on port ${localApiPort}`);
    });

    localServer.on('error', (err) => {
        console.error('Local server error:', err);
    });
}


// ----------------------------------------------------------------
// 3. BACKEND MANAGEMENT
// ----------------------------------------------------------------

function getBackendPath() {
    if (isDev) {
        const venvPath = path.join(__dirname, 'backend', '.venv', 'bin', 'python3');
        if (fs.existsSync(venvPath)) {
            console.log(`Using venv python: ${venvPath}`);
            return { command: venvPath, args: [path.join(__dirname, 'backend', 'main.py')] };
        }
        return { command: 'python3', args: [path.join(__dirname, 'backend', 'main.py')] };
    } else {
        const binaryName = process.platform === 'darwin' ? 'sidecar' : 'sidecar.exe';
        const binaryPath = path.join(process.resourcesPath, 'backend', binaryName);
        return { command: binaryPath, args: [] };
    }
}

async function findAvailablePort(startPort = 8001) {
    // Simple implementation: try startPort, if taken, increment
    // We strictly prefer keeping to a known range if possible
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(startPort, '127.0.0.1', () => {
            server.close(() => resolve(startPort));
        });
        server.on('error', () => {
            // Try next port?
            // For strict requirement "BACKEND_PORT", maybe we shouldn't drift too much
            // But let's try +1
            resolve(findAvailablePort(startPort + 1));
        });
    });
}

function startBackend() {
    const appDataDir = getAppDataDir();
    const { command, args } = getBackendPath();
    const config = readConfig();

    console.log(`🚀 Starting backend on port ${backendPort}`);

    const backendEnv = {
        ...process.env,
        APP_ENV: 'desktop',
        PORT: backendPort.toString(),
        DATABASE_URL: `sqlite:///${path.join(appDataDir, 'otto.db')}`,
        STORAGE_ROOT: path.join(appDataDir, 'storage'),
        APP_DATA_DIR: appDataDir,
        LOG_FILE: path.join(appDataDir, 'logs', 'backend.log'),
        // Inject Role Info
        OTTO_NODE_ROLE: config?.nodeRole || '',
        OTTO_NODE_ID: config?.nodeId || '',
        // Let backend know the local API port if needed (for reference)
        OTTO_LOCAL_API_PORT: localApiPort.toString()
    };

    if (backendEnv.OTTO_NODE_ROLE) {
        console.log(`Injecting OTTO_NODE_ROLE=${backendEnv.OTTO_NODE_ROLE}`);
    } else {
        console.log('No OTTO_NODE_ROLE found in config. Starting in unconfigured mode.');
    }

    backendProcess = spawn(command, args, {
        env: backendEnv,
        shell: false
    });

    backendProcess.stdout.on('data', d => console.log(`[Backend]: ${d}`));
    backendProcess.stderr.on('data', d => console.error(`[Backend ERR]: ${d}`));

    backendProcess.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`Backend crashed with code ${code}`);
            // We don't quit here immediately to avoid loops, but user will notice
        }
    });
}

async function waitForBackend() {
    const healthUrl = `http://127.0.0.1:${backendPort}/health`;
    for (let i = 0; i < 60; i++) {
        try {
            const res = await axios.get(healthUrl);
            if (res.data.status === 'ok') return true;
        } catch (e) {
            // waiting
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    return false;
}

// ----------------------------------------------------------------
// 4. MAIN APP LIFECYCLE
// ----------------------------------------------------------------

app.whenReady().then(async () => {
    // 1. Init Data Dirs
    const appDataDir = getAppDataDir();
    if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true });

    // 2. Start Local Server (for writing config)
    startLocalServer();

    // 3. Start Backend with Lockfile Governance
    try {
        const { port, reused } = await ensureBackend(appDataDir);
        backendPort = port;
        console.log(`Backend Active on port ${backendPort} (Reused: ${reused})`);
    } catch (e) {
        dialog.showErrorBox('Fatality', `OTTO Backend failed to start:\n${e.message}`);
        app.quit();
        return;
    }

    // 4. (Deprecated) Wait Check 
    // ensureBackend already waited. We are good to go.

    // 5. Check Config & Launch Browser
    const config = readConfig();
    const baseUrl = `http://127.0.0.1:${backendPort}`;

    // Logic: If NO config -> Setup. If Config -> Dashboard.
    if (!config || !config.nodeRole) {
        console.log('Fresh install detected. Opening Setup Wizard.');
        await shell.openExternal(`${baseUrl}/setup`);
    } else {
        console.log(`Config loaded (Role: ${config.nodeRole}). Opening Dashboard.`);
        await shell.openExternal(`${baseUrl}/`);
    }

    // Re-open on dock click
    app.on('activate', () => {
        const c = readConfig();
        const target = (!c || !c.nodeRole) ? '/setup' : '/';
        shell.openExternal(`${baseUrl}${target}`);
    });
});

app.on('window-all-closed', () => {
    // Keep running
});

app.on('before-quit', () => {
    if (backendProcess) treeKill(backendProcess.pid);
});

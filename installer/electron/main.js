const { app, shell, dialog } = require('electron');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const axios = require('axios');
const treeKill = require('tree-kill');
const net = require('net');
const os = require('os');
const fs = require('fs');

let backendProcess;
let currentBackendPort = 8001;

function getLauncherLogPath() {
  // Required: ~/Library/Logs/OTTO/launcher.log (macOS)
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Logs', 'OTTO', 'launcher.log');
  }
  return path.join(os.homedir(), '.otto', 'launcher.log');
}

function ensureLauncherLogDir() {
  const logPath = getLauncherLogPath();
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return logPath;
}

function logLine(...parts) {
  const msg = parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ');
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    const logPath = ensureLauncherLogDir();
    fs.appendFileSync(logPath, line, { encoding: 'utf8' });
  } catch {
    // Ignore logging failures (but still print to console)
  }
  // eslint-disable-next-line no-console
  console.log(msg);
}

function getAppDataDir() {
  const platform = process.platform;
  if (platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'OTTO');
  if (platform === 'win32') {
    const appData = process.env.APPDATA;
    return appData ? path.join(appData, 'OTTO') : path.join(os.homedir(), 'AppData', 'Roaming', 'OTTO');
  }
  return path.join(os.homedir(), '.local', 'share', 'OTTO');
}

function initializeAppDataDirs() {
  const appDataDir = getAppDataDir();
  const requiredDirs = [
    appDataDir,
    path.join(appDataDir, 'storage'),
    path.join(appDataDir, 'import_logs'),
    path.join(appDataDir, 'logs'),
  ];
  requiredDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  return appDataDir;
}

async function findAvailablePort(startPort = 8001, maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(port)) return port;
  }
  throw new Error('Could not find available port');
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

function getBackendBinaryPath() {
  const exeName = process.platform === 'win32' ? 'otto_backend.exe' : 'otto_backend';
  const candidate = path.join(process.resourcesPath, 'backend', exeName);
  if (fs.existsSync(candidate)) {
    try {
      const st = fs.statSync(candidate);
      if (st.isDirectory()) return path.join(candidate, exeName);
    } catch {
      // ignore
    }
    return candidate;
  }

  // PyInstaller onefolder layout: Resources/backend/otto_backend/otto_backend
  const folder = path.join(process.resourcesPath, 'backend', 'otto_backend');
  const nested = path.join(folder, exeName);
  if (fs.existsSync(nested)) return nested;

  return candidate;
}

function runCmd(label, cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  const out = (res.stdout || '').trim();
  const err = (res.stderr || '').trim();
  logLine(`${label}:`, cmd, args.join(' '));
  if (out) logLine(`${label}:stdout:`, out);
  if (err) logLine(`${label}:stderr:`, err);
  if (typeof res.status === 'number') logLine(`${label}:exit:`, String(res.status));
  return res;
}

function startBackend() {
  const appDataDir = getAppDataDir();
  const dbPath = path.join(appDataDir, 'otto.db');
  const storagePath = path.join(appDataDir, 'storage');
  const importLogsPath = path.join(appDataDir, 'import_logs');
  const logsPath = path.join(appDataDir, 'logs');
  const logFile = path.join(logsPath, 'backend.log');

  const backendPath = getBackendBinaryPath();
  const stderrTail = [];
  const maxTailLines = 30;

  // Diagnostics (pre-spawn)
  logLine('--- OTTO Launcher Diagnostics ---');
  logLine('process.execPath=', process.execPath);
  logLine('app.getAppPath()=', app.getAppPath());
  logLine('__dirname=', __dirname);
  logLine('process.resourcesPath=', process.resourcesPath);
  logLine('resolved backendPath=', backendPath);
  logLine('backendPath contains /Volumes/ =', backendPath.includes('/Volumes/'));
  logLine('launcher.log=', getLauncherLogPath());
  logLine('backend.log=', logFile);

  logLine('fs.existsSync(backendPath)=', String(fs.existsSync(backendPath)));
  try {
    const st = fs.statSync(backendPath);
    logLine('fs.statSync(mode)=', `0${(st.mode & 0o777).toString(8)}`);
    logLine('fs.statSync(isFile)=', String(st.isFile()), 'isDirectory=', String(st.isDirectory()));
  } catch (e) {
    logLine('fs.statSync failed:', String(e));
  }
  try {
    fs.accessSync(backendPath, fs.constants.X_OK);
    logLine('fs.accessSync(X_OK)=', 'OK');
  } catch (e) {
    logLine('fs.accessSync(X_OK)=', `FAIL: ${e && e.code ? e.code : String(e)}`);
  }

  if (process.platform === 'darwin') {
    runCmd('file', 'file', [backendPath]);
    runCmd('xattr', 'xattr', ['-l', backendPath]);
    runCmd('codesign', 'codesign', ['-dv', '--verbose=4', backendPath]);
  }

  const backendEnv = {
    ...process.env,
    APP_ENV: 'desktop',
    PORT: currentBackendPort.toString(),
    DATABASE_URL: `sqlite:///${dbPath}`,
    STORAGE_ROOT: storagePath,
    IMPORT_LOGS_ROOT: importLogsPath,
    APP_DATA_DIR: appDataDir,
    LOG_FILE: logFile,
  };

  try {
    backendProcess = spawn(backendPath, [], { env: backendEnv, shell: false });
  } catch (e) {
    logLine('spawn threw:', String(e));
    throw e;
  }

  backendProcess.stdout.on('data', (data) => console.log(`[Backend]: ${data}`));
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

  backendProcess.on('error', (err) => {
    logLine('spawn error:', {
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      path: err.path,
      message: err.message,
    });
  });

  backendProcess.on('close', (code) => {
    if (code !== 0 && code !== null) {
      dialog.showErrorBox(
        'OTTO Backend Failed',
        `The OTTO backend exited unexpectedly (code ${code}).\n\nLast stderr lines:\n${
          stderrTail.join('\n') || '(no stderr captured)'
        }\n\nLog file:\n${logFile}\n\nThe app cannot continue.`,
      );
      app.quit();
    }
  });

  return { stderrTail, logFile };
}

async function waitForBackend(retries = 30) {
  const healthUrl = `http://127.0.0.1:${currentBackendPort}/health`;
  for (let i = 0; i < retries; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await axios.get(healthUrl);
      if (response.status === 200) return true;
    } catch {
      // ignore
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

app.whenReady().then(async () => {
  initializeAppDataDirs();

  // If running from DMG mount, tell user to install properly.
  const execPath = process.execPath || '';
  if (process.platform === 'darwin' && execPath.includes('/Volumes/')) {
    const logPath = getLauncherLogPath();
    logLine('Detected /Volumes execution. execPath=', execPath);
    dialog.showErrorBox(
      'Install Required',
      `OTTO must be copied to Applications.\n\nClose OTTO, drag OTTO to Applications, then reopen.\n\nLog file:\n${logPath}`,
    );
    app.quit();
    return;
  }

  try {
    currentBackendPort = await findAvailablePort(8001);
  } catch (err) {
    dialog.showErrorBox('OTTO Startup Failed', `Failed to find backend port: ${err}`);
    app.quit();
    return;
  }

  let stderrTail = [];
  let logFile = '';
  try {
    const started = startBackend();
    stderrTail = started.stderrTail;
    logFile = started.logFile;
  } catch (err) {
    const logPath = getLauncherLogPath();
    dialog.showErrorBox(
      'OTTO Launch Failed',
      `Failed to spawn OTTO backend.\n\nError:\n${err && err.message ? err.message : String(err)}\n\nLog file:\n${logPath}`,
    );
    app.quit();
    return;
  }

  const healthy = await waitForBackend();
  if (!healthy) {
    dialog.showErrorBox(
      'OTTO Backend Failed to Start',
      `The OTTO backend did not become healthy in time.\n\nLast stderr lines:\n${
        stderrTail.join('\n') || '(no stderr captured)'
      }\n\nLog file:\n${logFile}\n\nThe app cannot continue.`,
    );
    app.quit();
    return;
  }

  const url = `http://127.0.0.1:${currentBackendPort}/`;
  await shell.openExternal(url);
  app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) treeKill(backendProcess.pid);
});

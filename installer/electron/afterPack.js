const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function chmodRecursive(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const st = fs.statSync(targetPath);
  if (st.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath)) {
      chmodRecursive(path.join(targetPath, entry));
    }
    return;
  }
  // Ensure executable bit on files (esp. PyInstaller bootloader + dylibs)
  try {
    fs.chmodSync(targetPath, 0o755);
  } catch {
    // ignore
  }
}

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appOutDir = context.appOutDir;
  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(appOutDir, appName);

  if (!fs.existsSync(appPath)) {
    throw new Error(`afterPack: .app not found: ${appPath}`);
  }

  const resourcesPath = path.join(appPath, 'Contents', 'Resources');
  const backendRoot = path.join(resourcesPath, 'backend');

  if (!fs.existsSync(backendRoot)) {
    throw new Error(`afterPack: backend resources missing: ${backendRoot}`);
  }

  // Onefolder expected: Contents/Resources/backend/otto_backend/otto_backend
  const backendDir = path.join(backendRoot, 'otto_backend');
  const backendExe = path.join(backendDir, 'otto_backend');

  if (!fs.existsSync(backendExe)) {
    throw new Error(`afterPack: backend binary missing: ${backendExe}`);
  }

  // Ensure exec perms on binary and internal files if present
  chmodRecursive(backendExe);
  chmodRecursive(path.join(backendDir, '_internal'));

  // Best-effort: remove quarantine attributes on packaged bundle
  try {
    execFileSync('xattr', ['-dr', 'com.apple.quarantine', appPath], { stdio: 'ignore' });
  } catch {
    // ignore in CI if xattr not available or fails
  }
};


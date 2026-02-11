import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                walk(filePath, fileList);
            }
        } else {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// Ensure we are in root or finding src correctly
const frontendSrc = path.join(__dirname, 'src');

if (!fs.existsSync(frontendSrc)) {
    console.error(`❌ Frontend src not found at ${frontendSrc}`);
    process.exit(1);
}

const files = walk(frontendSrc);
let errors = [];

// 1. Check for hardcoded backend URLs
const forbiddenPatterns = [
    'localhost:8000',
    '127.0.0.1:8000',
    'localhost:8001',
    '127.0.0.1:8001',
];

files.forEach(f => {
    // skip non-text files or test files if needed
    if (f.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) return;

    const content = fs.readFileSync(f, 'utf-8');
    forbiddenPatterns.forEach(pattern => {
        if (content.includes(pattern)) {
            errors.push(`Hardcoded backend URL found in ${f}: ${pattern}`);
        }
    });
});

// 2. SetupWizard presence
const setupWizardPath = path.join(frontendSrc, 'pages', 'SetupWizard.jsx');
if (!fs.existsSync(setupWizardPath)) {
    errors.push("Missing SetupWizard: frontend/src/pages/SetupWizard.jsx");
}

// 3. SetupWizard routing (check App.jsx)
const appPath = path.join(frontendSrc, 'App.jsx');
if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf-8');
    if (!appContent.includes('path="/setup"') || !appContent.includes('SetupWizard')) {
        errors.push("SetupWizard routing missing in App.jsx (must define path='/setup' and import SetupWizard)");
    }
} else {
    // try App.tsx too
    const appTsxPath = path.join(frontendSrc, 'App.tsx');
    if (fs.existsSync(appTsxPath)) {
        const appContent = fs.readFileSync(appTsxPath, 'utf-8');
        if (!appContent.includes('path="/setup"') || !appContent.includes('SetupWizard')) {
            errors.push("SetupWizard routing missing in App.tsx");
        }
    } else {
        errors.push("App.jsx/App.tsx not found to check routing");
    }
}

if (errors.length > 0) {
    console.error("❌ FRONTEND GOVERNANCE FAILED");
    errors.forEach(e => console.error(" - " + e));
    process.exit(1);
}

console.log("✅ Frontend governance checks passed");

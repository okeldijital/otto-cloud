const fs = require('fs');
let code = fs.readFileSync('test-report.js', 'utf8');
code = code.replace(/<script>/g, '').replace(/<\/script>/g, '');
code = `
const document = {
    getElementById: () => ({ innerHTML: '', innerText: '', addEventListener: () => {} }),
    querySelectorAll: () => ([]),
    addEventListener: () => {}
};
` + code;
fs.writeFileSync('test-report-node.js', code);

const fs = require('fs');
let code = fs.readFileSync('test-report-node.js', 'utf8');
code += `
console.log("Artists length:", document.getElementById('artists-list').innerHTML.length);
console.log("Tracks length:", document.getElementById('tracks-list').innerHTML.length);
console.log("Contracts length:", document.getElementById('contracts-list').innerHTML.length);
`;
fs.writeFileSync('test-report-node.js', code);

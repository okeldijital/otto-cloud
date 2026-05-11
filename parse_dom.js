const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('/Users/m2krproduction/otto/report/M2KR_Catalog_Status_Q1_2026.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously" });
setTimeout(() => {
    console.log("Artists List innerHTML length:", dom.window.document.getElementById('artists-list').innerHTML.length);
    console.log("Artists List innerText:", dom.window.document.getElementById('artists-list').textContent.substring(0, 100));
    console.log("Tracks List innerHTML length:", dom.window.document.getElementById('tracks-list').innerHTML.length);
    console.log("Contracts List innerHTML length:", dom.window.document.getElementById('contracts-list').innerHTML.length);
}, 1000);

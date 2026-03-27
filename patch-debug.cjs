const fs = require('fs');
const p = 'C:\\dev\\project-bolt-fixed\\src\\components\\transactions\\TransactionInsightDrawer.tsx';
const c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('merchantHasMapHint');
console.log(JSON.stringify(c.slice(idx - 50, idx + 30)));

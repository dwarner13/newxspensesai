const fs = require('fs');
const p = 'C:\\dev\\project-bolt-fixed\\src\\components\\transactions\\TransactionInsightDrawer.tsx';
const c = fs.readFileSync(p, 'utf8');
let idx = 0;
while (true) {
  idx = c.indexOf('merchantHasMapHint', idx + 1);
  if (idx === -1) break;
  console.log(idx, JSON.stringify(c.slice(idx - 20, idx + 40)));
}

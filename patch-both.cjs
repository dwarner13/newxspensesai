const fs = require('fs');

// Fix 1: double comma in categoryConfig.ts
const p1 = 'C:\\dev\\project-bolt-fixed\\src\\pages\\CategoriesV2\\categoryConfig.ts';
let c1 = fs.readFileSync(p1, 'utf8');
c1 = c1.replace(/budget: 0 \},,/g, 'budget: 0 },');
fs.writeFileSync(p1, c1, 'utf8');
console.log('categoryConfig fixed');

// Fix 2: duplicate }; in drawer
const p2 = 'C:\\dev\\project-bolt-fixed\\src\\components\\transactions\\TransactionInsightDrawer.tsx';
let c2 = fs.readFileSync(p2, 'utf8');
const before = c2.split('const savePendingCategory').length - 1;
c2 = c2.replace(/\};\s*\};\s*const savePendingCategory/, '};\n  const savePendingCategory');
const after = c2.split('const savePendingCategory').length - 1;
fs.writeFileSync(p2, c2, 'utf8');
console.log('Drawer fixed, savePendingCategory occurrences before/after:', before, after);

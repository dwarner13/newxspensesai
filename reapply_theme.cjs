const fs = require('fs');

// Reapply THEME brightness fix
const fc = 'src/pages/CategoriesV2/categoryConfig.ts';
let cc = fs.readFileSync(fc, 'utf8');
const before = cc;
cc = cc.replace('textMuted: "#7b8ba5"', 'textMuted: "#94a3b8"');
cc = cc.replace('textDim: "#4a5a75"',   'textDim: "#64748b"');
fs.writeFileSync(fc, cc, 'utf8');
console.log(before === cc ? 'WARNING: THEME already updated or pattern not found' : 'THEME text colours brightened');

// Also fix AgentInsightStrip directly since it may hardcode colours

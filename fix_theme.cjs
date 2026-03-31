const fs = require('fs');
const fc = 'src/pages/CategoriesV2/categoryConfig.ts';
let cc = fs.readFileSync(fc, 'utf8');

cc = cc.replace('textMuted: "#7b8ba5"', 'textMuted: "#94a3b8"');
cc = cc.replace('textDim: "#4a5a75"',   'textDim: "#64748b"');

fs.writeFileSync(fc, cc, 'utf8');
console.log('THEME text colours brightened');

const fs = require('fs');
const fc = 'netlify/functions/chat.ts';
let cc = fs.readFileSync(fc, 'utf8');

// Insert bypass at start of isStatementQaIntent function body
const target = 'function isStatementQaIntent(message: string): boolean {\n  const text =';
const idx = cc.indexOf(target);
if (idx !== -1) {
  cc = cc.slice(0, idx) +
    'function isStatementQaIntent(message: string): boolean {\n  if (message.startsWith(\'[PRIME_GREETING]\')) return false;\n  const text =' +
    cc.slice(idx + target.length);
  fs.writeFileSync(fc, cc, 'utf8');
  console.log('Fix done');
  console.log('bypass present:', cc.includes('[PRIME_GREETING]'));
} else {
  console.log('FAILED - target not found');
}

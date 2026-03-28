const fs = require('fs');
const f = 'C:/dev/project-bolt-fixed/src/components/transactions/TagCopilotPanel.tsx';
let c = fs.readFileSync(f, 'utf8');

// Strip ALL non-ASCII/corrupted chars from the two visible strings
// Greeting message
c = c.replace(/Hey\s+[^\w\s]+\s+I am Tag/, 'Hey — I am Tag');

// Input placeholder  
c = c.replace(/Tell Tag to recategorize[^\w"'`\s]+/, 'Tell Tag to recategorize\u2026');

// Nuclear option: strip any remaining diamond/replacement chars from all string literals
c = c.replace(/[\u25C6\u25A0\u2662\uFFFD\u00A0]/g, '');

fs.writeFileSync(f, c, 'utf8');
console.log('done');

const fs = require('fs');
const f = 'C:/dev/project-bolt-fixed/netlify/functions/_shared/tag_explain.ts';
let c = fs.readFileSync(f, 'utf8');

// Replace all corrupted bullet prefixes in proactiveInsights strings
c = c.replace(/`\?\?\s+This amount/g, '`\u26a0\ufe0f This amount');
c = c.replace(/`\?\?\s+You usually tag/g, '`\ud83d\udd04 You usually tag');
c = c.replace(/`\?\?\s+New merchant/g, '`\u2728 New merchant');
c = c.replace(/`\?\?\s+You have spent/g, '`\ud83d\udcca You have spent');

// Nuclear fallback: strip any remaining ?? patterns from template literals
c = c.replace(/`\?\?(\s+)/g, '`$1');

fs.writeFileSync(f, c, 'utf8');
console.log('done');

const fs = require('fs');
const f = 'C:\\dev\\project-bolt-fixed\\src\\components\\transactions\\TransactionInsightDrawer.tsx';
let c = fs.readFileSync(f, 'utf8');
// Remove the duplicate closing brace
c = c.replace('    };\n  };\n  const savePendingCategory', '    };\n  const savePendingCategory');
c = c.replace('    };\r\n  };\r\n  const savePendingCategory', '    };\r\n  const savePendingCategory');
fs.writeFileSync(f, c, 'utf8');
console.log('Done');

const fs = require('fs');
const p = 'C:\\dev\\project-bolt-fixed\\src\\pages\\AuthV2\\PostLoginSplash.tsx';
let c = fs.readFileSync(p, 'utf8');

// Fix outer container - center vertically
c = c.replace(
  'display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",',
  'display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",'
);

// Fix crown circle
c = c.replace(
  'display: "flex", alignItems: "center", justifyContent: "flex-start",\n        fontSize: 28, marginBottom: 20,',
  'display: "flex", alignItems: "center", justifyContent: "center",\n        fontSize: 28, marginBottom: 20,'
);

// Fix agent letter circles
c = c.replace(
  'display: "flex", alignItems: "center", justifyContent: "flex-start",\n              fontSize: 12, fontWeight: 700, color: agent.color,',
  'display: "flex", alignItems: "center", justifyContent: "center",\n              fontSize: 12, fontWeight: 700, color: agent.color,'
);

fs.writeFileSync(p, c, 'utf8');

// Verify
const result = fs.readFileSync(p, 'utf8');
const remaining = (result.match(/justifyContent: "flex-start"/g) || []).length;
console.log('flex-start remaining:', remaining, '(should be 0)');
console.log('Done');

const fs = require('fs');
const p = 'C:\\dev\\project-bolt-fixed\\src\\pages\\AuthV2\\PostLoginSplash.tsx';
let c = fs.readFileSync(p, 'utf8');

// Fix 1: center the crown icon
c = c.replace(
  'display: "flex", alignItems: "center", justifyContent: "flex-start",\n        fontSize: 28, marginBottom: 20,',
  'display: "flex", alignItems: "center", justifyContent: "center",\n        fontSize: 28, marginBottom: 20,'
);

// Fix 2: center agent letter circles
c = c.replace(
  'display: "flex", alignItems: "center", justifyContent: "flex-start",\n              fontSize: 12, fontWeight: 700, color: agent.color,',
  'display: "flex", alignItems: "center", justifyContent: "center",\n              fontSize: 12, fontWeight: 700, color: agent.color,'
);

// Fix 3: remove Open Prime Chat button (whole button block)
c = c.replace(
  /\s*<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); onOpenPrime\?\.\(\); \}\}[\s\S]*?<\/button>/,
  ''
);

// Fix 4: better desktop padding
c = c.replace(
  'padding: "80px 24px 60px",',
  'padding: "clamp(32px, 6vh, 80px) 24px clamp(32px, 6vh, 60px)",'
);

// Fix 5: smaller heading on desktop
c = c.replace(
  'fontSize: 38, fontWeight: 800',
  'fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Done');

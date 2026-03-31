const fs = require('fs');
const fp = 'src/pages/ReportsV2/ReportsPageV2.tsx';
let cc = fs.readFileSync(fp, 'utf8');

// Fix: replace Tailwind responsive classes with JS-based isMobile
// Desktop row: remove hidden md:grid, add inline display logic
cc = cc.replace(
  'className="hidden md:grid" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", padding: "10px 18px", alignItems: "center", fontSize: 12 }}',
  'className="reports-desktop-row" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", padding: "10px 18px", alignItems: "center", fontSize: 12, display: window.innerWidth >= 768 ? "grid" : "none" }}'
);

// Mobile card: remove md:hidden
cc = cc.replace(
  'className="md:hidden" style={{ display: "flex", alignItems: "center", padding: "10px 18px", gap: 10 }}',
  'style={{ display: window.innerWidth < 768 ? "flex" : "none", alignItems: "center", padding: "10px 18px", gap: 10 }}'
);

// Also fix the header row
cc = cc.replace(
  'className="reports-row-header hidden md:grid"',
  'className="reports-row-header" style={{ display: window.innerWidth >= 768 ? "grid" : "none" }}'
);

fs.writeFileSync(fp, cc, 'utf8');
console.log('Reports duplicate row fixed');

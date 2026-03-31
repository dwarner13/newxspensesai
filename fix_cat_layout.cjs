const fs = require('fs');

// ── Fix 1: Remove backdrop from CategoriesV2 Tag panel ──────────────────────
const f1 = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let c1 = fs.readFileSync(f1, 'utf8');

// Remove the full-screen dark backdrop entirely
c1 = c1.replace(
  `      <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", opacity: open ? 1 : 0, transition: "opacity 0.3s", zIndex: 998, backdropFilter: "blur(4px)" }} />`,
  ``
);

fs.writeFileSync(f1, c1, 'utf8');
console.log('Fix 1 done - backdrop removed');

// ── Fix 2: Push categories grid left when panel opens ───────────────────────
const f2 = 'src/pages/CategoriesV2/CategoriesPageV2.tsx';
let c2 = fs.readFileSync(f2, 'utf8');

// Add transition padding to the main content wrapper when copilot is open
c2 = c2.replace(
  `      <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 16px" : "32px 24px" }}>`,
  `      <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 16px" : "32px 24px", paddingRight: copilotOpen && !isMobile ? 544 : isMobile ? 16 : 24, transition: "padding-right 0.35s cubic-bezier(0.16,1,0.3,1)" }}>`
);

fs.writeFileSync(f2, c2, 'utf8');
console.log('Fix 2 done - content shifts left');

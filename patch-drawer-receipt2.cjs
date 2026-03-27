const fs = require('fs');
const p = 'C:\\dev\\project-bolt-fixed\\src\\components\\transactions\\TransactionInsightDrawer.tsx';
let c = fs.readFileSync(p, 'utf8');
const old = '}\r\n\r\n            {merchantHasMapHint ? (';
const receipt = '}\r\n\r\n            {/* Receipt hint */}\r\n            <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.12)", display: "flex", alignItems: "flex-start", gap: 10 }}>\r\n              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#22d3ee", flexShrink: 0 }}>B</div>\r\n              <div>\r\n                <div style={{ fontSize: 11, fontWeight: 700, color: "#22d3ee", marginBottom: 3 }}>No receipt attached</div>\r\n                <div style={{ fontSize: 11, color: "#7a8fa6", lineHeight: 1.5 }}>Have a receipt? Snap a photo and send it to Byte in chat \u2014 he will match it to this transaction automatically.</div>\r\n              </div>\r\n            </div>\r\n\r\n            {merchantHasMapHint ? (';
if (c.includes(old)) { c = c.replace(old, receipt); fs.writeFileSync(p, c, 'utf8'); console.log('Done'); }
else { console.log('NOT FOUND'); }

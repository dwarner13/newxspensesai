const fs = require('fs');
const fd = 'src/pages/CategoriesV2/CategoryDetailDrawer.tsx';
let cd = fs.readFileSync(fd, 'utf8');

// Merchant name: 13->14px, keep color
cd = cd.replace(
  "fontSize:13, fontWeight:600, color:THEME.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'",
  "fontSize:14, fontWeight:600, color:'#e8ecf4', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'"
);

// Date + subcategory line: 10->12px, brighter
cd = cd.replace(
  "fontSize:10, color:THEME.textDim, marginTop:2, display:'flex', gap:6",
  "fontSize:12, color:'#94a3b8', marginTop:2, display:'flex', gap:6"
);

// Category pill text: 10->11px
cd = cd.replace(
  "fontSize:10, padding:'2px 7px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:THEME.textDim",
  "fontSize:11, padding:'2px 8px', borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'#94a3b8'"
);

// Amount: 14->15px, brighter white
cd = cd.replace(
  "fontSize:14, fontWeight:700, color:THEME.text",
  "fontSize:15, fontWeight:700, color:'#f1f5f9'"
);

// Subcategory label: 9->10px
cd = cd.replace(
  "fontSize:9, textTransform:'uppercase', letterSpacing:1.2, color:THEME.textDim, fontWeight:700, marginBottom:6 }}>Category",
  "fontSize:10, textTransform:'uppercase', letterSpacing:1.2, color:'#64748b', fontWeight:700, marginBottom:6 }}>Category"
);
cd = cd.replace(
  "fontSize:9, textTransform:'uppercase', letterSpacing:1.2, color:THEME.textDim, fontWeight:700, marginBottom:6 }}>Subcategory",
  "fontSize:10, textTransform:'uppercase', letterSpacing:1.2, color:'#64748b', fontWeight:700, marginBottom:6 }}>Subcategory"
);

// Recent Transactions header
cd = cd.replace(
  '{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textDim, fontWeight: 700, marginBottom: 12 }',
  '{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: "#64748b", fontWeight: 700, marginBottom: 12 }'
);

fs.writeFileSync(fd, cd, 'utf8');
console.log('Typography fixed');

const fs = require('fs');

// Create shared chat styles constant
const sharedStyles = `// Shared Agent Chat UI Constants
// Used by TagCopilotPanel (Transactions), TagCopilotPanel (Categories), and future panels
export const CHAT_STYLES = {
  panel: {
    width: 520,
    bg: '#080f1e',
    borderLeft: '1px solid rgba(34,211,153,0.15)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
  },
  avatar: (color: string) => ({
    width: 28, height: 28, borderRadius: '50%',
    background: \`\${color}20\`, border: \`1px solid \${color}40\`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 800, color, flexShrink: 0, marginTop: 2,
  }),
  bubble: (isUser: boolean) => ({
    maxWidth: '85%',
    padding: '11px 15px',
    borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    background: isUser ? 'rgba(34,211,153,0.15)' : 'rgba(255,255,255,0.04)',
    border: \`1px solid \${isUser ? 'rgba(34,211,153,0.25)' : 'rgba(255,255,255,0.06)'}\`,
    fontSize: 15, color: '#e8ecf4', lineHeight: 1.7,
    wordBreak: 'break-word' as const, overflowWrap: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
    animation: 'chatMsgIn 0.18s ease forwards',
  }),
  input: {
    flex: 1, background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '12px 14px',
    fontSize: 14, color: '#e8ecf4', outline: 'none',
    fontFamily: 'inherit', resize: 'none' as const,
    lineHeight: 1.6, minHeight: 52,
  },
  sendBtn: (active: boolean) => ({
    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
    background: active ? 'rgba(34,211,153,0.2)' : 'rgba(34,211,153,0.08)',
    border: \`1px solid \${active ? 'rgba(34,211,153,0.35)' : 'rgba(34,211,153,0.15)'}\`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: active ? 'pointer' : 'default', color: '#22d3ee',
  }),
  thinkingDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#22d3ee', opacity: 0.5,
  },
};

export const CHAT_KEYFRAMES = \`@keyframes chatMsgIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}\`;
`;

fs.writeFileSync('src/lib/chatStyles.ts', sharedStyles, 'utf8');
console.log('Shared chat styles created');

// Now patch Transactions TagCopilotPanel input
const ft = 'src/components/transactions/TagCopilotPanel.tsx';
let ct = fs.readFileSync(ft, 'utf8');

// Fix input textarea
ct = ct.replace(
  `            rows={2}
            value={input}`,
  `            rows={3}
            value={input}`
);
ct = ct.replace(
  "style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#e8ecf4', outline:'none', fontFamily:'inherit', resize:'none', lineHeight:1.5 }}",
  "style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'12px 14px', fontSize:14, color:'#e8ecf4', outline:'none', fontFamily:'inherit', resize:'none', lineHeight:1.6, minHeight:52 }}"
);
// Fix send button size
ct = ct.replace(
  "style={{ width:36, height:36, borderRadius:8,",
  "style={{ width:38, height:38, borderRadius:10,"
);
// Fix message font (already 15px but ensure lineHeight)
ct = ct.replace(
  "fontSize:15, color:'#e8ecf4', lineHeight:1.7,",
  "fontSize:15, color:'#e8ecf4', lineHeight:1.7, animation:'chatMsgIn 0.18s ease forwards',"
);
// Add keyframes
if (!ct.includes('chatMsgIn')) {
  ct = ct.replace(
    "display:'flex', flexDirection:'column', gap:12 }}>",
    "display:'flex', flexDirection:'column', gap:12 }}><style>{'@keyframes chatMsgIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}'}</style>"
  );
}
fs.writeFileSync(ft, ct, 'utf8');
console.log('Transactions Tag input standardized');

// Patch Categories TagCopilotPanel - replace single input with textarea
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

// Replace the input with a textarea
cc = cc.replace(
  `            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Ask Tag anything about categories..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: THEME.text, fontSize: 13, padding: "10px 0", fontFamily: "inherit" }}
            />`,
  `            <textarea
              rows={3}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask Tag anything about categories..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: THEME.text, fontSize: 14, padding: "10px 0", fontFamily: "inherit", resize: "none", lineHeight: 1.6, minHeight: 52 }}
            />`
);

// Fix categories input container to match transactions
cc = cc.replace(
  'style={{ display: "flex", alignItems: "center", gap: 10, background: THEME.surface, borderRadius: 14, border: `1px solid ${THEME.border}`, padding: "4px 6px 4px 16px" }}',
  'style={{ display: "flex", alignItems: "flex-end", gap: 10, background: THEME.surface, borderRadius: 14, border: `1px solid ${THEME.border}`, padding: "8px 8px 8px 16px" }}'
);

// Fix send button size in categories
cc = cc.replace(
  'style={{ width: 34, height: 34, borderRadius: 10,',
  'style={{ width: 38, height: 38, borderRadius: 10,'
);

// Fix message font size in categories (13 → 15)
cc = cc.replace(
  'fontSize: 13,\n                  lineHeight: 1.6,',
  'fontSize: 15,\n                  lineHeight: 1.7,'
);

fs.writeFileSync(fc, cc, 'utf8');
console.log('Categories Tag input standardized');

const fs = require('fs');

// ── Fix 1: TagCopilotPanel.tsx — permissive FILTER regex ────────────────────
const f1 = 'src/components/transactions/TagCopilotPanel.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(
  'const filterMatch = reply.match(/FILTER:(\\{[^\\}]+\\})/s);',
  'const filterMatch = reply.match(/FILTER:\\s*({[^}]*})/s);'
);
fs.writeFileSync(f1, c1, 'utf8');
console.log('Fix 1 done - FILTER regex');

// ── Fix 2: TransactionsPageV2.tsx — visible filter chip + scroll ─────────────
const f2 = 'src/pages/dashboard/TransactionsPageV2.tsx';
let c2 = fs.readFileSync(f2, 'utf8');

// Add tagFilterLabel state after searchQuery state
c2 = c2.replace(
  "const [searchQuery, setSearchQuery] = useState('');",
  "const [searchQuery, setSearchQuery] = useState('');\n  const [tagFilterLabel, setTagFilterLabel] = useState('');\n  const txListRef = (typeof window !== 'undefined') ? { current: null } : { current: null };"
);

// Add useRef import if not present
if (!c2.includes('useRef')) {
  c2 = c2.replace(
    "import { useState,",
    "import { useState, useRef,"
  );
  if (!c2.includes('useRef')) {
    c2 = c2.replace(
      "import { useState ",
      "import { useState, useRef, "
    );
  }
}

// Set tagFilterLabel when Tag applies filter
c2 = c2.replace(
  "if (action.type === 'filter') { setSearchQuery(action.search || ''); }",
  "if (action.type === 'filter') { const q = action.search || ''; setSearchQuery(q); setTagFilterLabel(q); setTimeout(() => { document.getElementById('tx-list-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); }"
);

// Add the filter chip below the search input
c2 = c2.replace(
  '<input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search merchants, categories, amounts..."',
  '<input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setTagFilterLabel(\'\'); }} placeholder="Search merchants, categories, amounts..."'
);

// Add the Tag filter chip + scroll anchor after the search div closing tag
c2 = c2.replace(
  "          {/* Review banner */}",
  `          {/* Tag filter chip */}
          <div id="tx-list-anchor" />
          {tagFilterLabel && searchQuery === tagFilterLabel && (
            <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-800/60 bg-cyan-500/5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                <span style={{ fontSize: 9, fontWeight: 700, color: '#22d3ee', letterSpacing: '0.1em', textTransform: 'uppercase' }}>TAG</span>
                <span style={{ fontSize: 12, color: '#e8ecf4', fontWeight: 600 }}>{tagFilterLabel}</span>
                <button onClick={() => { setSearchQuery(''); setTagFilterLabel(''); }}
                  style={{ marginLeft: 2, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
              </div>
              <span style={{ fontSize: 11, color: '#475569' }}>Tag filtered your results</span>
            </div>
          )}

          {/* Review banner */}`
);

fs.writeFileSync(f2, c2, 'utf8');
console.log('Fix 2 done - filter chip + scroll');

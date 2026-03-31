const fs = require('fs');
const f = 'src/pages/CategoriesV2/CategoryDetailDrawer.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
  'import { useMemo } from "react";',
  'import { useMemo, useState } from "react";'
);
c = c.replace(
  'import { useTransactions } from "@/hooks/useTransactions";',
  'import { useTransactions } from "@/hooks/useTransactions";\nimport { getSupabase } from "@/lib/supabase";'
);
c = c.replace('const CYAN = "#22d3ee";',
`const CYAN = "#22d3ee";

const ALL_CATS = [
  'Income','Groceries','Food & Dining','Transportation','Housing','Utilities',
  'Shopping','Subscriptions','Personal Care','Healthcare','Bank Fees','Transfers',
  'Savings','Debt Payments','Insurance','Education','Travel','Other',
];

const SUBCATEGORY_OPTIONS: Record<string, string[]> = {
  'Transportation': ['Gas & Fuel','Parking','Transit','Vehicle Insurance','Vehicle Services','Rideshare'],
  'Food & Dining':  ['Restaurants','Fast Food','Coffee & Drinks','Delivery'],
  'Personal Care':  ['Hair & Beauty','Massage & Wellness','Gym & Fitness','Clothing'],
  'Healthcare':     ['Dental','Chiropractic','Pharmacy','Medical','Vision'],
  'Shopping':       ['Electronics','Auto & Hardware','Home & Garden','Clothing','General'],
  'Subscriptions':  ['Software & AI','Streaming','Memberships','News & Media'],
  'Entertainment':  ['Gaming & Lottery','Movies & Events','Sports','Golf','Hobbies'],
  'Bank Fees':      ['Banking','Credit Services','Loans','ATM'],
  'Income':         ['Employment','Business Income','Government Rebate','Tax Refund'],
  'Debt Payments':  ['Credit Card','Line of Credit','Loan Payment'],
};`
);

c = c.replace(
  '  const catTransactions = useMemo(() => {',
`  const [expandedTxId, setExpandedTxId] = useState(null);
  const [savingTxId, setSavingTxId] = useState(null);
  const [localCategories, setLocalCategories] = useState({});
  const [localSubcategories, setLocalSubcategories] = useState({});

  const handleCategoryChange = async (txId, newCategory) => {
    setLocalCategories(prev => ({ ...prev, [txId]: newCategory }));
    setLocalSubcategories(prev => ({ ...prev, [txId]: '' }));
    setSavingTxId(txId);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch('/.netlify/functions/tx-update-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({ id: txId, table: 'transactions', category: newCategory, applyToVendor: false }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Category updated');
    } catch { toast.error('Could not save'); }
    finally { setSavingTxId(null); }
  };

  const handleSubcategoryChange = async (txId, subcategory, category) => {
    setLocalSubcategories(prev => ({ ...prev, [txId]: subcategory }));
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      await fetch('/.netlify/functions/tx-update-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({ id: txId, table: 'transactions', category, subcategory }),
      });
      toast.success('Subcategory saved');
    } catch { toast.error('Could not save subcategory'); }
  };

  const catTransactions = useMemo(() => {`
);

const oldRows = `          {catTransactions.map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: \`1px solid \${THEME.border}\` }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.merchant_name || "Unknown"}
                </div>
                <div style={{ fontSize: 10, color: THEME.textDim }}>{(t.posted_at || "").slice(0, 10)}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text, flexShrink: 0, marginLeft: 12 }}>
                \${Math.abs(t.amount).toFixed(2)}
              </div>
            </div>
          ))}`;

const newRows = `          {catTransactions.map(t => {
            const isExpanded = expandedTxId === t.id;
            const isSaving = savingTxId === t.id;
            const displayCat = localCategories[t.id] || t.category || category.name;
            const displaySub = localSubcategories[t.id] ?? (t.subcategory || '');
            const subcatOpts = SUBCATEGORY_OPTIONS[displayCat] || [];
            return (
              <div key={t.id} style={{ borderBottom: \`1px solid \${THEME.border}\` }}>
                <div onClick={() => setExpandedTxId(isExpanded ? null : t.id)}
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', cursor:'pointer', gap:8 }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:THEME.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {t.merchant_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize:10, color:THEME.textDim, marginTop:2, display:'flex', gap:6 }}>
                      <span>{(t.posted_at || '').slice(0,10)}</span>
                      {displaySub && <span style={{ color:CYAN, fontWeight:600 }}>{displaySub}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:THEME.textDim }}>{displayCat}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:THEME.text }}>\${Math.abs(t.amount).toFixed(2)}</span>
                    <span style={{ color:THEME.textDim, fontSize:10, display:'inline-block', transform:isExpanded?'rotate(180deg)':'none', transition:'transform 0.2s' }}>▾</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ padding:'8px 0 14px', display:'flex', flexDirection:'column', gap:10 }}>
                    <div>
                      <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:1.2, color:THEME.textDim, fontWeight:700, marginBottom:6 }}>Category</div>
                      <select value={displayCat} onChange={e => void handleCategoryChange(t.id, e.target.value)} disabled={isSaving}
                        style={{ width:'100%', padding:'6px 10px', borderRadius:8, background:'#0b1220', border:'1px solid #1e2d4a', color:'#f1f5f9', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
                        {ALL_CATS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    {subcatOpts.length > 0 && (
                      <div>
                        <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:1.2, color:THEME.textDim, fontWeight:700, marginBottom:6 }}>Subcategory</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                          {subcatOpts.map(sub => (
                            <button key={sub} onClick={() => void handleSubcategoryChange(t.id, sub, displayCat)}
                              style={{ padding:'4px 10px', borderRadius:14, fontSize:11, fontWeight:600, cursor:'pointer',
                                background: displaySub===sub ? CYAN+'20' : 'rgba(255,255,255,0.04)',
                                border: '1px solid '+(displaySub===sub ? CYAN+'50' : 'rgba(255,255,255,0.08)'),
                                color: displaySub===sub ? CYAN : THEME.textMuted }}>
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {onAskTag && (
                      <button onClick={() => { onAskTag(\`Help me with \${t.merchant_name||'this transaction'} ($\${Math.abs(t.amount).toFixed(2)}) — currently in \${displayCat}\${displaySub?' / '+displaySub:''}. Is this right for a self-employed Canadian?\`); onClose(); }}
                        style={{ alignSelf:'flex-start', padding:'5px 12px', borderRadius:14, fontSize:11, fontWeight:700, background:CYAN+'12', border:'1px solid '+CYAN+'30', color:CYAN, cursor:'pointer' }}>
                        Ask Tag →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}`;

if (c.includes(oldRows)) {
  c = c.replace(oldRows, newRows);
  console.log('Row replacement done');
} else {
  console.log('WARNING: pattern not found - manual check needed');
}

fs.writeFileSync(f, c, 'utf8');
console.log('CategoryDetailDrawer patched');

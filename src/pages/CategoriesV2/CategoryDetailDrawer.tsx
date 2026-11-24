import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { THEME, type CategoryData } from "./categoryConfig";
import { AnimatedBar } from "./AnimatedBar";
import { useTransactions } from "@/hooks/useTransactions";
import { getSupabase } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/useIsMobile";
import { inSelectedPeriod, periodLabel, calendarDayOfTx, DETAIL_PAGE_SIZE } from "@/lib/categoryPeriod";
import { formatMonthPeriod } from "@/lib/categoryList";
import { formatCalendarDate } from "@/lib/calendarDate";

const CYAN = "#22d3ee";

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
};
interface CategoryDetailDrawerProps {
  category: CategoryData | null;
  onClose: () => void;
  subcategoryFilter?: { name: string; merchantNames: string[] } | null;
  onAskTag?: (question: string) => void;
  isTagOpen?: boolean;
  /** K-b: the page's year / month filter, so the detail lists exactly what the page counted. */
  selectedYear?: number | 'all';
  selectedPeriod?: string;
}

export function CategoryDetailDrawer({ category, onClose, subcategoryFilter, onAskTag, isTagOpen = false, selectedYear, selectedPeriod }: CategoryDetailDrawerProps) {
  const navigate = useNavigate();
  const { transactions } = useTransactions();

  const [expandedTxId, setExpandedTxId] = useState(null);
  const [savingTxId, setSavingTxId] = useState(null);
  const [localCategories, setLocalCategories] = useState({});
  const [localSubcategories, setLocalSubcategories] = useState({});
  const isMobile = useIsMobile();
  // K-b: show every matching transaction, a page at a time (was capped at 10 / 15).
  const [visibleCount, setVisibleCount] = useState(DETAIL_PAGE_SIZE);
  useEffect(() => { setVisibleCount(DETAIL_PAGE_SIZE); }, [category?.name, subcategoryFilter?.name, selectedYear, selectedPeriod]);

  const handleCategoryChange = async (txId, newCategory) => {
    const prevCategory = localCategories[txId];
    const prevSubcategory = localSubcategories[txId];
    setLocalCategories(prev => ({ ...prev, [txId]: newCategory }));
    setLocalSubcategories(prev => ({ ...prev, [txId]: '' }));
    setSavingTxId(txId);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch('/.netlify/functions/tx-update-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: txId, table: 'transactions', category: newCategory, applyToVendor: false }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Category updated');
    } catch {
      // K-b: the save was not confirmed — show the last saved value again.
      setLocalCategories(prev => ({ ...prev, [txId]: prevCategory }));
      setLocalSubcategories(prev => ({ ...prev, [txId]: prevSubcategory }));
      toast.error('Could not save');
    }
    finally { setSavingTxId(null); }
  };

  const handleSubcategoryChange = async (txId, subcategory, category) => {
    const prevSubcategory = localSubcategories[txId];
    setLocalSubcategories(prev => ({ ...prev, [txId]: subcategory }));
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch('/.netlify/functions/tx-update-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: txId, table: 'transactions', category, subcategory }),
      });
      // K-b: previously "Subcategory saved" showed even when the save failed.
      if (!res.ok) throw new Error('Save failed');
      toast.success('Subcategory saved');
    } catch {
      setLocalSubcategories(prev => ({ ...prev, [txId]: prevSubcategory }));
      toast.error('Could not save subcategory');
    }
  };

  // K-b: same year / month rules as the page, and no 10 / 15 cap (paged below).
  const allCatTransactions = useMemo(() => {
    if (!category) return [];
    const base = transactions
      .filter(t => (t.category || "Other") === category.name)
      .filter(t => inSelectedPeriod(calendarDayOfTx(t), selectedYear, selectedPeriod))
      .sort((a, b) => (b.posted_at || "").localeCompare(a.posted_at || ""));
    if (subcategoryFilter) {
      const names = subcategoryFilter.merchantNames.map(n => n.toLowerCase());
      return base.filter(t => names.includes((t.merchant_name || "").toLowerCase()));
    }
    return base;
  }, [transactions, category, subcategoryFilter, selectedYear, selectedPeriod]);
  const catTransactions = allCatTransactions.slice(0, visibleCount);

  if (!category) return null;

  // When filtered, compute subcategory spent from matched transactions
  const displaySpent = subcategoryFilter
    ? Math.round(allCatTransactions.reduce((s, t) => s + Math.abs(t.amount), 0))
    : category.spent;
  const displayCount = subcategoryFilter ? allCatTransactions.length : category.transactionCount;
  const periodText = periodLabel(selectedYear, selectedPeriod, formatMonthPeriod);

  const pct = category.budget > 0 ? Math.round((category.spent / category.budget) * 100) : 0;
  const isOver = pct > 100;
  const barColor = isOver ? THEME.red : pct >= 80 ? THEME.amber : category.color;

  return createPortal(
    <>
      <button type="button" aria-label="Close"
        style={{ position: "fixed", top: 0, left: 0, right: isTagOpen ? 520 : 0, bottom: 0, zIndex: 1000, background: "rgba(11,18,32,0.6)", backdropFilter: "blur(2px)", border: "none", cursor: "pointer" }}
        onClick={onClose}
      />
      <div role="dialog" aria-label={`${subcategoryFilter ? subcategoryFilter.name : category.name} transactions`} style={{ position: "fixed", top: 0, right: isMobile ? 0 : (isTagOpen ? 528 : 0), zIndex: 1001, width: isMobile ? "100%" : 440, paddingTop: "env(safe-area-inset-top, 0px)", boxSizing: "border-box", transition: "right 0.3s cubic-bezier(0.16,1,0.3,1)", height: "100%", background: THEME.bg, borderLeft: `1px solid ${THEME.border}`, display: "flex", flexDirection: "column", animation: "catDrawerSlide 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}>
        <style>{`@keyframes catDrawerSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: category.color + "18", border: `1px solid ${category.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {category.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text }}>
              {subcategoryFilter ? subcategoryFilter.name : category.name}
            </div>
            <div style={{ fontSize: 13, color: "#9ba8bc" }}>
              {subcategoryFilter
                ? <><span style={{ color: category.color, fontWeight: 600 }}>{category.name}</span> &rsaquo; {subcategoryFilter.name} &middot; {displayCount} transactions</>
                : <>{displayCount} transactions &middot; {periodText}</>
              }
            </div>
          </div>
          <button onClick={onClose} aria-label="Close category details" style={{ width: 44, height: 44, borderRadius: 10, background: "transparent", border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 80px" }}>

          {/* Spend summary */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: isOver && !subcategoryFilter ? THEME.red : THEME.text }}>
              ${displaySpent.toLocaleString()}
            </div>
            {subcategoryFilter ? (
              <div style={{ fontSize: 12, color: THEME.textDim, marginTop: 6 }}>
                of ${category.spent.toLocaleString()} total {category.name} spend
                ({category.spent > 0 ? Math.round((displaySpent / category.spent) * 100) : 0}%)
              </div>
            ) : category.budget > 0 ? (
              <>
                <div style={{ fontSize: 12, color: THEME.textDim, margin: "6px 0 10px" }}>
                  of ${category.budget.toLocaleString()} budget ({pct}%)
                </div>
                <AnimatedBar pct={pct} color={barColor} height={8} />
              </>
            ) : null}
          </div>

          {/* Subcategory chips — show all chips when viewing parent */}
          {!subcategoryFilter && category.subcategories && category.subcategories.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textDim, fontWeight: 700, marginBottom: 8 }}>Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {category.subcategories.map(sub => (
                  <div key={sub.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: category.color }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>{sub.name}</span>
                      <span style={{ fontSize: 10, color: THEME.textDim }}>{sub.count} txns</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>${sub.spent.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trend */}
          {!subcategoryFilter && category.trend !== 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: category.trend > 0 ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.08)", border: `1px solid ${category.trend > 0 ? "rgba(248,113,113,0.15)" : "rgba(52,211,153,0.15)"}`, marginBottom: 20, fontSize: 12, color: category.trend > 0 ? THEME.red : THEME.green }}>
              {category.trend > 0 ? "\u2191" : "\u2193"} {Math.abs(category.trend)}% vs last month
            </div>
          )}

          {/* Transactions */}
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: "#64748b", fontWeight: 700, marginBottom: 12 }}>
            Transactions &middot; {periodText}
          </div>
          {catTransactions.length === 0 && (
            <div style={{ fontSize: 12, color: THEME.textDim, padding: "12px 0" }}>No transactions found</div>
          )}
          {catTransactions.map(t => {
            const isExpanded = expandedTxId === t.id;
            const isSaving = savingTxId === t.id;
            const displayCat = localCategories[t.id] || t.category || category.name;
            const displaySub = localSubcategories[t.id] ?? (t.subcategory || '');
            const subcatOpts = SUBCATEGORY_OPTIONS[displayCat] || [];
            return (
              <div key={t.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                <button type="button" onClick={() => setExpandedTxId(isExpanded ? null : t.id)} aria-expanded={isExpanded}
                  style={{ width:'100%', minHeight:56, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', cursor:'pointer', gap:8, background:'transparent', border:'none', textAlign:'left', fontFamily:'inherit' }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'#e8ecf4', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {t.merchant_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize:12, color:'#94a3b8', marginTop:2, display:'flex', gap:6 }}>
                      <span>{formatCalendarDate(calendarDayOfTx(t), 'medium') || ''}</span>
                      {displaySub && <span style={{ color:CYAN, fontWeight:600 }}>{displaySub}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'#94a3b8' }}>{displayCat}</span>
                    <span style={{ fontSize:15, fontWeight:700, color:'#f1f5f9' }}>${Math.abs(t.amount).toFixed(2)}</span>
                    <span aria-hidden="true" style={{ color:'#9ba8bc', fontSize:12, display:'inline-block', transform:isExpanded?'rotate(180deg)':'none', transition:'transform 0.2s' }}>▾</span>
                  </div>
                </button>
                {isExpanded && (
                  <div style={{ padding:'8px 0 14px', display:'flex', flexDirection:'column', gap:10 }}>
                    <div>
                      <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:1.2, color:'#64748b', fontWeight:700, marginBottom:6 }}>Category</div>
                      <select value={displayCat} onChange={e => void handleCategoryChange(t.id, e.target.value)} disabled={isSaving} aria-label={`Category for ${t.merchant_name || 'transaction'}`}
                        style={{ width:'100%', minHeight:44, padding:'0 12px', borderRadius:10, background:'#0b1220', border:'1px solid #24365a', color:'#f1f5f9', fontSize:15, fontFamily:'inherit', cursor:'pointer' }}>
                        {ALL_CATS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    {subcatOpts.length > 0 && (
                      <div>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:1.2, color:'#64748b', fontWeight:700, marginBottom:6 }}>Subcategory</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                          {subcatOpts.map(sub => (
                            <button key={sub} onClick={() => void handleSubcategoryChange(t.id, sub, displayCat)}
                              aria-pressed={displaySub===sub}
                              style={{ minHeight:40, padding:'0 12px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
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
                      <button onClick={() => { onAskTag(`Help me with ${t.merchant_name||'this transaction'} (${Math.abs(t.amount).toFixed(2)}) - currently in ${displayCat}${displaySub?' / '+displaySub:''}. Is this right for a self-employed Canadian?`); onClose(); }}
                        style={{ alignSelf:'flex-start', padding:'5px 12px', borderRadius:14, fontSize:11, fontWeight:700, background:CYAN+'12', border:'1px solid '+CYAN+'30', color:CYAN, cursor:'pointer' }}>
                        Ask Tag {"->"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {allCatTransactions.length > catTransactions.length && (
            <button type="button" onClick={() => setVisibleCount(n => n + DETAIL_PAGE_SIZE)}
              style={{ width: "100%", minHeight: 44, marginTop: 12, borderRadius: 10, border: `1px solid ${THEME.border}`, background: "transparent", color: "#c8d0e0", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Show more ({allCatTransactions.length - catTransactions.length} more)
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px calc(12px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${THEME.border}`, display: "flex", gap: 8 }}>
          <button onClick={() => { onClose(); navigate("/dashboard/analytics-ai"); }}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: `${category.color}15`, border: `1px solid ${category.color}30`, color: category.color, cursor: "pointer" }}>
            View Trends
          </button>
          {onAskTag && (
            <button onClick={() => { onAskTag(subcategoryFilter
              ? `Help me with ${subcategoryFilter.name} under ${category.name} - should these transactions stay here or move to a different category?`
              : `I have ${category.transactionCount} transactions in ${category.name} totalling ${category.spent.toLocaleString()}. Can you help me review and optimize this category?`
            ); onClose(); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 700, background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN, cursor: "pointer" }}>
              Ask Tag
            </button>
          )}
          <button onClick={() => toast("Budget editing coming soon")}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, color: THEME.textDim, cursor: "pointer" }}>
            Edit Budget
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

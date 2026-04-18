import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { AgentFloatingBubble } from "@/components/ui/AgentFloatingBubble";
import { THEME } from "./categoryConfig";
import { useCategoriesData } from "./useCategoriesData";
import { useProfile } from "@/hooks/useProfile";
import { StatCard } from "./StatCard";
import { CategoryCard } from "./CategoryCard";
import { CategoryDetailDrawer } from "./CategoryDetailDrawer";
import { AgentInsightStrip } from "./AgentInsightStrip";
import { TagCopilotPanel } from "@/components/transactions/TagCopilotPanel";
import { getSupabase } from "@/lib/supabase";
import { Reveal } from "../PrimeChatV2/Reveal";
import type { CategoryData } from "./categoryConfig";

const CYAN = "#22d3ee";
const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function formatPeriod(p: string): string {
  const [year, month] = p.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

export default function CategoriesPageV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fullName } = useProfile();
  const firstName = fullName?.split(' ')[0] || '';
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const data = useCategoriesData(selectedPeriod || undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try { window.dispatchEvent(new Event('transactions:refresh')); } catch { /* noop */ }
    try { window.dispatchEvent(new Event('tag:stats-refresh')); } catch { /* noop */ }
    // Flip period to force useCategoriesData to re-run even if hook doesn't listen
    setSelectedPeriod(p => p); // no-op update, triggers dep re-check
    setTimeout(() => setIsRefreshing(false), 800);
  }, [isRefreshing]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [subcategoryFilter, setSubcategoryFilter] = useState<{ name: string; merchantNames: string[] } | null>(null);
  const [search, setSearch] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotInitialMessage, setCopilotInitialMessage] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    h(); window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const handleExport = useCallback(() => {
    if (data.categories.length === 0) { toast.error("No categories to export"); return; }
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = data.categories.map(c => [
      escape(c.name), c.spent, c.budget, c.transactionCount, c.trend, escape(c.topMerchant),
    ].join(","));
    const csv = ["Category,Spent,Budget,Transactions,MoM Trend %,Top Merchant", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `categories-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Categories exported");
  }, [data.categories]);

  // Separate Transfers from real expense categories
  const transfersCategory = data.categories.find(c => c.name === "Transfers");
  const mainCategories = data.categories.filter(c => c.name !== "Transfers");
  const filtered = search
    ? mainCategories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : mainCategories;

  const overBudgetCount = mainCategories.filter(c => c.budget > 0 && c.spent > c.budget).length;
  const totalTxCount = data.categories.reduce((s, c) => s + c.transactionCount, 0);
  const net = data.totalIncome - data.totalSpent;

  if (data.loading) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 16px" : "32px 24px", paddingRight: copilotOpen && !isMobile ? 544 : isMobile ? 16 : 24, transition: "padding-right 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: THEME.textMuted }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #334155", borderTopColor: "#94a3b8", animation: "spin 1s linear infinite" }} />
          Loading categories...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const saveBudget = async () => {
    if (!budgetCategory || !budgetAmount) return;
    setBudgetSaving(true);
    try {
      const sb = getSupabase();
      if (!sb) return;
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { toast.error("Not logged in"); return; }
      const limit = parseFloat(budgetAmount);
      const { error } = await sb.from('category_budgets').upsert(
        { user_id: session.user.id, category: budgetCategory, monthly_limit: limit },
        { onConflict: 'user_id,category' }
      );
      if (error) throw error;
      await sb.from('user_notifications').insert({
        user_id: session.user.id,
        employee_slug: 'goalie-goals',
        type: 'budget_set',
        title: `Budget set \u2014 ${budgetCategory}`,
        message: `$${limit.toLocaleString()}/month limit locked in for ${budgetCategory}. I'll flag you when you hit 80%.`,
        priority: 'info',
        sent_at: new Date().toISOString(),
      }).catch(() => {});
      toast.success(`Goalie locked in $${limit}/mo for ${budgetCategory}`);
      setBudgetModal(false);
      setBudgetAmount("");
    } catch {
      toast.error("Failed to save budget");
    } finally {
      setBudgetSaving(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 16px" : "32px 24px" }}>

        {/* Header */}
        <Reveal delay={0}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: isMobile ? 12 : 0 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: 0, letterSpacing: -0.3 }}>Categories</h1>
              <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                {data.categoryCount} categories &middot; {totalTxCount} transactions
                {selectedPeriod && <span style={{ color: CYAN }}> &middot; {formatPeriod(selectedPeriod)}</span>}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={handleRefresh} disabled={isRefreshing} title="Refresh data"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, borderRadius: 10, color: isRefreshing ? CYAN : THEME.textMuted, cursor: isRefreshing ? "wait" : "pointer", opacity: isRefreshing ? 0.8 : 1, transition: "all 0.15s" }}>
                <span style={{ display: "inline-block", transition: "transform 0.6s", transform: isRefreshing ? "rotate(360deg)" : "rotate(0deg)", fontSize: 14, lineHeight: 1 }}>↻</span>
                {!isMobile && <span>{isRefreshing ? "Refreshing" : "Refresh"}</span>}
              </button>
              {!isMobile && (
                <>
                <button onClick={() => navigate('/dashboard/categories/rules')} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, background: `${CYAN}10`, border: `1px solid ${CYAN}30`, borderRadius: 10, color: CYAN, cursor: "pointer" }}>
                  Tag Rules
                </button>
                <button onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, borderRadius: 10, color: THEME.textMuted, cursor: "pointer" }}>
                  Export
                </button>
                </>
              )}
              <button onClick={() => setCopilotOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, background: `${CYAN}12`, border: `1px solid ${CYAN}28`, borderRadius: 10, color: CYAN, cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = `${CYAN}22`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${CYAN}12`; }}
              >
                <span style={{ width: 20, height: 20, borderRadius: "50%", fontSize: 9, fontWeight: 700, background: `${CYAN}25`, border: `1px solid ${CYAN}44`, color: CYAN, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>T</span>
                Tag Copilot
              </button>
              <button onClick={() => { setBudgetCategory(filtered[0]?.name || ""); setBudgetModal(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg, #fbbf24, #d97706)", border: "none", borderRadius: 10, color: "#0b1220", cursor: "pointer", boxShadow: "0 4px 16px rgba(251,191,36,0.35)" }}>
                {'\u26A1'} Goalie: Set Budget
              </button>
            </div>
          </div>
        </Reveal>

        {/* Income / Expense / Net hero banner + period selector */}
        <Reveal delay={50}>
          <div style={{ borderRadius: 16, background: THEME.surface, border: `1px solid ${THEME.border}`, padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: data.availablePeriods.length > 0 ? 16 : 0 }}>

              {/* Income */}
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>Income</div>
                <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: THEME.green }}>${fmt(data.totalIncome)}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{selectedPeriod ? formatPeriod(selectedPeriod) : "All time"}</div>
              </div>

              {/* Expenses */}
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>Expenses</div>
                <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: THEME.red }}>${fmt(data.totalSpent)}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>excl. transfers</div>
              </div>

              {/* Net � desktop only */}
              {!isMobile && (
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>Net</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: net >= 0 ? THEME.green : THEME.red }}>
                    {net >= 0 ? "+$" : "-$"}{fmt(Math.abs(net))}
                  </div>
                  <div style={{ fontSize: 11, color: net >= 0 ? THEME.green : THEME.red, marginTop: 2, fontWeight: 600 }}>
                    {net >= 0 ? "\u2191 Positive cash flow" : "\u2193 Spending exceeds income"}
                  </div>
                </div>
              )}
            </div>

            {/* Period pills */}
            {data.availablePeriods.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 14, borderTop: `1px solid ${THEME.border}` }}>
                <button
                  onClick={() => setSelectedPeriod("")}
                  style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${!selectedPeriod ? CYAN : THEME.border}`, background: !selectedPeriod ? `${CYAN}18` : "transparent", color: !selectedPeriod ? CYAN : THEME.textMuted, transition: "all 0.15s" }}
                >
                  All Time
                </button>
                {data.availablePeriods.slice(0, 8).map(p => (
                  <button key={p} onClick={() => setSelectedPeriod(p)}
                    style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${selectedPeriod === p ? CYAN : THEME.border}`, background: selectedPeriod === p ? `${CYAN}18` : "transparent", color: selectedPeriod === p ? CYAN : THEME.textMuted, transition: "all 0.15s" }}
                  >
                    {formatPeriod(p)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Stat cards */}
        <Reveal delay={100}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <StatCard label="Total Spent" value={`$${fmt(data.totalSpent)}`} color={THEME.red}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7" /></svg>} />
            <StatCard label="Categories" value={String(data.categoryCount)} color={THEME.text}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>} />
            <StatCard label="Over Budget" value={String(overBudgetCount)} color={overBudgetCount > 0 ? THEME.red : THEME.green}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>} />
            <StatCard label="Uncategorized" value={String(data.uncategorizedCount)} color={data.uncategorizedCount > 0 ? THEME.amber : THEME.green}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>} />
          </div>
        </Reveal>

        {/* Tag insight strip */}
        <Reveal delay={150}>
          <button type="button" onClick={() => setCopilotOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 18px", borderRadius: 14, marginBottom: 20, background: `${CYAN}04`, border: `1px solid ${CYAN}18`, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = `${CYAN}08`; e.currentTarget.style.borderColor = `${CYAN}30`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${CYAN}04`; e.currentTarget.style.borderColor = `${CYAN}18`; }}
          >
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `${CYAN}20`, border: `1.5px solid ${CYAN}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: CYAN, boxShadow: `0 0 12px ${CYAN}25` }}>T</div>
            <div style={{ flex: 1, fontSize: 12, color: THEME.textMuted }}>
              <span style={{ color: CYAN, fontWeight: 600 }}>{data.uncategorizedCount} items need review</span>
              {data.subcategorySuggestions?.length > 0 && <>{" \u2022 "}{data.subcategorySuggestions.length} subcategory split{data.subcategorySuggestions.length !== 1 ? "s" : ""} suggested</>}
              {" \u2022 "}Tag rules active
            </div>

          </button>
        </Reveal>

        {/* Agent insights */}
        <Reveal delay={200}>
          <div style={{ marginBottom: 20 }}>
            <AgentInsightStrip data={data} />
          </div>
        </Reveal>

        {/* Search */}
        <Reveal delay={250}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, marginBottom: 20 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={THEME.textDim} strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: THEME.text, fontSize: 13, fontFamily: "inherit" }} />
          </div>
        </Reveal>

        {/* Main category grid */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
          {filtered.map((cat, i) => (
            <Reveal key={cat.name} delay={300 + i * 60}>
              <CategoryCard category={cat} onClick={() => { setSubcategoryFilter(null); setSelectedCategory(cat); }} onSubcategoryClick={(name, merchantNames) => { setSubcategoryFilter({ name, merchantNames }); setSelectedCategory(cat); }} />
            </Reveal>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: THEME.textDim, fontSize: 14 }}>
            {search ? "No categories match your search" : "No categories found. Upload a statement to get started."}
          </div>
        )}

        {/* Money Movement � Transfers shown separately, excluded from expense totals */}
        {!search && transfersCategory && (
          <Reveal delay={200}>
            <div style={{ marginTop: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: THEME.blue }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: THEME.blue }}>Money Movement</span>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Not counted in expenses</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
                <CategoryCard category={transfersCategory} onClick={() => { setSubcategoryFilter(null); setSelectedCategory(transfersCategory); }} onSubcategoryClick={(name, merchantNames) => { setSubcategoryFilter({ name, merchantNames }); setSelectedCategory(transfersCategory); }} />
              </div>
            </div>
          </Reveal>
        )}
      </div>

      {/* Floating T bubble */}
      {!copilotOpen && location.pathname.includes('/categories') && createPortal(
        <AgentFloatingBubble letter="T" color="#22d3ee" colorTo="#0891b2" onClick={() => setCopilotOpen(true)} label="Open Tag Copilot" badgeCount={data.uncategorizedCount} pulse={data.uncategorizedCount > 0} />,
        document.body
      )}

      {/* Tag Copilot Panel */}
      {copilotOpen && createPortal(
        <TagCopilotPanel
          onClose={() => { setCopilotOpen(false); setTimeout(() => setCopilotInitialMessage(""), 300); }}
          firstName={firstName}
          totalCount={totalTxCount}
          totalSpent={data.totalSpent}
          totalIncome={data.totalIncome}
          injectedMessage={copilotInitialMessage || undefined}
        />,
        document.body
      )}

      {/* Category detail drawer */}
      <CategoryDetailDrawer
        category={selectedCategory}
        onClose={() => { setSelectedCategory(null); setSubcategoryFilter(null); }}
        subcategoryFilter={subcategoryFilter}
        isTagOpen={copilotOpen}
        onAskTag={(question) => { setCopilotInitialMessage(question); setCopilotOpen(true); }}
      />

      {/* Budget modal */}
      {budgetModal && createPortal(
        <div onClick={() => setBudgetModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111a2e", border: "1px solid #1e2d4a", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fbbf2420", border: "1.5px solid #fbbf2444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fbbf24", flexShrink: 0 }}>G</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>Goalie</div>
                <div style={{ fontSize: 11, color: "#9ba8bc" }}>Budget manager</div>
              </div>
            </div>
            <p style={{ color: "#c8d0e0", fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>Set a monthly spending limit. I'll track your progress and flag you at 80% so you never get surprised.</p>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9ba8bc", textTransform: "uppercase" as const, letterSpacing: 1, display: "block", marginBottom: 6 }}>Category</label>
            <select value={budgetCategory} onChange={e => setBudgetCategory(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#0b1220", border: "1px solid #1e2d4a", color: "#e8ecf4", fontSize: 13, marginBottom: 16, boxSizing: "border-box" as const, fontFamily: "inherit" }}>
              {mainCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9ba8bc", textTransform: "uppercase" as const, letterSpacing: 1, display: "block", marginBottom: 6 }}>Monthly Limit (CAD $)</label>
            <input type="number" placeholder="e.g. 500" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void saveBudget(); }} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#0b1220", border: "1px solid #fbbf2433", color: "#e8ecf4", fontSize: 13, marginBottom: 20, boxSizing: "border-box" as const, fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setBudgetModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, background: "transparent", border: "1px solid #1e2d4a", color: "#9ba8bc", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Cancel</button>
              <button onClick={() => void saveBudget()} disabled={budgetSaving || !budgetCategory || !budgetAmount} style={{ flex: 1, padding: 12, borderRadius: 10, background: "linear-gradient(135deg, #fbbf24, #d97706)", border: "none", color: "#0b1220", fontWeight: 700, cursor: "pointer", fontSize: 13, opacity: budgetSaving ? 0.7 : 1, fontFamily: "inherit" }}>{budgetSaving ? "Saving..." : "Lock It In"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}


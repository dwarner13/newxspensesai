import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { THEME } from "./categoryConfig";
import { useCategoriesData } from "./useCategoriesData";
import { StatCard } from "./StatCard";
import { CategoryCard } from "./CategoryCard";
import { CategoryDetailDrawer } from "./CategoryDetailDrawer";
import { AgentInsightStrip } from "./AgentInsightStrip";
import { TagCopilotPanel } from "./TagCopilotPanel";
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
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const data = useCategoriesData(selectedPeriod || undefined);
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [subcategoryFilter, setSubcategoryFilter] = useState<{ name: string; merchantNames: string[] } | null>(null);
  const [search, setSearch] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotInitialMessage, setCopilotInitialMessage] = useState("");
  const [isMobile, setIsMobile] = useState(false);

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
      <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 16px" : "32px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: THEME.textMuted }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #334155", borderTopColor: "#94a3b8", animation: "spin 1s linear infinite" }} />
          Loading categories...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 16px" : "32px 24px" }}>

        {/* Header */}
        <Reveal delay={0}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: isMobile ? 12 : 0 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: 0, letterSpacing: -0.3 }}>Categories</h1>
              <p style={{ fontSize: 12, color: THEME.textDim, marginTop: 4 }}>
                {data.categoryCount} categories &middot; {totalTxCount} transactions
                {selectedPeriod && <span style={{ color: CYAN }}> &middot; {formatPeriod(selectedPeriod)}</span>}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!isMobile && (
                <button onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, borderRadius: 10, color: THEME.textMuted, cursor: "pointer" }}>
                  Export
                </button>
              )}
              <button onClick={() => setCopilotOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, background: `${CYAN}12`, border: `1px solid ${CYAN}28`, borderRadius: 10, color: CYAN, cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = `${CYAN}22`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${CYAN}12`; }}
              >
                <span style={{ width: 20, height: 20, borderRadius: "50%", fontSize: 9, fontWeight: 700, background: `${CYAN}25`, border: `1px solid ${CYAN}44`, color: CYAN, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>T</span>
                Tag Copilot
              </button>
              <button onClick={() => toast("Budget setting coming soon")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`, border: "none", borderRadius: 10, color: "#0b1220", cursor: "pointer", boxShadow: `0 4px 16px rgba(200,166,78,0.35)` }}>
                + Set Budget
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
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textDim, fontWeight: 700, marginBottom: 6 }}>Income</div>
                <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: THEME.green }}>${fmt(data.totalIncome)}</div>
                <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2 }}>{selectedPeriod ? formatPeriod(selectedPeriod) : "All time"}</div>
              </div>

              {/* Expenses */}
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textDim, fontWeight: 700, marginBottom: 6 }}>Expenses</div>
                <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: THEME.red }}>${fmt(data.totalSpent)}</div>
                <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2 }}>excl. transfers</div>
              </div>

              {/* Net ï¿½ desktop only */}
              {!isMobile && (
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textDim, fontWeight: 700, marginBottom: 6 }}>Net</div>
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

        {/* Money Movement ï¿½ Transfers shown separately, excluded from expense totals */}
        {!search && transfersCategory && (
          <Reveal delay={200}>
            <div style={{ marginTop: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: THEME.blue }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: THEME.blue }}>Money Movement</span>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
                <span style={{ fontSize: 11, color: THEME.textDim }}>Not counted in expenses</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
                <CategoryCard category={transfersCategory} onClick={() => { setSubcategoryFilter(null); setSelectedCategory(transfersCategory); }} onSubcategoryClick={(name, merchantNames) => { setSubcategoryFilter({ name, merchantNames }); setSelectedCategory(transfersCategory); }} />
              </div>
            </div>
          </Reveal>
        )}
      </div>

      {/* Floating T bubble ï¿½ only when copilot closed */}
      {!copilotOpen && (
        <button onClick={() => setCopilotOpen(true)} aria-label="Open Tag Copilot"
          className="fixed z-40 transition-all hover:scale-105 active:scale-95"
          style={{ bottom: "calc(80px + env(safe-area-inset-bottom, 0px))", right: 16, width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg, ${CYAN}, #0891b2)`, boxShadow: `0 4px 20px ${CYAN}44`, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#0b1220" }}
        >T</button>
      )}

      {/* Tag Copilot Panel */}
      {copilotOpen && (
        <TagCopilotPanel initialMessage={copilotInitialMessage}
          onClose={() => setCopilotOpen(false)}
          flaggedCount={data.uncategorizedCount}
          categorizedCount={totalTxCount - data.uncategorizedCount}
          totalCount={totalTxCount}
          avgConfidence={data.uncategorizedCount === 0 ? 96 : Math.round((1 - data.uncategorizedCount / Math.max(totalTxCount, 1)) * 100)}
          rulesCount={0}
          flaggedTransactions={data.flaggedTransactions}
          subcategorySuggestions={data.subcategorySuggestions}
          totalSpent={data.totalSpent}
          totalIncome={data.totalIncome}
          txCount={totalTxCount}
          topCategories={data.categories.slice(0, 8).map(c => ({
            category: c.name,
            total: c.spent,
            transactionCount: c.transactionCount,
          }))}
        />
      )}

      {/* Category detail drawer */}
      <CategoryDetailDrawer
        category={selectedCategory}
        onClose={() => { setSelectedCategory(null); setSubcategoryFilter(null); }}
        subcategoryFilter={subcategoryFilter}
        onAskTag={(question) => { setCopilotInitialMessage(question); setCopilotOpen(true); }}
      />
    </>
  );
}


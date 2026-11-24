import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { AgentFloatingBubble } from "@/components/ui/AgentFloatingBubble";
import { THEME } from "./categoryConfig";
import { useCategoriesData } from "./useCategoriesData";
import { useProfile } from "@/hooks/useProfile";
import { CategoryListRow } from "./CategoryListRow";
import { formatMonthPeriod } from "@/lib/categoryList";
import { useImportList } from "@/hooks/useImportList";
import { groupImportsIntoAccounts, importIdsForAccount } from "@/lib/accountGroups";
import { isRangeActive, type DateRange } from "@/lib/categoryPeriod";
import { readCategoryFilters, writeCategoryFilters, hasActiveCategoryFilters } from "@/lib/categoryFilterUrl";
import { CategoryDetailDrawer } from "./CategoryDetailDrawer";
import { AgentInsightStrip } from "./AgentInsightStrip";
import { TagCopilotPanel } from "@/components/transactions/TagCopilotPanel";
import { getSupabase } from "@/lib/supabase";
import { Reveal } from "../PrimeChatV2/Reveal";
import type { CategoryData } from "./categoryConfig";

const CYAN = "#22d3ee";
const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// K-a: readable text colours (the shared THEME.textDim #64748b is below 4.5:1 on this navy).
const KA = { text: "#e8ecf4", muted: "#c8d0e0", dim: "#9ba8bc" } as const;

export default function CategoriesPageV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fullName } = useProfile();
  const firstName = fullName?.split(' ')[0] || '';
  // K-d: every filter is read from / written to the URL so it survives navigation and reload.
  const [initialUrl] = useState(() => { try { return readCategoryFilters(window.location.search); } catch { return readCategoryFilters(''); } });
  const currentYear = new Date().getFullYear();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(initialUrl.month);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(initialUrl.year ?? currentYear);
  const [rangeFrom, setRangeFrom] = useState<string>(initialUrl.from);
  const [rangeTo, setRangeTo] = useState<string>(initialUrl.to);
  const [showRange, setShowRange] = useState<boolean>(!!(initialUrl.from || initialUrl.to));
  const [accountId, setAccountId] = useState<string>(initialUrl.account || 'all');
  // Reset the month when the year changes (not on the first render, so a URL month survives).
  const yearMounted = useRef(false);
  useEffect(() => {
    if (!yearMounted.current) { yearMounted.current = true; return; }
    setSelectedPeriod("");
  }, [selectedYear]);
  useEffect(() => {
    try {
      const qs = writeCategoryFilters(window.location.search, { year: selectedYear, month: selectedPeriod, from: rangeFrom, to: rangeTo, account: accountId });
      window.history.replaceState(window.history.state, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    } catch { /* noop */ }
  }, [selectedYear, selectedPeriod, rangeFrom, rangeTo, accountId]);

  // K-d: accounts are the same import groups the Transactions page uses.
  const { imports } = useImportList();
  const accountGroups = useMemo(() => groupImportsIntoAccounts(imports), [imports]);
  const scopedImportIds = useMemo(() => importIdsForAccount(accountGroups, accountId), [accountGroups, accountId]);
  const selectedAccountName = accountGroups.find(a => a.id === accountId)?.name ?? null;
  const range: DateRange | null = useMemo(
    () => (showRange && (rangeFrom || rangeTo) ? { from: rangeFrom || undefined, to: rangeTo || undefined } : null),
    [showRange, rangeFrom, rangeTo],
  );
  const rangeActive = isRangeActive(range);
  const rangeInvalid = !!(rangeFrom && rangeTo && rangeFrom > rangeTo);
  const data = useCategoriesData(selectedPeriod || undefined, selectedYear, { range: rangeInvalid ? null : range, importIds: scopedImportIds });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    // Actually refetch data — not just dispatch events and hope something listens.
    void data.refetch?.();
    try { window.dispatchEvent(new Event('transactions:refresh')); } catch { /* noop */ }
    try { window.dispatchEvent(new Event('tag:stats-refresh')); } catch { /* noop */ }
    setTimeout(() => setIsRefreshing(false), 800);
  }, [isRefreshing, data]);

  // Listen for tag action events so the page auto-refreshes after Tag
  // successfully re-categorizes, sets a rule, or renames a merchant. Belt +
  // suspenders on top of useTransactions's realtime subscription — mobile
  // WebSocket subscriptions drop during sleep/wake and miss updates.
  useEffect(() => {
    const onRefresh = () => { void data.refetch?.(); };
    window.addEventListener('tag:stats-refresh', onRefresh);
    window.addEventListener('transactions:refresh', onRefresh);
    return () => {
      window.removeEventListener('tag:stats-refresh', onRefresh);
      window.removeEventListener('transactions:refresh', onRefresh);
    };
  }, [data]);

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
  const filtersActive = hasActiveCategoryFilters({ year: selectedYear, month: selectedPeriod, from: showRange ? rangeFrom : '', to: showRange ? rangeTo : '', account: accountId, search }, currentYear);
  const resetFilters = useCallback(() => {
    setSelectedYear(currentYear);
    setSelectedPeriod("");
    setRangeFrom(""); setRangeTo(""); setShowRange(false);
    setAccountId('all');
    setSearch("");
  }, [currentYear]);
  // K-a: ⋯ menu (Refresh, Tag rules, Goalie budget); Escape closes it.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    h(); window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // UX-C2: Tag no longer auto-opens on Categories. It opens from the floating Tag
  // bubble (explicit customer action).

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

        {/* K-a: compact header — title, filters, search, Export and a ⋯ menu (Refresh, Tag Rules, Goalie budget) */}
        <Reveal delay={0}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: "white", margin: 0, letterSpacing: -0.3 }}>Categories</h1>
                <p style={{ fontSize: 14, color: KA.dim, margin: "4px 0 0" }}>
                  {data.categoryCount} categories &middot; {totalTxCount} transactions
                  {!rangeActive && selectedPeriod && <span style={{ color: CYAN }}> &middot; {formatMonthPeriod(selectedPeriod)}</span>}
                  {rangeActive && !rangeInvalid && <span style={{ color: CYAN }}> &middot; custom range</span>}
                  {selectedAccountName && <span style={{ color: CYAN }}> &middot; {selectedAccountName}</span>}
                </p>
              </div>
              <button type="button" onClick={handleExport} aria-label="Export categories as CSV"
                style={{ minHeight: 44, padding: isMobile ? "0 12px" : "0 16px", fontSize: 14, fontWeight: 700, background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, borderRadius: 12, color: KA.muted, cursor: "pointer", fontFamily: "inherit" }}>
                Export
              </button>
              <div style={{ position: "relative" }}>
                <button type="button" onClick={() => setMenuOpen(v => !v)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="More actions"
                  style={{ width: 44, height: 44, fontSize: 20, background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, borderRadius: 12, color: KA.muted, cursor: "pointer" }}>
                  ⋯
                </button>
                {menuOpen && (
                  <div role="menu" aria-label="More actions" style={{ position: "absolute", right: 0, top: 50, zIndex: 30, minWidth: 220, padding: 6, borderRadius: 12, background: "#0f182b", border: `1px solid ${THEME.borderLight}`, boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}>
                    {[
                      { label: isRefreshing ? "Refreshing…" : "Refresh", onSelect: handleRefresh },
                      { label: "Tag rules", onSelect: () => navigate('/dashboard/categories/rules') },
                      { label: "Goalie: set a budget", onSelect: () => { setBudgetCategory(filtered[0]?.name || ""); setBudgetModal(true); } },
                    ].map(item => (
                      <button key={item.label} type="button" role="menuitem"
                        onClick={() => { setMenuOpen(false); item.onSelect(); }}
                        style={{ display: "block", width: "100%", minHeight: 44, padding: "0 12px", textAlign: "left", borderRadius: 8, border: "none", background: "transparent", color: KA.text, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <label style={{ display: "flex", flex: "1 1 220px", minWidth: 0 }}>
                <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search categories</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories"
                  style={{ flex: 1, minWidth: 0, minHeight: 44, padding: "0 14px", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, color: THEME.text, fontSize: 16, fontFamily: "inherit", outline: "none" }} />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: KA.dim }}>
                Year
                <select value={selectedYear === 'all' ? 'all' : String(selectedYear)} disabled={rangeActive}
                  onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  style={{ minHeight: 44, padding: "0 12px", background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, borderRadius: 12, color: KA.text, fontSize: 15, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "inherit" }}>
                  {data.availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  <option value="all">All years</option>
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: KA.dim }}>
                Month
                <select value={showRange ? "custom" : selectedPeriod}
                  onChange={(e) => {
                    if (e.target.value === "custom") { setShowRange(true); return; }
                    setShowRange(false); setRangeFrom(""); setRangeTo("");
                    setSelectedPeriod(e.target.value);
                  }}
                  style={{ minHeight: 44, padding: "0 12px", background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, borderRadius: 12, color: KA.text, fontSize: 15, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "inherit" }}>
                  <option value="">{selectedYear === 'all' ? "All months" : "All of the year"}</option>
                  {data.availablePeriods.map(p => <option key={p} value={p}>{formatMonthPeriod(p)}</option>)}
                  <option value="custom">Custom range…</option>
                </select>
              </label>
              {accountGroups.length > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: KA.dim }}>
                  Account
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
                    style={{ minHeight: 44, padding: "0 12px", background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, borderRadius: 12, color: KA.text, fontSize: 15, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "inherit" }}>
                    <option value="all">All accounts</option>
                    {accountGroups.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
              )}
              {filtersActive && (
                <button type="button" onClick={resetFilters}
                  style={{ minHeight: 44, padding: "0 14px", background: "transparent", border: `1px solid ${THEME.border}`, borderRadius: 12, color: CYAN, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Reset filters
                </button>
              )}
            </div>
            {showRange && (
              <div role="group" aria-label="Custom date range" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: KA.dim }}>
                  From
                  <input type="date" value={rangeFrom} max={rangeTo || undefined} onChange={(e) => setRangeFrom(e.target.value)}
                    style={{ minHeight: 44, padding: "0 12px", background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, borderRadius: 12, color: KA.text, fontSize: 15, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "inherit", colorScheme: "dark" }} />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: KA.dim }}>
                  To
                  <input type="date" value={rangeTo} min={rangeFrom || undefined} onChange={(e) => setRangeTo(e.target.value)}
                    style={{ minHeight: 44, padding: "0 12px", background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, borderRadius: 12, color: KA.text, fontSize: 15, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "inherit", colorScheme: "dark" }} />
                </label>
                <span role="status" style={{ fontSize: 13, color: rangeInvalid ? THEME.red : KA.dim }}>
                  {rangeInvalid ? "The start date is after the end date." : rangeActive ? "Year and month are ignored while a custom range is set." : "Choose a start date, an end date or both."}
                </span>
              </div>
            )}
          </div>
        </Reveal>

        {/* K-a: compact income / expenses / net strip */}
        <Reveal delay={50}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))", gap: 12, padding: "14px 18px", borderRadius: 14, background: THEME.surface, border: `1px solid ${THEME.border}`, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: KA.dim, fontWeight: 700 }}>Income</div>
              <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: THEME.green }}>${fmt(data.totalIncome)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: KA.dim, fontWeight: 700 }}>Expenses <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>(excl. transfers)</span></div>
              <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: THEME.red }}>${fmt(data.totalSpent)}</div>
            </div>
            {!isMobile && (
              <div>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: KA.dim, fontWeight: 700 }}>Net</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: net >= 0 ? THEME.green : THEME.red }}>{net >= 0 ? "+$" : "-$"}{fmt(Math.abs(net))}</div>
              </div>
            )}
          </div>
        </Reveal>

        {/* Review banner — opens Tag on request (no auto-open) */}
        <Reveal delay={100}>
          <button type="button" onClick={() => setCopilotOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 52, padding: "10px 16px", borderRadius: 14, marginBottom: 14, background: `${CYAN}06`, border: `1px solid ${CYAN}24`, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
            <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: `${CYAN}20`, border: `1.5px solid ${CYAN}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: CYAN }}>T</span>
            <span style={{ flex: 1, fontSize: 15, color: KA.muted }}>
              <span style={{ color: CYAN, fontWeight: 700 }}>{data.uncategorizedCount} items need review</span>
              {data.subcategorySuggestions?.length > 0 && <>{" • "}{data.subcategorySuggestions.length} subcategory split{data.subcategorySuggestions.length !== 1 ? "s" : ""} suggested</>}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: CYAN }}>Review with Tag</span>
          </button>
        </Reveal>

        {/* Agent insights */}
        <Reveal delay={150}>
          <div style={{ marginBottom: 16 }}>
            <AgentInsightStrip data={data} />
          </div>
        </Reveal>

        {/* K-a: compact category list (replaces the 3-column card grid) */}
        <section aria-label="Categories" style={{ borderRadius: 14, background: THEME.surface, border: `1px solid ${THEME.border}`, overflow: "hidden" }}>
          {!isMobile && filtered.length > 0 && (
            <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "36px minmax(0, 1.6fr) minmax(0, 1fr) 110px 64px", gap: 16, padding: "10px 18px", borderBottom: `1px solid ${THEME.border}`, fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: KA.dim }}>
              <span /><span>Category</span><span>Share of expenses</span><span style={{ textAlign: "right" }}>Spent</span><span style={{ textAlign: "right" }}>Trend</span>
            </div>
          )}
          <ul style={{ margin: 0, padding: 0 }}>
            {filtered.map(cat => (
              <CategoryListRow
                key={cat.name}
                category={cat}
                totalSpent={data.totalSpent}
                isMobile={isMobile}
                onOpen={() => { setSubcategoryFilter(null); setSelectedCategory(cat); }}
                onSubcategory={(name, merchantNames) => { setSubcategoryFilter({ name, merchantNames }); setSelectedCategory(cat); }}
              />
            ))}
          </ul>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 16px", color: KA.dim, fontSize: 15 }}>
              {search ? "No categories match your search" : "No categories found. Upload a statement to get started."}
            </div>
          )}
        </section>

        {/* Money Movement — Transfers shown separately, excluded from expense totals */}
        {!search && transfersCategory && (
          <Reveal delay={200}>
            <section aria-label="Money movement" style={{ marginTop: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <h2 style={{ margin: 0, fontSize: 13, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, color: THEME.blue }}>Money movement</h2>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
                <span style={{ fontSize: 13, color: KA.dim }}>Not counted in expenses</span>
              </div>
              <ul style={{ margin: 0, padding: 0, borderRadius: 14, background: THEME.surface, border: `1px solid ${THEME.border}`, overflow: "hidden" }}>
                <CategoryListRow
                  category={transfersCategory}
                  totalSpent={data.totalSpent}
                  isMobile={isMobile}
                  showShare={false}
                  onOpen={() => { setSubcategoryFilter(null); setSelectedCategory(transfersCategory); }}
                  onSubcategory={(name, merchantNames) => { setSubcategoryFilter({ name, merchantNames }); setSelectedCategory(transfersCategory); }}
                />
              </ul>
            </section>
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
          onClose={() => {
            setCopilotOpen(false);
            // Remember dismissal for this session so we don't re-auto-open.
            // Cleared on hard refresh / new browser session (sessionStorage).
            try { sessionStorage.setItem('tag_autopen_dismissed', '1'); } catch { /* noop */ }
            setTimeout(() => setCopilotInitialMessage(""), 300);
          }}
          firstName={firstName}
          totalCount={totalTxCount}
          categorizedCount={totalTxCount - data.uncategorizedCount}
          flaggedCount={data.flaggedTransactions?.length || 0}
          avgConfidence={totalTxCount > 0 ? Math.round(((totalTxCount - data.uncategorizedCount) / totalTxCount) * 100) : 0}
          rulesCount={0}
          flaggedTransactions={data.flaggedTransactions}
          subcategorySuggestions={data.subcategorySuggestions}
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
        selectedYear={selectedYear}
        selectedPeriod={selectedPeriod || undefined}
        range={rangeInvalid ? null : range}
        importIds={scopedImportIds}
        accountName={selectedAccountName}
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


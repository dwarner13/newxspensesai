import { useState, useEffect, useMemo, useCallback } from "react";
import { THEME } from "../PrimeChatV2/agentConfig";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/* ── Types matching actual DB schema ── */

interface Transaction {
  category: string | null;
  merchant: string | null;
  amount: number; // negative for expenses
  type: string; // "expense" | "income"
  date: string; // "YYYY-MM-DD"
  subcategory: string | null;
}

interface SubRow {
  label: string;
  count: number;
  amount: number; // always positive for display
}

interface SectionDef {
  id: string;
  icon: string;
  title: string;
  matchFn: (tx: Transaction) => boolean;
}

/* ── Section definitions using EXACT category strings from DB ── */

const SECTIONS: SectionDef[] = [
  { id: "income", icon: "\uD83D\uDCB0", title: "Income", matchFn: (tx) => tx.type === "income" },
  { id: "vehicle", icon: "\uD83D\uDE97", title: "Vehicle Expenses", matchFn: (tx) => tx.category === "Car & Truck Expenses" },
  { id: "home", icon: "\uD83C\uDFE0", title: "Home / Rent / Lease", matchFn: (tx) => tx.category === "Rent or Lease" },
  { id: "meals", icon: "\uD83C\uDF7D\uFE0F", title: "Meals & Entertainment", matchFn: (tx) => tx.category === "Meals & Entertainment" },
  { id: "business", icon: "\uD83D\uDCBC", title: "Business Expenses", matchFn: (tx) => tx.category === "Advertising" || tx.category === "Other Expenses" || tx.category === "Professional Services" || tx.category === "Employee Benefits" },
  { id: "personal", icon: "\uD83D\uDC64", title: "Personal", matchFn: (tx) => tx.category === "Personal" },
];

/* ── Subcategory bucket definitions per section ── */

interface Bucket {
  label: string;
  keywords: string[];
}

const VEHICLE_BUCKETS: Bucket[] = [
  { label: "Gas / Fuel", keywords: ["petro", "esso", "shell", "gas", "fuel", "co-op", "mobil", "7-eleven fuel", "husky"] },
  { label: "Car Payments", keywords: ["td loan", "car payment", "auto loan", "lns/pre"] },
  { label: "Registration", keywords: ["registry", "registration", "northtown registry"] },
  { label: "Insurance", keywords: ["car insurance", "vehicle insurance", "auto insurance"] },
  { label: "Repairs / Maintenance", keywords: ["oil change", "repair", "tire", "mechanic", "midas", "canadian tire auto", "maintenance"] },
  { label: "Parking", keywords: ["parking", "impark", "parkade"] },
  { label: "Car Wash", keywords: ["car wash"] },
];

const MEALS_BUCKETS: Bucket[] = [
  { label: "Coffee", keywords: ["tim hortons", "starbucks", "booster juice", "second cup", "good earth"] },
  { label: "Restaurants / Dining", keywords: ["pizza", "restaurant", "pub", "grill", "diner", "kitchen", "smittys", "wendys", "mcdonalds", "popeyes", "mr sub", "halong bay", "sushi", "thai", "wok", "buffet", "a&w", "subway", "kfc", "burger", "boston pizza", "earls", "cactus", "moxies", "original joe", "joey", "montanas"] },
  { label: "Fast Food / Takeout", keywords: ["uber eats", "doordash", "skip the dishes", "instacart"] },
  { label: "Groceries / Convenience", keywords: ["7-eleven", "mac's", "circle k"] },
  { label: "Entertainment", keywords: ["movie", "concert", "sport", "fitness", "theatre", "cinema", "netflix", "spotify"] },
  { label: "Alcohol", keywords: ["liquor", "econo liquor", "beer", "wine", "alcanna", "wine and beyond"] },
  { label: "Supplements / Health Food", keywords: ["supplement", "ls supplement", "popeye supplement", "gnc", "nutrition"] },
];

const HOME_BUCKETS: Bucket[] = [
  { label: "Mortgage / Rent", keywords: ["mortgage", "b/m payt", "celtic group", "rent", "rnt payt"] },
  { label: "Condo Fees", keywords: ["condo fee", "strata", "hoa"] },
  { label: "Utilities — Electric", keywords: ["epcor", "electricity", "electric"] },
  { label: "Utilities — Gas / Heat", keywords: ["atco", "direct energy", "enmax"] },
  { label: "Utilities — Water", keywords: ["epcor water", "water bill"] },
  { label: "Internet", keywords: ["telus", "shaw", "internet"] },
  { label: "Home Insurance", keywords: ["home insurance", "property insurance", "tenant insurance"] },
];

const BUSINESS_BUCKETS: Bucket[] = [
  { label: "Advertising / Marketing", keywords: ["dreamhost", "seo", "amazon prime business", "amazon", "google ads", "facebook", "advertising"] },
  { label: "Software / Subscriptions", keywords: ["cursor", "openai", "youtube", "everlance", "ranked ai", "adobe", "microsoft", "canva", "zoom", "slack", "notion", "dropbox", "chatgpt"] },
  { label: "Professional Fees", keywords: ["accounting", "ncube", "2nd site", "legal", "bookkeeping", "consulting"] },
  { label: "Bank Fees", keywords: ["premium plan", "handling chg", "interest charge", "service charge", "bank fee", "nsf", "overdraft"] },
  { label: "Business Insurance", keywords: ["imperial pfs", "business insurance", "liability"] },
];

const PERSONAL_BUCKETS: Bucket[] = [
  { label: "Groceries", keywords: ["sobeys", "save on", "safeway", "loblaws", "walmart", "mac's", "superstore", "costco", "no frills", "freshco"] },
  { label: "Grooming / Salon", keywords: ["shadified", "salon", "barber", "hair", "q hair", "grooming"] },
  { label: "Wellness / Massage", keywords: ["massage", "ting ting", "yo yo", "lewis massage", "tulip garden", "songblossom", "spa", "wellness"] },
  { label: "Transfers", keywords: ["interac etrnsfr sent", "e-transfer", "etransfer"] },
  { label: "Loan Payments", keywords: ["easyfinancial", "cash money", "springfinancial", "national money", "flexiti"] },
  { label: "Credit Card Payments", keywords: ["capital one", "canadian tire bank", "cc payment"] },
  { label: "Investments", keywords: ["bmo inv inc", "tfsa", "rrsp", "wealthsimple", "questrade", "investment"] },
  { label: "Shopping", keywords: ["winners", "dollar tree", "shoppers drug mart", "marshalls", "homesense"] },
];

const INCOME_BUCKETS: Bucket[] = []; // Income groups by merchant (no predefined buckets)

/** Map section id → its buckets */
const SECTION_BUCKETS: Record<string, Bucket[]> = {
  income: INCOME_BUCKETS,
  vehicle: VEHICLE_BUCKETS,
  home: HOME_BUCKETS,
  meals: MEALS_BUCKETS,
  business: BUSINESS_BUCKETS,
  personal: PERSONAL_BUCKETS,
};

/* ── Helpers ── */

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Group transactions into predefined subcategory buckets by matching
 * merchant name against keywords. Unmatched txs go to "Other".
 * Empty buckets are shown with $0.
 */
function groupIntoBuckets(txs: Transaction[], buckets: Bucket[]): SubRow[] {
  // Initialise all buckets to 0
  const map = new Map<string, { count: number; total: number }>();
  for (const b of buckets) map.set(b.label, { count: 0, total: 0 });
  map.set("Other", { count: 0, total: 0 });

  for (const tx of txs) {
    const merch = (tx.merchant || tx.subcategory || "").toLowerCase();
    let matched = false;
    for (const b of buckets) {
      if (b.keywords.some((kw) => merch.includes(kw.toLowerCase()))) {
        const entry = map.get(b.label)!;
        entry.count += 1;
        entry.total += Math.abs(tx.amount);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const entry = map.get("Other")!;
      entry.count += 1;
      entry.total += Math.abs(tx.amount);
    }
  }

  // Return buckets in defined order, then "Other" at end. Include $0 rows.
  const rows: SubRow[] = [];
  for (const b of buckets) {
    const entry = map.get(b.label)!;
    rows.push({ label: b.label, count: entry.count, amount: entry.total });
  }
  const other = map.get("Other")!;
  if (other.total > 0 || other.count > 0) {
    rows.push({ label: "Other", count: other.count, amount: other.total });
  }
  return rows;
}

/** For income: group by merchant name (payer/client) */
function groupByMerchant(txs: Transaction[]): SubRow[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const tx of txs) {
    const key = tx.merchant?.trim() || "(unknown payer)";
    const entry = map.get(key) || { count: 0, total: 0 };
    entry.count += 1;
    entry.total += Math.abs(tx.amount);
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([label, v]) => ({ label, count: v.count, amount: v.total }));
}

/* ── CSV export ── */

function exportCSV(
  year: number,
  sectionResults: Map<string, { txs: Transaction[]; rows: SubRow[]; total: number }>,
) {
  const csvRows: string[][] = [["Section", "Subcategory", "# Transactions", "Amount"]];
  for (const section of SECTIONS) {
    const res = sectionResults.get(section.id);
    if (!res || res.txs.length === 0) continue;
    csvRows.push([section.title, "", "", `$${res.total.toFixed(2)}`]);
    for (const sr of res.rows) {
      csvRows.push(["", sr.label, String(sr.count), `$${sr.amount.toFixed(2)}`]);
    }
  }
  const csv = csvRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tax-summary-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════ */

export default function TaxWorkspacePage() {
  const { userId } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [year, setYear] = useState(2024);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTIONS.map((s) => s.id)),
  );
  const [vehicleKm, setVehicleKm] = useState({ total: "", business: "" });

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    h();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // Fetch transactions for selected year
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("transactions")
        .select("category, merchant, amount, type, date, subcategory")
        .eq("user_id", userId)
        .gte("date", `${year}-01-01`)
        .lt("date", `${year + 1}-01-01`)
        .order("date", { ascending: false });
      if (!cancelled) {
        if (error) console.error("[TaxWorkspace] fetch error:", error);
        setTransactions((data as Transaction[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, year]);

  // Assign each tx to FIRST matching section (no double-counting)
  const sectionResults = useMemo(() => {
    const results = new Map<string, { txs: Transaction[]; rows: SubRow[]; total: number }>();
    const claimed = new Set<number>(); // index-based since we don't have id

    for (const section of SECTIONS) {
      const matched: Transaction[] = [];
      transactions.forEach((tx, idx) => {
        if (claimed.has(idx)) return;
        if (section.matchFn(tx)) {
          matched.push(tx);
          claimed.add(idx);
        }
      });
      const buckets = SECTION_BUCKETS[section.id];
      const rows = buckets && buckets.length > 0
        ? groupIntoBuckets(matched, buckets)
        : groupByMerchant(matched); // Income: group by payer
      const total = matched.reduce((s, t) => s + Math.abs(t.amount), 0);
      results.set(section.id, { txs: matched, rows, total });
    }
    return results;
  }, [transactions]);

  // Summary totals
  const totalIncome = sectionResults.get("income")?.total ?? 0;
  const totalExpenses = useMemo(
    () => transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions],
  );
  const totalPersonal = sectionResults.get("personal")?.total ?? 0;

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    exportCSV(year, sectionResults);
  }, [year, sectionResults]);

  const [exportingReport, setExportingReport] = useState(false);
  const handleExportReport = useCallback(async () => {
    if (!userId) return;
    setExportingReport(true);
    try {
      const res = await fetch("/.netlify/functions/generate-tax-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({
          year,
          vehicle_config: {
            total_km: parseFloat(vehicleKm.total) || 0,
            business_km: parseFloat(vehicleKm.business) || 0,
          },
        }),
      });
      if (!res.ok) throw new Error("Report generation failed");
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tax-report-${year}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[TaxWorkspace] export report error:", err);
    } finally {
      setExportingReport(false);
    }
  }, [userId, year, vehicleKm]);

  /* ── Render ── */

  if (loading) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", color: THEME.textMuted, padding: 40, textAlign: "center" }}>
        Loading tax data...
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      maxWidth: 1100, margin: "0 auto",
      padding: isMobile ? "20px 16px" : "32px 24px",
      color: THEME.text,
    }}>

      {/* ══════ HEADER ══════ */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: "white", margin: 0 }}>Tax Summary</h1>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{
              background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 8,
              color: THEME.text, padding: "6px 12px", fontSize: 14, fontWeight: 600,
              cursor: "pointer", outline: "none",
            }}
          >
            {[2026, 2025, 2024, 2023].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ fontSize: 12, color: THEME.textDim }}>
            {transactions.length} transactions loaded
          </span>
        </div>
        <p style={{ fontSize: 13, color: THEME.textMuted, margin: "0 0 16px 0" }}>
          Auto-generated from your uploaded statements
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: THEME.accent, border: "none", color: "#0b1220", cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            Export CSV
          </button>
          <button
            onClick={handleExportReport}
            disabled={exportingReport}
            style={{
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: THEME.surface, border: `1px solid ${THEME.border}`,
              color: exportingReport ? THEME.textDim : THEME.text,
              cursor: exportingReport ? "wait" : "pointer",
              opacity: exportingReport ? 0.6 : 1,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { if (!exportingReport) { e.currentTarget.style.borderColor = THEME.accent; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; }}
          >
            {exportingReport ? "Generating..." : "Export Report (HTML)"}
          </button>
        </div>
      </div>

      {/* ══════ SUMMARY CARDS ══════ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: 16, marginBottom: 32,
      }}>
        {[
          { label: "Total Income", value: `$${fmt(totalIncome)}`, color: THEME.green },
          { label: "Total Expenses", value: `$${fmt(totalExpenses)}`, color: "#f87171" },
          { label: "Total Personal", value: `$${fmt(totalPersonal)}`, color: THEME.textMuted },
          { label: "Transactions", value: String(transactions.length), color: THEME.accent },
        ].map((card) => (
          <div key={card.label} style={{
            background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14,
            padding: isMobile ? "14px 12px" : "18px 20px",
            boxShadow: `0 4px 20px ${card.color}08`,
          }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textMuted, fontWeight: 700, marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* ══════ ALL SECTIONS ══════ */}
      {SECTIONS.map((section) => {
        const res = sectionResults.get(section.id);
        const txs = res?.txs ?? [];
        const subRows = res?.rows ?? [];
        const sectionTotal = res?.total ?? 0;
        const isExpanded = expandedSections.has(section.id);
        const headerColor = section.id === "income" ? THEME.green : section.id === "personal" ? THEME.textDim : THEME.accent;

        return (
          <SectionCard
            key={section.id}
            icon={section.icon}
            title={section.title}
            total={sectionTotal}
            count={txs.length}
            color={headerColor}
            expanded={isExpanded}
            onToggle={() => toggleSection(section.id)}
            isMobile={isMobile}
          >
            {txs.length === 0 ? (
              <div style={{ fontSize: 13, color: THEME.textDim, padding: "12px 0" }}>
                No transactions found for {year}.
              </div>
            ) : (
              <SubcategoryTable rows={subRows} color={headerColor} isMobile={isMobile} isIncome={section.id === "income"} />
            )}

            {/* Vehicle KM inputs (raw numbers for accountant) */}
            {section.id === "vehicle" && (
              <div style={{
                marginTop: 16, padding: "14px 16px", borderRadius: 12,
                background: `${THEME.accent}08`, border: `1px solid ${THEME.accent}15`,
              }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, fontWeight: 700, color: THEME.accent, marginBottom: 12 }}>
                  Vehicle KM Log
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                  {([
                    { label: "Total KM", key: "total" as const, placeholder: "e.g. 25000" },
                    { label: "Business KM", key: "business" as const, placeholder: "e.g. 18000" },
                  ] as const).map((field) => (
                    <label key={field.key} style={{ fontSize: 12, color: THEME.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
                      {field.label}:
                      <input type="number" value={vehicleKm[field.key]}
                        onChange={(e) => setVehicleKm((v) => ({ ...v, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        style={{ width: 110, padding: "5px 8px", borderRadius: 6, background: THEME.bg, border: `1px solid ${THEME.border}`, color: THEME.text, fontSize: 13, outline: "none" }}
                      />
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 8 }}>
                  Enter your odometer readings — your accountant will calculate the business-use percentage.
                </div>
              </div>
            )}
          </SectionCard>
        );
      })}

      {/* ══════ FOOTER ══════ */}
      <div style={{
        marginTop: 32, padding: "16px 20px", borderRadius: 12,
        background: THEME.surface, border: `1px solid ${THEME.border}`,
        fontSize: 12, color: THEME.textDim, lineHeight: 1.6,
      }}>
        <strong style={{ color: THEME.textMuted }}>Disclaimer:</strong> This summary is auto-generated
        from your uploaded financial statements and is intended as a starting point for tax preparation.
        It is not tax advice. Consult a qualified tax professional for your specific situation.
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════ */

function SectionCard({ icon, title, total, count, color, expanded, onToggle, isMobile, children }: {
  icon: string; title: string; total: number; count: number; color: string;
  expanded: boolean; onToggle: () => void; isMobile: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, marginBottom: 16, overflow: "hidden" }}>
      <button onClick={onToggle} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: isMobile ? "14px 12px" : "16px 20px",
        background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color }}>{title}</div>
          <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2 }}>
            {count} transaction{count !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: THEME.text, marginRight: 8 }}>
          ${fmt(total)}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={THEME.textDim} strokeWidth="2" strokeLinecap="round"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div style={{ padding: isMobile ? "0 12px 14px" : "0 20px 18px" }}>{children}</div>
      )}
    </div>
  );
}

function SubcategoryTable({ rows, color, isMobile, isIncome }: { rows: SubRow[]; color: string; isMobile: boolean; isIncome: boolean }) {
  if (rows.length === 0) return null;
  const colLabel = isIncome ? "Client / Payer" : "Subcategory";
  return (
    <div>
      {/* Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 100px" : "1fr 110px",
        gap: 8, padding: "6px 0", borderBottom: `1px solid ${THEME.border}`,
      }}>
        <div style={COL_HDR}>{colLabel}</div>
        <div style={{ ...COL_HDR, textAlign: "right" }}>Amount</div>
      </div>
      {/* Rows */}
      {rows.map((row, i) => (
        <div key={row.label + i} style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 100px" : "1fr 110px",
          gap: 8, padding: "9px 0",
          borderBottom: i < rows.length - 1 ? `1px solid ${THEME.border}44` : "none",
          alignItems: "center",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: row.amount > 0 ? THEME.text : THEME.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: row.amount > 0 ? color : THEME.textDim, textAlign: "right", whiteSpace: "nowrap" }}>
            ${fmt(row.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}

const COL_HDR: React.CSSProperties = {
  fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: THEME.textDim, fontWeight: 700,
};

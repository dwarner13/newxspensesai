import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { THEME } from "../PrimeChatV2/agentConfig";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { yearRange } from "@/lib/financialSummary";
import { hasFigures } from "@/components/finance/FinancialState";
import { FINANCIAL_LABELS } from "@/lib/financialLabels";

/* ── Types matching actual DB schema ── */

interface Transaction {
  category: string | null;
  merchant: string | null;
  merchant_name: string | null;
  amount: number;
  type: string;
  date: string;
  subcategory: string | null;
}

interface SubRow {
  label: string;
  count: number;
  amount: number; // always positive for display
  txDetails?: { merchant: string; amount: number; date: string }[]; // populated for "Other" bucket
}

interface SectionDef {
  id: string;
  icon: string;
  title: string;
  matchFn: (tx: Transaction) => boolean;
}

/* ── Section definitions using EXACT category strings from DB ── */

const SECTIONS: SectionDef[] = [
  // UX-FST2-9: display metadata only; the server (tax-summary) assigns transactions to sections.
  { id: "internal", icon: "\uD83D\uDD01", title: "Transfers & Payments (not income or expense)", matchFn: () => false },
  { id: "income", icon: "\uD83D\uDCB0", title: "Income", matchFn: (tx) => tx.type === "income" },
  { id: "vehicle", icon: "\uD83D\uDE97", title: "Vehicle Expenses", matchFn: (tx) => tx.category === "Transportation" || tx.category === "Automotive" || tx.subcategory === "Vehicle Insurance" || ["Gas & Fuel", "Parking", "Vehicle Maintenance", "Vehicle Registration", "Car Loan", "Car Wash"].includes(tx.subcategory || "") },
  { id: "home", icon: "\uD83C\uDFE0", title: "Home / Rent / Lease", matchFn: (tx) => tx.category === "Rent or Lease" || tx.category === "Utilities" || tx.category === "Housing" || tx.category === "Home / Rent / Lease" || tx.subcategory === "Mortgage / Rent" || tx.subcategory === "Condo Fees" || tx.subcategory === "Home Insurance" },
  { id: "meals", icon: "\uD83C\uDF7D\uFE0F", title: "Meals & Entertainment", matchFn: (tx) => tx.category === "Food & Dining" || (tx.category === "Entertainment" && tx.subcategory !== "Golf" && tx.subcategory !== "Gambling" && tx.subcategory !== "Events / Tickets") },
  { id: "business", icon: "\uD83D\uDCBC", title: "Business Expenses", matchFn: (tx) => tx.category === "Subscriptions" || tx.category === "Bank Fees" || tx.category === "Advertising" || tx.category === "Technology" || tx.category === "Office Supplies" || tx.category === "Professional Services" || tx.category === "Business Expenses" },
  { id: "personal", icon: "\uD83D\uDC64", title: "Personal", matchFn: (tx) => tx.category === "Personal Care" || tx.category === "Groceries" || tx.category === "Debt Payments" || tx.category === "Transfers" || tx.category === "Shopping" || tx.category === "Healthcare" || tx.category === "Needs Review" || tx.category === "Travel" || tx.subcategory === "Golf" || tx.subcategory === "Gambling" || tx.subcategory === "Events / Tickets" || tx.subcategory === "Investments" || tx.subcategory === "Online Shopping" || tx.subcategory === "Clothing" || tx.subcategory === "General Shopping" || tx.subcategory === "Hardware / Auto" || tx.subcategory === "Fitness" || tx.subcategory === "Supplements" },
  { id: "other", icon: "\uD83D\uDCE6", title: "Other / Uncategorized", matchFn: (tx) => tx.type === "expense" },
];

/* UX-FST2-9: the page's own bucket rules, grouping and totals are retired; the server (tax-summary)
   returns sections and buckets. */

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── CSV export ── */

function exportCSV(
  year: number,
  sectionResults: Map<string, { count: number; rows: SubRow[]; total: number }>,
) {
  const csvRows: string[][] = [["Section", "Subcategory", "# Transactions", "Amount"]];
  for (const section of SECTIONS) {
    const res = sectionResults.get(section.id);
    if (!res || res.count === 0) continue;
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
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [year, setYear] = useState(2025);
  // UX-FST2-9 (AR-1b FR-011): the server's tax summary for the year (complete, count-verified read;
  // refunds are not income, internal movement is its own section). Nothing is summed in the browser.
  type TaxSection = { id: string; title: string; total: number; count: number; buckets: { label: string; total: number; count: number }[] };
  type TaxState =
    | { status: 'loading' }
    | { status: 'verified' | 'verified_zero'; sections: TaxSection[]; transactionCount: number; unsectionedCount: number; engine: { incomeCents: number; spendingCents: number } | null }
    | { status: 'partial' | 'unavailable'; message: string };
  const [tax, setTax] = useState<TaxState>({ status: 'loading' });
  const reviewScope = useMemo(() => yearRange(year), [year]);
  const reviewFinancial = useFinancialSummary(reviewScope);
  const needsReviewCount = hasFigures(reviewFinancial) ? reviewFinancial.summary.needsReviewCount : 0;
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTIONS.map((s) => s.id)),
  );
  const [vehicleKm, setVehicleKm] = useState({ opening: "", closing: "", businessGFS: "", businessROWNMI: "", make: "", model: "", year: "" });
  const [kmSaved, setKmSaved] = useState(false);
  const [kmSaving, setKmSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    h();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // Load saved odometer readings from profiles.settings
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from("profiles")
        .select("settings")
        .eq("id", userId)
        .single();
      if (data?.settings?.vehicle_km?.[year]) {
        const saved = data.settings.vehicle_km[year];
        setVehicleKm({
          opening: saved.opening || "",
          closing: saved.closing || "",
          businessGFS: saved.businessGFS || "",
          businessROWNMI: saved.businessROWNMI || "",
          make: saved.make || "",
          model: saved.model || "",
          year: saved.year || "",
        });
      }
    })();
  }, [userId, year]);

  // Fetch the server tax summary for the selected year
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTax({ status: 'loading' });
      try {
        const supabase = getSupabase();
        const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
        if (!token) throw new Error('signed_out');
        const res = await fetch('/.netlify/functions/tax-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ year }),
          cache: 'no-store',
        });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !body) {
          setTax({ status: 'unavailable', message: (body && body.error) || "The tax summary couldn't be loaded; nothing was guessed. Please try again." });
        } else if (body.queryStatus === 'partial') {
          setTax({ status: 'partial', message: body.message || "Not every transaction for this year could be read, so no section totals are shown." });
        } else {
          setTax({
            status: body.queryStatus === 'verified_zero' ? 'verified_zero' : 'verified',
            sections: Array.isArray(body.sections) ? body.sections : [],
            transactionCount: Number(body.transactionCount) || 0,
            unsectionedCount: Number(body.unsectionedCount) || 0,
            engine: body.engine && typeof body.engine.incomeCents === 'number' ? { incomeCents: body.engine.incomeCents, spendingCents: body.engine.spendingCents } : null,
          });
        }
      } catch {
        if (!cancelled) setTax({ status: 'unavailable', message: "The tax summary couldn't be loaded; nothing was guessed. Please try again." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, year, refreshKey]);

  // Server sections by id (rows = the server's buckets; no browser grouping or sums).
  const sectionResults = useMemo(() => {
    const results = new Map<string, { count: number; rows: SubRow[]; total: number; title: string }>();
    if (tax.status !== 'verified' && tax.status !== 'verified_zero') return results;
    for (const sec of tax.sections) {
      results.set(sec.id, { count: sec.count, total: sec.total, title: sec.title, rows: (sec.buckets || []).map(b => ({ label: b.label, count: b.count, amount: b.total })) });
    }
    return results;
  }, [tax]);

  // Summary figures: the engine's Actual Income / Actual Spending for the year; Personal = server section.
  const taxFigures = tax.status === 'verified' || tax.status === 'verified_zero';
  const totalIncome = taxFigures && tax.engine ? tax.engine.incomeCents / 100 : 0;
  const totalExpenses = taxFigures && tax.engine ? tax.engine.spendingCents / 100 : 0;
  const totalPersonal = sectionResults.get("personal")?.total ?? 0;

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const saveVehicleKm = async () => {
    if (!userId) return;
    setKmSaving(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      // Read existing settings first to merge
      const { data } = await supabase.from("profiles").select("settings").eq("id", userId).single();
      const existing = data?.settings || {};
      const vehicle_km = { ...(existing.vehicle_km || {}), [year]: vehicleKm };
      await supabase.from("profiles").update({ settings: { ...existing, vehicle_km } }).eq("id", userId);
      setKmSaved(true);
      setTimeout(() => setKmSaved(false), 3000);
    } catch (err) {
      console.error("[TaxWorkspace] save km error:", err);
    } finally {
      setKmSaving(false);
    }
  };

  const handleExportCSV = useCallback(() => {
    exportCSV(year, sectionResults);
  }, [year, sectionResults]);

  const [exportingReport, setExportingReport] = useState(false);
  const handleExportReport = useCallback(async () => {
    if (!userId) return;
    setExportingReport(true);
    try {
      // S0 Batch 2: the report endpoint requires the verified session token, read at call time
      // (fresh after resume). No token means no request; x-user-id alone is not identity.
      const sb = getSupabase();
      const { data: { session } } = sb ? await sb.auth.getSession() : { data: { session: null } };
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not signed in. Please sign in again to export the report.");
      const res = await fetch("/.netlify/functions/generate-tax-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, "x-user-id": userId },
        body: JSON.stringify({
          year,
          format: "pdf",
          vehicle_config: {
            opening_odometer: parseFloat(vehicleKm.opening) || 0,
            closing_odometer: parseFloat(vehicleKm.closing) || 0,
            total_km: Math.max(0, (parseFloat(vehicleKm.closing) || 0) - (parseFloat(vehicleKm.opening) || 0)),
            business_km_gfs: parseFloat(vehicleKm.businessGFS) || 0,
            business_km_rownmi: parseFloat(vehicleKm.businessROWNMI) || 0,
            business_km: (parseFloat(vehicleKm.businessGFS) || 0) + (parseFloat(vehicleKm.businessROWNMI) || 0),
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "unknown error");
        throw new Error(`Report generation failed: ${errText}`);
      }
      const pdfBlob = await res.blob();
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tax-report-${year}.pdf`;
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
          <button
            onClick={() => { setIsRefreshing(true); setRefreshKey(k => k + 1); setTimeout(() => setIsRefreshing(false), 1500); }}
            title="Refresh data"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: isMobile ? "6px 10px" : "6px 14px",
              borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: THEME.surface, border: `1px solid ${THEME.border}`,
              color: isRefreshing ? THEME.accent : THEME.textMuted,
              cursor: isRefreshing ? "wait" : "pointer", outline: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.accent; e.currentTarget.style.color = THEME.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = isRefreshing ? THEME.accent : THEME.textMuted; }}
          >
            <span style={{ display: "inline-block", transition: "transform 0.6s", transform: isRefreshing ? "rotate(360deg)" : "rotate(0deg)", fontSize: 15 }}>↻</span>
            {!isMobile && <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>}
          </button>
          <span style={{ fontSize: 12, color: THEME.textDim }}>
            {taxFigures ? tax.transactionCount : 0} transactions
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
            {exportingReport ? "Generating PDF..." : "Download PDF Report"}
          </button>
        </div>
      </div>

      {/* ══════ DISCLAIMER ══════ */}
      <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 20, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{"\u26A0\uFE0F"}</span>
        <span style={{ fontSize: 12, color: '#7b8ba5', lineHeight: 1.5 }}>XspensesAI organizes your financial data to help you work with your accountant more efficiently. We are not accountants, financial advisors, or tax professionals. Nothing in this app constitutes financial, tax, or legal advice.</span>
      </div>

      {/* ══════ NEEDS REVIEW BANNER ══════ */}
      {needsReviewCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: isMobile ? "12px 14px" : "14px 20px", marginBottom: 20, borderRadius: 14,
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <span style={{ fontSize: 18 }}>{"\u26A0\uFE0F"}</span>
            <span style={{ fontSize: 13, color: "#fbbf24", fontWeight: 600 }}>
              {needsReviewCount} transaction{needsReviewCount !== 1 ? 's' : ''} need{needsReviewCount === 1 ? 's' : ''} your attention before these totals are accurate.
            </span>
          </div>
          <button
            onClick={() => navigate("/dashboard/transactions?category=Needs+Review")}
            style={{
              padding: "7px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)",
              color: "#fbbf24", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            Review with Tag {"\u2192"}
          </button>
        </div>
      )}

      {/* ══════ SUMMARY CARDS ══════ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: 16, marginBottom: 32,
      }}>
        {[
          { label: FINANCIAL_LABELS.actualIncome, value: taxFigures && tax.engine ? `$${fmt(totalIncome)}` : "\u2014", color: THEME.green },
          { label: FINANCIAL_LABELS.actualSpending, value: taxFigures && tax.engine ? `$${fmt(totalExpenses)}` : "\u2014", color: "#f87171" },
          { label: "Personal", value: taxFigures ? `$${fmt(totalPersonal)}` : "\u2014", color: THEME.textMuted },
          { label: "Transactions", value: taxFigures ? String(tax.transactionCount) : "—", color: THEME.accent },
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
      {(tax.status === 'partial' || tax.status === 'unavailable') && (
        <div role="status" data-testid="tax-state" style={{ margin: "0 0 16px", padding: "12px 16px", borderRadius: 12, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.35)", color: "#fde68a", fontSize: 14, lineHeight: 1.5 }}>
          {tax.message}
        </div>
      )}
      {taxFigures && SECTIONS.map((section) => {
        const res = sectionResults.get(section.id);
        const count = res?.count ?? 0;
        const subRows = res?.rows ?? [];
        const sectionTotal = res?.total ?? 0;
        const isExpanded = expandedSections.has(section.id);
        const headerColor = section.id === "income" ? THEME.green : section.id === "personal" ? THEME.textDim : THEME.accent;

        // Hide "other" section if it has no transactions
        if ((section.id === "other" || section.id === "internal") && count === 0) return null;

        return (
          <SectionCard
            key={section.id}
            icon={section.icon}
            title={res?.title || section.title}
            total={sectionTotal}
            count={count}
            color={headerColor}
            expanded={isExpanded}
            onToggle={() => toggleSection(section.id)}
            isMobile={isMobile}
          >
            {count === 0 ? (
              <div style={{ fontSize: 13, color: THEME.textDim, padding: "12px 0" }}>
                No transactions found for {year}.
              </div>
            ) : subRows.length === 0 ? (
              <div style={{ fontSize: 13, color: THEME.textDim, padding: "12px 0" }}>
                {count} transaction{count === 1 ? "" : "s"}. A breakdown by {section.id === "income" ? "payer" : "subcategory"} isn't available yet.
              </div>
            ) : (
              <SubcategoryTable
                rows={subRows}
                color={headerColor}
                isMobile={isMobile}
                isIncome={section.id === "income"}
              />
            )}

            {/* Vehicle KM inputs (raw numbers for accountant) */}
            {section.id === "vehicle" && (
              <div style={{
                marginTop: 16, padding: "16px 20px", borderRadius: 12,
                background: `${THEME.accent}08`, border: `1px solid ${THEME.accent}20`,
              }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, fontWeight: 700, color: THEME.accent, marginBottom: 14 }}>
                  🚗 Vehicle KM Log
                </div>

                {/* Vehicle info row */}
                <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${THEME.border}44` }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: THEME.textDim, fontWeight: 600, marginBottom: 8 }}>Vehicle Information</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {([
                      { label: "Year", key: "year" as const, placeholder: "e.g. 2021", width: 90 },
                      { label: "Make", key: "make" as const, placeholder: "e.g. Hyundai", width: 130 },
                      { label: "Model", key: "model" as const, placeholder: "e.g. Elantra", width: 130 },
                    ] as const).map((field) => (
                      <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 11, color: THEME.textMuted }}>{field.label}</span>
                        <input
                          type={field.key === "year" ? "number" : "text"}
                          value={vehicleKm[field.key]}
                          onChange={(e) => setVehicleKm((v) => ({ ...v, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          style={{ width: field.width, padding: "6px 10px", borderRadius: 6, background: THEME.bg, border: `1px solid ${THEME.border}`, color: THEME.text, fontSize: 13, outline: "none" }}
                        />
                      </div>
                    ))}
                    {vehicleKm.year && vehicleKm.make && vehicleKm.model && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: 11, color: THEME.textMuted }}>Vehicle</span>
                        <div style={{ padding: "6px 12px", borderRadius: 6, background: `${THEME.accent}15`, border: `1px solid ${THEME.accent}30`, fontSize: 13, fontWeight: 700, color: THEME.accent }}>
                          {vehicleKm.year} {vehicleKm.make} {vehicleKm.model}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Odometer row */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: THEME.textDim, fontWeight: 600, marginBottom: 8 }}>Odometer Readings</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {([
                      { label: "Opening (Jan 1)", key: "opening" as const, placeholder: "e.g. 170210" },
                      { label: "Closing (Dec 31)", key: "closing" as const, placeholder: "e.g. 229677" },
                    ] as const).map((field) => (
                      <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 11, color: THEME.textMuted }}>{field.label}</span>
                        <input type="number" value={vehicleKm[field.key]}
                          onChange={(e) => setVehicleKm((v) => ({ ...v, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          style={{ width: 140, padding: "6px 10px", borderRadius: 6, background: THEME.bg, border: `1px solid ${THEME.border}`, color: THEME.text, fontSize: 13, outline: "none" }}
                        />
                      </div>
                    ))}
                    {vehicleKm.opening && vehicleKm.closing && Number(vehicleKm.closing) > Number(vehicleKm.opening) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: 11, color: THEME.textMuted }}>Total KM</span>
                        <div style={{ padding: "6px 10px", borderRadius: 6, background: `${THEME.accent}15`, border: `1px solid ${THEME.accent}30`, fontSize: 13, fontWeight: 700, color: THEME.accent, minWidth: 120 }}>
                          {(Number(vehicleKm.closing) - Number(vehicleKm.opening)).toLocaleString()} km
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business KM row */}
                <div style={{ marginBottom: 12, paddingTop: 12, borderTop: `1px solid ${THEME.border}44` }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: THEME.textDim, fontWeight: 600, marginBottom: 8 }}>Business KM by Purpose</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {/* Privacy (owner decision 2026-11-24): generic labels only — no business or employer
                        names and no example figures. The storage keys (businessGFS / businessROWNMI,
                        business_km_gfs / business_km_rownmi) are internal names kept for saved-data
                        compatibility; they are never shown. Both rows are optional. */}
                    {([
                      { label: "Employment driving, if any (T777)", key: "businessGFS" as const, placeholder: "km (optional)", color: "#60a5fa" },
                      { label: "Self-employment driving, if any (T2125)", key: "businessROWNMI" as const, placeholder: "km (optional)", color: "#34d399" },
                    ] as const).map((field) => (
                      <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 11, color: field.color, fontWeight: 600 }}>{field.label}</span>
                        <input type="number" value={vehicleKm[field.key]}
                          onChange={(e) => setVehicleKm((v) => ({ ...v, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          style={{ width: 160, padding: "6px 10px", borderRadius: 6, background: THEME.bg, border: `1px solid ${field.color}40`, color: THEME.text, fontSize: 13, outline: "none" }}
                        />
                        {vehicleKm[field.key] && vehicleKm.opening && vehicleKm.closing && Number(vehicleKm.closing) > Number(vehicleKm.opening) && (
                          <span style={{ fontSize: 10, color: field.color, opacity: 0.8 }}>
                            {((Number(vehicleKm[field.key]) / (Number(vehicleKm.closing) - Number(vehicleKm.opening))) * 100).toFixed(1)}% of total
                          </span>
                        )}
                      </div>
                    ))}
                    {(vehicleKm.businessGFS || vehicleKm.businessROWNMI) && vehicleKm.opening && vehicleKm.closing && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "flex-start", paddingTop: 0 }}>
                        <span style={{ fontSize: 11, color: THEME.textMuted }}>Combined Business</span>
                        <div style={{ padding: "6px 10px", borderRadius: 6, background: `${THEME.green}15`, border: `1px solid ${THEME.green}30`, fontSize: 13, fontWeight: 700, color: THEME.green, minWidth: 140 }}>
                          {((Number(vehicleKm.businessGFS) || 0) + (Number(vehicleKm.businessROWNMI) || 0)).toLocaleString()} km
                        </div>
                        <span style={{ fontSize: 10, color: THEME.green, opacity: 0.8 }}>
                          {((((Number(vehicleKm.businessGFS) || 0) + (Number(vehicleKm.businessROWNMI) || 0)) / (Number(vehicleKm.closing) - Number(vehicleKm.opening))) * 100).toFixed(1)}% business use
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${THEME.border}44` }}>
                  <div style={{ fontSize: 11, color: THEME.textDim }}>
                    If applicable: employment vehicle expenses (T777) need a T2200 signed by your employer · self-employment vehicle expenses go on T2125
                  </div>
                  <button
                    onClick={saveVehicleKm}
                    disabled={kmSaving}
                    style={{
                      padding: "7px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: kmSaved ? THEME.green : THEME.accent,
                      border: "none", color: "#0b1220", cursor: kmSaving ? "wait" : "pointer",
                      opacity: kmSaving ? 0.7 : 1, transition: "all 0.2s",
                    }}
                  >
                    {kmSaved ? "✓ Saved" : kmSaving ? "Saving..." : "Save"}
                  </button>
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

function MerchantGroup({ mg, color, isMobile, isLast }: {
  mg: { merchant: string; total: number; txs: { merchant: string; amount: number; date: string }[] | undefined };
  color: string; isMobile: boolean; isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const txs = mg.txs || [];
  return (
    <div>
      {/* Merchant row */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 70px" : "1fr 110px",
          gap: 8, padding: "8px 14px",
          borderBottom: !open && !isLast ? `1px solid ${THEME.border}22` : "none",
          alignItems: "center", cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${color}06`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, color, opacity: 0.5 }}>{open ? "▲" : "▼"}</span>
          {mg.merchant}
          <span style={{ fontSize: 10, color: THEME.textDim, fontWeight: 400 }}>({txs.length})</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color, textAlign: "right", whiteSpace: "nowrap" }}>
          ${fmt(mg.total)}
        </div>
      </div>

      {/* Individual transactions */}
      {open && (
        <div style={{ background: `${color}04`, borderBottom: !isLast ? `1px solid ${THEME.border}22` : "none" }}>
          {txs.map((tx, k) => (
            <div key={k} style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 70px" : "1fr 130px 90px",
              gap: 8, padding: "5px 24px",
              borderBottom: k < txs.length - 1 ? `1px solid ${THEME.border}11` : "none",
              alignItems: "center",
            }}>
              <div style={{ fontSize: 11, color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tx.merchant}
              </div>
              {!isMobile && (
                <div style={{ fontSize: 11, color: THEME.textDim, whiteSpace: "nowrap" }}>{tx.date}</div>
              )}
              <div style={{ fontSize: 11, fontWeight: 600, color, textAlign: "right", whiteSpace: "nowrap" }}>
                ${fmt(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubcategoryTable({ rows, color, isMobile, isIncome }: {
  rows: SubRow[]; color: string; isMobile: boolean; isIncome: boolean;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  if (rows.length === 0) return null;
  const colLabel = isIncome ? "Client / Payer" : "Subcategory";

  const toggleRow = (label: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 100px" : "1fr 110px",
        gap: 8, padding: "6px 0", borderBottom: `1px solid ${THEME.border}`,
      }}>
        <div style={COL_HDR}>{colLabel}</div>
        <div style={{ ...COL_HDR, textAlign: "right" }}>Amount</div>
      </div>

      {rows.map((row, i) => {
        const hasDetails = row.txDetails && row.txDetails.length > 0;
        const isExpanded = expandedRows.has(row.label);

        // Group txDetails by merchant
        const merchantGroups: { merchant: string; total: number; txs: typeof row.txDetails }[] = [];
        if (hasDetails) {
          const mgMap = new Map<string, { total: number; txs: { merchant: string; amount: number; date: string }[] }>();
          for (const tx of row.txDetails!) {
            const entry = mgMap.get(tx.merchant) || { total: 0, txs: [] };
            entry.total += tx.amount;
            entry.txs.push(tx);
            mgMap.set(tx.merchant, entry);
          }
          merchantGroups.push(
            ...Array.from(mgMap.entries())
              .sort((a, b) => b[1].total - a[1].total)
              .map(([merchant, v]) => ({ merchant, total: v.total, txs: v.txs }))
          );
        }

        return (
          <div key={row.label + i}>
            {/* Subcategory row */}
            <div
              onClick={() => { if (row.amount > 0 && hasDetails) toggleRow(row.label); }}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 100px" : "1fr 110px",
                gap: 8, padding: "9px 0",
                borderBottom: !isExpanded && i < rows.length - 1 ? `1px solid ${THEME.border}44` : "none",
                alignItems: "center",
                cursor: row.amount > 0 && hasDetails ? "pointer" : "default",
                borderRadius: 6, transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (row.amount > 0 && hasDetails) e.currentTarget.style.background = `${color}08`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: row.amount > 0 ? THEME.text : THEME.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                {row.label}
                {row.amount > 0 && hasDetails && (
                  <span style={{ fontSize: 10, color, opacity: 0.7 }}>{isExpanded ? "▲" : "▼"}</span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: row.amount > 0 ? color : THEME.textDim, textAlign: "right", whiteSpace: "nowrap" }}>
                ${fmt(row.amount)}
              </div>
            </div>

            {/* Merchant group level */}
            {hasDetails && isExpanded && (
              <div style={{ marginBottom: 8, borderRadius: 8, background: THEME.bg, border: `1px solid ${THEME.border}44`, overflow: "hidden" }}>
                {merchantGroups.map((mg, mi) => (
                  <MerchantGroup key={mg.merchant + mi} mg={mg} color={color} isMobile={isMobile} isLast={mi === merchantGroups.length - 1} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const COL_HDR: React.CSSProperties = {
  fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: THEME.textDim, fontWeight: 700,
};

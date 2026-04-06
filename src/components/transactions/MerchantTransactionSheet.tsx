import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { getSupabase } from "@/lib/supabase";

// ─── Design tokens (matches TagCopilotPanel) ──────────────────────────────────
const T = {
  bg:        "#080f1c",
  surface:   "#0d1526",
  surface2:  "#111d33",
  border:    "#1a2740",
  borderHi:  "#223355",
  cyan:      "#22d3ee",
  green:     "#34d399",
  orange:    "#fb923c",
  purple:    "#a78bfa",
  text:      "#e8f0fc",
  textMuted: "#8899b4",
  textDim:   "#4a5f7a",
} as const;

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');

  @keyframes mtsSlideUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes mtsShimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes mtsGlow      { 0%,100%{opacity:0.5} 50%{opacity:1} }
  @keyframes mtsFadeIn    { from{opacity:0} to{opacity:1} }

  .mts-scrollbar::-webkit-scrollbar       { width:3px }
  .mts-scrollbar::-webkit-scrollbar-track { background:transparent }
  .mts-scrollbar::-webkit-scrollbar-thumb { background:rgba(34,211,238,0.2); border-radius:4px }

  .mts-tx-row { transition: border-color 0.15s ease, background 0.15s ease, transform 0.12s ease; }
  .mts-tx-row:hover { border-color: rgba(34,211,238,0.3) !important; background: rgba(34,211,238,0.04) !important; transform: translateX(2px); }

  .mts-back-btn { transition: background 0.15s, color 0.15s; }
  .mts-back-btn:hover { background: rgba(34,211,238,0.1) !important; color: #22d3ee !important; }

  .mts-save-btn { transition: filter 0.15s, transform 0.12s; }
  .mts-save-btn:hover:not(:disabled) { filter: brightness(1.15); transform: scale(1.03); }

  .mts-shimmer {
    background: linear-gradient(90deg, #0d1526 25%, #111d33 50%, #0d1526 75%);
    background-size: 200% 100%;
    animation: mtsShimmer 1.6s ease-in-out infinite;
  }
`;

interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant_name: string;
  amount: number;
  type: "income" | "expense" | string;
  category: string | null;
  subcategory: string | null;
  import_id: string | null;
  statement_name?: string;
}

interface MerchantTransactionSheetProps {
  merchant: string;
  onClose: () => void;
  reviewScrollTop?: number;
  onRestoreScroll?: (px: number) => void;
}

function formatAmount(amount: number, type: string): string {
  const sign = type === "income" ? "+" : "-";
  return `${sign}${Math.abs(amount).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}

function CategoryPill({ category, isNew }: { category: string; isNew?: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
      background: isNew ? "rgba(52,211,153,0.12)" : "rgba(34,211,238,0.1)",
      border: `1px solid ${isNew ? "rgba(52,211,153,0.25)" : "rgba(34,211,238,0.2)"}`,
      color: isNew ? T.green : T.cyan,
      fontFamily: "'Syne',sans-serif", letterSpacing: 0.3,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {isNew && <span style={{ fontSize: 9 }}>{"\u2713"}</span>}
      {category}
    </span>
  );
}

function UncategorizedPill() {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
      background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.22)",
      color: T.orange, fontFamily: "'Syne',sans-serif", letterSpacing: 0.3,
    }}>Needs Review</span>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingTop: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="mts-shimmer" style={{
          height: 74, borderRadius: 14,
          border: `1px solid ${T.border}`,
          opacity: 1 - i * 0.12,
        }} />
      ))}
    </div>
  );
}

// ─── TransactionDetail ────────────────────────────────────────────────────────
function TransactionDetail({
  tx, onBack, onRuleSaved,
}: {
  tx: Transaction;
  onBack: () => void;
  onRuleSaved: (merchant: string, category: string) => void;
}) {
  const [clarifyText, setClarifyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSaveRule = async () => {
    const trimmed = clarifyText.trim();
    if (!trimmed || saving) return;
    setSaving(true); setError("");
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("No supabase client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const merchantPattern = tx.merchant_name?.toLowerCase().trim() || trimmed.toLowerCase();
      const parts = trimmed.split("/").map(s => s.trim());
      const category = parts[0];
      const subcategory = parts[1] || null;
      const { error: upsertErr } = await supabase
        .from("category_rules")
        .upsert(
          { user_id: user.id, merchant_pattern: merchantPattern, category, subcategory, updated_at: new Date().toISOString() },
          { onConflict: "user_id,merchant_pattern" }
        );
      if (upsertErr) throw upsertErr;
      setSaved(true);
      onRuleSaved(tx.merchant_name, category);
    } catch (err: any) {
      setError(err.message || "Failed to save rule.");
    } finally { setSaving(false); }
  };

  const isIncome = tx.type === "income";
  const amountColor = isIncome ? T.green : T.orange;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button className="mts-back-btn" onClick={onBack} style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
          color: T.textMuted, cursor: "pointer", width: 36, height: 36,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16,
        }}>{"\u2190"}</button>
        <div>
          <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 1.8, color: T.textDim, fontWeight: 700, fontFamily: "'Syne',sans-serif", marginBottom: 2 }}>Transaction Detail</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: "'Syne',sans-serif" }}>{tx.merchant_name}</div>
        </div>
      </div>

      {/* Body */}
      <div className="mts-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Amount hero */}
        <div style={{
          padding: "24px 20px", borderRadius: 16,
          background: `linear-gradient(135deg, ${T.surface} 0%, rgba(13,21,38,0.6) 100%)`,
          border: `1px solid ${T.border}`,
          marginBottom: 16, textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: isIncome
              ? "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(52,211,153,0.08) 0%, transparent 70%)"
              : "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(251,146,60,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ fontSize: 34, fontWeight: 800, color: amountColor, marginBottom: 4, fontFamily: "'DM Mono',monospace", textShadow: `0 0 24px ${amountColor}44` }}>
            {formatAmount(tx.amount, tx.type)}
          </div>
          <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 2, fontFamily: "'Syne',sans-serif" }}>{formatDate(tx.date)}</div>
          <div style={{ fontSize: 12, color: T.textDim }}>{tx.description || tx.merchant_name}</div>
        </div>

        {/* Meta rows */}
        <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
          {[
            { label: "Category", value: tx.category || "Uncategorized", color: tx.category ? T.cyan : T.orange },
            { label: "Subcategory", value: tx.subcategory || "\u2014", color: T.textMuted },
            { label: "Type", value: tx.type === "income" ? "Income" : "Expense", color: isIncome ? T.green : T.textMuted },
          ].map((row, i, arr) => (
            <div key={row.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "13px 16px",
              borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
              background: i % 2 === 0 ? T.surface : T.bg,
            }}>
              <span style={{ fontSize: 12, color: T.textDim, fontWeight: 600, fontFamily: "'Syne',sans-serif", letterSpacing: 0.3 }}>{row.label}</span>
              <span style={{ fontSize: 13, color: row.color, fontWeight: 700, fontFamily: row.label === "Category" ? "'Syne',sans-serif" : "inherit" }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", background: T.surface }}>
            <span style={{ fontSize: 12, color: T.textDim, fontWeight: 600, fontFamily: "'Syne',sans-serif", letterSpacing: 0.3 }}>Source</span>
            <span style={{ fontSize: 12, color: tx.statement_name ? T.cyan : T.textDim, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              {tx.statement_name ? (<><span style={{ fontSize: 11 }}>{"\uD83D\uDCC4"}</span>{tx.statement_name}</>) : "Unknown statement"}
            </span>
          </div>
        </div>

        {/* Tell Tag section */}
        <div style={{
          padding: "18px", borderRadius: 14,
          background: "rgba(34,211,238,0.04)",
          border: "1px solid rgba(34,211,238,0.14)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "rgba(34,211,238,0.15)", border: "1.5px solid rgba(34,211,238,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 800, color: T.cyan, fontFamily: "'Syne',sans-serif",
            }}>T</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.cyan, fontFamily: "'Syne',sans-serif" }}>Tell Tag what this is</span>
          </div>
          <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 14, lineHeight: 1.65, margin: "0 0 14px" }}>
            Tag will remember this for all future transactions from{" "}
            <strong style={{ color: T.text, fontFamily: "'Syne',sans-serif" }}>{tx.merchant_name}</strong>.
            {" "}Type a category, or <span style={{ color: T.cyan, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>"Category / Subcategory"</span> to be precise.
          </p>

          {saved ? (
            <div style={{
              padding: "14px 16px", borderRadius: 12,
              background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)",
              fontSize: 13, color: T.green, fontWeight: 700, textAlign: "center",
              fontFamily: "'Syne',sans-serif", letterSpacing: 0.3,
              animation: "mtsFadeIn 0.2s ease forwards",
            }}>
              {"\u2713"} Rule saved for {tx.merchant_name}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                <input
                  type="text"
                  value={clarifyText}
                  onChange={e => setClarifyText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveRule(); }}
                  placeholder='e.g. "Office Supplies" or "Travel / Flights"'
                  style={{
                    flex: 1, background: T.bg, border: `1px solid ${T.borderHi}`,
                    borderRadius: 10, padding: "12px 14px", fontSize: 14, color: T.text,
                    outline: "none", fontFamily: "inherit",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
                  }}
                />
                <button
                  className="mts-save-btn"
                  onClick={handleSaveRule}
                  disabled={!clarifyText.trim() || saving}
                  style={{
                    padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: clarifyText.trim() && !saving ? `linear-gradient(135deg, ${T.cyan}, #0891b2)` : T.surface2,
                    border: clarifyText.trim() && !saving ? "none" : `1px solid ${T.border}`,
                    color: clarifyText.trim() && !saving ? "#080f1c" : T.textDim,
                    cursor: clarifyText.trim() && !saving ? "pointer" : "default",
                    flexShrink: 0,
                    boxShadow: clarifyText.trim() && !saving ? "0 2px 16px rgba(34,211,238,0.28)" : "none",
                    fontFamily: "'Syne',sans-serif",
                  }}
                >{saving ? "\u2026" : "Save"}</button>
              </div>
              {error && (
                <div style={{ marginTop: 8, fontSize: 12, color: T.orange, padding: "8px 12px", borderRadius: 8, background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.16)" }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MerchantTransactionSheet({
  merchant, onClose, reviewScrollTop = 0, onRestoreScroll,
}: MerchantTransactionSheetProps) {
  const [visible, setVisible] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [savedRules, setSavedRules] = useState<Record<string, string>>({});
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("transactions")
          .select("id, date, description, merchant_name, amount, type, category, subcategory, import_id")
          .eq("user_id", user.id)
          .ilike("merchant_name", `%${merchant}%`)
          .order("date", { ascending: false })
          .limit(100);
        if (error) throw error;
        const importIds = [...new Set((data || []).map(t => t.import_id).filter(Boolean))];
        let importMap: Record<string, string> = {};
        if (importIds.length > 0) {
          const { data: imports } = await supabase
            .from("imports")
            .select("id, source_file, statement_date, bank_name")
            .in("id", importIds);
          (imports || []).forEach(imp => {
            const bank = imp.bank_name || "Statement";
            const dateLabel = imp.statement_date
              ? new Date(imp.statement_date).toLocaleDateString("en-CA", { month: "short", year: "numeric" })
              : imp.source_file?.replace(/\.[^.]+$/, "") || "";
            importMap[imp.id] = `${bank} ${dateLabel}`.trim();
          });
        }
        setTransactions((data || []).map(t => ({ ...t, statement_name: t.import_id ? importMap[t.import_id] : undefined })));
      } catch (err) {
        console.error("MerchantTransactionSheet fetch error:", err);
      } finally { setLoading(false); }
    })();
  }, [merchant]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => { onRestoreScroll?.(reviewScrollTop); onClose(); }, 320);
  }, [onClose, onRestoreScroll, reviewScrollTop]);

  const handleRuleSaved = (merch: string, category: string) => {
    setSavedRules(prev => ({ ...prev, [merch]: category }));
  };

  const totalSpend = transactions.filter(t => t.type !== "income").reduce((s, t) => s + t.amount, 0);
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const uncategorized = transactions.filter(t => !t.category && !savedRules[t.merchant_name]).length;

  const sheetStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed", left: 0, right: 0, bottom: 0, height: "92dvh",
        borderRadius: "20px 20px 0 0",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
      }
    : {
        position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
        borderLeft: `1px solid ${T.border}`,
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
      };

  const content = (
    <>
      <style>{STYLES}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(2,6,14,0.75)", backdropFilter: "blur(6px)",
        zIndex: 1100,
        opacity: visible ? 1 : 0, transition: "opacity 0.32s ease",
      }} />

      {/* Sheet */}
      <div style={{
        ...sheetStyle, zIndex: 1101,
        background: T.bg,
        backgroundImage: "radial-gradient(ellipse 70% 30% at 50% 0%, rgba(34,211,238,0.04) 0%, transparent 70%)",
        display: "flex", flexDirection: "column",
        overflowY: "hidden",
        boxShadow: isMobile
          ? "0 -16px 64px rgba(0,0,0,0.7)"
          : "-24px 0 80px rgba(0,0,0,0.6), -1px 0 0 rgba(34,211,238,0.06)",
      }}>

        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 14, paddingBottom: 6, flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(34,211,238,0.2)" }} />
          </div>
        )}

        {selectedTx ? (
          <TransactionDetail tx={selectedTx} onBack={() => setSelectedTx(null)} onRuleSaved={handleRuleSaved} />
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: "16px 20px", borderBottom: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
              background: `linear-gradient(180deg, rgba(13,21,38,0.95) 0%, rgba(8,15,28,0.8) 100%)`,
              backdropFilter: "blur(12px)",
            }}>
              <button className="mts-back-btn" onClick={handleClose} style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
                color: T.textMuted, cursor: "pointer", width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16,
              }}>{"\u2190"}</button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 1.8, color: T.textDim, fontWeight: 700, fontFamily: "'Syne',sans-serif", marginBottom: 2 }}>
                  {"\u2190"} Back to Review
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text, fontFamily: "'Syne',sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {merchant}
                </div>
              </div>

              <div style={{
                padding: "4px 12px", borderRadius: 20,
                background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)",
                fontSize: 11, fontWeight: 700, color: T.cyan, flexShrink: 0,
                fontFamily: "'DM Mono',monospace",
              }}>
                {loading ? "\u2026" : `${transactions.length} txns`}
              </div>
            </div>

            {/* Summary strip */}
            {!loading && transactions.length > 0 && (
              <div style={{
                display: "flex", gap: 1, flexShrink: 0,
                borderBottom: `1px solid ${T.border}`,
                background: T.surface,
              }}>
                {[
                  { label: "Total Spent", value: `-${totalSpend.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: T.orange, show: totalSpend > 0 },
                  { label: "Income", value: `+${totalIncome.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: T.green, show: totalIncome > 0 },
                  { label: "Needs Review", value: `${uncategorized}`, color: uncategorized > 0 ? T.orange : T.green, show: true },
                ].filter(s => s.show).map((s, i, arr) => (
                  <div key={s.label} style={{
                    flex: 1, padding: "11px 14px", textAlign: "center",
                    borderRight: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
                  }}>
                    <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 1.6, color: T.textDim, fontWeight: 700, fontFamily: "'Syne',sans-serif", marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Transaction list */}
            <div className="mts-scrollbar" style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "12px 16px" }}>
              {loading ? (
                <LoadingSkeleton />
              ) : transactions.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "56px 24px",
                  animation: "mtsFadeIn 0.3s ease forwards",
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{"\uD83D\uDD0D"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.textMuted, fontFamily: "'Syne',sans-serif", marginBottom: 6 }}>No transactions found</div>
                  <div style={{ fontSize: 12, color: T.textDim }}>No records for "{merchant}" in your statements.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {transactions.map(tx => {
                    const isIncome = tx.type === "income";
                    const amountColor = isIncome ? T.green : T.text;
                    const ruleCategory = savedRules[tx.merchant_name];
                    const displayCat = ruleCategory || tx.category;

                    return (
                      <button
                        key={tx.id}
                        className="mts-tx-row"
                        onClick={() => setSelectedTx(tx)}
                        style={{
                          width: "100%", padding: "14px 16px", borderRadius: 14,
                          background: T.surface, border: `1px solid ${T.border}`,
                          cursor: "pointer", textAlign: "left",
                          display: "flex", alignItems: "center", gap: 12,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                        }}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: isIncome ? T.green : T.orange,
                          boxShadow: `0 0 6px ${isIncome ? T.green : T.orange}66`,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>
                            {tx.description || tx.merchant_name}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11.5, color: T.textDim, fontFamily: "'DM Mono',monospace" }}>{formatDate(tx.date)}</span>
                            <span style={{ fontSize: 9, color: T.border }}>{"\u00b7"}</span>
                            {displayCat
                              ? <CategoryPill category={displayCat} isNew={!!ruleCategory} />
                              : <UncategorizedPill />
                            }
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: amountColor, fontFamily: "'DM Mono',monospace" }}>
                            {formatAmount(tx.amount, tx.type)}
                          </span>
                          <span style={{ fontSize: 13, color: T.textDim }}>{"\u203A"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "12px 20px", borderTop: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              flexShrink: 0, background: T.surface,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}66`, animation: "mtsGlow 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 10, color: T.textDim, fontFamily: "'Syne',sans-serif", letterSpacing: 0.3 }}>
                Tap a transaction to categorize it {"\u00b7"} Tag will remember your rules
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );

  return createPortal(content, document.body);
}

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { getSupabase } from "@/lib/supabase";

const CYAN = "#22d3ee";
const THEME = {
  bg: "#0b1220",
  surface: "#111a2e",
  border: "#1e2d4a",
  text: "#e8ecf4",
  textMuted: "#9ba8bc",
  textDim: "#64748b",
  green: "#34d399",
};

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
  return `${sign}${Math.abs(amount).toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── sub-component: transaction detail ──────────────────────────────────────

function TransactionDetail({
  tx,
  onBack,
  onRuleSaved,
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
    setSaving(true);
    setError("");

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
          {
            user_id: user.id,
            merchant_pattern: merchantPattern,
            category,
            subcategory,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,merchant_pattern" }
        );

      if (upsertErr) throw upsertErr;

      setSaved(true);
      onRuleSaved(tx.merchant_name, category);
    } catch (err: any) {
      setError(err.message || "Failed to save rule.");
    } finally {
      setSaving(false);
    }
  };

  const amountColor = tx.type === "income" ? THEME.green : "#fb923c";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Detail header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 8, color: THEME.textMuted, fontSize: 18, cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {"\u2190"}
        </button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text }}>Transaction Detail</div>
          <div style={{ fontSize: 12, color: THEME.textDim }}>{tx.merchant_name}</div>
        </div>
      </div>

      {/* Detail body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Amount + date hero */}
        <div style={{ padding: "20px", borderRadius: 16, background: THEME.surface, border: `1px solid ${THEME.border}`, marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: amountColor, marginBottom: 4 }}>
            {formatAmount(tx.amount, tx.type)}
          </div>
          <div style={{ fontSize: 14, color: THEME.textMuted, marginBottom: 2 }}>{formatDate(tx.date)}</div>
          <div style={{ fontSize: 13, color: THEME.textDim }}>{tx.description || tx.merchant_name}</div>
        </div>

        {/* Meta rows */}
        <div style={{ borderRadius: 14, border: `1px solid ${THEME.border}`, overflow: "hidden", marginBottom: 20 }}>
          {[
            { label: "Category", value: tx.category || "Uncategorized", color: tx.category ? CYAN : "#fb923c" },
            { label: "Subcategory", value: tx.subcategory || "\u2014", color: THEME.textMuted },
            { label: "Type", value: tx.type === "income" ? "Income" : "Expense", color: tx.type === "income" ? THEME.green : THEME.textMuted },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${THEME.border}` : "none", background: i % 2 === 0 ? THEME.surface : THEME.bg }}>
              <span style={{ fontSize: 13, color: THEME.textDim, fontWeight: 500 }}>{row.label}</span>
              <span style={{ fontSize: 14, color: row.color, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}

          {/* Source statement row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", background: THEME.surface }}>
            <span style={{ fontSize: 13, color: THEME.textDim, fontWeight: 500 }}>Source</span>
            <span style={{ fontSize: 13, color: tx.statement_name ? CYAN : THEME.textDim, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              {tx.statement_name ? (
                <>
                  <span style={{ fontSize: 11 }}>{"\uD83D\uDCC4"}</span>
                  {tx.statement_name}
                </>
              ) : (
                "Unknown statement"
              )}
            </span>
          </div>
        </div>

        {/* Tell Tag what this is */}
        <div style={{ padding: "18px", borderRadius: 14, background: `${CYAN}06`, border: `1px solid ${CYAN}20` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${CYAN}20`, border: `1.5px solid ${CYAN}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: CYAN, flexShrink: 0 }}>T</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: CYAN }}>Tell Tag what this is</span>
          </div>

          <p style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
            Tag will remember this for all future transactions from{" "}
            <strong style={{ color: THEME.text }}>{tx.merchant_name}</strong>.
            Type a category, or "Category / Subcategory" to be precise.
          </p>

          {saved ? (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: `${THEME.green}12`, border: `1px solid ${THEME.green}30`, fontSize: 14, color: THEME.green, fontWeight: 600, textAlign: "center" }}>
              {"\u2713"} Rule saved for {tx.merchant_name}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <input
                  type="text"
                  value={clarifyText}
                  onChange={e => setClarifyText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveRule(); }}
                  placeholder='e.g. "Office Supplies" or "Travel / Flights"'
                  style={{ flex: 1, background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, color: THEME.text, outline: "none", fontFamily: "inherit", minHeight: 44 }}
                />
                <button
                  onClick={handleSaveRule}
                  disabled={!clarifyText.trim() || saving}
                  style={{
                    padding: "12px 18px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                    background: clarifyText.trim() && !saving ? `linear-gradient(135deg, ${CYAN}, #0891b2)` : THEME.surface,
                    border: `1px solid ${clarifyText.trim() && !saving ? "transparent" : THEME.border}`,
                    color: clarifyText.trim() && !saving ? "#0b1220" : THEME.textDim,
                    cursor: clarifyText.trim() && !saving ? "pointer" : "default",
                    minHeight: 44, flexShrink: 0, transition: "all 0.15s ease",
                  }}
                >
                  {saving ? "\u2026" : "Save"}
                </button>
              </div>
              {error && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#fb923c", padding: "8px 12px", borderRadius: 8, background: "rgba(251,146,60,0.08)" }}>
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

// ─── main component ──────────────────────────────────────────────────────────

export function MerchantTransactionSheet({
  merchant,
  onClose,
  reviewScrollTop = 0,
  onRestoreScroll,
}: MerchantTransactionSheetProps) {
  const [visible, setVisible] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [savedRules, setSavedRules] = useState<Record<string, string>>({});
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

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
      } finally {
        setLoading(false);
      }
    })();
  }, [merchant]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      onRestoreScroll?.(reviewScrollTop);
      onClose();
    }, 320);
  }, [onClose, onRestoreScroll, reviewScrollTop]);

  const handleRuleSaved = (merch: string, category: string) => {
    setSavedRules(prev => ({ ...prev, [merch]: category }));
  };

  const sheetStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed", left: 0, right: 0, bottom: 0, height: "92dvh",
        borderRadius: "20px 20px 0 0",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
      }
    : {
        position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
        borderLeft: `1px solid ${THEME.border}`,
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
      };

  const content = (
    <>
      {/* Backdrop */}
      <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)", zIndex: 1100, opacity: visible ? 1 : 0, transition: "opacity 0.32s ease" }} />

      {/* Sheet */}
      <div style={{ ...sheetStyle, zIndex: 1101, background: THEME.bg, display: "flex", flexDirection: "column", overflowY: "hidden" }}>
        {/* Drag handle (mobile only) */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: THEME.border }} />
          </div>
        )}

        {selectedTx ? (
          <TransactionDetail tx={selectedTx} onBack={() => setSelectedTx(null)} onRuleSaved={handleRuleSaved} />
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <button onClick={handleClose} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 8, color: THEME.textMuted, fontSize: 18, cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {"\u2190"}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: THEME.textDim, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600, marginBottom: 2 }}>
                  {"\u2190"} Back to Review
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {merchant}
                </div>
              </div>
              <div style={{ padding: "4px 10px", borderRadius: 20, background: `${CYAN}10`, border: `1px solid ${CYAN}22`, fontSize: 12, fontWeight: 600, color: CYAN, flexShrink: 0 }}>
                {loading ? "\u2026" : `${transactions.length} txns`}
              </div>
            </div>

            {/* Transaction list */}
            <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "12px 16px" }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ height: 72, borderRadius: 14, background: THEME.surface, border: `1px solid ${THEME.border}`, opacity: 1 - i * 0.15, animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                  <style>{`@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}`}</style>
                </div>
              ) : transactions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 24px", color: THEME.textDim, fontSize: 14 }}>
                  No transactions found for this merchant.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {transactions.map(tx => {
                    const isIncome = tx.type === "income";
                    const amountColor = isIncome ? THEME.green : THEME.text;
                    const ruleCategory = savedRules[tx.merchant_name];

                    return (
                      <button
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        style={{ width: "100%", padding: "14px 16px", borderRadius: 14, background: THEME.surface, border: `1px solid ${THEME.border}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, minHeight: 44, transition: "border-color 0.15s ease" }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = CYAN + "44")}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = THEME.border)}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: isIncome ? THEME.green : "#fb923c", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }}>
                            {tx.description || tx.merchant_name}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: THEME.textDim }}>{formatDate(tx.date)}</span>
                            {(ruleCategory || tx.category) && (
                              <>
                                <span style={{ fontSize: 10, color: THEME.border }}>{"\u00b7"}</span>
                                <span style={{ fontSize: 12, color: ruleCategory ? THEME.green : CYAN, fontWeight: 600 }}>
                                  {ruleCategory || tx.category}{ruleCategory && " \u2713"}
                                </span>
                              </>
                            )}
                            {!tx.category && !ruleCategory && (
                              <>
                                <span style={{ fontSize: 10, color: THEME.border }}>{"\u00b7"}</span>
                                <span style={{ fontSize: 12, color: "#fb923c", fontWeight: 600 }}>Uncategorized</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: amountColor }}>{formatAmount(tx.amount, tx.type)}</span>
                          <span style={{ fontSize: 14, color: THEME.textDim }}>{"\u203A"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexShrink: 0 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: THEME.green, boxShadow: `0 0 8px ${THEME.green}66` }} />
              <span style={{ fontSize: 10, color: THEME.textDim }}>Tap a transaction to categorize it {"\u00b7"} Tag will remember your rules</span>
            </div>
          </>
        )}
      </div>
    </>
  );

  return createPortal(content, document.body);
}

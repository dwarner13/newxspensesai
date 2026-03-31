import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useReportsData } from "@/hooks/useReportsData";
import type { IssuerGroup } from "@/hooks/useReportsData";
import { getSupabase } from "@/lib/supabase";

// ─── Design tokens ──────────────────────────────────────────────────────
const T = {
  bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a",
  text: "#e8ecf4", muted: "#c8d0e0", dim: "#9ba8bc",
  gold: "#c8a64e", cyan: "#22d3ee", purple: "#a78bfa", green: "#34d399",
  red: "#f87171", amber: "#fbbf24",
};

const ISSUER_COLORS: Record<string, string> = {
  BMO: "#3b82f6", "RBC Avion": "#ef4444", CIBC: "#f97316",
  "Canadian Tire": "#34d399", TD: "#22d3ee", Amex: "#6366f1",
  Scotiabank: "#ef4444", Unknown: "#9ba8bc",
};

const KNOWN_ISSUERS = ["BMO", "RBC Avion", "CIBC", "Canadian Tire"];

function fmtCAD(n: number) { return "CAD $" + Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}
function fmtDateFull(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Agent Badge ─────────────────────────────────────────────────────────
function AgentBadge({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: color + "20", border: "1.5px solid " + color + "44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>{label}</div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 140, padding: "16px 18px", borderRadius: 14, background: T.surface, border: "1px solid " + T.border }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: T.dim, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

// ─── Issuer Section ──────────────────────────────────────────────────────
function IssuerSection({ group, navigate }: { group: IssuerGroup; navigate: (path: string) => void }) {
  const [open, setOpen] = useState(true);
  const dot = ISSUER_COLORS[group.issuer] || T.dim;

  return (
    <div style={{ borderRadius: 14, border: "1px solid " + T.border, background: T.surface, marginBottom: 12, overflow: "hidden" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: T.text, flex: 1 }}>{group.issuer}</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: dot + "18", color: dot }}>{group.statements.length}</span>
        <span style={{ fontSize: 12, color: T.muted, marginLeft: 8 }}>{fmtCAD(group.totalSpent)} spent</span>
        <span style={{ fontSize: 12, color: T.dim, marginLeft: 4 }}>{group.txCount} txns</span>
        <span style={{ fontSize: 14, color: T.dim, marginLeft: 8, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>{"\u25BE"}</span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid " + T.border }}>
          {/* Column headers — desktop only */}
          <div className="reports-row-header" style={{ display: window.innerWidth >= 768 ? "grid" : "none" }} style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", padding: "8px 18px", fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 1 }}>
            <span>Statement Period</span><span>Transactions</span><span>Spent</span><span>Income</span><span />
          </div>
          {group.statements.map(s => (
            <div key={s.importId} style={{ borderTop: "1px solid " + T.border }}>
              {/* Desktop row */}
              <div className="reports-desktop-row" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", padding: "10px 18px", alignItems: "center", fontSize: 12, display: window.innerWidth >= 768 ? "grid" : "none" }}>
                <span style={{ color: T.text }}>{s.earliestDate && s.latestDate ? fmtDate(s.earliestDate) + " – " + fmtDateFull(s.latestDate) : "Imported " + fmtDateFull(s.createdAt)}</span>
                <span style={{ color: T.muted }}>{s.txCount}</span>
                <span style={{ color: T.red, fontWeight: 600 }}>{fmtCAD(s.totalSpent)}</span>
                <span style={{ color: T.green, fontWeight: 600 }}>{fmtCAD(s.totalIncome)}</span>
                <button onClick={() => navigate("/dashboard/transactions?importId=" + s.importId)} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: T.gold + "12", border: "1px solid " + T.gold + "28", color: T.gold, cursor: "pointer" }}>View →</button>
              </div>
              {/* Mobile card */}
              <div style={{ display: window.innerWidth < 768 ? "flex" : "none", alignItems: "center", padding: "10px 18px", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{s.earliestDate && s.latestDate ? fmtDate(s.earliestDate) + " – " + fmtDateFull(s.latestDate) : "Imported " + fmtDateFull(s.createdAt)}</div>
                  <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{s.txCount} transactions · {fmtCAD(s.totalSpent)} spent</div>
                  {s.totalIncome > 0 && <div style={{ color: T.green, fontSize: 12, marginTop: 1 }}>{fmtCAD(s.totalIncome)} income</div>}
                </div>
                <button onClick={() => navigate("/dashboard/transactions?importId=" + s.importId)} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: T.gold + "12", border: "1px solid " + T.gold + "28", color: T.gold, cursor: "pointer", flexShrink: 0 }}>View →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function ReportsPageV2() {
  const data = useReportsData();
  const navigate = useNavigate();
  const [taxBannerDismissed, setTaxBannerDismissed] = useState(() => localStorage.getItem("reports_tax_banner_dismissed") === "1");
  const [chatAgent, setChatAgent] = useState<"Prime" | "Crystal" | "Tag">("Prime");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const dismissTaxBanner = useCallback(() => {
    localStorage.setItem("reports_tax_banner_dismissed", "1");
    setTaxBannerDismissed(true);
  }, []);

  // ── CSV export ──
  const exportCSV = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data: userData } = await sb.auth.getUser();
    if (!userData?.user) return;
    const { data: txs } = await sb
      .from("transactions")
      .select("posted_at, merchant_name, amount, category, subcategory, import_id")
      .eq("user_id", userData.user.id)
      .order("posted_at", { ascending: false });
    if (!txs) return;
    const importIssuerMap = new Map<string, string>();
    data.issuerGroups.forEach(g => g.statements.forEach(s => importIssuerMap.set(s.importId, g.issuer)));
    const rows = [
      ["Date", "Merchant", "Amount", "Category", "Subcategory", "Issuer", "Import ID"],
      ...txs.map((t: any) => [
        t.posted_at || "", t.merchant_name || "", t.amount?.toFixed(2) || "",
        t.category || "", t.subcategory || "",
        importIssuerMap.get(t.import_id) || "Unknown", t.import_id || "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "xspensesai-export-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [data.issuerGroups]);

  // Destructure for cleaner access in callbacks
  const { issuerGroups, grandTotalSpent, grandTotalIncome, grandTxCount, monthlyTrends, topCategories } = data;

  // Build real financial context from live data for all agents
  const buildPrimeContext = useCallback(() => {
    const topCats = topCategories.slice(0, 8).map(c => ({
      name: c.category,
      amount: c.total,
    }));

    const issuerSummaries = issuerGroups.map(g => ({
      importId: g.statements[0]?.importId || '',
      label: g.issuer,
      totalSpend: g.totalSpent,
      totalIncome: g.totalIncome,
      txCount: g.txCount,
      topCategories: topCats,
      topMerchants: [],
      displayedAt: new Date().toISOString(),
    }));

    return {
      displayName: null,
      timezone: 'America/Edmonton',
      currency: 'CAD',
      currentStage: 'power' as const,
      financialSnapshot: {
        hasTransactions: grandTxCount > 0,
        uncategorizedCount: 0,
        monthlySpend: grandTotalSpent,
        topCategories: topCats,
        hasDebt: false,
        hasGoals: false,
      },
      memorySummary: null,
      recentImportSummaries: issuerSummaries,
    };
  }, [topCategories, issuerGroups, grandTotalSpent, grandTotalIncome, grandTxCount]);

  // ── Inline chat ──
  const sendChat = useCallback(async (text?: string) => {
    const msg = (text || chatInput).trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    const updated = [...chatMessages, { role: "user" as const, content: msg }];
    setChatMessages(updated);
    setChatLoading(true);
    try {
      const sb = getSupabase();
      const session = sb ? (await sb.auth.getSession()).data.session : null;
      const slugMap: Record<string, string> = { Prime: "prime", Crystal: "crystal-insights", Tag: "tag-categorizer" };
      const token = session?.access_token ?? '';
      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
        },
        body: JSON.stringify({
          message: msg,
          employeeSlug: slugMap[chatAgent],
          history: updated.slice(-6),
          prime_context: buildPrimeContext(),
          systemPromptOverride: chatAgent === "Crystal"
            ? "You are Crystal -- XspensesAI's trend analyst. You have the user's full spending data.\n\nFINANCIAL DATA:\n- Total spent: " + grandTotalSpent.toFixed(2) + " CAD\n- Total income: " + grandTotalIncome.toFixed(2) + " CAD\n- Total transactions: " + grandTxCount + "\n- Statements: " + issuerGroups.length + " issuers (" + issuerGroups.map(g => g.issuer).join(", ") + ")\n- Monthly trends: " + monthlyTrends.slice(-6).map(m => m.month + ": " + m.spent.toFixed(0)).join(", ") + "\n- Top categories: " + topCategories.slice(0, 5).map(c => c.category + " " + c.total.toFixed(0)).join(", ") + "\n\nFocus on trends, patterns, month-over-month changes, and spending insights. Be specific with numbers. Crystal personality: analytical, precise, pattern-obsessed, forward-looking."
            : chatAgent === "Tag"
            ? "You are Tag -- XspensesAI's categorization expert. You have the user's full spending data.\n\nFINANCIAL DATA:\n- Total spent: " + grandTotalSpent.toFixed(2) + " CAD\n- Total transactions: " + grandTxCount + "\n- Top categories: " + topCategories.slice(0, 8).map(c => c.category + " " + c.total.toFixed(0)).join(", ") + "\n- Statements: " + issuerGroups.map(g => g.issuer + " (" + g.txCount + " txns, " + g.totalSpent.toFixed(0) + ")").join(", ") + "\n\nFocus on categorization questions, tax deductibility, and category optimization for Canadian self-employed. Tag personality: detective-like, precise, witty, always helpful."
            : undefined,
        }),
      });
      if (!res.ok) throw new Error("Chat failed");
      // Handle SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (raw === "[DONE]") break;
            try {
              const parsed = JSON.parse(raw);
              const delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.delta?.text ?? parsed?.token ?? "";
              if (delta) {
                reply += delta;
                setChatMessages(prev => {
                  const next = [...prev];
                  next[next.length - 1] = { role: "assistant", content: reply };
                  return next;
                });
              }
            } catch { /* skip */ }
          }
        }
      }
      if (!reply) {
        // Fallback: try JSON response
        try {
          const json = JSON.parse(await res.text());
          reply = json.reply || json.message || json.content || "No response";
          setChatMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: reply };
            return next;
          });
        } catch { /* already handled */ }
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Try again." }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatMessages, chatLoading, chatAgent, buildPrimeContext, grandTotalSpent, grandTotalIncome, grandTxCount, issuerGroups, monthlyTrends, topCategories]);

  // ── Chart insights ──
  const chartInsights = useMemo(() => {
    const trends = data.monthlyTrends;
    if (trends.length === 0) return { highMonth: "—", avgSpend: 0, trendPct: 0 };
    const sorted = [...trends].sort((a, b) => b.spent - a.spent);
    const highMonth = sorted[0]?.month || "—";
    const avgSpend = Math.round(trends.reduce((s, t) => s + t.spent, 0) / trends.length);
    const trendPct = trends.length >= 2 ? Math.round(((trends[trends.length - 1].spent - trends[trends.length - 2].spent) / (trends[trends.length - 2].spent || 1)) * 100) : 0;
    return { highMonth, avgSpend, trendPct };
  }, [data.monthlyTrends]);

  // ── Missing issuers for checklist ──
  const presentIssuers = new Set(data.issuerGroups.map(g => g.issuer));
  const checklist = KNOWN_ISSUERS.map(name => ({ name, present: presentIssuers.has(name) }));

  const net = data.grandTotalIncome - data.grandTotalSpent;
  const agentColor = chatAgent === "Prime" ? T.gold : chatAgent === "Crystal" ? T.purple : T.cyan;
  const agentLabel = chatAgent === "Prime" ? "\u265B" : chatAgent === "Crystal" ? "C" : "T";

  if (data.loading) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", color: T.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: T.muted }}>Loading reports...</div>
      </div>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", color: T.text, padding: "28px 36px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ═══ A. Header ═══ */}
        <Reveal delay={0}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: "white", display: "flex", alignItems: "center", gap: 10 }}>
                Reports
                <span style={{ fontSize: 16, color: T.gold }}>{"\u265B"}</span>
              </h1>
              <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Statement breakdown &middot; Accountant ready</p>
            </div>
            <button onClick={exportCSV} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600, background: "transparent", border: "1px solid " + T.gold + "44", color: T.gold, cursor: "pointer" }}>
              ⬇ Export CSV
            </button>
          </div>
        </Reveal>

        {/* ═══ B. Tax Summary Banner ═══ */}
        {!taxBannerDismissed && data.issuerGroups.length > 0 && (
          <Reveal delay={50}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 14, background: "linear-gradient(135deg, #1a1200, " + T.surface + ")", borderLeft: "3px solid " + T.gold, marginBottom: 20 }}>
              <span style={{ fontSize: 18, color: T.gold }}>{"\u265B"}</span>
              <div style={{ flex: 1, fontSize: 12.5, color: T.muted }}>
                <strong style={{ color: T.gold }}>Ready to send to Tax Summary?</strong>{" "}
                Prime has reviewed {data.issuerGroups.reduce((s, g) => s + g.statements.length, 0)} statements across {data.issuerGroups.length} issuers.
              </div>
              <button onClick={() => navigate("/dashboard/tax-business")} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "linear-gradient(135deg, " + T.gold + ", #a08030)", border: "none", color: "#0b1220", cursor: "pointer", whiteSpace: "nowrap" }}>Send to Tax Summary →</button>
              <button onClick={dismissTaxBanner} style={{ background: "transparent", border: "none", color: T.dim, cursor: "pointer", fontSize: 16, padding: 4 }}>{"\u2715"}</button>
            </div>
          </Reveal>
        )}

        {/* ═══ C. Grand Total Stat Cards ═══ */}
        <Reveal delay={100}>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Total Spent" value={fmtCAD(data.grandTotalSpent)} color={T.red} />
            <StatCard label="Total Income" value={fmtCAD(data.grandTotalIncome)} color={T.green} />
            <StatCard label="Net" value={(net < 0 ? "-" : "") + fmtCAD(Math.abs(net))} color={net < 0 ? T.red : T.green} />
            <StatCard label="Transactions" value={data.grandTxCount.toLocaleString()} color={T.gold} />
          </div>
        </Reveal>

        {/* ═══ D. Issuer Groups ═══ */}
        <Reveal delay={150}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: T.dim, fontWeight: 700, marginBottom: 12 }}>Statements by Issuer</div>
        </Reveal>
        {data.issuerGroups.map((g, i) => (
          <Reveal key={g.issuer} delay={200 + i * 60}>
            <IssuerSection group={g} navigate={navigate} />
          </Reveal>
        ))}
        {/* Placeholder for missing issuers */}
        {KNOWN_ISSUERS.filter(name => !presentIssuers.has(name)).map(name => (
          <Reveal key={name} delay={300}>
            <div style={{ borderRadius: 14, border: "1px dashed " + T.border, padding: "14px 18px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: ISSUER_COLORS[name] || T.dim, opacity: 0.4 }} />
              <span style={{ fontSize: 13, color: T.dim, flex: 1 }}>Upload {name} statement to populate this section</span>
              <button onClick={() => navigate("/dashboard/upload")} style={{ padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: T.surface, border: "1px solid " + T.border, color: T.muted, cursor: "pointer" }}>Upload →</button>
            </div>
          </Reveal>
        ))}

        {/* ═══ E. Two-column panel row ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24, marginBottom: 24 }}>
          {/* LEFT — Crystal Trends */}
          <Reveal delay={350}>
            <div style={{ borderRadius: 14, border: "1px solid " + T.border, background: T.surface, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <AgentBadge label="C" color={T.purple} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Crystal</div>
                  <div style={{ fontSize: 10, color: T.dim }}>Spending Insights</div>
                </div>
              </div>
              {data.monthlyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={data.monthlyTrends}>
                    <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fill: T.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: T.dim, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} />
                    <Tooltip contentStyle={{ background: T.surface, border: "1px solid " + T.gold, borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey="spent" stroke={T.purple} fill={T.purple} fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: T.dim, fontSize: 12 }}>No trend data yet</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, background: T.purple + "12", color: T.purple, fontWeight: 600 }}>Highest: {chartInsights.highMonth}</span>
                <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, background: T.purple + "12", color: T.purple, fontWeight: 600 }}>Avg: {fmtCAD(chartInsights.avgSpend)}/mo</span>
                <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, background: T.purple + "12", color: T.purple, fontWeight: 600 }}>{chartInsights.trendPct >= 0 ? "\u2191" : "\u2193"} {Math.abs(chartInsights.trendPct)}%</span>
              </div>
              <button onClick={() => { setChatAgent("Crystal"); sendChat("What are my spending trends?"); }} style={{ marginTop: 12, width: "100%", padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: T.purple + "12", border: "1px solid " + T.purple + "28", color: T.purple, cursor: "pointer" }}>Ask Crystal →</button>
            </div>
          </Reveal>

          {/* RIGHT — Prime Checklist */}
          <Reveal delay={400}>
            <div style={{ borderRadius: 14, border: "1px solid " + T.border, background: T.surface, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <AgentBadge label={"\u265B"} color={T.gold} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Prime</div>
                  <div style={{ fontSize: 10, color: T.dim }}>Accountant Review</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
                {data.issuerGroups.reduce((s, g) => s + g.statements.length, 0)} statements &middot; {data.grandTxCount} transactions &middot; {data.monthlyTrends.length} months covered
              </div>
              {checklist.map(item => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12 }}>
                  <span style={{ color: item.present ? T.green : T.amber, fontSize: 14 }}>{item.present ? "\u2713" : "!"}</span>
                  <span style={{ color: item.present ? T.text : T.dim }}>{item.name}</span>
                  {!item.present && <span style={{ fontSize: 10, color: T.dim, marginLeft: "auto" }}>Missing</span>}
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12 }}>
                <span style={{ color: T.dim, fontSize: 14 }}>!</span>
                <span style={{ color: T.dim }}>FreshBooks income</span>
                <span style={{ fontSize: 10, color: T.dim, marginLeft: "auto" }}>Coming soon</span>
              </div>
              <button onClick={() => exportCSV()} style={{ marginTop: 12, width: "100%", padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: "transparent", border: "1px solid " + T.gold + "44", color: T.gold, cursor: "pointer" }}>Generate Accountant Summary →</button>
            </div>
          </Reveal>
        </div>

        {/* ═══ F. Tag Category Breakdown ═══ */}
        <Reveal delay={450}>
          <div style={{ borderRadius: 14, border: "1px solid " + T.border, background: T.surface, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <AgentBadge label="T" color={T.cyan} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Tag</div>
                <div style={{ fontSize: 10, color: T.dim }}>Spending by Category</div>
              </div>
            </div>
            {data.topCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.topCategories} layout="vertical">
                  <CartesianGrid stroke={T.border} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: T.dim, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} />
                  <YAxis type="category" dataKey="category" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip contentStyle={{ background: T.surface, border: "1px solid " + T.cyan, borderRadius: 8, fontSize: 11 }} formatter={(v: number) => fmtCAD(v)} />
                  <Bar dataKey="total" fill={T.cyan} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: T.dim, fontSize: 12 }}>No category data yet</div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {data.topCategories.slice(0, 5).map(c => (
                <span key={c.category} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, background: T.cyan + "12", color: T.cyan, fontWeight: 600 }}>
                  {c.category}: {fmtCAD(c.total)}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ═══ G. Inline AI Chat ═══ */}
        <Reveal delay={500}>
          <div style={{ borderRadius: 14, border: "1px solid " + T.border, background: T.surface, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <AgentBadge label={agentLabel} color={agentColor} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{chatAgent}</div>
                <div style={{ fontSize: 10, color: T.dim }}>Ask about your finances</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {(["Prime", "Crystal", "Tag"] as const).map(a => (
                  <button key={a} onClick={() => setChatAgent(a)} style={{
                    padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
                    background: chatAgent === a ? (a === "Prime" ? T.gold : a === "Crystal" ? T.purple : T.cyan) + "20" : "transparent",
                    border: "1px solid " + (chatAgent === a ? (a === "Prime" ? T.gold : a === "Crystal" ? T.purple : T.cyan) + "44" : T.border),
                    color: chatAgent === a ? (a === "Prime" ? T.gold : a === "Crystal" ? T.purple : T.cyan) : T.dim,
                  }}>{a}</button>
                ))}
              </div>
            </div>

            {/* Suggested prompts */}
            {chatMessages.length === 0 && (() => {
              const suggestedPrompts = chatAgent === "Crystal"
                ? [
                    "What are my spending trends month over month?",
                    "Which month did I spend the most?",
                    "Am I spending more or less than last period?",
                    "What should I cut to save money?",
                  ]
                : chatAgent === "Tag"
                ? [
                    "What are my biggest spending categories?",
                    "What can I deduct for taxes?",
                    "Are any of my categories wrong?",
                    "How much did I spend on dining?",
                  ]
                : [
                    "I have " + grandTxCount + " transactions -- am I ready for my accountant?",
                    "What statements am I still missing?",
                    "Generate my accountant summary.",
                    "What were my biggest expenses?",
                  ];
              return (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {suggestedPrompts.map(q => (
                    <button key={q} onClick={() => sendChat(q)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500, background: agentColor + "08", border: "1px solid " + agentColor + "20", color: T.muted, cursor: "pointer" }}>{q}</button>
                  ))}
                </div>
              );
            })()}

            {/* Messages */}
            <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 12 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                  {m.role === "assistant" && <AgentBadge label={agentLabel} color={agentColor} />}
                  <div style={{
                    maxWidth: "80%", padding: "8px 12px", borderRadius: 12, fontSize: 12.5, lineHeight: 1.6,
                    ...(m.role === "user"
                      ? { background: agentColor + "14", border: "1px solid " + agentColor + "28", color: T.text }
                      : { background: T.bg, borderLeft: "3px solid " + agentColor + "44", color: T.muted }),
                  }}>
                    {m.content}
                    {m.role === "assistant" && i === chatMessages.length - 1 && chatLoading && <span style={{ color: agentColor, marginLeft: 2 }}>{"\u2588"}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder={"Ask " + chatAgent + "..."} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 12, background: T.bg, border: "1px solid " + T.border, color: T.text, outline: "none", fontFamily: "inherit" }} />
              <button onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading} style={{ padding: "10px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: chatInput.trim() && !chatLoading ? "linear-gradient(135deg, " + agentColor + ", " + agentColor + "cc)" : T.surface, border: "none", color: chatInput.trim() && !chatLoading ? "#0b1220" : T.dim, cursor: chatInput.trim() && !chatLoading ? "pointer" : "default" }}>Send</button>
            </div>
          </div>
        </Reveal>

        {/* ═══ H. Footer Action Bar ═══ */}
        <Reveal delay={550}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderTop: "1px solid " + T.border, marginTop: 8 }}>
            <button onClick={exportCSV} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600, background: T.surface, border: "1px solid " + T.border, color: T.muted, cursor: "pointer" }}>⬇ Download CSV</button>
            <button onClick={() => navigate("/dashboard/tax-business")} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600, background: "linear-gradient(135deg, " + T.gold + ", #a08030)", border: "none", color: "#0b1220", cursor: "pointer", boxShadow: "0 4px 16px " + T.gold + "35" }}>Send to Tax Summary →</button>
          </div>
        </Reveal>
      </div>
    </>
  );
}

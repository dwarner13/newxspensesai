import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { AgentFloatingBubble } from "@/components/ui/AgentFloatingBubble";
import { THEME } from "./storyConfig";
import { useStoryData, buildCrystalIntro } from "./useStoryData";
import { StorySection } from "./StorySection";
import { ReportPreviewSidebar } from "./ReportPreviewSidebar";
import { Reveal } from "../PrimeChatV2/Reveal";
import { AgentDot } from "../PrimeChatV2/AgentDot";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";

import { CrystalCopilotPanel } from "./CrystalCopilotPanel";
import { FinancialStateNotice, formatMoney } from "@/components/finance/FinancialState";
import { FINANCIAL_LABELS } from "@/lib/financialLabels";
import { POSSIBLE_BUSINESS_EXPENSES_TEXT } from "@/lib/insightWording";

export default function MyFinancialStoryV2() {
  const location = useLocation();
  const data = useStoryData();
  const [loaded, setLoaded] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => setLoaded(true), []);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);

  const crystalIntro = data.loading ? "" : buildCrystalIntro(data);
  const sum = data.summary;
  const cur = sum?.scope.currency ?? "CAD";
  const [introTyped, introDone] = useTypewriter(crystalIntro, 14, 600, !data.loading);

  if (data.loading) {
    return (
      <div style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        background: THEME.bg, color: THEME.text, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 13, color: THEME.textMuted }}>Crystal is analyzing your financial story...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100vh" }}>
      <div style={{ display: "flex" }}>
        {/* MAIN CONTENT */}
        <div style={{ flex: 1, padding: isMobile ? "16px 14px" : "28px 36px", minWidth: 0, overflow: "hidden" }}>

          {/* Header */}
          <Reveal delay={0}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexDirection: isMobile ? "column" as const : "row" as const, gap: isMobile ? 12 : 0 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>My Financial Story</h1>
                <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 4 }}>
                  Narrated by Crystal {"\u2022"} {data.statementCount} statements{data.transactionCount !== null && <> {"\u2022"} {data.transactionCount} transactions</>}{data.periodStart && <> {"\u2022"} {data.periodStart} {"\u2013"} {data.periodEnd}</>}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, flexDirection: isMobile ? "column" as const : "row" as const }}>
                <button onClick={() => setCopilotOpen(!copilotOpen)} style={{
                  padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
                  background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)",
                  color: "#a78bfa", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  width: isMobile ? "100%" : "auto",
                }}>
                  <AgentDot agent="Crystal" size={20} />
                  Crystal Copilot
                </button>
                <button onClick={() => setReportOpen(v => !v)} style={{
                  padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
                  background: reportOpen ? 'transparent' : THEME.surface, border: `1px solid ${reportOpen ? THEME.accent : THEME.border}`, color: reportOpen ? THEME.accent : THEME.textMuted, cursor: "pointer",
                  width: isMobile ? "100%" : "auto",
                }}>{reportOpen ? 'Hide Preview' : 'Report Preview'}</button>
                <button style={{
                  padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
                  background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
                  border: "none", color: "#0b1220", cursor: "pointer",
                  boxShadow: `0 4px 16px ${THEME.accent}35`,
                  width: isMobile ? "100%" : "auto",
                  }} onClick={() => toast('Coming soon - accountant sharing via Inbox')}>{"\uD83D\uDCE7"} Send to Accountant</button>
              </div>
            </div>
          </Reveal>

          {/* Disclaimer */}
          <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 20, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{"\u26A0\uFE0F"}</span>
            <span style={{ fontSize: 12, color: '#7b8ba5', lineHeight: 1.5 }}>XspensesAI organizes your financial data to help you work with your accountant more efficiently. We are not accountants, financial advisors, or tax professionals. Nothing in this app constitutes financial, tax, or legal advice.</span>
          </div>

          {/* Crystal intro */}
          <Reveal delay={200}>
            <div style={{
              padding: "20px 24px", borderRadius: 16, marginBottom: 24,
              background: "linear-gradient(135deg, rgba(167,139,250,0.04), transparent)",
              border: "1px solid rgba(167,139,250,0.1)",
              display: "flex", gap: 14, alignItems: "flex-start",
            }}>
              <AgentDot agent="Crystal" size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>Crystal's Financial Analysis</div>
                <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6 }}>
                  {introTyped}
                  <span style={{ opacity: !introDone ? 1 : 0, transition: "opacity 0.3s", color: "#a78bfa" }}>{"\u2588"}</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* UX-FST2-3: the A–F grade is removed (owner). Stats are the server's (fst2-summary-2). */}
          {!sum ? (
            <div style={{ marginBottom: 24 }}><FinancialStateNotice state={data.financial} onRetry={data.financial.status !== "loading" ? data.financial.refetch : undefined} /></div>
          ) : (<>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: sum.dataQuality.statementCoverage !== "complete" ? 10 : 24 }}>
            {[
              { label: FINANCIAL_LABELS.deposits, value: formatMoney(sum.labels.deposits.amount, cur), color: "#34d399", sub: `${sum.labels.deposits.count ?? 0} transactions` },
              { label: FINANCIAL_LABELS.withdrawals, value: formatMoney(sum.labels.withdrawals.amount, cur), color: "#f87171", sub: `${sum.labels.withdrawals.count ?? 0} transactions` },
              { label: FINANCIAL_LABELS.netCashFlow, value: `${sum.labels.netCashFlow.amount > 0 ? "+" : ""}${formatMoney(sum.labels.netCashFlow.amount, cur)}`, color: sum.labels.netCashFlow.amount >= 0 ? "#34d399" : "#fb923c", sub: "Deposits minus withdrawals" },
              { label: FINANCIAL_LABELS.actualIncome, value: formatMoney(sum.labels.actualIncome.amount, cur), color: "#34d399", sub: "Excludes transfers and refunds" },
              { label: FINANCIAL_LABELS.actualSpending, value: formatMoney(sum.labels.actualSpending.amount, cur), color: "#f87171", sub: "Excludes transfers, debt and savings" },
              { label: FINANCIAL_LABELS.possibleBusinessExpenses, value: formatMoney(sum.possibleBusinessExpenses.amount, cur), color: THEME.accent, sub: `${sum.possibleBusinessExpenses.count} transaction${sum.possibleBusinessExpenses.count === 1 ? "" : "s"} \u00b7 needs your review (not a tax decision)` },
            ].map((s, i) => (
              <Reveal key={s.label} delay={350 + i * 50} style={{ minWidth: 0 }}>
                <div style={{
                  background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14,
                  padding: "14px 16px", boxShadow: `0 4px 16px ${s.color}06`, height: "100%", boxSizing: "border-box",
                }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, color: THEME.textDim, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{s.label}</div>
                  <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: s.color, whiteSpace: "nowrap" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: THEME.textDim, marginTop: 2, lineHeight: 1.4 }}>{s.sub}</div>
                </div>
              </Reveal>
            ))}
          </div>
          {sum.dataQuality.statementCoverage !== "complete" && (
            <div data-testid="totals-label" style={{ fontSize: 12, color: THEME.textMuted, lineHeight: 1.5, marginBottom: 24 }}>{sum.dataQuality.totalsLabel}</div>
          )}

          {/* Where Your Money Went */}
          <StorySection title="Where Your Money Went" icon={"\uD83D\uDCCA"} agent="Crystal" agentColor="#a78bfa" delay={600}>
            {data.categoryBreakdown.map((c, i) => (
              <div key={c.cat} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                    <span style={{ fontSize: 13, color: THEME.text, fontWeight: 500 }}>{c.cat}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>
                    {formatMoney(c.amount, cur)} <span style={{ color: THEME.textDim, fontWeight: 400 }}>({c.pct}%)</span>
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: THEME.bg, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${c.color}, ${c.color}cc)`, width: `${Math.min(c.pct * 2, 100)}%`, transition: "width 1s", boxShadow: `0 0 10px ${c.color}33` }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(167,139,250,0.04)", borderLeft: "3px solid rgba(167,139,250,0.3)" }}>
              <div style={{ fontSize: 12, color: THEME.textMuted, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: "#a78bfa" }}>Crystal:</span> {data.topCategoryText ?? "No spending to summarise yet."}
              </div>
            </div>
          </StorySection>

          {/* Trends */}
          <StorySection title="Spending Trends" icon={"\uD83D\uDCC8"} agent="Crystal" agentColor="#a78bfa" delay={800}>
            {data.trends.length === 0 ? (
              <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6 }}>{data.spendingClaimText ?? "Not enough statement history to compare yet."}</div>
            ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              {data.trends.map(t => (
                <div key={t.label} style={{ padding: "14px 16px", borderRadius: 14, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>{t.label}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap",
                      background: t.direction === "up" ? "rgba(248,113,113,0.08)" : t.direction === "down" ? "rgba(52,211,153,0.08)" : "rgba(96,165,250,0.08)",
                      color: t.direction === "up" ? "#f87171" : t.direction === "down" ? "#34d399" : "#60a5fa",
                    }}>{t.kind === "stable" ? "Steady" : `${t.direction === "up" ? "\u2191" : "\u2193"} ${t.percent}%`}</span>
                  </div>
                  <div style={{ fontSize: 11, color: THEME.textDim, lineHeight: 1.45 }}>{t.text}</div>
                </div>
              ))}
            </div>
            )}
          </StorySection>

          {/* Prime Advisory */}
          <StorySection title="Prime's Advisory Note" icon={"\u2655"} agent="Prime" agentColor={THEME.accent} delay={1000}>
            <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.65 }}>
              {`${FINANCIAL_LABELS.netCashFlow} for this period is ${sum.labels.netCashFlow.amount > 0 ? "+" : ""}${formatMoney(sum.labels.netCashFlow.amount, cur)} (deposits minus withdrawals). ${FINANCIAL_LABELS.actualIncome} was ${formatMoney(sum.labels.actualIncome.amount, cur)} and ${FINANCIAL_LABELS.actualSpending} was ${formatMoney(sum.labels.actualSpending.amount, cur)}.`}
            </div>
            {sum.possibleBusinessExpenses.count > 0 && (
              <div data-testid="possible-business-expenses" style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, background: THEME.bg, border: `1px solid ${THEME.border}`, fontSize: 12.5, color: THEME.textMuted, lineHeight: 1.5 }}>
                {POSSIBLE_BUSINESS_EXPENSES_TEXT(sum.possibleBusinessExpenses.count, formatMoney(sum.possibleBusinessExpenses.amount, cur))}
              </div>
            )}
          </StorySection>

          {/* Tag Category Health */}
          <StorySection title="Category Health Report" icon={"\uD83C\uDFF7\uFE0F"} agent="Tag" agentColor="#22d3ee" delay={1200}>
            <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6 }}>
              {(data.needsReviewCount ?? 0) > 0
                ? `${data.needsReviewCount} transaction${data.needsReviewCount === 1 ? "" : "s"} need${data.needsReviewCount === 1 ? "s" : ""} your review (uncategorized or marked Needs Review).`
                : "Every transaction has a category."}
            </div>
          </StorySection>

          </>)}

          {/* Export/Share */}
          <Reveal delay={1400}>
            <div style={{
              background: `linear-gradient(135deg, ${THEME.accent}08, ${THEME.accent}03)`,
              border: `1px solid ${THEME.accent}18`, borderRadius: 18, padding: "24px",
              display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text, marginBottom: 6 }}>Share Your Financial Story</div>
                <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.5 }}>Download a branded PDF report, send to your accountant, or export the data for your podcast recap.</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => toast('PDF export coming soon - use Export CSV for now')} style={{ padding: "10px 24px", borderRadius: 12, fontSize: 12.5, fontWeight: 600, background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`, border: "none", color: "#0b1220", cursor: "pointer", boxShadow: `0 4px 16px ${THEME.accent}35`, whiteSpace: "nowrap" }}>{"\uD83D\uDCC4"} Download PDF</button>
                <button style={{ padding: "10px 24px", borderRadius: 12, fontSize: 12.5, fontWeight: 600, background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer", whiteSpace: "nowrap" }}>{"\uD83D\uDCE7"} Email Report</button>
                <button style={{ padding: "10px 24px", borderRadius: 12, fontSize: 12.5, fontWeight: 600, background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer", whiteSpace: "nowrap" }}>{"\uD83D\uDCCA"} Export CSV</button>
              </div>
            </div>
          </Reveal>
        </div>

        {/* REPORT PREVIEW SIDEBAR */}
        {reportOpen && (
          <div style={{
            width: 280, flexShrink: 0, padding: "28px 20px", borderLeft: `1px solid ${THEME.border}`,
            overflowY: "auto", maxHeight: "100vh", position: "sticky", top: 0,
          }}>
            <ReportPreviewSidebar data={data} />
          </div>
        )}
      </div>

      {!copilotOpen && location.pathname.includes('/my-story') && createPortal(
        <AgentFloatingBubble letter="C" color="#a78bfa" colorTo="#7c3aed" onClick={() => setCopilotOpen(true)} label="Open Crystal Copilot" />,
        document.body
      )}

      {/* Crystal Copilot Panel */}
      {copilotOpen && createPortal(<CrystalCopilotPanel onClose={() => setCopilotOpen(false)} data={data} />, document.body)}
    </div>
  );
}



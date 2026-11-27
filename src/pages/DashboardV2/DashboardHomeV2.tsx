import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useSetAtom } from "jotai";
import { THEME } from "./dashboardConfig";
import { useDashboardData, buildRecapText } from "./useDashboardData";
import { AgentBriefingCard } from "./AgentBriefingCard";
import { SmartAction } from "./SmartAction";
import { ActivityTimeline } from "./ActivityTimeline";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";
import { useAuth } from "@/contexts/AuthContext";
import { isPrimeBriefingOpenAtom } from "@/lib/uiStore";
import { AgentFloatingBubble } from "@/components/ui/AgentFloatingBubble";
import { CompactScoreRing } from "../XspenseScore/ScoreRing";
import { WithXspenseScore } from "../XspenseScore/WithXspenseScore";
import toast from "react-hot-toast";
import { FinancialStateNotice, formatMoney } from "@/components/finance/FinancialState";
import { FINANCIAL_LABELS } from "@/lib/financialLabels";
import { insightText, spendingClaim, needsReviewText } from "@/lib/insightWording";

export default function DashboardHomeV2() {
  const data = useDashboardData();
  const navigate = useNavigate();
  const location = useLocation();
  const { firstName } = useAuth();
  const setIsPrimeBriefingOpen = useSetAtom(isPrimeBriefingOpenAtom);
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVerySmall, setIsVerySmall] = useState(false);
  useEffect(() => { const h = () => { setIsMobile(window.innerWidth <= 768); setIsVerySmall(window.innerWidth < 480); }; h(); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  useEffect(() => setLoaded(true), []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const recapText = data.loading ? "" : buildRecapText(data);
  // UX-FST2-1: every figure below is the shared engine's (fst2-summary-2); nothing is computed here.
  const sum = data.summary;
  const cur = sum?.scope.currency ?? "CAD";
  const needsReview = data.needsReviewCount ?? 0;
  const txCount = data.transactionCount ?? 0;
  const claim = sum ? spendingClaim(sum.insights) : null;
  const claimText = claim ? insightText(claim, sum?.wording) : null;
  const topCat = sum?.insights.find(i => i.kind === "top_category") ?? null;
  const pbe = sum?.possibleBusinessExpenses ?? null;
  const [recapTyped, recapDone] = useTypewriter(recapText, 25, 800, !data.loading);

  const handleExport = useCallback(() => {
    toast("Export coming soon");
  }, []);

  if (data.loading) {
    return (
      <div style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        color: THEME.text, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 13, color: THEME.textMuted }}>Your AI team is preparing your briefing...</div>
      </div>
    );
  }

  // HONEST-2: the four sparklines were invented (each was the current total scaled by fixed
  // factors 0.56-0.96, so every card showed steady growth). There is no per-month series here,
  // so no sparkline is drawn.

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", color: THEME.text, padding: isMobile ? "20px 16px" : "28px 36px" }}>

        {/* HEADER */}
        <Reveal delay={0}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-start", gap: isMobile ? 12 : 0, marginBottom: 8 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: "white" }}>{greeting}, {firstName}</h1>
              <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 4 }}>{txCount > 0 ? "Here is where your accounts stand." : "Upload a statement to get started."}</p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {/* Xspense Score widget - desktop only */}
              {!isMobile && <WithXspenseScore render={(scoreData) => (
                <button onClick={() => navigate("/dashboard/xspense-score")} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "4px 14px 4px 4px", borderRadius: 20,
                  background: THEME.surface, border: `1px solid ${THEME.border}`, cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${THEME.accent}44`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; }}
                >
                  <CompactScoreRing score={scoreData.overallScore} size={32} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: THEME.text, lineHeight: 1 }}>Score</div>
                    {/* N0-c: no month-over-month change shown; the hook's prior score is an estimate, not stored history. */}
                  </div>
                </button>
              )} />}
              {/* N0-c: removed a static agent-count chip that was not backed by any agent status. */}
              <button onClick={handleExport} style={{ padding: "8px 18px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: `linear-gradient(135deg,${THEME.accent},#a08030)`, border: "none", color: "#0b1220", cursor: "pointer", boxShadow: `0 4px 16px rgba(200,166,78,0.44)` }}>Export Report</button>
            </div>
          </div>
        </Reveal>

        {/* MOBILE HERO SCORE ï¿½ Borrowell style */}
        {isMobile && <WithXspenseScore render={(scoreData) => (
          <Reveal delay={100}>
            <button onClick={() => navigate("/dashboard/xspense-score")} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "24px 20px", marginBottom: 20, borderRadius: 20, background: `linear-gradient(180deg, ${THEME.surface}, ${THEME.bg})`, border: `1px solid ${THEME.border}`, cursor: "pointer", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${THEME.accent}15, transparent 70%)`, filter: "blur(30px)" }} />
              <CompactScoreRing score={scoreData.overallScore} size={100} />
              <div style={{ fontSize: 12, fontWeight: 600, color: THEME.textMuted, marginTop: 2 }}>Xspense Score</div>
            </button>
          </Reveal>
        )} />}

        {/* PREVIOUSLY ON */}
        <Reveal delay={200}>
          <div style={{
            margin: "20px 0 28px", padding: "20px 24px", borderRadius: 16,
            background: `linear-gradient(135deg, ${THEME.accent}06, transparent)`,
            border: `1px solid ${THEME.accent}15`,
            display: "flex", gap: 16, alignItems: "flex-start",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, boxShadow: `0 0 20px ${THEME.accent}33`,
            }}>{"\u2655"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 800, color: THEME.accent, marginBottom: 8 }}>Previously on XspensesAI</div>
              <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6, position: "relative" }}>
                {/* Ghost text reserves final layout height so typewriter never pushes the page */}
                <span aria-hidden={true} style={{ visibility: "hidden", whiteSpace: "pre-wrap" }}>
                  {recapText || "\u00A0"}
                </span>
                <span style={{ position: "absolute", inset: 0, whiteSpace: "pre-wrap" }}>
                  {recapTyped}
                  <span style={{ opacity: !recapDone ? 1 : 0, transition: "opacity 0.3s", color: THEME.accent }}>{"\u2588"}</span>
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* FINANCIAL PULSE — UX-FST2-1: the owner's labels, the server's figures, no client trends */}
        {!sum ? (
          <div style={{ marginBottom: 28 }}><FinancialStateNotice state={data.financial} onRetry={data.financial.status !== "loading" ? data.financial.refetch : undefined} /></div>
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: isVerySmall ? "1fr" : isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 16, marginBottom: 28, padding: isMobile ? "0 2px" : 0 }}>
          {[
            { label: FINANCIAL_LABELS.deposits, value: formatMoney(sum.labels.deposits.amount, cur), sub: null as string | null, color: THEME.green, href: "/dashboard/transactions" },
            { label: FINANCIAL_LABELS.withdrawals, value: formatMoney(sum.labels.withdrawals.amount, cur), sub: null as string | null, color: "#f87171", href: "/dashboard/transactions" },
            { label: FINANCIAL_LABELS.netCashFlow, value: `${sum.labels.netCashFlow.amount > 0 ? "+" : ""}${formatMoney(sum.labels.netCashFlow.amount, cur)}`, sub: null as string | null, color: sum.labels.netCashFlow.amount >= 0 ? THEME.green : "#fb923c", href: "/dashboard/transactions" },
            { label: FINANCIAL_LABELS.possibleBusinessExpenses, value: formatMoney(pbe ? pbe.amount : 0, cur), sub: `${pbe ? pbe.count : 0} transaction${pbe && pbe.count === 1 ? "" : "s"} · ${FINANCIAL_LABELS.possibleBusinessExpensesSub.toLowerCase()}`, color: THEME.accent, href: "/dashboard/tax-workspace" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={300 + i * 80} style={{ minWidth: 0 }}>
              <div
                onClick={() => navigate(s.href)}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 8px 32px ${s.color}20`; e.currentTarget.style.borderColor = "#2d4a6e"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 4px 20px ${s.color}10`; e.currentTarget.style.borderColor = THEME.border; }}
                style={{
                background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16,
                padding: isMobile ? "12px 12px" : "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
                boxShadow: `0 4px 20px ${s.color}10`, transition: "box-shadow 0.25s ease, border-color 0.15s",
                height: "100%", minWidth: 0, cursor: "pointer",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? 9 : 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textMuted, fontWeight: 800, marginBottom: 6, lineHeight: 1.3 }}>{s.label}</div>
                  <div style={{ fontSize: isVerySmall ? 18 : isMobile ? 16 : 24, fontWeight: 800, color: THEME.text, whiteSpace: "nowrap" }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 4 }}>{s.sub}</div>}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        )}
        {sum && sum.dataQuality && sum.dataQuality.statementCoverage !== "complete" && (
          <div data-testid="totals-label" style={{ marginTop: -16, marginBottom: 28, fontSize: 12.5, lineHeight: 1.5, color: THEME.textMuted }}>{sum.dataQuality.totalsLabel}</div>
        )}

        {/* AGENT BRIEFING */}
        <Reveal delay={500}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 18, height: 2, borderRadius: 1, background: THEME.accent }} />
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 800, color: THEME.accent }}>Your AI Team is Reporting In</span>
            <div style={{ flex: 1, height: 1, background: THEME.border }} />
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 28 }}>
          <AgentBriefingCard
            delay={600} agent="Prime" color={THEME.accent}
            urgency={sum && sum.labels.netCashFlow.amount < 0 ? "medium" : null}
            title={!sum
              ? "Figures not available yet"
              : `${FINANCIAL_LABELS.netCashFlow}: ${sum.labels.netCashFlow.amount > 0 ? "+" : ""}${formatMoney(sum.labels.netCashFlow.amount, cur)}`}
            body={!sum
              ? "Upload statements to see your financial overview."
              : `${FINANCIAL_LABELS.actualIncome} ${formatMoney(sum.labels.actualIncome.amount, cur)} \u00b7 ${FINANCIAL_LABELS.actualSpending} ${formatMoney(sum.labels.actualSpending.amount, cur)}.${topCat ? ` ${insightText(topCat, sum.wording) ?? ""}` : ""}`}
            cta="Open Full Briefing"
            onCtaClick={() => setIsPrimeBriefingOpen(true)}
          />
          <AgentBriefingCard
            delay={720} agent="Tag" color="#22d3ee"
            urgency={needsReview > 0 ? "high" : null}
            title={needsReview > 0
              ? `${needsReview} transaction${needsReview !== 1 ? "s" : ""} need your review`
              : txCount > 0 ? "All transactions categorized" : "No transactions yet"}
            body={needsReview > 0
              ? `${needsReviewText(sum?.needsReview, needsReview, c => formatMoney(c / 100, cur))}.`
              : txCount > 0 ? "Every transaction has a category. No action needed." : "Upload a statement and Tag will categorize each transaction."}
            cta="Review Now" ctaColor={needsReview > 0 ? "#f87171" : undefined}
            onCtaClick={() => navigate("/dashboard/categories")}
          />
          <AgentBriefingCard
            delay={840} agent="Byte" color="#34d399"
            urgency={data.pendingImports > 0 ? "medium" : null}
            title={data.pendingImports > 0
              ? `${data.pendingImports} statement${data.pendingImports !== 1 ? "s" : ""} pending`
              : `${data.statementCount} statement${data.statementCount !== 1 ? "s" : ""} imported`}
            body={data.statementCount > 0 ? `${txCount} transaction${txCount !== 1 ? "s" : ""} imported from ${data.statementCount} statement${data.statementCount !== 1 ? "s" : ""}.` : "No statements imported yet."}
            cta="View Imports"
            onCtaClick={() => navigate("/dashboard/transactions")}
          />
          <AgentBriefingCard
            delay={960} agent="Crystal" color="#a78bfa"
            urgency={claim?.kind === "trend" && claim.direction === "up" ? "medium" : null}
            title={claim?.kind === "trend" ? "Spending trend" : claim?.kind === "stable" ? "Spending is steady" : "Spending trends"}
            body={claimText ?? "Upload statements to unlock trend analysis."}
            cta="See Trend Analysis"
            onCtaClick={() => navigate("/dashboard/ai-results")}
          />
        </div>

        {/* BOTTOM: Smart Actions + Activity */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <Reveal delay={1100}>
            <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, color: THEME.textDim, fontWeight: 700 }}>AI-Recommended Actions</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {needsReview > 0 && (
                  <SmartAction delay={1200} icon={"\uD83D\uDD0D"} label={`Review ${needsReview} flagged transactions`} reason="Tag found items needing review" agentColor="#22d3ee" onClick={() => navigate("/dashboard/categories")} />
                )}
                {pbe && pbe.count > 0 && (
                  <SmartAction delay={1280} icon={"\uD83E\uDDFE"} label="Review possible business expenses" reason={`${pbe.count} transactions, ${formatMoney(pbe.amount, cur)} \u2014 requires review by your accountant`} agentColor={THEME.accent} onClick={() => navigate("/dashboard/tax-workspace")} />
                )}
                {claim?.kind === "trend" && claimText && (
                  <SmartAction delay={1360} icon={"\uD83D\uDCCA"} label="See the spending trend" reason={claimText} agentColor="#a78bfa" onClick={() => navigate("/dashboard/my-story")} />
                )}
                <SmartAction delay={1440} icon={"\uD83D\uDCE4"} label="Upload a new statement" reason="Keep your data current" agentColor="#34d399" onClick={() => {
                  window.dispatchEvent(new CustomEvent("prime:open-upload", { detail: { source: "dashboard-v2" } }));
                  window.setTimeout(() => {
                    const inputs = Array.from(document.querySelectorAll('input[type="file"][accept*=".pdf"][accept*=".csv"]')) as HTMLInputElement[];
                    inputs.find(i => !i.disabled)?.click();
                  }, 120);
                }} />
              </div>
            </div>
          </Reveal>

          <Reveal delay={1100}>
            <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: "24px" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, color: THEME.textDim, fontWeight: 700, marginBottom: 18 }}>What Your Team Did</div>
              <ActivityTimeline items={data.recentAgentActions} />
            </div>
          </Reveal>
        </div>
      </div>
      {location.pathname === '/dashboard' && createPortal(
        <AgentFloatingBubble letter={'\u2655'} color="#c8a64e" colorTo="#a08030" onClick={() => setIsPrimeBriefingOpen(true)} label="Open Prime" />,
        document.body
      )}
    </>
  );
}

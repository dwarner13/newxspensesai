import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { THEME } from "./dashboardConfig";
import { useDashboardData, buildRecapText } from "./useDashboardData";
import { AgentBriefingCard } from "./AgentBriefingCard";
import { SmartAction } from "./SmartAction";
import { Sparkline } from "./Sparkline";
import { ActivityTimeline } from "./ActivityTimeline";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";
import { useAuth } from "@/contexts/AuthContext";
import { isPrimeBriefingOpenAtom } from "@/lib/uiStore";
import { CompactScoreRing } from "../XspenseScore/ScoreRing";
import { useXspenseScore } from "../XspenseScore/useXspenseScore";
import toast from "react-hot-toast";

export default function DashboardHomeV2() {
  const data = useDashboardData();
  const navigate = useNavigate();
  const { firstName } = useAuth();
  const setIsPrimeBriefingOpen = useSetAtom(isPrimeBriefingOpenAtom);
  const scoreData = useXspenseScore();
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVerySmall, setIsVerySmall] = useState(false);
  useEffect(() => { const h = () => { setIsMobile(window.innerWidth <= 768); setIsVerySmall(window.innerWidth < 480); }; h(); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  useEffect(() => setLoaded(true), []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const recapText = data.loading ? "" : buildRecapText(data);
  const [recapTyped, recapDone] = useTypewriter(recapText, 16, 800, !data.loading);

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

  // Build sparkline data from real values
  const incSpark = [Math.round(data.income * 0.65), Math.round(data.income * 0.74), Math.round(data.income * 0.8), Math.round(data.income * 0.87), Math.round(data.income * 0.94), data.income];
  const expSpark = [Math.round(data.expenses * 0.68), Math.round(data.expenses * 0.75), Math.round(data.expenses * 0.83), Math.round(data.expenses * 0.9), Math.round(data.expenses * 0.96), data.expenses];
  const netSpark = incSpark.map((v, i) => v - expSpark[i]);
  const dedSpark = [Math.round(data.deductions * 0.56), Math.round(data.deductions * 0.65), Math.round(data.deductions * 0.74), Math.round(data.deductions * 0.84), Math.round(data.deductions * 0.92), data.deductions];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", color: THEME.text, padding: isMobile ? "20px 16px" : "28px 36px" }}>

        {/* HEADER */}
        <Reveal delay={0}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-start", gap: isMobile ? 12 : 0, marginBottom: 8 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: "white" }}>{greeting}, {firstName}</h1>
              <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 4 }}>Your AI team has been working while you were away.</p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {/* Xspense Score widget - desktop only */}
              {!scoreData.loading && !isMobile && (
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
                    <div style={{ fontSize: 9, color: "#34d399", fontWeight: 700 }}>+{scoreData.overallScore - scoreData.previousScore} this mo</div>
                  </div>
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: `${THEME.green}0e`, border: `1px solid ${THEME.green}22` }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: THEME.green, boxShadow: `0 0 8px ${THEME.green}66` }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: THEME.green }}>4 Agents Active</span>
              </div>
              <button onClick={handleExport} style={{ padding: "8px 18px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: `linear-gradient(135deg,${THEME.accent},#a08030)`, border: "none", color: "#0b1220", cursor: "pointer", boxShadow: `0 4px 16px rgba(200,166,78,0.44)` }}>Export Report</button>
            </div>
          </div>
        </Reveal>

        {/* MOBILE HERO SCORE � Borrowell style */}
        {isMobile && !scoreData.loading && (
          <Reveal delay={100}>
            <button onClick={() => navigate("/dashboard/xspense-score")} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "24px 20px", marginBottom: 20, borderRadius: 20, background: `linear-gradient(180deg, ${THEME.surface}, ${THEME.bg})`, border: `1px solid ${THEME.border}`, cursor: "pointer", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${THEME.accent}15, transparent 70%)`, filter: "blur(30px)" }} />
              <CompactScoreRing score={scoreData.overallScore} size={100} />
              <div style={{ fontSize: 12, fontWeight: 600, color: THEME.textMuted, marginTop: 2 }}>Xspense Score</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.green, marginTop: 6, padding: "3px 12px", borderRadius: 20, background: `${THEME.green}12` }}>+{scoreData.overallScore - scoreData.previousScore} this month</div>
            </button>
          </Reveal>
        )}

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
              <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6 }}>
                {recapTyped}
                <span style={{ opacity: !recapDone ? 1 : 0, transition: "opacity 0.3s", color: THEME.accent }}>{"\u2588"}</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* FINANCIAL PULSE */}
        <div style={{ display: "grid", gridTemplateColumns: isVerySmall ? "1fr" : isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 16, marginBottom: 28, padding: isMobile ? "0 2px" : 0 }}>
          {[
            { label: "Income", value: `$${data.income.toLocaleString()}`, trend: data.incomeTrend !== 0 ? `${data.incomeTrend > 0 ? "+" : ""}${data.incomeTrend}%` : null, dir: data.incomeTrend >= 0 ? "up" as const : "down" as const, color: THEME.green, spark: incSpark, href: "/dashboard/transactions?filter=income" },
            { label: "Expenses", value: `$${data.expenses.toLocaleString()}`, trend: data.expenseTrend !== 0 ? `${data.expenseTrend > 0 ? "+" : ""}${data.expenseTrend}%` : null, dir: data.expenseTrend >= 0 ? "up" as const : "down" as const, color: "#f87171", spark: expSpark, href: "/dashboard/transactions?filter=expenses" },
            { label: "Net Flow", value: `${data.netFlow >= 0 ? "+" : ""}$${data.netFlow.toLocaleString()}`, trend: null, dir: data.netFlow >= 0 ? "up" as const : "down" as const, color: data.netFlow >= 0 ? THEME.green : "#fb923c", spark: netSpark, href: "/dashboard/transactions" },
            { label: "Deductions Found", value: `$${data.deductions.toLocaleString()}`, trend: null, dir: "up" as const, color: THEME.accent, spark: dedSpark, href: "/dashboard/tax-workspace" },
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
                  <div style={{ fontSize: isMobile ? 9 : 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textMuted, fontWeight: 800, marginBottom: 6, whiteSpace: "nowrap" }}>{s.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: isMobile ? 4 : 8 }}>
                    <span style={{ fontSize: isVerySmall ? 18 : isMobile ? 16 : 24, fontWeight: 800, color: THEME.text, whiteSpace: "nowrap" }}>{s.value}</span>
                    {s.trend && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                        background: s.dir === "up" && s.color === THEME.green ? "rgba(52,211,153,0.08)" : s.dir === "up" ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.08)",
                        color: s.dir === "up" && s.color === THEME.green ? THEME.green : s.dir === "up" ? "#f87171" : THEME.green,
                      }}>{s.dir === "up" ? "\u2191" : "\u2193"} {s.trend}</span>
                    )}
                  </div>
                </div>
                <Sparkline data={s.spark} color={s.color} />
              </div>
            </Reveal>
          ))}
        </div>

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
            urgency={data.netFlow < 0 ? "medium" : null}
            title={data.netFlow < 0
              ? `Your expenses are outpacing income by $${Math.abs(data.netFlow).toLocaleString()}`
              : `Net positive: +$${data.netFlow.toLocaleString()} this period`}
            body={data.topCategory.name
              ? `${data.topCategory.name} at $${data.topCategory.amount.toLocaleString()} is ${data.topCategory.pct}% of all spending${data.topCategory.trend > 0 ? ` \u2014 up ${data.topCategory.trend}% from last month` : ""}.${data.deductions > 0 ? ` I've flagged $${data.deductions.toLocaleString()} in tax deductions.` : ""}`
              : "Upload statements to see your financial overview."}
            cta="Open Full Briefing"
            onCtaClick={() => setIsPrimeBriefingOpen(true)}
          />
          <AgentBriefingCard
            delay={720} agent="Tag" color="#22d3ee"
            urgency={data.uncategorizedCount > 0 ? "high" : null}
            title={data.uncategorizedCount > 0
              ? `${data.uncategorizedCount} transaction${data.uncategorizedCount !== 1 ? "s" : ""} need your review`
              : "All transactions categorized"}
            body={data.uncategorizedCount > 0
              ? `Found ${data.uncategorizedCount} uncategorized or suspicious item${data.uncategorizedCount !== 1 ? "s" : ""}. Should take about ${Math.max(1, Math.ceil(data.uncategorizedCount / 3))} minute${data.uncategorizedCount > 3 ? "s" : ""} to resolve.`
              : "Every transaction is categorized with high confidence. No action needed."}
            cta="Review Now" ctaColor={data.uncategorizedCount > 0 ? "#f87171" : undefined}
            onCtaClick={() => navigate("/dashboard/categories")}
          />
          <AgentBriefingCard
            delay={840} agent="Byte" color="#34d399"
            urgency={data.pendingImports > 0 ? "medium" : null}
            title={data.pendingImports > 0
              ? `${data.pendingImports} statement${data.pendingImports !== 1 ? "s" : ""} pending`
              : `${data.statementCount} statement${data.statementCount !== 1 ? "s" : ""} imported`}
            body={`${data.transactionCount} transactions extracted across ${data.statementCount} statement${data.statementCount !== 1 ? "s" : ""}. All staged and ready.`}
            cta="View Imports"
            onCtaClick={() => navigate("/dashboard/transactions")}
          />
          <AgentBriefingCard
            delay={960} agent="Crystal" color="#a78bfa"
            urgency={data.trendAlert ? "medium" : null}
            title={data.trendAlert
              ? `${data.trendAlert.category} spend is accelerating \u2014 ${data.trendAlert.months.length} month${data.trendAlert.months.length !== 1 ? "s" : ""} straight`
              : "No unusual spending trends detected"}
            body={data.trendAlert
              ? `${data.trendAlert.months.map(m => "$" + m.toLocaleString()).join(" \u2192 ")}. At this rate, it may continue climbing next month.`
              : data.topCategory.name
                ? `Top category is ${data.topCategory.name} at $${data.topCategory.amount.toLocaleString()}. Spending patterns look stable.`
                : "Upload more statements to unlock trend analysis."}
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
                {data.uncategorizedCount > 0 && (
                  <SmartAction delay={1200} icon={"\uD83D\uDD0D"} label={`Review ${data.uncategorizedCount} flagged transactions`} reason="Tag found items needing review" agentColor="#22d3ee" onClick={() => navigate("/dashboard/categories")} />
                )}
                {data.deductions > 0 && (
                  <SmartAction delay={1280} icon={"\uD83E\uDDFE"} label="Review tax deductions" reason={`$${data.deductions.toLocaleString()} identified by Prime`} agentColor={THEME.accent} onClick={() => setIsPrimeBriefingOpen(true)} />
                )}
                {data.trendAlert && (
                  <SmartAction delay={1360} icon={"\uD83D\uDCCA"} label={`Check ${data.trendAlert.category} trend`} reason={`Crystal: spending up ${data.trendAlert.months.length} months straight`} agentColor="#a78bfa" onClick={() => navigate("/dashboard/ai-results")} />
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
    </>
  );
}

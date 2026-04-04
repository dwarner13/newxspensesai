import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { AgentFloatingBubble } from "@/components/ui/AgentFloatingBubble";
import { THEME } from "./storyConfig";
import { useStoryData, buildCrystalIntro } from "./useStoryData";
import { HealthRing } from "./HealthRing";
import { StorySection } from "./StorySection";
import { ReportPreviewSidebar } from "./ReportPreviewSidebar";
import { Reveal } from "../PrimeChatV2/Reveal";
import { AgentDot } from "../PrimeChatV2/AgentDot";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";

import { CrystalCopilotPanel } from "./CrystalCopilotPanel";

export default function MyFinancialStoryV2() {
  const location = useLocation();
  const data = useStoryData();
  const [loaded, setLoaded] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => setLoaded(true), []);

  const crystalIntro = data.loading ? "" : buildCrystalIntro(data);
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
        <div style={{ flex: 1, padding: "28px 36px" }}>

          {/* Header */}
          <Reveal delay={0}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>My Financial Story</h1>
                <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 4 }}>
                  Narrated by Crystal \u2022 {data.statementCount} statements \u2022 {data.transactionCount} transactions \u2022 {data.periodStart} \u2013 {data.periodEnd}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setCopilotOpen(!copilotOpen)} style={{
                  padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
                  background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)",
                  color: "#a78bfa", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                }}>
                  <AgentDot agent="Crystal" size={20} />
                  Crystal Copilot
                </button>
                <button onClick={() => setReportOpen(v => !v)} style={{
                  padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
                  background: reportOpen ? 'transparent' : THEME.surface, border: `1px solid ${reportOpen ? THEME.accent : THEME.border}`, color: reportOpen ? THEME.accent : THEME.textMuted, cursor: "pointer",
                }}>{reportOpen ? 'Hide Preview' : 'Report Preview'}</button>
                <button style={{
                  padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
                  background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
                  border: "none", color: "#0b1220", cursor: "pointer",
                  boxShadow: `0 4px 16px ${THEME.accent}35`,
                }}>{"\uD83D\uDCE7"} Send to Accountant</button>
              </div>
            </div>
          </Reveal>

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

          {/* Health + Stats */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <Reveal delay={300} style={{ flex: "0 0 200px" }}>
              <div style={{
                background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18,
                padding: "24px", display: "flex", flexDirection: "column", alignItems: "center",
                boxShadow: "0 4px 20px rgba(167,139,250,0.08)",
              }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textDim, fontWeight: 700, marginBottom: 16 }}>Financial Health</div>
                <HealthRing grade={data.healthGrade} />
              </div>
            </Reveal>

            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Total Income", value: `$${data.income.toLocaleString()}`, color: "#34d399", sub: `${data.periodMonths} months` },
                { label: "Total Expenses", value: `$${data.expenses.toLocaleString()}`, color: "#f87171", sub: `+${data.expenseTrendPct}% MoM` },
                { label: "Net Position", value: `$${data.netPosition.toLocaleString()}`, color: "#fb923c", sub: data.netPosition < 0 ? "Deficit" : "Surplus" },
                { label: "Statements", value: `${data.statementCount}`, color: "#60a5fa", sub: "Processed" },
                { label: "Transactions", value: `${data.transactionCount}`, color: "#22d3ee", sub: "Categorized" },
                { label: "Tax Deductions", value: `$${data.deductions.toLocaleString()}`, color: THEME.accent, sub: "Identified" },
              ].map((s, i) => (
                <Reveal key={s.label} delay={350 + i * 50}>
                  <div style={{
                    background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14,
                    padding: "14px 16px", boxShadow: `0 4px 16px ${s.color}06`,
                  }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, color: THEME.textDim, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: THEME.textDim, marginTop: 2 }}>{s.sub}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

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
                    ${c.amount.toLocaleString()} <span style={{ color: THEME.textDim, fontWeight: 400 }}>({c.pct}%)</span>
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: THEME.bg, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${c.color}, ${c.color}cc)`, width: `${Math.min(c.pct * 2, 100)}%`, transition: "width 1s", boxShadow: `0 0 10px ${c.color}33` }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(167,139,250,0.04)", borderLeft: "3px solid rgba(167,139,250,0.3)" }}>
              <div style={{ fontSize: 12, color: THEME.textMuted, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: "#a78bfa" }}>Crystal:</span> Personal Care dominates at 50% of spending. This is unusual \u2014 the typical ratio is 15-20%. Worth reviewing if some items should be recategorized as business expenses.
              </div>
            </div>
          </StorySection>

          {/* Trends */}
          <StorySection title="Spending Trends" icon={"\uD83D\uDCC8"} agent="Crystal" agentColor="#a78bfa" delay={800}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {data.trends.map(t => (
                <div key={t.label} style={{ padding: "14px 16px", borderRadius: 14, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>{t.label}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                      background: t.trend === "up" ? "rgba(248,113,113,0.08)" : t.trend === "down" ? "rgba(52,211,153,0.08)" : "rgba(96,165,250,0.08)",
                      color: t.trend === "up" ? "#f87171" : t.trend === "down" ? "#34d399" : "#60a5fa",
                    }}>{t.pct}</span>
                  </div>
                  <div style={{ fontSize: 11, color: THEME.textDim }}>{t.months}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "rgba(167,139,250,0.04)", borderLeft: "3px solid rgba(167,139,250,0.3)" }}>
              <div style={{ fontSize: 12, color: THEME.textMuted, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: "#a78bfa" }}>Crystal:</span> Dining acceleration is most concerning \u2014 3 months straight with 68% driven by delivery apps. Shopping trending well.
              </div>
            </div>
          </StorySection>

          {/* Prime Advisory */}
          <StorySection title="Prime's Advisory Note" icon={"\u2655"} agent="Prime" agentColor={THEME.accent} delay={1000}>
            <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.65 }}>
              Your expenses have outpaced income by ${Math.abs(data.netPosition).toLocaleString()} over this period. The good news: I've identified $${data.deductions.toLocaleString()} in potential tax deductions. For self-employed income, these could save you approximately $820-$985 at tax time. Lock down vehicle expense documentation \u2014 CRA requires mileage logs and April deadline is approaching.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {data.deductionBreakdown.map(d => (
                <div key={d.label} style={{ flex: 1, padding: "12px 14px", borderRadius: 12, background: THEME.bg, border: `1px solid ${THEME.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: THEME.textDim, fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: d.color }}>${d.amount.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </StorySection>

          {/* Tag Category Health */}
          <StorySection title="Category Health Report" icon={"\uD83C\uDFF7\uFE0F"} agent="Tag" agentColor="#22d3ee" delay={1200}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.categoryHealth.map(c => (
                <div key={c.cat} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text, flex: 1 }}>{c.cat}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: `${c.statusColor}12`, color: c.statusColor, border: `1px solid ${c.statusColor}22` }}>{c.status}</span>
                  <span style={{ fontSize: 11, color: "#22d3ee", fontWeight: 600, width: 50, textAlign: "right" }}>{c.confidence}%</span>
                </div>
              ))}
            </div>
          </StorySection>

          {/* Export/Share */}
          <Reveal delay={1400}>
            <div style={{
              background: `linear-gradient(135deg, ${THEME.accent}08, ${THEME.accent}03)`,
              border: `1px solid ${THEME.accent}18`, borderRadius: 18, padding: "24px",
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text, marginBottom: 6 }}>Share Your Financial Story</div>
                <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.5 }}>Download a branded PDF report, send to your accountant, or export the data for your podcast recap.</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button style={{ padding: "10px 24px", borderRadius: 12, fontSize: 12.5, fontWeight: 600, background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`, border: "none", color: "#0b1220", cursor: "pointer", boxShadow: `0 4px 16px ${THEME.accent}35`, whiteSpace: "nowrap" }}>{"\uD83D\uDCC4"} Download PDF</button>
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



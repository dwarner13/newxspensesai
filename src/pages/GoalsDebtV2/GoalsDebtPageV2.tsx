import { useState, useEffect } from "react";
import { THEME, GOALIE_COLOR } from "./goalsConfig";
import { useGoalsData, buildGoalieIntro } from "./useGoalsData";
import { GoalCard } from "./GoalCard";
import { DebtTracker } from "./DebtTracker";
import { MoneyLessons } from "./MoneyLessons";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";

import { GoalieCopilotPanel } from "./GoalieCopilotPanel";

export default function GoalsDebtPageV2() {
  const data = useGoalsData();
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"goals" | "debt" | "learn">("goals");
  const [copilotOpen, setCopilotOpen] = useState(false);
  useEffect(() => setLoaded(true), []);

  const goalieIntro = data.loading ? "" : buildGoalieIntro(data);
  const [typed, typeDone] = useTypewriter(goalieIntro, 14, 600, !data.loading);

  const goalPct = data.totalGoalTarget > 0 ? Math.round((data.totalGoalCurrent / data.totalGoalTarget) * 100) : 0;

  if (data.loading) {
    return (
      <div style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        background: THEME.bg, color: THEME.text, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 13, color: THEME.textMuted }}>Goalie is analyzing your goals...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100vh", padding: "28px 36px" }}>

      {/* Header */}
      <Reveal delay={0}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>Goals & Debt</h1>
            <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 4 }}>AI-coached financial goals {"\u2022"} Guided by Goalie</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{
              padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
              background: `${GOALIE_COLOR}12`, border: `1px solid ${GOALIE_COLOR}28`, color: GOALIE_COLOR,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${GOALIE_COLOR}25`, border: `1px solid ${GOALIE_COLOR}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: GOALIE_COLOR }}>G</div>
              Goalie Copilot
            </button>
            <button style={{
              padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
              background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
              border: "none", color: "#0b1220", cursor: "pointer",
              boxShadow: `0 4px 16px ${THEME.accent}35`,
            }}>+ New Goal</button>
          </div>
        </div>
      </Reveal>

      {/* Goalie intro */}
      <Reveal delay={200}>
        <div style={{
          padding: "20px 24px", borderRadius: 16, marginBottom: 24,
          background: `linear-gradient(135deg, ${GOALIE_COLOR}06, transparent)`,
          border: `1px solid ${GOALIE_COLOR}15`,
          display: "flex", gap: 14, alignItems: "flex-start",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg, ${GOALIE_COLOR}30, ${GOALIE_COLOR}10)`,
            border: `1.5px solid ${GOALIE_COLOR}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: GOALIE_COLOR,
            boxShadow: `0 0 16px ${GOALIE_COLOR}33`,
          }}>G</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 700, color: GOALIE_COLOR, marginBottom: 8 }}>Goalie's Assessment</div>
            <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6 }}>
              {typed}
              <span style={{ opacity: !typeDone ? 1 : 0, transition: "opacity 0.3s", color: GOALIE_COLOR }}>{"\u2588"}</span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Goal Progress", value: `${goalPct}%`, sub: `$${data.totalGoalCurrent.toLocaleString()} / $${data.totalGoalTarget.toLocaleString()}`, color: "#34d399", icon: "\uD83C\uDFAF" },
          { label: "Total Debt", value: `$${data.totalDebt.toLocaleString()}`, sub: `${data.debts.length} accounts`, color: "#f87171", icon: "\uD83D\uDCB3" },
          { label: "Monthly Savings", value: `$${data.monthlySavings}`, sub: "+12% vs last month", color: "#60a5fa", icon: "\uD83D\uDCB0" },
          { label: "Debt-Free Date", value: `${data.debtFreeMonths > 0 ? Math.ceil(data.debtFreeMonths / 12) > 1 ? `${data.debtFreeMonths} mo` : `${data.debtFreeMonths} mo` : "N/A"}`, sub: "At current pace", color: "#a78bfa", icon: "\uD83D\uDCC5" },
        ].map((s, i) => (
          <Reveal key={s.label} delay={100 + i * 60} style={{ flex: 1 }}>
            <div style={{
              background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14,
              padding: "16px 20px", boxShadow: `0 4px 16px ${s.color}06`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${s.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{s.icon}</div>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: THEME.textDim, fontWeight: 700 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: THEME.text }}>{s.value}</div>
              <div style={{ fontSize: 10.5, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.sub}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Tabs */}
      <Reveal delay={350}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {([
            { id: "goals" as const, label: "\uD83C\uDFAF Goals", count: data.goals.length },
            { id: "debt" as const, label: "\uD83D\uDCB3 Debt Tracker", count: data.debts.length },
            { id: "learn" as const, label: "\uD83D\uDCA1 Money Lessons", count: data.lessons.length },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "9px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
              background: tab === t.id ? THEME.accentGlow : THEME.surface,
              border: `1px solid ${tab === t.id ? THEME.accent + "44" : THEME.border}`,
              color: tab === t.id ? THEME.accent : THEME.textMuted,
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {t.label}
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 6, background: tab === t.id ? `${THEME.accent}20` : THEME.bg, color: tab === t.id ? THEME.accent : THEME.textDim }}>{t.count}</span>
            </button>
          ))}
        </div>
      </Reveal>

      {/* Tab content */}
      {tab === "goals" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {data.goals.map((g, i) => <GoalCard key={g.name} goal={g} index={i} />)}
          <Reveal delay={700}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "40px", borderRadius: 18, border: `2px dashed ${THEME.border}`,
              cursor: "pointer", transition: "all 0.15s", minHeight: 200,
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.borderColor = GOALIE_COLOR; e.currentTarget.style.background = `${GOALIE_COLOR}06`; }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 32, color: GOALIE_COLOR }}>+</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: GOALIE_COLOR }}>Add New Goal</span>
              <span style={{ fontSize: 11, color: THEME.textDim }}>Goalie will help you set a realistic target</span>
            </div>
          </Reveal>
        </div>
      )}
      {tab === "debt" && <DebtTracker debts={data.debts} debtFreeMonths={data.debtFreeMonths} />}
      {tab === "learn" && <MoneyLessons lessons={data.lessons} />}

      {/* Goalie floating bubble */}
      <div style={{
        position: "fixed", bottom: typeof window !== "undefined" && window.innerWidth <= 768 ? 80 : 24, right: 24, width: 52, height: 52,
        borderRadius: "50%", background: `linear-gradient(135deg, ${GOALIE_COLOR}, #d4a017)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", boxShadow: `0 4px 20px ${GOALIE_COLOR}44`,
        fontSize: 20, fontWeight: 800, color: "#0b1220",
        transition: "transform 0.15s", zIndex: 100,
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.transform = "scale(1.1)"}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.transform = "scale(1)"}
      >G</div>

      {/* Goalie Copilot Panel */}
      {copilotOpen && <GoalieCopilotPanel onClose={() => setCopilotOpen(false)} data={data} />}
    </div>
  );
}

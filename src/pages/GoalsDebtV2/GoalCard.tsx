import { useState, useEffect } from "react";
import { THEME, GOALIE_COLOR, type GoalData } from "./goalsConfig";
import { Reveal } from "../PrimeChatV2/Reveal";

interface GoalCardProps {
  goal: GoalData;
  index: number;
  onClick?: (goal: GoalData) => void;
}

export function GoalCard({ goal, index, onClick }: GoalCardProps) {
  const [h, setH] = useState(false);
  const pct = Math.round((goal.current / goal.target) * 100);
  const remaining = goal.target - goal.current;

  // Animated ring
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(pct), 400); return () => clearTimeout(t); }, []);
  const size = 56, stroke = 5, r = (size - stroke) / 2, circ = 2 * Math.PI * r;

  return (
    <Reveal delay={300 + index * 100}>
      <div onClick={() => onClick?.(goal)}
        onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{
          background: h ? `${goal.color}0a` : THEME.surface,
          border: `1px solid ${h ? goal.color + "33" : THEME.border}`,
          borderRadius: 18, padding: "22px", cursor: "pointer",
          transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
          transform: h ? "translateY(-2px)" : "translateY(0)",
          boxShadow: h ? `0 8px 32px ${goal.color}0d` : `0 2px 12px ${goal.color}04`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={THEME.border} strokeWidth={stroke} />
              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={goal.color} strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={circ - (anim / 100) * circ}
                strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{goal.icon}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text }}>{goal.name}</div>
            <div style={{ fontSize: 11, color: THEME.textDim }}>Due: {goal.deadline}</div>
          </div>
          <div style={{
            padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: goal.priority === "high" ? "rgba(248,113,113,0.08)" : goal.priority === "medium" ? "rgba(251,146,60,0.08)" : "rgba(52,211,153,0.08)",
            color: goal.priority === "high" ? "#f87171" : goal.priority === "medium" ? "#fb923c" : "#34d399",
            border: `1px solid ${goal.priority === "high" ? "#f87171" : goal.priority === "medium" ? "#fb923c" : "#34d399"}22`,
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>{goal.priority}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: THEME.textMuted }}>Progress</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>
            ${goal.current.toLocaleString()} <span style={{ color: THEME.textDim, fontWeight: 400 }}>/ ${goal.target.toLocaleString()}</span>
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: THEME.bg, overflow: "hidden", marginBottom: 10 }}>
          <div style={{
            height: "100%", borderRadius: 4,
            background: `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)`,
            width: `${pct}%`, transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
            boxShadow: `0 0 10px ${goal.color}33`,
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: goal.color, fontWeight: 600 }}>{pct}% complete</span>
          <span style={{ fontSize: 11, color: THEME.textDim }}>${remaining.toLocaleString()} to go</span>
        </div>

        {/* Goalie tip */}
        <div style={{ padding: "10px 12px", borderRadius: 10, background: `${GOALIE_COLOR}06`, borderLeft: `3px solid ${GOALIE_COLOR}44` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: `${GOALIE_COLOR}25`, border: `1px solid ${GOALIE_COLOR}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, color: GOALIE_COLOR }}>G</div>
            <span style={{ fontSize: 10, fontWeight: 700, color: GOALIE_COLOR }}>Goalie</span>
          </div>
          <div style={{ fontSize: 11.5, color: THEME.textMuted, lineHeight: 1.4 }}>{goal.tip}</div>
        </div>
      </div>
    </Reveal>
  );
}

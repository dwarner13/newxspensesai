import { useState, useEffect } from "react";
import { THEME, getScoreColor, type ScorePillar } from "./scoreConfig";
import { Reveal } from "../PrimeChatV2/Reveal";

interface PillarBreakdownProps {
  pillars: ScorePillar[];
}

export function PillarBreakdown({ pillars }: PillarBreakdownProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div>
      <Reveal delay={150}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, color: THEME.textDim, fontWeight: 700, marginBottom: 14 }}>
          Score Breakdown {"\u2022"} 6 Pillars {"\u2022"} {pillars.reduce((s, p) => s + p.factors.length, 0)} Factors
        </div>
      </Reveal>

      {pillars.map((p, i) => (
        <PillarBar key={p.name} pillar={p} index={i} expanded={expanded === i} onToggle={() => setExpanded(expanded === i ? null : i)} />
      ))}

      <Reveal delay={800}>
        <div style={{
          padding: "16px 20px", borderRadius: 14,
          background: `${THEME.accent}06`, border: `1px solid ${THEME.accent}15`, marginTop: 10,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: THEME.accent, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 8 }}>{"\u2655"} How Your Score is Calculated</div>
          <div style={{ fontSize: 12, color: THEME.textMuted, lineHeight: 1.5 }}>
            Your Xspense Score evaluates {pillars.reduce((s, p) => s + p.factors.length, 0)} factors across 6 pillars: {pillars.map(p => `${p.name} (${Math.round(p.weight * 100)}%)`).join(", ")}. Each factor is scored individually and weighted by importance. The score updates in real-time as your financial data changes.
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function PillarBar({ pillar: p, index, expanded, onToggle }: { pillar: ScorePillar; index: number; expanded: boolean; onToggle: () => void }) {
  const color = getScoreColor(p.score);
  const [barW, setBarW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setBarW(p.score), 600 + index * 100); return () => clearTimeout(t); }, []);

  return (
    <Reveal delay={200 + index * 80}>
      <div style={{
        background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16,
        overflow: "hidden", marginBottom: 10,
        boxShadow: expanded ? `0 4px 20px ${color}0a` : "none", transition: "box-shadow 0.3s",
      }}>
        <div onClick={onToggle} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer", transition: "background 0.15s",
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = "#1a2844"}
        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = "transparent"}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{p.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{p.name}</div>
            <div style={{ height: 4, borderRadius: 2, background: THEME.bg, marginTop: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${color}, ${color}cc)`, width: `${barW}%`, transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)", boxShadow: `0 0 8px ${color}44` }} />
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: 50 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{p.score}</div>
            <div style={{ fontSize: 9, color: THEME.textDim }}>/100</div>
          </div>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6" stroke={THEME.textDim} strokeWidth={2} strokeLinecap="round" />
          </svg>
        </div>

        {expanded && (
          <div style={{ padding: "0 20px 16px", borderTop: `1px solid ${THEME.border}` }}>
            <div style={{ paddingTop: 14 }}>
              {p.factors.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < p.factors.length - 1 ? `1px solid ${THEME.border}` : "none" }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: f.status === "pass" ? "#34d399" : f.status === "warn" ? "#fb923c" : "#f87171",
                    boxShadow: `0 0 6px ${f.status === "pass" ? "#34d399" : f.status === "warn" ? "#fb923c" : "#f87171"}44`,
                  }} />
                  <span style={{ fontSize: 12.5, color: THEME.text, flex: 1 }}>{f.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: f.status === "pass" ? "#34d399" : f.status === "warn" ? "#fb923c" : "#f87171" }}>{f.value}</span>
                </div>
              ))}
            </div>
            {p.factors.find(f => f.tip && f.status !== "pass") && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: `${THEME.accent}06`, borderLeft: `3px solid ${THEME.accent}44` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: THEME.accent, marginBottom: 4 }}>{"\u2655"} PRIME TIP</div>
                <div style={{ fontSize: 11.5, color: THEME.textMuted, lineHeight: 1.4 }}>
                  {p.factors.find(f => f.tip && f.status !== "pass")?.tip}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Reveal>
  );
}

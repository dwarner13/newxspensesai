import { useState } from "react";
import { THEME, RECAP_COLOR, type RecapEpisode } from "./recapConfig";
import { Reveal } from "../PrimeChatV2/Reveal";

interface RecapCardProps {
  episode: RecapEpisode;
  index: number;
}

export function RecapCard({ episode: ep, index }: RecapCardProps) {
  const [h, setH] = useState(false);
  const gradeColor = ep.healthGrade === "A" || ep.healthGrade === "B" ? "#34d399" : ep.healthGrade === "C" ? "#fbbf24" : "#f87171";

  return (
    <Reveal delay={200 + index * 100}>
      <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
        background: h ? `${RECAP_COLOR}06` : THEME.surface,
        border: `1px solid ${h ? RECAP_COLOR + "33" : THEME.border}`,
        borderRadius: 18, padding: "24px", marginBottom: 14,
        transition: "all 0.25s", cursor: "pointer",
        boxShadow: h ? `0 8px 32px ${RECAP_COLOR}0d` : "none",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text }}>{ep.title}</div>
            <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2 }}>Generated {ep.date} {"\u2022"} {ep.duration} read</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ padding: "4px 12px", borderRadius: 8, background: `${gradeColor}12`, border: `1px solid ${gradeColor}22`, fontSize: 12, fontWeight: 700, color: gradeColor }}>Grade {ep.healthGrade}</div>
            {ep.hasAudio && <div style={{ padding: "4px 12px", borderRadius: 8, background: `${RECAP_COLOR}12`, border: `1px solid ${RECAP_COLOR}22`, fontSize: 11, fontWeight: 600, color: RECAP_COLOR }}>{"\uD83C\uDF99\uFE0F"} Audio</div>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Income", value: `$${ep.income.toLocaleString()}`, color: "#34d399" },
            { label: "Expenses", value: `$${ep.expenses.toLocaleString()}`, color: "#f87171" },
            { label: "Net", value: `$${ep.net.toLocaleString()}`, color: ep.net >= 0 ? "#34d399" : "#fb923c" },
          ].map(s => (
            <div key={s.label} style={{ padding: "8px 14px", borderRadius: 10, background: THEME.bg, border: `1px solid ${THEME.border}`, flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: THEME.textDim, fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ep.agentHighlights.map((ah, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: THEME.textMuted }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${ah.color}20`, border: `1px solid ${ah.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, color: ah.color, flexShrink: 0 }}>{ah.agent[0]}</div>
              <span style={{ fontWeight: 600, color: ah.color }}>{ah.agent}:</span>
              <span>{ah.text}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button style={{ padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: `${RECAP_COLOR}12`, border: `1px solid ${RECAP_COLOR}28`, color: RECAP_COLOR, cursor: "pointer" }}>Read Full Recap</button>
          {!ep.hasAudio && <button style={{ padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer" }}>{"\uD83C\uDF99\uFE0F"} Generate Audio</button>}
          {ep.hasAudio && <button style={{ padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer" }}>{"\u25B6"} Play Episode</button>}
          <button style={{ padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer" }}>{"\uD83D\uDCE4"} Share</button>
        </div>
      </div>
    </Reveal>
  );
}

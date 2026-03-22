import { useState, useEffect } from "react";
import { THEME, getScoreColor } from "./scoreConfig";
import { useXspenseScore } from "./useXspenseScore";
import { ScoreRing } from "./ScoreRing";
import { PillarBreakdown } from "./PillarBreakdown";
import { Reveal } from "../PrimeChatV2/Reveal";

// TODO: import { useNavigate } from "react-router-dom";

export default function XspenseScorePage() {
  const data = useXspenseScore();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(true), []);

  if (data.loading) {
    return (
      <div style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        background: THEME.bg, color: THEME.text, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 13, color: THEME.textMuted }}>Calculating your Xspense Score...</div>
      </div>
    );
  }

  const scoreDiff = data.overallScore - data.previousScore;
  const scoreColor = getScoreColor(data.overallScore);

  // Score history mini chart
  const histW = 280, histH = 60;
  const histMax = Math.max(...data.history.map(d => d.score));
  const histMin = Math.min(...data.history.map(d => d.score));
  const histRange = histMax - histMin || 1;
  const histPts = data.history.map((d, i) =>
    `${(i / (data.history.length - 1)) * histW},${histH - ((d.score - histMin) / histRange) * histH * 0.8 - histH * 0.1}`
  ).join(" ");

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100vh", padding: "28px 36px" }}>

      {/* Header */}
      <Reveal delay={0}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>Xspense Score</h1>
            <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 4 }}>Your comprehensive financial health score {"\u2022"} Updated in real-time</p>
          </div>
          <button style={{
            padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
            background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
            border: "none", color: "#0b1220", cursor: "pointer",
            boxShadow: `0 4px 16px ${THEME.accent}35`,
          }}>Share Score</button>
        </div>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 }}>

        {/* LEFT COLUMN */}
        <div>
          {/* Main score ring */}
          <Reveal delay={100}>
            <div style={{
              background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 20,
              padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center",
              marginBottom: 16, boxShadow: `0 4px 24px ${scoreColor}08`,
            }}>
              <ScoreRing score={data.overallScore} />
              <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 16, textAlign: "center", lineHeight: 1.5 }}>
                {scoreDiff > 0
                  ? <>Your score improved <span style={{ color: "#34d399", fontWeight: 700 }}>+{scoreDiff} points</span> this month</>
                  : scoreDiff < 0
                  ? <>Your score dropped <span style={{ color: "#f87171", fontWeight: 700 }}>{scoreDiff} points</span> this month</>
                  : <>Your score is <span style={{ fontWeight: 700 }}>unchanged</span> this month</>
                }
              </div>
            </div>
          </Reveal>

          {/* Score history */}
          <Reveal delay={200}>
            <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "20px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textDim, fontWeight: 700, marginBottom: 14 }}>Score History</div>
              <svg width={histW} height={histH} style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="scoreHistGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={THEME.accent} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={THEME.accent} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={`0,${histH} ${histPts} ${histW},${histH}`} fill="url(#scoreHistGrad)" />
                <polyline points={histPts} fill="none" stroke={THEME.accent} strokeWidth={2} strokeLinecap="round" />
                {data.history.map((d, i) => (
                  <circle key={i} cx={(i / (data.history.length - 1)) * histW} cy={histH - ((d.score - histMin) / histRange) * histH * 0.8 - histH * 0.1} r={3} fill={THEME.accent} stroke={THEME.bg} strokeWidth={2} />
                ))}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                {data.history.map((d, i) => (
                  <span key={i} style={{ fontSize: 9, color: THEME.textDim }}>{d.month}</span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Top actions */}
          <Reveal delay={300}>
            <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "20px" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.accent, fontWeight: 700, marginBottom: 14 }}>Top Actions to Improve</div>
              {data.topActions.map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10, marginBottom: 6, cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = "#1a2844"}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${a.color}20`, border: `1px solid ${a.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: a.color, flexShrink: 0 }}>{a.agent[0]}</div>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: THEME.text }}>{a.action}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", flexShrink: 0 }}>{a.impact}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 11, color: THEME.textDim, textAlign: "center" }}>
                Following all suggestions: <span style={{ fontWeight: 700, color: "#34d399" }}>+{data.topActions.reduce((s, a) => s + parseInt(a.impact), 0)} pts possible</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* RIGHT COLUMN */}
        <PillarBreakdown pillars={data.pillars} />
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { THEME, getScoreColor, getScoreGrade, getScoreLabel } from "./scoreConfig";
import { useXspenseScore } from "./useXspenseScore";
import { ScoreRing } from "./ScoreRing";
import { PillarBreakdown } from "./PillarBreakdown";
import { Reveal } from "../PrimeChatV2/Reveal";
import { isXspenseScoreVisible, XSPENSE_SCORE_REVIEW_MESSAGE } from "./scoreDisplay";

/** The visible Score (only mounted when the hold is off, so useXspenseScore never runs while held). */
function XspenseScoreVisible() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth <= 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
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

  const scoreColor = getScoreColor(data.overallScore);
  // The score-history chart was removed: useXspenseScore's history is simulated from the
  // current score plus random noise, not stored history. It returns only with real data.

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100vh", padding: isMobile ? "20px 16px" : "28px 36px" }}>

      {/* Header */}
      <Reveal delay={0}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>Xspense Score</h1>
            <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 4 }}>Your comprehensive financial health score {"\u2022"} Updated in real-time</p>
          </div>
          <button onClick={() => {
            const grade = getScoreGrade(data.overallScore);
            const label = getScoreLabel(data.overallScore);
            const text = `My XspensesAI Xspense Score is ${data.overallScore}/100 - ${grade} grade (${label}). Track your financial health at xspensesai.com`;
            if (navigator.share) { navigator.share({ title: 'My Xspense Score', text }).catch(() => {}); }
            else { navigator.clipboard.writeText(text).then(() => toast.success('Score copied to clipboard')); }
          }} style={{
            padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
            background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
            border: "none", color: "#0b1220", cursor: "pointer",
            boxShadow: `0 4px 16px ${THEME.accent}35`,
          }}>Share Score</button>
        </div>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "340px 1fr", gap: 24 }}>

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
              {/* N0-c: no "improved/dropped this month" claim; previousScore is an estimate
                  (useXspenseScore), not stored score history. */}
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

/**
 * XS-2 (owner 2026-11-26: keep the Score hidden; no hidden calculation). The hold is checked
 * BEFORE any score hook runs; while held only the review message renders.
 */
export default function XspenseScorePage() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth <= 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  if (isXspenseScoreVisible()) return <XspenseScoreVisible />;
  // Score review hold: show no number, ring, pillar scores or point impacts until the
  // score's accuracy is reviewed (see scoreDisplay.ts). No placeholder score is shown.
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100vh", padding: isMobile ? "20px 16px" : "28px 36px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>Xspense Score</h1>
        <div role="status" style={{ marginTop: 20, maxWidth: 560, background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "20px 22px", fontSize: 14, lineHeight: 1.6, color: THEME.textMuted }}>
          {XSPENSE_SCORE_REVIEW_MESSAGE}
        </div>
      </div>
    );
}

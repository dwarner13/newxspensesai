import { useState, useEffect } from "react";
import { THEME, RECAP_COLOR } from "./recapConfig";
import { useRecapData } from "./useRecapData";
import { RecapCard } from "./RecapCard";
import { Reveal } from "../PrimeChatV2/Reveal";
import { AgentDot } from "../PrimeChatV2/AgentDot";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";

export default function MonthlyRecapPageV2() {
  const data = useRecapData();
  const [tab, setTab] = useState<"written" | "audio" | "settings">("written");

  const intro = data.loading ? "" : `You have ${data.totalEpisodes} monthly recaps covering your financial journey. Your latest recap is ready \u2014 February was a tough month, but your Xspense Score still improved by 4 points.`;
  const [typed, typeDone] = useTypewriter(intro, 14, 600, !data.loading);

  if (data.loading) return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: THEME.textMuted }}>Preparing your recaps...</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100vh", padding: "28px 36px" }}>
      <Reveal delay={0}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>Monthly Recap</h1>
          <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 4 }}>AI-generated financial recaps {"\u2022"} Written & audio</p>
        </div>
        <button style={{ padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600, background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`, border: "none", color: "#0b1220", cursor: "pointer", boxShadow: `0 4px 16px ${THEME.accent}35` }}>Generate This Month</button>
      </div></Reveal>

      <Reveal delay={200}><div style={{ padding: "20px 24px", borderRadius: 16, marginBottom: 24, background: `linear-gradient(135deg, ${RECAP_COLOR}06, transparent)`, border: `1px solid ${RECAP_COLOR}15`, display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${RECAP_COLOR}30, ${RECAP_COLOR}10)`, border: `1.5px solid ${RECAP_COLOR}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: RECAP_COLOR, boxShadow: `0 0 16px ${RECAP_COLOR}33` }}>{"\uD83C\uDF99\uFE0F"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 700, color: RECAP_COLOR, marginBottom: 8 }}>Your AI Recap</div>
          <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6 }}>{typed}<span style={{ opacity: !typeDone ? 1 : 0, color: RECAP_COLOR }}>{"\u2588"}</span></div>
        </div>
      </div></Reveal>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Recaps", value: `${data.totalEpisodes}`, color: RECAP_COLOR, icon: "\uD83D\uDCDD" },
          { label: "Audio Episodes", value: `${data.episodes.filter(e => e.hasAudio).length}`, color: "#a78bfa", icon: "\uD83C\uDF99\uFE0F" },
          { label: "Total Duration", value: data.totalDuration, color: "#60a5fa", icon: "\u23F1" },
          { label: "Pending", value: `${data.pendingRecaps}`, color: "#fbbf24", icon: "\u23F3" },
        ].map((s, i) => (
          <Reveal key={s.label} delay={100 + i * 60} style={{ flex: 1 }}>
            <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${s.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: THEME.textDim, fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: THEME.text }}>{s.value}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={350}><div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {([
          { id: "written" as const, label: "\uD83D\uDCDD Written Recaps", count: data.totalEpisodes },
          { id: "audio" as const, label: "\uD83C\uDF99\uFE0F Audio Episodes", count: data.episodes.filter(e => e.hasAudio).length },
          { id: "settings" as const, label: "\u2699\uFE0F Preferences", count: 0 },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: tab === t.id ? THEME.accentGlow : THEME.surface, border: `1px solid ${tab === t.id ? THEME.accent + "44" : THEME.border}`, color: tab === t.id ? THEME.accent : THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            {t.label}
            {t.count > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 6, background: tab === t.id ? `${THEME.accent}20` : THEME.bg, color: tab === t.id ? THEME.accent : THEME.textDim }}>{t.count}</span>}
          </button>
        ))}
      </div></Reveal>

      {tab === "written" && data.episodes.map((ep, i) => <RecapCard key={ep.id} episode={ep} index={i} />)}
      {tab === "audio" && data.episodes.filter(e => e.hasAudio).map((ep, i) => <RecapCard key={ep.id} episode={ep} index={i} />)}
      {tab === "settings" && (
        <Reveal delay={100}><div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "24px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text, marginBottom: 16 }}>Recap Preferences</div>
          {[
            { label: "Frequency", value: "Monthly" },
            { label: "Include Prime Advisory", value: "On" },
            { label: "Include Tag Breakdown", value: "On" },
            { label: "Include Crystal Analytics", value: "On" },
            { label: "Auto-generate Audio", value: "Off" },
            { label: "Email Delivery", value: "On" },
          ].map(p => (
            <div key={p.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${THEME.border}` }}>
              <span style={{ fontSize: 13, color: THEME.text }}>{p.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: THEME.accent }}>{p.value}</span>
            </div>
          ))}
        </div></Reveal>
      )}
    </div>
  );
}

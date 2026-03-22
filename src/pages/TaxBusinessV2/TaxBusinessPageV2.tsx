import { useState, useEffect } from "react";
import { THEME, LEDGER_COLOR } from "./taxConfig";
import { useTaxData } from "./useTaxData";
import { LedgerCopilotPanel } from "./LedgerCopilotPanel";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";

export default function TaxBusinessPageV2() {
  const data = useTaxData();
  const [tab, setTab] = useState<"deductions" | "deadlines" | "tips">("deductions");
  const [copilotOpen, setCopilotOpen] = useState(false);

  const intro = data.loading ? "" : `I've scanned your transactions and organized $${data.deductionsFound.toLocaleString()} in potential deductions across ${data.deductionCategories.length} categories. Your filing deadline is ${data.daysToDeadline} days away \u2014 let's make sure everything is documented.`;
  const [typed, typeDone] = useTypewriter(intro, 14, 600, !data.loading);

  if (data.loading) return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: THEME.textMuted }}>Ledger is reviewing your tax position...</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100vh", padding: "28px 36px" }}>
      <Reveal delay={0}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>Tax & Business</h1>
          <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 4 }}>AI-organized tax preparation {"\u2022"} Guided by Ledger</p>
        </div>
        <button style={{ padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600, background: `${LEDGER_COLOR}12`, border: `1px solid ${LEDGER_COLOR}28`, color: LEDGER_COLOR, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${LEDGER_COLOR}25`, border: `1px solid ${LEDGER_COLOR}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: LEDGER_COLOR }}>L</div>
          Ledger Copilot
        </button>
      </div></Reveal>

      <Reveal delay={200}><div style={{ padding: "20px 24px", borderRadius: 16, marginBottom: 24, background: `linear-gradient(135deg, ${LEDGER_COLOR}06, transparent)`, border: `1px solid ${LEDGER_COLOR}15`, display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${LEDGER_COLOR}30, ${LEDGER_COLOR}10)`, border: `1.5px solid ${LEDGER_COLOR}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: LEDGER_COLOR, boxShadow: `0 0 16px ${LEDGER_COLOR}33` }}>L</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 700, color: LEDGER_COLOR, marginBottom: 8 }}>Ledger's Tax Review</div>
          <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6 }}>{typed}<span style={{ opacity: !typeDone ? 1 : 0, color: LEDGER_COLOR }}>{"\u2588"}</span></div>
        </div>
      </div></Reveal>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Deductions Found", value: `$${data.deductionsFound.toLocaleString()}`, color: LEDGER_COLOR, icon: "\uD83E\uDDFE" },
          { label: "Estimated Savings", value: data.estimatedSavings, color: "#60a5fa", icon: "\uD83D\uDCB0" },
          { label: "Docs Processed", value: `${data.docsProcessed}`, color: "#a78bfa", icon: "\uD83D\uDCC4" },
          { label: "Filing Deadline", value: `${data.daysToDeadline} days`, color: "#fbbf24", icon: "\uD83D\uDCC5" },
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
          { id: "deductions" as const, label: "\uD83E\uDDFE Deductions", count: data.deductionCategories.length },
          { id: "deadlines" as const, label: "\uD83D\uDCC5 Deadlines", count: data.deadlines.length },
          { id: "tips" as const, label: "\uD83D\uDCA1 Tax Tips", count: data.tips.length },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: tab === t.id ? THEME.accentGlow : THEME.surface, border: `1px solid ${tab === t.id ? THEME.accent + "44" : THEME.border}`, color: tab === t.id ? THEME.accent : THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            {t.label}
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 6, background: tab === t.id ? `${THEME.accent}20` : THEME.bg, color: tab === t.id ? THEME.accent : THEME.textDim }}>{t.count}</span>
          </button>
        ))}
      </div></Reveal>

      {tab === "deductions" && data.deductionCategories.map((d, i) => (
        <Reveal key={d.name} delay={100 + i * 80}>
          <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "20px 24px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${d.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{"\uD83E\uDDFE"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text }}>{d.name}</div>
                <div style={{ fontSize: 11, color: THEME.textDim }}>{d.count} transactions {"\u2022"} {d.confidence}% confidence</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: d.color }}>${d.amount.toLocaleString()}</div>
              <button style={{ padding: "6px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: `${d.color}12`, border: `1px solid ${d.color}28`, color: d.color, cursor: "pointer" }}>Review</button>
            </div>
          </div>
        </Reveal>
      ))}

      {tab === "deadlines" && data.deadlines.map((d, i) => (
        <Reveal key={d.label} delay={100 + i * 80}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 22px", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, marginBottom: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${d.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{"\uD83D\uDCC5"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{d.label}</div>
              <div style={{ fontSize: 11, color: THEME.textDim }}>{d.date}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: d.color, padding: "4px 14px", borderRadius: 8, background: `${d.color}12`, border: `1px solid ${d.color}22` }}>{d.status}</span>
          </div>
        </Reveal>
      ))}

      {tab === "tips" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {data.tips.map((t, i) => (
            <Reveal key={t.title} delay={100 + i * 80}>
              <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "22px", cursor: "pointer", transition: "all 0.25s" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${t.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 14 }}>{t.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text, marginBottom: 6 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: THEME.textDim, marginBottom: 4 }}>By Ledger {"\u2022"} {t.duration}</div>
                <div style={{ fontSize: 12.5, color: THEME.textMuted, lineHeight: 1.5, marginBottom: 14 }}>{t.desc}</div>
                <button style={{ padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: `${t.color}12`, border: `1px solid ${t.color}28`, color: t.color, cursor: "pointer" }}>Read More {"\u2192"}</button>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      {/* Ledger copilot bubble */}
      {!copilotOpen && (
        <button onClick={() => setCopilotOpen(true)} style={{ position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #34d399, #34d399cc)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 20px rgba(52,211,153,0.44)", fontSize: 20, fontWeight: 800, color: "#fff", zIndex: 100, border: "none", transition: "transform 0.15s" }}>L</button>
      )}
      {copilotOpen && <LedgerCopilotPanel onClose={() => setCopilotOpen(false)} data={data} />}
    </div>
  );
}

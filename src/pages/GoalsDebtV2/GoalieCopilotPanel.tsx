import { useState, useEffect, useRef } from "react";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";
import { useUnifiedChatEngine } from "@/hooks/useUnifiedChatEngine";
import type { GoalsPageData } from "./useGoalsData";

const T = { bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", text: "#e8ecf4", muted: "#7b8ba5", dim: "#4a5a75" };
const YELLOW = "#fbbf24";

interface Props { onClose: () => void; data: GoalsPageData; }

export function GoalieCopilotPanel({ onClose, data }: Props) {
  const { messages, sendMessage } = useUnifiedChatEngine({ employeeSlug: "goalie-ai" });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setOpen(true)); }, []);
  const handleClose = () => { setOpen(false); setTimeout(onClose, 300); };

  const goalPct = data.totalGoalTarget > 0 ? Math.round((data.totalGoalCurrent / data.totalGoalTarget) * 100) : 0;
  const statusText = `You're ${goalPct}% toward your total goal target of $${data.totalGoalTarget.toLocaleString()}. ${data.totalDebt > 0 ? `You also have $${data.totalDebt.toLocaleString()} in total debt.` : ""} ${data.monthlySavings > 0 ? `At $${data.monthlySavings.toLocaleString()}/mo savings, you're making progress.` : "Let's work on building your savings rate."}`;
  const [typed, typeDone] = useTypewriter(statusText, 14, 500);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [typed, messages.length]);
  const chatMsgs = messages.filter(m => m.role === "user" || (m.role === "assistant" && !m.meta?.isGreeting));

  return (
    <>
      <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", opacity: open ? 1 : 0, transition: "opacity 0.3s", zIndex: 998, backdropFilter: "blur(4px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 520, background: T.bg, borderLeft: "1px solid rgba(245,158,11,0.2)", transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)", zIndex: 999, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${YELLOW}20`, border: `1.5px solid ${YELLOW}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: YELLOW, boxShadow: `0 0 16px ${YELLOW}33` }}>G</div>
          <div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Goalie <span style={{ fontWeight: 400, color: T.muted }}>Copilot</span></span><span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", letterSpacing: "0.05em" }}>SECURED</span></div><div style={{ fontSize: 11, color: T.dim }}>Goals & Debt Coach</div></div>
          <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "20px 24px 140px" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `${YELLOW}20`, border: `1.5px solid ${YELLOW}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: YELLOW }}>G</div>
            <div style={{ flex: 1, fontSize: 13, color: T.muted, lineHeight: 1.6, padding: "12px 14px", borderRadius: 14, background: `${YELLOW}06`, borderLeft: `3px solid ${YELLOW}44` }}>
              {typed}<span style={{ opacity: !typeDone ? 1 : 0, color: YELLOW }}>{"\u2588"}</span>
            </div>
          </div>

          {typeDone && (
            <Reveal delay={0} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "Goals", value: String(data.goals.length), color: YELLOW },
                  { label: "Debts", value: String(data.debts.length), color: "#f87171" },
                  { label: "Savings/mo", value: `$${data.monthlySavings.toLocaleString()}`, color: "#34d399" },
                  { label: "Progress", value: `${goalPct}%`, color: "#60a5fa" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, textAlign: "center" }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: T.dim, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {typeDone && data.goals.length > 0 && (
            <Reveal delay={200} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: YELLOW, marginBottom: 12 }}>Goal Progress</div>
              {data.goals.map(g => {
                const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
                return (
                  <div key={g.name} style={{ padding: "12px 14px", borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{g.icon} {g.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: g.color }}>{pct}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: T.border }}>
                      <div style={{ height: "100%", borderRadius: 2, background: g.color, width: `${pct}%`, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                );
              })}
            </Reveal>
          )}

          {chatMsgs.length > 0 && (
            <div style={{ marginTop: 24, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
              {chatMsgs.map(m => (
                <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                  <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: 12, background: m.role === "user" ? T.surface : `${YELLOW}06`, borderLeft: m.role === "assistant" ? `3px solid ${YELLOW}44` : "none", fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `linear-gradient(0deg, ${T.bg} 75%, transparent)`, padding: "32px 24px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: "4px 6px 4px 16px" }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && input.trim()) { sendMessage(input.trim()); setInput(""); } }} placeholder="Ask Goalie about goals..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 13, padding: "10px 0", fontFamily: "inherit" }} />
            <button onClick={() => { if (input.trim()) { sendMessage(input.trim()); setInput(""); } }} style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${YELLOW}, #d97706)`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="#0b1220" /></svg>
            </button>
          </div>
        </div>
        <div style={{ padding: "6px 16px", borderTop: `1px solid ${T.border}`, flexShrink: 0, textAlign: "center" }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.5)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.03em' }}>Goalie AI {'\u2022'} Guardrails + PII protection active</span>
          </div>
          <div style={{ fontSize: 9, color: '#334155', lineHeight: 1.4, maxWidth: 320, margin: '0 auto' }}>Not financial, tax, or legal advice. Consult your accountant for professional guidance.</div>
        </div>
      </div>
    </>
  );
}

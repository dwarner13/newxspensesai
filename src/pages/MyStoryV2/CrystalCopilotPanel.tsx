import { useState, useEffect, useRef } from "react";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";
import { useUnifiedChatEngine } from "@/hooks/useUnifiedChatEngine";
import type { StoryData } from "./useStoryData";

const T = { bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", text: "#e8ecf4", muted: "#7b8ba5", dim: "#4a5a75" };
const PURPLE = "#a78bfa";

interface Props { onClose: () => void; data: StoryData; }

export function CrystalCopilotPanel({ onClose, data }: Props) {
  const { messages, sendMessage } = useUnifiedChatEngine({ employeeSlug: "crystal-ai" });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setOpen(true)); }, []);
  const handleClose = () => { setOpen(false); setTimeout(onClose, 300); };

  const topCat = data.categoryBreakdown[0];
  const statusText = `I've been tracking your spending patterns across ${data.categoryBreakdown.length} categories. ${topCat ? `${topCat.cat} is your top spend at ${topCat.pct}%.` : ""} ${data.trends.filter(t => t.trend === "up").length > 0 ? `I spotted ${data.trends.filter(t => t.trend === "up").length} accelerating trend${data.trends.filter(t => t.trend === "up").length !== 1 ? "s" : ""}.` : "No concerning trends detected."}`;
  const [typed, typeDone] = useTypewriter(statusText, 14, 500);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [typed, messages.length]);
  const chatMsgs = messages.filter(m => m.role === "user" || (m.role === "assistant" && !m.meta?.isGreeting));

  return (
    <>
      <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", opacity: open ? 1 : 0, transition: "opacity 0.3s", zIndex: 998, backdropFilter: "blur(4px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 520, background: T.bg, borderLeft: "1px solid rgba(167,139,250,0.2)", transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)", zIndex: 999, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${PURPLE}20`, border: `1.5px solid ${PURPLE}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: PURPLE, boxShadow: `0 0 16px ${PURPLE}33` }}>C</div>
          <div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Crystal <span style={{ fontWeight: 400, color: T.muted }}>Copilot</span></span><span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", letterSpacing: "0.05em" }}>SECURED</span></div><div style={{ fontSize: 11, color: T.dim }}>Analytics & Trends</div></div>
          <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px 140px" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `${PURPLE}20`, border: `1.5px solid ${PURPLE}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: PURPLE }}>C</div>
            <div style={{ flex: 1, fontSize: 13, color: T.muted, lineHeight: 1.6, padding: "12px 14px", borderRadius: 14, background: `${PURPLE}06`, borderLeft: `3px solid ${PURPLE}44` }}>
              {typed}<span style={{ opacity: !typeDone ? 1 : 0, color: PURPLE }}>{"\u2588"}</span>
            </div>
          </div>

          {typeDone && data.trends.length > 0 && (
            <Reveal delay={200} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: PURPLE, marginBottom: 12 }}>Trend Alerts</div>
              {data.trends.map((t, i) => (
                <div key={t.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 8 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{t.label}</div><div style={{ fontSize: 10, color: T.dim }}>{t.months}</div></div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.trend === "up" ? "#f87171" : t.trend === "down" ? "#34d399" : T.dim }}>{t.pct}</span>
                </div>
              ))}
            </Reveal>
          )}

          {chatMsgs.length > 0 && (
            <div style={{ marginTop: 24, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
              {chatMsgs.map(m => (
                <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                  <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: 12, background: m.role === "user" ? T.surface : `${PURPLE}06`, borderLeft: m.role === "assistant" ? `3px solid ${PURPLE}44` : "none", fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `linear-gradient(0deg, ${T.bg} 75%, transparent)`, padding: "32px 24px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: "4px 6px 4px 16px" }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && input.trim()) { sendMessage(input.trim()); setInput(""); } }} placeholder="Ask Crystal about trends..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 13, padding: "10px 0", fontFamily: "inherit" }} />
            <button onClick={() => { if (input.trim()) { sendMessage(input.trim()); setInput(""); } }} style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${PURPLE}, #7c3aed)`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="#0b1220" /></svg>
            </button>
          </div>
        </div>
        <div style={{ padding: "6px 16px", borderTop: `1px solid ${T.border}`, flexShrink: 0, textAlign: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px rgba(52,211,153,0.5)", flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.03em" }}>Crystal AI {"\u2022"} Guardrails + PII protection active</span>
            </div>
            <div style={{ fontSize: 9, color: "#334155", lineHeight: 1.4, maxWidth: 320, margin: "0 auto" }}>Not financial, tax, or legal advice. Consult your accountant for professional guidance.</div>
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";
import { useUnifiedChatEngine } from "@/hooks/useUnifiedChatEngine";
import type { TaxData } from "./useTaxData";

const T = { bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", text: "#e8ecf4", muted: "#7b8ba5", dim: "#4a5a75" };
const GREEN = "#34d399";

interface Props { onClose: () => void; data: TaxData; }

export function LedgerCopilotPanel({ onClose, data }: Props) {
  const { messages, sendMessage } = useUnifiedChatEngine({ employeeSlug: "ledger-tax" });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setOpen(true)); }, []);
  const handleClose = () => { setOpen(false); setTimeout(onClose, 300); };

  const statusText = `I've organized $${data.totalDeductions.toLocaleString()} in potential deductions across ${data.deductions.length} categories. ${data.daysToDeadline > 0 ? `${data.daysToDeadline} days until filing deadline.` : "Filing deadline has passed."} Estimated tax savings: ${data.estimatedSavings}.`;
  const [typed, typeDone] = useTypewriter(statusText, 14, 500);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [typed, messages.length]);
  const chatMsgs = messages.filter(m => m.role === "user" || (m.role === "assistant" && !m.meta?.isGreeting));

  return (
    <>
      <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", opacity: open ? 1 : 0, transition: "opacity 0.3s", zIndex: 998, backdropFilter: "blur(4px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: T.bg, borderLeft: `1px solid ${T.border}`, transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)", zIndex: 999, display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${GREEN}20`, border: `1.5px solid ${GREEN}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: GREEN, boxShadow: `0 0 16px ${GREEN}33` }}>L</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Ledger <span style={{ fontWeight: 400, color: T.muted }}>Copilot</span></div><div style={{ fontSize: 11, color: T.dim }}>Tax & Business Assistant</div></div>
          <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px 140px" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `${GREEN}20`, border: `1.5px solid ${GREEN}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: GREEN }}>L</div>
            <div style={{ flex: 1, fontSize: 13, color: T.muted, lineHeight: 1.6, padding: "12px 14px", borderRadius: 14, background: `${GREEN}06`, borderLeft: `3px solid ${GREEN}44` }}>
              {typed}<span style={{ opacity: !typeDone ? 1 : 0, color: GREEN }}>{"\u2588"}</span>
            </div>
          </div>

          {typeDone && data.deductions.length > 0 && (
            <Reveal delay={200} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: GREEN, marginBottom: 12 }}>Deduction Checklist</div>
              {data.deductions.map(d => (
                <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 8 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{d.label}</div><div style={{ fontSize: 10, color: T.dim }}>{d.txCount} transaction{d.txCount !== 1 ? "s" : ""}</div></div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: d.color }}>${d.amount.toLocaleString()}</div>
                    <span style={{ fontSize: 9, fontWeight: 600, color: d.confidence >= 90 ? GREEN : "#fb923c" }}>{d.confidence}% conf</span>
                  </div>
                </div>
              ))}
            </Reveal>
          )}

          {chatMsgs.length > 0 && (
            <div style={{ marginTop: 24, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
              {chatMsgs.map(m => (
                <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                  <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: 12, background: m.role === "user" ? T.surface : `${GREEN}06`, borderLeft: m.role === "assistant" ? `3px solid ${GREEN}44` : "none", fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `linear-gradient(0deg, ${T.bg} 75%, transparent)`, padding: "32px 24px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: "4px 6px 4px 16px" }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && input.trim()) { sendMessage(input.trim()); setInput(""); } }} placeholder="Ask Ledger about taxes..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 13, padding: "10px 0", fontFamily: "inherit" }} />
            <button onClick={() => { if (input.trim()) { sendMessage(input.trim()); setInput(""); } }} style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${GREEN}, #059669)`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="#0b1220" /></svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

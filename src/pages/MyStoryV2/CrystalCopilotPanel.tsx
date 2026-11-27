import { useState, useEffect, useRef } from "react";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";
import { useEmployeeChat } from "@/hooks/useEmployeeChat";
import { ConversationControls, UnsavedReplyNotice } from "@/components/chat/ConversationControls";
import { ChatIdentity, LetterLogo } from "@/components/chat/ChatHeader";
import { isUnsavedReply } from "@/lib/employeeChat";
import { PANEL } from "../PrimeChatV2/panelConfig";
import type { StoryData } from "./useStoryData";

const T = { bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", text: "#e8ecf4", muted: "#7b8ba5", dim: "#4a5a75" };
const PURPLE = "#a78bfa";

interface Props { onClose: () => void; data: StoryData; }

export function CrystalCopilotPanel({ onClose, data }: Props) {
  // Universal conversation history: the shared hook (restore, resume, history, New conversation).
  const { messages, sendMessage, sessionId, history, openConversation, startNewConversation } = useEmployeeChat("crystal-analytics", {
    employeeSlug: "crystal-ai",
    // UX-FST2-3: no browser money in AI context (the server drops it anyway; FST-1 / P-G2).
    // Counts only. Crystal's figures must come from the server; Crystal's chat tools still do their
    // own sums, and their compliance is tracked under AR-1b FR-035…043 (not guaranteed yet).
    additionalPrimeContext: data.loading ? undefined : {
      transactionCount: data.transactionCount,
      statementCount: data.statementCount,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
    },
  });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setOpen(true)); }, []);
  const handleClose = () => { setOpen(false); setTimeout(onClose, 300); };

  // Server insights only: the top-category line and the spending claim (no client trend counting).
  const statusText = [data.topCategoryText, data.spendingClaimText].filter(Boolean).join(" ") || "Your spending insights will appear here once your figures are available.";
  const [typed, typeDone] = useTypewriter(statusText, 14, 500);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [typed, messages.length]);
  const chatMsgs = messages.filter(m => m.role === "user" || (m.role === "assistant" && !m.meta?.isGreeting));

  return (
    <>
      <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", opacity: open ? 1 : 0, transition: "opacity 0.3s", zIndex: 998, backdropFilter: "blur(4px)" }} />
      <div style={{ position: "fixed", top: isMobile ? "auto" : 0, bottom: 0, right: 0, left: isMobile ? 0 : "auto", width: isMobile ? "100%" : 520, height: isMobile ? "90vh" : "100%", borderRadius: isMobile ? "20px 20px 0 0" : 0, borderLeft: isMobile ? "none" : "1px solid rgba(167,139,250,0.2)", borderTop: isMobile ? "1px solid rgba(167,139,250,0.2)" : "none", background: T.bg, transform: open ? "translateX(0)" : (isMobile ? "translateY(100%)" : "translateX(100%)"), transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)", zIndex: 999, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" }}>
        <div style={{ padding: isMobile ? "10px 8px 10px 14px" : "12px 16px 12px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          {/* TB-4: universal chat header — identity separate from the compact toolbar. The
              duplicate SECURED tag is gone; the footer still states the protections. */}
          <ChatIdentity
            isMobile={isMobile}
            renderLogo={(px) => <LetterLogo size={px} letter="C" color={PURPLE} />}
            name={isMobile ? "Crystal" : <>Crystal <span style={{ fontWeight: 500, color: T.muted }}>Copilot</span></>}
            subtitle={isMobile ? undefined : "Analytics & Trends"}
          />
          <ConversationControls
            employeeName="Crystal" accent={PURPLE} isMobile={isMobile}
            items={history.items} loading={history.loading} currentId={sessionId}
            onLoad={history.load} onOpen={openConversation} onNew={startNewConversation}
            onClose={handleClose}
          />
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px 140px" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `${PURPLE}20`, border: `1.5px solid ${PURPLE}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: PURPLE }}>C</div>
            <div style={{ flex: 1, fontSize: PANEL.messageFontSize, color: T.muted, lineHeight: 1.6, padding: "12px 14px", borderRadius: 14, background: `${PURPLE}06`, borderLeft: `3px solid ${PURPLE}44` }}>
              {typed}<span style={{ opacity: !typeDone ? 1 : 0, color: PURPLE }}>{"\u2588"}</span>
            </div>
          </div>

          {typeDone && data.trends.length > 0 && (
            <Reveal delay={200} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: PURPLE, marginBottom: 12 }}>Spending Trends</div>
              {data.trends.map((t, i) => (
                <div key={t.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{t.label}</div><div style={{ fontSize: 10, color: T.dim, lineHeight: 1.4 }}>{t.text}</div></div>
                  <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8, color: t.direction === "up" ? "#f87171" : t.direction === "down" ? "#34d399" : T.dim }}>{t.kind === "stable" ? "Steady" : `${t.direction === "up" ? "\u2191" : "\u2193"} ${t.percent}%`}</span>
                </div>
              ))}
            </Reveal>
          )}

          {chatMsgs.length > 0 && (
            <div style={{ marginTop: 24, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
              {chatMsgs.map(m => (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                  <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: 12, background: m.role === "user" ? T.surface : `${PURPLE}06`, borderLeft: m.role === "assistant" ? `3px solid ${PURPLE}44` : "none", fontSize: PANEL.messageFontSize, color: T.muted, lineHeight: 1.5 }}>{m.content}</div>
                  {isUnsavedReply(m) && <div style={{ maxWidth: "80%" }}><UnsavedReplyNotice /></div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `linear-gradient(0deg, ${T.bg} 75%, transparent)`, padding: "32px 24px 16px" }}>
          <div className="chat-composer" style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: "4px 6px 4px 14px" }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && input.trim()) { sendMessage(input.trim()); setInput(""); } }} placeholder="Ask Crystal about trends..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T.text, fontSize: PANEL.inputFontSize, padding: "10px 4px", fontFamily: "inherit" }} data-composer="" />
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

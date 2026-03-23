import { useState, useEffect, useRef } from "react";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";
import { useImportList } from "@/hooks/useImportList";
import { useUnifiedChatEngine } from "@/hooks/useUnifiedChatEngine";
import { useSetAtom } from "jotai";
import { isUploadModalOpenAtom } from "@/lib/uiStore";
import { ChatAttachmentButton } from "@/components/chat/ChatAttachmentButton";

const T = { bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", text: "#e8ecf4", muted: "#7b8ba5", dim: "#4a5a75" };
const GREEN = "#34d399";

interface ByteCopilotPanelProps { onClose: () => void; }

export function ByteCopilotPanel({ onClose }: ByteCopilotPanelProps) {
  const { imports } = useImportList();
  const { messages, sendMessage, isStreaming } = useUnifiedChatEngine({ employeeSlug: "byte-docs" });
  const setUploadOpen = useSetAtom(isUploadModalOpenAtom);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setOpen(true)); }, []);
  const handleClose = () => { setOpen(false); setTimeout(onClose, 300); };

  const statusText = `I've processed ${imports.length} statement${imports.length !== 1 ? "s" : ""} with high accuracy. ${imports.length > 0 ? `Your last import was ${imports[0]?.label || "recently"}.` : "Upload a statement to get started."}`;
  const [typed, typeDone] = useTypewriter(statusText, 14, 500);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [typed, messages.length]);

  const chatMsgs = messages.filter(m => m.role === "user" || (m.role === "assistant" && !m.meta?.isGreeting));

  return (
    <>
      <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", opacity: open ? 1 : 0, transition: "opacity 0.3s", zIndex: 998, backdropFilter: "blur(4px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: T.bg, borderLeft: `1px solid ${T.border}`, transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)", zIndex: 999, display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${GREEN}20`, border: `1.5px solid ${GREEN}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: GREEN, boxShadow: `0 0 16px ${GREEN}33` }}>B</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Byte <span style={{ fontWeight: 400, color: T.muted }}>Copilot</span></div><div style={{ fontSize: 11, color: T.dim }}>Smart Import Assistant</div></div>
          <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
        </div>

        {/* Body */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px 140px" }}>
          {/* Status */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `${GREEN}20`, border: `1.5px solid ${GREEN}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: GREEN }}>B</div>
            <div style={{ flex: 1, fontSize: 13, color: T.muted, lineHeight: 1.6, padding: "12px 14px", borderRadius: 14, background: `${GREEN}06`, borderLeft: `3px solid ${GREEN}44` }}>
              {typed}<span style={{ opacity: !typeDone ? 1 : 0, color: GREEN }}>{"\u2588"}</span>
            </div>
          </div>

          {/* Stats */}
          {typeDone && (
            <Reveal delay={0} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "Statements", value: String(imports.length), color: GREEN },
                  { label: "Last Import", value: imports[0]?.label || "None", color: "#60a5fa" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, textAlign: "center" }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: T.dim, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {/* Recent imports */}
          {typeDone && imports.length > 0 && (
            <Reveal delay={200} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: T.dim, marginBottom: 12 }}>Recent Imports</div>
              {imports.slice(0, 5).map((imp, i) => (
                <div key={imp.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 4 ? `1px solid ${T.border}` : "none" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{imp.statementLabel || imp.docName}</div><div style={{ fontSize: 10, color: T.dim }}>{imp.label}</div></div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: imp.status === "committed" ? `${GREEN}15` : `#fb923c15`, color: imp.status === "committed" ? GREEN : "#fb923c", alignSelf: "center" }}>{imp.status}</span>
                </div>
              ))}
            </Reveal>
          )}

          {/* Upload button */}
          {typeDone && (
            <Reveal delay={400} style={{ marginLeft: 38 }}>
              <button onClick={() => { handleClose(); setUploadOpen(true); }} style={{ width: "100%", padding: "12px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg, ${GREEN}, #059669)`, border: "none", color: T.bg, cursor: "pointer", boxShadow: `0 4px 16px ${GREEN}33` }}>Upload New Statement {"\u2192"}</button>
            </Reveal>
          )}

          {/* Chat messages */}
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

        {/* Input */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `linear-gradient(0deg, ${T.bg} 75%, transparent)`, padding: "32px 24px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: "4px 6px 4px 16px" }}>
            <ChatAttachmentButton onFileSelected={(file) => { setUploadOpen(true); }} />
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && input.trim()) { sendMessage(input.trim()); setInput(""); } }} placeholder="Ask Byte about imports..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 13, padding: "10px 0", fontFamily: "inherit" }} />
            <button onClick={() => { if (input.trim()) { sendMessage(input.trim()); setInput(""); } }} style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${GREEN}, #059669)`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 12px ${GREEN}33` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="#0b1220" /></svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

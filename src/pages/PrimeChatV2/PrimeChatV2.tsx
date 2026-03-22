import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { THEME } from "./agentConfig";
import { AgentDot } from "./AgentDot";
import { Reveal } from "./Reveal";
import { useTypewriter } from "./useTypewriter";
import { SpendingBreakdown } from "./SpendingBreakdown";
import { AgentCallout } from "./AgentCallout";
import { TaxDeductionsCard } from "./TaxDeductionsCard";
import { PrimeThoughts } from "./PrimeThoughts";
import { QuickActionChips } from "./QuickActionChips";
import { PrimeChatInput } from "./PrimeChatInput";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedChatEngine } from "@/hooks/useUnifiedChatEngine";
import { useTeamActivitySummary } from "@/hooks/useTeamActivitySummary";
import { TypingMessage, FormattedMessageText } from "@/components/chat/TypingMessage";
import {
  usePrimeBriefingData,
  buildSummaryText,
  buildThoughtsText,
} from "./usePrimeBriefingData";

interface PrimeChatV2ContentProps {
  onClose?: () => void;
}

export function PrimeChatV2Content({ onClose }: PrimeChatV2ContentProps) {
  const data = usePrimeBriefingData();
  const navigate = useNavigate();
  const { firstName } = useAuth();
  const teamActivity = useTeamActivitySummary();

  // Wire into the EXISTING chat engine — sends to POST /.netlify/functions/chat
  // Team activity summary injected so Prime knows what other agents discussed
  const {
    messages,
    sendMessage,
    isStreaming,
    addUploadFiles,
  } = useUnifiedChatEngine({
    employeeSlug: "prime-boss",
    additionalPrimeContext: teamActivity.summaryText ? { teamActivitySummary: teamActivity.summaryText } : undefined,
  });

  const [loaded, setLoaded] = useState(false);
  const [thoughtsDone, setThoughtsDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [promptsUsed, setPromptsUsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragCountRef = useRef(0);
  const typedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => setLoaded(true), []);

  const summaryText = data.loading ? "" : buildSummaryText(data);
  const thoughtsText = data.loading ? "" : buildThoughtsText(data);
  const [typed, typeDone] = useTypewriter(summaryText, 18, 600, !data.loading);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  // Filter to only messages created during this panel session (skip history greeting etc.)
  // Show messages that are user-initiated or responses to them
  const chatMessages = messages.filter(m => m.role === "user" || (m.role === "assistant" && !m.meta?.isGreeting));

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [typed, typeDone, thoughtsDone, chatMessages.length, isStreaming]);

  const handleThoughtsDone = useCallback(() => setThoughtsDone(true), []);

  // Send through the real chat engine — no openChat(), stays in-panel
  const handleSend = useCallback(async (message: string) => {
    setPromptsUsed(true);
    await sendMessage(message);
  }, [sendMessage]);

  // File upload via the engine's addUploadFiles (queues for next send)
  const handleFileSelected = useCallback(async (file: File) => {
    await addUploadFiles([file]);
  }, [addUploadFiles]);

  // Drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current <= 0) { dragCountRef.current = 0; setIsDragging(false); }
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await addUploadFiles([file]);
  }, [addUploadFiles]);

  if (data.loading) {
    return (
      <div style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        background: THEME.bg, color: THEME.text, width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <AgentDot agent="Prime" size={48} />
          <div style={{ marginTop: 16, fontSize: 13, color: THEME.textMuted }}>
            Prime is preparing your briefing...
          </div>
        </div>
      </div>
    );
  }

  const lastMsgId = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].id : null;

  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        background: THEME.bg, color: THEME.text, width: "100%", height: "100%",
        display: "flex", flexDirection: "column", position: "relative",
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop zone overlay */}
      {isDragging && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: `${THEME.accent}12`, border: `2px dashed ${THEME.accent}66`,
          borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.accent }}>Drop statement here</div>
            <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 4 }}>PDF, CSV, or image</div>
          </div>
        </div>
      )}
      {/* HEADER */}
      <div style={{
        padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 10,
        borderBottom: `1px solid ${THEME.border}`,
        background: `linear-gradient(180deg, ${THEME.surface} 0%, ${THEME.bg} 100%)`,
        opacity: loaded ? 1 : 0, transition: "opacity 0.5s", flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 24px ${THEME.accent}33`, fontSize: 17,
        }}>{"\u2655"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.3 }}>Prime</div>
          <div style={{ fontSize: 10, color: THEME.textMuted }}>Your Financial Advisor</div>
        </div>
        <div style={{
          padding: "3px 9px", borderRadius: 20,
          background: `${THEME.green}0e`, border: `1px solid ${THEME.green}22`,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: THEME.green }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: THEME.green }}>Secured</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: "transparent", border: `1px solid ${THEME.border}`,
              color: THEME.textMuted, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = THEME.surface; e.currentTarget.style.color = THEME.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = THEME.textMuted; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* SCROLLABLE BODY */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 16px 140px", minHeight: 0 }}>

        {/* ══════════ BRIEFING SECTION (static) ══════════ */}

        {/* Prime greeting + summary */}
        <Reveal delay={200}>
          <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
            <AgentDot agent="Prime" size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.accent }}>Prime</span>
                <span style={{ fontSize: 10, color: THEME.textDim }}>just now</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, marginBottom: 8 }}>
                {greeting}, {firstName}. Here&apos;s your financial briefing.
              </div>
              <div style={{
                fontSize: 12.5, color: THEME.textMuted, lineHeight: 1.65,
                padding: "12px 14px", borderRadius: 12,
                background: THEME.accentGlow, borderLeft: `3px solid ${THEME.accent}55`,
              }}>
                {typed}
                <span style={{ opacity: !typeDone ? 1 : 0, transition: "opacity 0.3s", color: THEME.accent }}>{"\u2588"}</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Spending breakdown */}
        {typeDone && (
          <Reveal delay={0} style={{ marginLeft: 38, marginTop: 14, marginBottom: 18 }}>
            <SpendingBreakdown categories={data.categoryBreakdown} total={data.totalSpent} />
          </Reveal>
        )}

        {/* Agent callouts */}
        {typeDone && (
          <Reveal delay={400} style={{ marginLeft: 38, marginBottom: 6 }}>
            <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
              Here&apos;s what the team flagged for you:
            </div>
          </Reveal>
        )}

        {typeDone && (
          <Reveal delay={600} style={{ marginLeft: 38, marginBottom: 6 }}>
            <AgentCallout
              agent="Tag"
              text={data.uncategorizedCount > 0
                ? `Found ${data.uncategorizedCount} transactions that need your call \u2014 some look like duplicates, others are uncategorized.`
                : "All clear \u2014 every transaction is categorized. Nice work."}
              cta="Review with Tag"
              onCtaClick={() => { onClose?.(); navigate("/dashboard/smart-categories"); }}
            />
          </Reveal>
        )}

        {typeDone && (
          <Reveal delay={800} style={{ marginLeft: 38, marginBottom: 6 }}>
            <AgentCallout
              agent="Byte"
              text={data.pendingImports > 0
                ? `${data.pendingImports} statement${data.pendingImports > 1 ? "s" : ""} ready to import. Detected transactions awaiting your approval.`
                : "No pending imports \u2014 all statements have been processed."}
              cta={data.pendingImports > 0 ? "Import now" : "Upload new"}
              onCtaClick={() => {
                onClose?.();
                // Trigger upload flow via Byte's file picker
                window.dispatchEvent(new CustomEvent("prime:open-upload", { detail: { source: "prime-briefing" } }));
                window.setTimeout(() => {
                  const inputs = Array.from(
                    document.querySelectorAll('input[type="file"][accept*=".pdf"][accept*=".csv"]')
                  ) as HTMLInputElement[];
                  inputs.find(i => !i.disabled)?.click();
                }, 120);
              }}
            />
          </Reveal>
        )}

        {typeDone && (
          <Reveal delay={1000} style={{ marginLeft: 38, marginBottom: 6 }}>
            <AgentCallout
              agent="Crystal"
              text={data.trendAlert
                ? `${data.trendAlert.category} has ${data.trendAlert.direction === "up" ? "increased" : "decreased"} ${data.trendAlert.months.length} months straight: ${data.trendAlert.months.map((m) => "$" + m.toLocaleString()).join(" \u2192 ")}.`
                : data.categoryBreakdown.length > 0
                  ? `Your top category is ${data.categoryBreakdown[0].label} at $${data.categoryBreakdown[0].amount.toLocaleString()}. No unusual trends detected.`
                  : "Not enough data yet to spot trends. Upload more statements to unlock insights."}
              cta="See trend analysis"
              onCtaClick={() => { onClose?.(); navigate("/dashboard/analytics-ai"); }}
            />
          </Reveal>
        )}

        {/* Tax deductions */}
        {typeDone && data.deductions.total > 0 && (
          <Reveal delay={1200} style={{ marginLeft: 38, marginTop: 14, marginBottom: 18 }}>
            <TaxDeductionsCard total={data.deductions.total} categories={data.deductions.categories} />
          </Reveal>
        )}

        {/* Prime's Take */}
        {typeDone && (
          <Reveal delay={1500} style={{ marginLeft: 38, marginBottom: 18 }}>
            <PrimeThoughts text={thoughtsText} enabled={typeDone} onDone={handleThoughtsDone} />
          </Reveal>
        )}

        {/* Follow-up prompts — hidden after first use */}
        {thoughtsDone && !promptsUsed && (
          <Reveal delay={300} style={{ marginLeft: 38 }}>
            <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 10 }}>
              Want me to dig into any of this?
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                "Break down the dining spend",
                "Show me deduction details",
                ...(data.uncategorizedCount > 0 ? [`Categorize the ${data.uncategorizedCount} flagged`] : []),
                "Compare to last quarter",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                    background: THEME.surface, border: `1px solid ${THEME.border}`,
                    color: THEME.text, cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.accent; e.currentTarget.style.background = THEME.accentGlow; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.background = THEME.surface; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </Reveal>
        )}

        {/* ══════════ CONVERSATION SECTION (live chat) ══════════ */}

        {chatMessages.length > 0 && (
          <div style={{ marginTop: 24, borderTop: `1px solid ${THEME.border}`, paddingTop: 18 }}>
            {chatMessages.map((msg) => {
              if (msg.role === "user") {
                return (
                  <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <div style={{
                      maxWidth: "80%", padding: "10px 14px", borderRadius: 14,
                      borderBottomRightRadius: 4,
                      background: THEME.surfaceLight, border: `1px solid ${THEME.borderLight}`,
                      fontSize: 13, color: THEME.text, lineHeight: 1.55,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              }
              // Assistant message
              const isThisStreaming = isStreaming && msg.id === lastMsgId;
              const isEmpty = msg.content.trim() === "";
              return (
                <div key={msg.id} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <AgentDot agent="Prime" size={24} />
                  <div style={{
                    maxWidth: "85%", padding: "10px 14px", borderRadius: 14,
                    borderBottomLeftRadius: 4,
                    background: THEME.accentGlow, borderLeft: `3px solid ${THEME.accent}44`,
                    fontSize: 13, color: THEME.textMuted, lineHeight: 1.6, minWidth: 40,
                  }}>
                    {isThisStreaming && isEmpty ? (
                      // Typing indicator while waiting for first token
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 0" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: THEME.accent, opacity: 0.6, animation: "primeDot 1.4s ease-in-out infinite" }} />
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: THEME.accent, opacity: 0.6, animation: "primeDot 1.4s ease-in-out 0.2s infinite" }} />
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: THEME.accent, opacity: 0.6, animation: "primeDot 1.4s ease-in-out 0.4s infinite" }} />
                        <style>{`@keyframes primeDot { 0%,80%,100% { transform: scale(0.6); opacity: 0.3; } 40% { transform: scale(1); opacity: 0.8; } }`}</style>
                      </div>
                    ) : (
                      <TypingMessage
                        content={msg.content}
                        messageId={msg.id}
                        isStreaming={isThisStreaming}
                        isTyped={typedIdsRef.current.has(msg.id)}
                        onTyped={(id) => typedIdsRef.current.add(id)}
                        charDelay={12}
                        maxDuration={2800}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FIXED BOTTOM */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: `linear-gradient(0deg, ${THEME.bg} 75%, transparent)`,
        padding: "28px 16px 12px",
      }}>
        <div style={{ marginBottom: 8 }}>
          <QuickActionChips chips={[
            { icon: "\uD83D\uDCCA", label: "Categories", action: () => { onClose?.(); navigate("/dashboard/smart-categories"); } },
            { icon: "\uD83E\uDDFE", label: "Tax summary", action: () => { onClose?.(); navigate("/dashboard/tax-assistant"); } },
            { icon: "\uD83D\uDCC8", label: "Trends", action: () => { onClose?.(); navigate("/dashboard/analytics-ai"); } },
            { icon: "\uD83D\uDCE4", label: "Export", action: () => { onClose?.(); navigate("/dashboard/transactions"); } },
          ]} />
        </div>
        <PrimeChatInput onSend={handleSend} onFileSelected={handleFileSelected} />
      </div>
    </div>
  );
}

export default PrimeChatV2Content;

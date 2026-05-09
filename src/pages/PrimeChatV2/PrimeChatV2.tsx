import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { THEME, AGENT_COLORS, AGENT_BG } from "./agentConfig";
import { AgentDot } from "./AgentDot";
import { AgentCallout } from "./AgentCallout";
import { TaxDeductionsCard } from "./TaxDeductionsCard";
import { QuickActionChips } from "./QuickActionChips";
import { PrimeChatInput } from "./PrimeChatInput";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedChatEngine } from "@/hooks/useUnifiedChatEngine";
import { useTeamActivitySummary } from "@/hooks/useTeamActivitySummary";
import { TypingMessage } from "@/components/chat/TypingMessage";
import { runSmartImportPipeline } from "@/lib/smartImport/runSmartImportPipeline";
import {
  usePrimeBriefingData,
  buildSummaryText,
  buildThoughtsText,
} from "./usePrimeBriefingData";

/* ── File upload helpers ── */

function isSpreadsheetFile(name: string): boolean {
  const ext = name.toLowerCase().split(".").pop() || "";
  return ["xlsx", "xls", "csv"].includes(ext);
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function handleSpreadsheetUpload(
  file: File,
  userId: string,
  authToken?: string,
): Promise<{ success: boolean; import_id?: string; byte_message?: string; transaction_count?: number; error?: string }> {
  const base64 = await fileToBase64(file);
  const response = await fetch("/.netlify/functions/process-spreadsheet", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ file_base64: base64, filename: file.name }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Spreadsheet import failed");

  if (data.import_id) {
    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "x-user-id": userId,
    };
    if (authToken) authHeaders["Authorization"] = `Bearer ${authToken}`;

    await fetch("/.netlify/functions/approve-import", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ importId: data.import_id }),
    });

    const commitRes = await fetch("/.netlify/functions/commit-import", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ importId: data.import_id }),
    });
    const commitData = await commitRes.json();
    if (commitData.committed) {
      data.transaction_count = commitData.committed;
    }
  }

  return data;
}

interface PrimeChatV2ContentProps {
  onClose?: () => void;
}

export function PrimeChatV2Content({ onClose }: PrimeChatV2ContentProps) {
  const data = usePrimeBriefingData();
  const navigate = useNavigate();
  const { firstName, userId, session } = useAuth();
  const teamActivity = useTeamActivitySummary();

  // Wire into the EXISTING chat engine - sends to POST /.netlify/functions/chat
  // Team activity summary injected so Prime knows what other agents discussed
  const {
    messages,
    sendMessage,
    isStreaming,
  } = useUnifiedChatEngine({
    employeeSlug: "prime-boss",
    additionalPrimeContext: data.loading ? undefined : {
      // Real financial snapshot from usePrimeBriefingData
      financialSnapshot: {
        hasTransactions: data.transactionCount > 0,
        uncategorizedCount: data.uncategorizedCount,
        monthlySpend: data.totalSpent,
        topCategories: data.categoryBreakdown.slice(0, 6).map(c => ({
          name: c.label,
          amount: c.amount,
        })),
        hasDebt: data.categoryBreakdown.some(c =>
          c.label.toLowerCase().includes('debt') || c.label.toLowerCase().includes('loan')
        ),
      },
      // Real income/expense summary
      totalIncome: data.totalIncome,
      totalSpent: data.totalSpent,
      statementCount: data.statementCount,
      transactionCount: data.transactionCount,
      uncategorizedCount: data.uncategorizedCount,
      categorySummary: data.categorySummary,
      topMerchant: data.topMerchant?.name ?? null,
      pendingImports: data.pendingImports,
      // Tax-workspace mirror (section totals + top subcategories) so Prime answers
      // "how much did I pay on car payments" etc. without routing to Ledger.
      taxSummary: data.taxSummary.map(s => ({
        section: s.title,
        total: s.total,
        count: s.count,
        topSubcategories: s.topBuckets.map(b => ({
          name: b.label,
          amount: b.amount,
          count: b.count,
        })),
      })),
      // Team agent activity
      teamActivitySummary: teamActivity.summaryText || undefined,
    },
  });

  const [isDragging, setIsDragging] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const revealStarted = useRef(false);

  // Sequential reveal - each step unlocks the next briefing section
  useEffect(() => {
    if (data.loading || data.transactionCount === 0) return;
    if (revealStarted.current) return;
    revealStarted.current = true;
    const steps = [400, 1300, 3000, 4500, 5700, 7000, 8500, 10000];
    steps.forEach((delay, i) => { setTimeout(() => setRevealStep(i + 1), delay); });
  }, [data.loading, data.transactionCount]);

  const [promptsUsed, setPromptsUsed] = useState(false);
  const [briefingCollapsed, setBriefingCollapsed] = useState(false);
  const [uploadMessages, setUploadMessages] = useState<{ id: string; text: string; type: "info" | "success" | "error" }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const dragCountRef = useRef(0);
  const typedIdsRef = useRef<Set<string>>(new Set());

  const summaryText = data.loading ? "" : buildSummaryText(data);
  const thoughtsText = data.loading ? "" : buildThoughtsText(data);

  // ── Smart greeting: data-driven opener that varies based on what's most interesting.
  // Pool of 10+ openers, filtered by relevance, picked with light rotation (sessionStorage).
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    // Build a weighted pool of openers based on what the data is telling us.
    type Opener = { weight: number; lead: string };
    const openers: Opener[] = [];

    // Priority 1: Urgent signals (uncategorized, pending imports, trend alerts)
    if (data.uncategorizedCount > 5) {
      openers.push({ weight: 10, lead: `${data.uncategorizedCount} transactions still need your call, ${firstName}.` });
      openers.push({ weight: 8, lead: `Heads up, ${firstName} — Tag's queue is at ${data.uncategorizedCount}.` });
    }
    if (data.pendingImports > 0) {
      openers.push({ weight: 10, lead: `${data.pendingImports} import${data.pendingImports > 1 ? 's' : ''} waiting to commit, ${firstName}.` });
    }
    if (data.trendAlert) {
      const dir = data.trendAlert.direction === 'up' ? 'climbing' : 'dropping';
      openers.push({ weight: 9, lead: `Your ${data.trendAlert.category.toLowerCase()} is ${dir} three months running, ${firstName}.` });
    }

    // Priority 2: Net flow framing (if meaningful income/expense)
    if (data.totalIncome > 0 && data.totalSpent > 0) {
      const net = data.totalIncome - data.totalSpent;
      if (net < -1000) {
        openers.push({ weight: 6, lead: `Expenses outpacing income by $${Math.abs(net).toLocaleString()}, ${firstName}.` });
        openers.push({ weight: 5, lead: `${firstName} — the gap is $${Math.abs(net).toLocaleString()} this period.` });
      } else if (net > 1000) {
        openers.push({ weight: 6, lead: `Net positive by $${net.toLocaleString()}, ${firstName}.` });
      }
    }

    // Priority 3: Month-over-month framing
    if (Math.abs(data.monthOverMonthPct) >= 15 && Math.abs(data.monthOverMonthPct) < 500) {
      const dir = data.monthOverMonthPct > 0 ? 'up' : 'down';
      openers.push({ weight: 5, lead: `Spending ${dir} ${Math.abs(data.monthOverMonthPct)}% from last month, ${firstName}.` });
    }

    // Priority 4: Top category framing
    if (data.categoryBreakdown[0] && data.categoryBreakdown[0].label !== 'Other' && data.totalSpent > 0) {
      const top = data.categoryBreakdown[0];
      const pct = Math.round((top.amount / data.totalSpent) * 100);
      if (pct >= 30) {
        openers.push({ weight: 4, lead: `${top.label} is ${pct}% of your spend, ${firstName}.` });
      }
    }

    // Priority 5: Deductions
    if (data.deductions.total > 500) {
      openers.push({ weight: 4, lead: `$${data.deductions.total.toLocaleString()} in potential deductions on the table, ${firstName}.` });
    }

    // Priority 6: Generic varied openers (always available as fallback)
    openers.push({ weight: 2, lead: `${firstName} — here's where things stand.` });
    openers.push({ weight: 2, lead: `Quick read on your books, ${firstName}.` });
    openers.push({ weight: 2, lead: `Your numbers right now, ${firstName}.` });
    openers.push({ weight: 2, lead: `Let's run the tape, ${firstName}.` });
    openers.push({ weight: 1, lead: `Good ${timeOfDay}, ${firstName}.` });

    // Weighted random pick with light rotation: avoid the same opener two sessions in a row.
    let lastOpener = '';
    try { lastOpener = sessionStorage.getItem('prime_last_opener') || ''; } catch { /* ignore */ }
    const candidates = openers.filter(o => o.lead !== lastOpener);
    const pool = candidates.length > 0 ? candidates : openers;
    const total = pool.reduce((s, o) => s + o.weight, 0);
    let r = Math.random() * total;
    let pick = pool[0];
    for (const o of pool) { r -= o.weight; if (r <= 0) { pick = o; break; } }
    try { sessionStorage.setItem('prime_last_opener', pick.lead); } catch { /* ignore */ }
    return pick.lead;
  }, [data.loading, data.uncategorizedCount, data.pendingImports, data.trendAlert, data.totalIncome, data.totalSpent, data.monthOverMonthPct, data.categoryBreakdown, data.deductions.total, firstName]);

  // Filter to only visible messages - skip hidden user prompts and greeting instructions
  const chatMessages = messages.filter(m => {
    if (m.role === 'user' && m.meta?.hidden) return false;
    if (m.role === 'user' && String(m.content || '').startsWith('[PRIME_GREETING]')) return false;
    return true;
  });

  // ── Auto-scroll logic ──
  // Track the length of the last assistant message so we scroll during streaming too
  // (length changes as content streams in, not just when a new message appears).
  const lastAssistantLen = chatMessages.length > 0
    ? String(chatMessages[chatMessages.length - 1]?.content || '').length
    : 0;

  // Auto-scroll on new content - but respect user scroll-up intent.
  // Using 'auto' instead of 'smooth' because smooth scroll can lag behind
  // rapid streaming updates, causing the viewport to miss the latest tokens.
  // Includes revealStep so the briefing's sequential reveal animation keeps
  // the newest block in view (8 steps over ~8 seconds).
  useEffect(() => {
    if (userScrolledUpRef.current) return;
    // Double RAF lets batched DOM updates (handoff + assistant message added together)
    // settle before measuring scroll position. Without this, scroll fires mid-render
    // and lands above the latest message. Apr 30 fix.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      });
    });
  }, [chatMessages.length, uploadMessages.length, lastAssistantLen, revealStep]);

  // MutationObserver + direct scrollTop assignment: more reliable than ResizeObserver
  // because it fires on ANY DOM change inside the scroll container (new messages, markdown
  // reflows, typewriter growth, image loads). Direct scrollTop = scrollHeight bypasses any
  // bottomRef positioning quirks and always lands at the absolute bottom of the container.
  // Auto-scroll: keep chat pinned to bottom as content grows. Fires on every DOM mutation
  // (TypingMessage typewriter, markdown reflow, image loads). Unconditional scroll-to-bottom
  // for the duration of any active mutation; user can scroll freely once content settles.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof MutationObserver === 'undefined') return;
    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight;
    };
    const observer = new MutationObserver(scrollToBottom);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [data.loading]);

  // Force-scroll to the bottom (used on user send and briefing collapse).
  // Clears userScrolledUpRef because sending a message = "I want to see the response."
  const forceScrollToBottom = useCallback(() => {
    userScrolledUpRef.current = false;
    // Double RAF to let the DOM settle after state changes (briefing collapse, new message)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      });
    });
  }, []);

  // Send through the real chat engine - no openChat(), stays in-panel
  const handleSend = useCallback(async (message: string) => {
    setPromptsUsed(true);
    setBriefingCollapsed(true);
    forceScrollToBottom();
    await sendMessage(message);
  }, [sendMessage, forceScrollToBottom]);

  // ── Process file through the import pipeline ──
  const processFile = useCallback(async (file: File) => {
    if (!userId) return;
    const msgId = `upload-${Date.now()}`;
    const authToken = session?.access_token;

    // Show progress message
    setUploadMessages(prev => [...prev, { id: msgId, text: `Byte is processing ${file.name}...`, type: "info" }]);
    setBriefingCollapsed(true);

    try {
      if (isSpreadsheetFile(file.name)) {
        // Spreadsheet path: process-spreadsheet -> approve -> commit
        const result = await handleSpreadsheetUpload(file, userId, authToken);
        const successMsg = result.byte_message
          || `Imported ${result.transaction_count ?? 0} transactions from ${file.name}`;
        setUploadMessages(prev =>
          prev.map(m => m.id === msgId ? { ...m, text: successMsg, type: "success" as const } : m)
        );
      } else {
        // PDF/image path: full smart import pipeline (uploads to Supabase storage via smart-import-init)
        const result = await runSmartImportPipeline({
          userId,
          source: "chat",
          file,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          lastModified: file.lastModified || 0,
          authToken,
        });
        const txCount = result.transactionCount ?? result.stats?.transactionCount ?? 0;
        const successMsg = txCount > 0
          ? `Processed ${file.name} - ${txCount} transactions imported.`
          : `Processed ${file.name}. Byte is extracting transactions - this may take a moment.`;
        setUploadMessages(prev =>
          prev.map(m => m.id === msgId ? { ...m, text: successMsg, type: "success" as const } : m)
        );
      }

      // Ask Prime to summarize the upload
      await sendMessage(`I just uploaded ${file.name}, summarize it`);
    } catch (err: any) {
      const errorMsg = err?.message || "Upload failed. Please try again.";
      setUploadMessages(prev =>
        prev.map(m => m.id === msgId ? { ...m, text: `Failed to process ${file.name}: ${errorMsg}`, type: "error" as const } : m)
      );
    }
  }, [userId, session, sendMessage]);

  // File upload handler (paperclip button)
  const handleFileSelected = useCallback(async (file: File) => {
    await processFile(file);
  }, [processFile]);

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
    if (file) await processFile(file);
  }, [processFile]);

  if (data.loading) {
    return (
      <div style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        background: THEME.bg, color: THEME.text, width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <AgentDot agent="Prime" size={48} />
          </div>
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
        flexShrink: 0,
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
      <style>{`
        @keyframes primeReveal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes primeDot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; } 40% { transform: scale(1); opacity: 0.8; } }
      `}</style>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 16px 16px", minHeight: 0 }}>

        {/* ══════════ BRIEFING SECTION ══════════ */}

        {briefingCollapsed ? (
          /* ── Collapsed briefing card ── */
          <button
            onClick={() => setBriefingCollapsed(false)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", marginBottom: 16, borderRadius: 12,
              background: THEME.accentGlow, border: `1px solid ${THEME.accent}22`,
              cursor: "pointer", textAlign: "left", transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${THEME.accent}55`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${THEME.accent}22`; }}
          >
            <AgentDot agent="Prime" size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.accent, marginBottom: 2 }}>
                Prime&apos;s Briefing
              </div>
              <div style={{ fontSize: 11, color: THEME.textMuted }}>
                ${data.totalIncome.toLocaleString()} income · ${data.totalSpent.toLocaleString()} expenses · {data.transactionCount} transactions
              </div>
            </div>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={THEME.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        ) : (
          /* ── Full briefing (sequential reveal) ── */
          <>
            {/* STEP 1 - Greeting */}
            {revealStep >= 1 && (
              <div style={{ display: "flex", gap: 10, marginBottom: 4, animation: 'primeReveal 0.4s ease forwards' }}>
                <AgentDot agent="Prime" size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.accent }}>Prime</span>
                    <span style={{ fontSize: 10, color: THEME.textDim }}>just now</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>
                    {greeting} Here&apos;s your briefing.
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 - Summary (types in) */}
            {revealStep >= 2 && (
              <div style={{ marginLeft: 38, marginBottom: 8, animation: 'primeReveal 0.4s ease forwards' }}>
                <div style={{ fontSize: 15, color: THEME.textMuted, lineHeight: 1.7, padding: "12px 14px", borderRadius: 12, background: THEME.accentGlow, borderLeft: `3px solid ${THEME.accent}55` }}>
                  <TypingMessage content={summaryText} messageId="prime-summary" isStreaming={false} isTyped={typedIdsRef.current.has('prime-summary')} onTyped={(id) => typedIdsRef.current.add(id)} charDelay={10} maxDuration={2200} />
                </div>
              </div>
            )}
            {/* Typing dots between summary and transactions */}
            {revealStep >= 2 && revealStep < 3 && (
              <div style={{ marginLeft: 38, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: THEME.accent, animation: `primeDot 1.4s ease-in-out ${delay}s infinite`, display: 'inline-block' }} />
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3 - Top transactions */}
            {revealStep >= 3 && data.topTransactions.length > 0 && (
              <div style={{ marginLeft: 38, marginTop: 4, marginBottom: 18, animation: 'primeReveal 0.4s ease forwards' }}>
                <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "14px 16px", width: "100%" }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, color: THEME.textDim, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>Top Transactions - Latest Statement</div>
                  {data.topTransactions.slice(0, 5).map((tx, i, arr) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 100px 90px", gap: 8, alignItems: "center", padding: "7px 0", borderBottom: i < arr.length - 1 ? `1px solid ${THEME.border}44` : "none" }}>
                      <div style={{ minWidth: 0, fontSize: 12.5, fontWeight: 600, color: THEME.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.merchant}</div>
                      <div style={{ fontSize: 10.5, color: THEME.textDim, textAlign: "center" }}>{tx.date}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: tx.isIncome ? "#34d399" : THEME.text, textAlign: "right" }}>{tx.isIncome ? "+" : "-"}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ textAlign: "right" }}><span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: `${tx.categoryColor}15`, color: tx.categoryColor }}>{tx.category}</span></div>
                    </div>
                  ))}
                  {data.categorySummary && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${THEME.border}`, fontSize: 10.5, color: THEME.textDim, textAlign: "center" }}>{data.categorySummary}</div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4 - Tag callout */}
            {revealStep >= 4 && (
              <div style={{ marginLeft: 38, animation: 'primeReveal 0.4s ease forwards' }}>
                <div style={{ fontSize: 14, color: THEME.textMuted, marginBottom: 12, lineHeight: 1.5 }}>Here&apos;s what the team flagged for you:</div>
              </div>
            )}
            {revealStep >= 4 && (
              <div style={{ marginLeft: 38, marginBottom: 6, animation: 'primeReveal 0.4s ease forwards' }}>
                <AgentCallout agent="Tag" text={data.uncategorizedCount > 0 ? `Found ${data.uncategorizedCount} transactions that need your call \u2014 some look like duplicates, others are uncategorized.` : "All clear \u2014 every transaction is categorized. Nice work."} cta="Review with Tag" onCtaClick={() => { onClose?.(); navigate("/dashboard/smart-categories"); }} />
              </div>
            )}

            {/* STEP 5 - Byte callout */}
            {revealStep >= 5 && (
              <div style={{ marginLeft: 38, marginBottom: 6, animation: 'primeReveal 0.4s ease forwards' }}>
                <AgentCallout agent="Byte" text={data.pendingImports > 0 ? `${data.pendingImports} statement${data.pendingImports > 1 ? "s" : ""} ready to import.` : "No pending imports \u2014 all statements processed."} cta={data.pendingImports > 0 ? "Import now" : "Upload new"} onCtaClick={() => { onClose?.(); navigate("/dashboard/upload"); }} />
              </div>
            )}

            {/* STEP 6 - Crystal callout */}
            {revealStep >= 6 && (
              <div style={{ marginLeft: 38, marginBottom: 6, animation: 'primeReveal 0.4s ease forwards' }}>
                <AgentCallout agent="Crystal" text={data.trendAlert ? `${data.trendAlert.category} has ${data.trendAlert.direction === "up" ? "increased" : "decreased"} ${data.trendAlert.months.length} months straight: ${data.trendAlert.months.map((m) => "$" + m.toLocaleString()).join(" \u2192 ")}.` : data.categoryBreakdown.length > 0 ? `Your top category is ${data.categoryBreakdown[0].label} at $${data.categoryBreakdown[0].amount.toLocaleString()}. No unusual trends detected.` : "Not enough data yet to spot trends."} cta="See trend analysis" onCtaClick={() => { onClose?.(); navigate("/dashboard/my-story"); }} />
              </div>
            )}
            {/* Typing dots before Prime's Take */}
            {revealStep >= 6 && revealStep < 7 && (
              <div style={{ marginLeft: 38, marginTop: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: THEME.accent, animation: `primeDot 1.4s ease-in-out ${delay}s infinite`, display: 'inline-block' }} />
                  ))}
                </div>
              </div>
            )}

            {/* STEP 7 - Tax deductions + Prime's Take */}
            {revealStep >= 7 && data.deductions.total > 0 && (
              <div style={{ marginLeft: 38, marginTop: 14, marginBottom: 18, animation: 'primeReveal 0.4s ease forwards' }}>
                <TaxDeductionsCard total={data.deductions.total} categories={data.deductions.categories} />
              </div>
            )}
            {revealStep >= 7 && (
              <div style={{ marginLeft: 38, marginBottom: 18, animation: 'primeReveal 0.4s ease forwards' }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 18, height: 2, borderRadius: 1, background: THEME.accent }} />
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 700, color: THEME.accent }}>Prime&apos;s Take</span>
                  <div style={{ flex: 1, height: 1, background: THEME.border }} />
                </div>
                <div style={{ fontSize: 15, color: THEME.textMuted, lineHeight: 1.7, padding: "14px 16px", borderRadius: 14, background: `linear-gradient(135deg, ${THEME.accent}08, transparent)`, border: `1px solid ${THEME.accent}15` }}>
                  <TypingMessage content={thoughtsText} messageId="prime-thoughts" isStreaming={false} isTyped={typedIdsRef.current.has('prime-thoughts')} onTyped={(id) => typedIdsRef.current.add(id)} charDelay={10} maxDuration={2500} />
                </div>
              </div>
            )}

            {/* STEP 8 - Follow-up chips */}
            {revealStep >= 8 && !promptsUsed && (
              <div style={{ marginLeft: 38, animation: 'primeReveal 0.4s ease forwards' }}>
                <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 10 }}>Want me to dig into any of this?</div>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                  {["Break down the dining spend", "Show me deduction details", ...(data.uncategorizedCount > 0 ? [`Categorize the ${data.uncategorizedCount} flagged`] : []), "Compare to last quarter"].map((q) => (
                    <button key={q} onClick={() => handleSend(q)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500, background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.accent; e.currentTarget.style.background = THEME.accentGlow; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.background = THEME.surface; }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════ UPLOAD STATUS MESSAGES ══════════ */}
        {uploadMessages.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {uploadMessages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <AgentDot agent="Byte" size={24} />
                <div style={{
                  flex: 1, padding: "10px 14px", borderRadius: 12,
                  background: msg.type === "error" ? "#f8717112" : msg.type === "success" ? "#34d39912" : `${THEME.surface}`,
                  borderLeft: `3px solid ${msg.type === "error" ? "#f87171" : msg.type === "success" ? "#34d399" : "#22d3ee"}88`,
                  fontSize: 13, color: THEME.textMuted, lineHeight: 1.5,
                }}>
                  {msg.text}
                  {msg.type === "info" && (
                    <span style={{ display: "inline-block", marginLeft: 6, animation: "primeDot 1.4s ease-in-out infinite", color: "#22d3ee" }}>...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════ CONVERSATION SECTION (live chat) ══════════ */}

        {chatMessages.length > 0 && (
          <div style={{ marginTop: 24, borderTop: `1px solid ${THEME.border}`, paddingTop: 18 }}>
            {chatMessages.map((msg) => {
              // Skip system messages (handoff dividers etc) — backend still records them for audit.
              if (msg.role === "system") return null;
              if (msg.role === "user") {
                return (
                  <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <div style={{
                      maxWidth: "80%", padding: "10px 14px", borderRadius: 14,
                      borderBottomRightRadius: 4,
                      background: THEME.surfaceLight, border: `1px solid ${THEME.borderLight}`,
                      fontSize: 15, color: THEME.text, lineHeight: 1.55,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              }
              // Assistant message
              const isThisStreaming = isStreaming && msg.id === lastMsgId;
              const isEmpty = msg.content.trim() === "";
              // Pick agent avatar based on meta.employee_key (set by handoff flow).
              // Slug -> AgentDot name mapping (AgentDot takes "Prime"/"Byte"/"Tag"/"Crystal"/"Goalie").
              const slugToAgent: Record<string, "Prime" | "Byte" | "Tag" | "Crystal" | "Goalie"> = {
                'prime-boss': 'Prime',
                'prime': 'Prime',
                'tag-ai': 'Tag',
                'tag': 'Tag',
                'byte-docs': 'Byte',
                'byte': 'Byte',
                'crystal-analytics': 'Crystal',
                'crystal': 'Crystal',
                'goalie-goals': 'Goalie',
                'goalie-ai': 'Goalie',
                'goalie': 'Goalie',
              };
              const empKey = (msg.meta as any)?.employee_key as string | undefined;
              const agentForMsg: "Prime" | "Byte" | "Tag" | "Crystal" | "Goalie" =
                (empKey && slugToAgent[empKey]) || 'Prime';
              return (
                <div key={msg.id} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <AgentDot agent={agentForMsg} size={24} />
                  <div style={{
                    maxWidth: "85%", padding: "10px 14px", borderRadius: 14,
                    borderBottomLeftRadius: 4,
                    background: AGENT_BG[agentForMsg], borderLeft: `3px solid ${AGENT_COLORS[agentForMsg]}44`,
                    fontSize: 15, color: THEME.textMuted, lineHeight: 1.6, minWidth: 40,
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
        <div ref={bottomRef} />
      </div>

      {/* BOTTOM INPUT BAR - flex child, not absolute */}
      <div style={{
        flexShrink: 0,
        borderTop: `1px solid ${THEME.border}`,
        padding: "10px 16px 12px",
        background: THEME.bg,
      }}>
        <div className="md:hidden" style={{ marginBottom: 8 }}>
          <QuickActionChips chips={[
            { icon: "\uD83D\uDCCA", label: "Categories", action: () => { onClose?.(); navigate("/dashboard/smart-categories"); } },
            { icon: "\uD83E\uDDFE", label: "Tax summary", action: () => { onClose?.(); navigate("/dashboard/tax-assistant"); } },
            { icon: "\uD83D\uDCC8", label: "Trends", action: () => { onClose?.(); navigate("/dashboard/analytics-ai"); } },          ]} />
        </div>
        <PrimeChatInput onSend={handleSend} onFileSelected={handleFileSelected} />
      </div>
    </div>
  );
}

export default PrimeChatV2Content;

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { THEME, AGENT_COLORS, AGENT_BG } from "./agentConfig";
import { AgentDot } from "./AgentDot";
import { AgentCallout } from "./AgentCallout";
import { TaxDeductionsCard } from "./TaxDeductionsCard";
import { QuickActionChips } from "./QuickActionChips";
import { PrimeChatInput } from "./PrimeChatInput";
import { resolvePreferredName } from "@/shared/preferred-name";
import { useAuth } from "@/contexts/AuthContext";
import { useAtom, useAtomValue } from "jotai";
import { primeRequestedSessionIdAtom, primeChatModeAtom } from "@/lib/uiStore";
import { nextExpandMode, workspaceSideGutter } from "@/lib/primeChatMode";
import {
  primeSessionStorageKey, storePrimeSessionId, verifyOwnedPrimeSession, type SessionOwnershipClient,
  selectResumeCandidate, readResumeState, writeResumeState, primeConversationFallbackTitle,
  type RecentActivityRow, type SessionRow, isPrimeSlug,
} from "@/lib/primeChatSession";
import { useChatSessions } from "@/hooks/useChatSessions";
import { buildTagReviewPath } from "@/lib/tagReview";
import { getSupabase } from "@/lib/supabase";
import { useUnifiedChatEngine } from "@/hooks/useUnifiedChatEngine";
import { TypingMessage } from "@/components/chat/TypingMessage";
import { runSmartImportPipeline } from "@/lib/smartImport/runSmartImportPipeline";
import { attachForDiscussion } from "@/lib/chatDocuments/attachForDiscussion";
import {
  usePrimeBriefingData,
  buildSummaryText,
  buildThoughtsText,
} from "./usePrimeBriefingData";
import type { ChatMessage } from "@/hooks/usePrimeChat";
import { ConfirmationCard } from "@/components/chat/ConfirmationCard";
import { ActionReceiptCard, parseActionReceipt } from "@/components/chat/ActionReceiptCard";
import { TransactionCandidateListCard, parseTxCandidates } from "@/components/chat/TransactionCandidateListCard";
import { SpecialistConsultationMarker } from "@/components/chat/SpecialistConsultationMarker";
import { parseSpecialistConsultations } from "@/lib/specialistConsultation";
import {
  shouldRevealCandidateCard,
  isCandidateCardRevealTransition,
  shouldAnchorCandidateMessage,
  messageStartScrollTop,
} from "./candidateCardReveal";
import { TeamHandoffAnnouncement, SpecialistCompleteMessage, parseLifecycleMessage } from "@/components/chat/TeamHandoffAnnouncement";
import { deriveEmployeeStops } from "@/components/chat/deriveEmployeeStops";
import { ConversationHistoryDropdown, HistoryDropdownTrigger } from "@/components/chat/ConversationHistoryDropdown";
import { ThinkingIndicator } from "@/components/chat/ThinkingIndicator";
import { ConversationHistoryDrawer } from "@/components/chat/ConversationHistoryDrawer";
import { CHAT_VISUALS, chatTextSize } from "@/lib/chatVisualStandards";

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
  // process-spreadsheet verifies the Supabase JWT (P0-C2a); x-user-id is only a must-match hint.
  const response = await fetch("/.netlify/functions/process-spreadsheet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
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
  const { userId, session, profile, user } = useAuth();
  // P-UI-2 (owner GO): the greeting uses the same preferred-name rule as Prime's replies
  // (src/shared/preferred-name.ts): display_name → first_name → full_name → sign-in metadata;
  // never the email address. null when no name is known, and every line still reads naturally.
  const firstName = useMemo(
    () => resolvePreferredName(profile, user?.user_metadata).firstName,
    [profile, user],
  );
  const nameSuffix = firstName ? `, ${firstName}` : '';
  const namePrefix = firstName ? `${firstName} — ` : '';

  const [sessionId, setSessionId] = useState<string | undefined>(
    () => (userId ? localStorage.getItem(primeSessionStorageKey(userId)) ?? undefined : undefined)
  );
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [historyChecked, setHistoryChecked] = useState(false);

  // Wire into the EXISTING chat engine - sends to POST /.netlify/functions/chat
  // Team activity summary injected so Prime knows what other agents discussed
  const {
    messages,
    sendMessage,
    isStreaming,
    clearMessages,
    resetThread,
    resetActiveEmployee,
    activeEmployeeSlug,
    pendingConfirmation,
    confirmToolExecution,
    cancelToolExecution,
  } = useUnifiedChatEngine({
    employeeSlug: "prime-boss",
    initialMessages: history,
    conversationId: sessionId,
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
    },
  });

  const [isDragging, setIsDragging] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const revealStarted = useRef(false);
  const [coverage, setCoverage] = useState<{ autoPct: number; total: number } | null>(null);
  // ── Returning-user resume (Surface #3) ──
  // C2-R: the most recent OTHER owned Prime conversation to offer (never switched to automatically).
  const [lastSession, setLastSession] = useState<{ title: string; summary: string; sessionId?: string; lastActivity?: string } | null>(null);
  const [lastSessionChecked, setLastSessionChecked] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  // C2-F: New Chat shows a short welcome; the full briefing stays available on demand.
  const [freshWelcome, setFreshWelcome] = useState(false);
  // C2-F: visible Chat History in the panel (existing useChatSessions; includes unsummarized chats).
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const { sessions: historySessions, isLoading: historyLoading, loadSessions: loadHistorySessions } = useChatSessions({ limit: 40, perEmployee: 40, autoLoad: false });
  const primeHistory = useMemo(() => historySessions.filter(h => isPrimeSlug(h.employee_slug) && h.id), [historySessions]);

  // Fetch Tag rule-coverage stat for the briefing one-liner (Surface #2)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      if (!sb || !userId) return;
      const { data: raw, error } = await sb.rpc("get_rules_coverage", { p_user_id: userId });
      if (cancelled) return;
      if (error) {
        console.error("[PrimeChatV2] coverage RPC failed", error);
        return;
      }
      const counts = (raw ?? {}) as Record<string, number>;
      const get = (k: string) => counts[k] ?? 0;
      const auto = get("tag_rule") + get("hardcoded") + get("ai") + get("learned") + get("tag_chat");
      const manual = get("user_override") + get("user_type_fix");
      const pending = get("_null") + get("needs_review");
      const total = auto + manual + pending;
      const autoPct = total ? Math.round((auto / total) * 100) : 0;
      setCoverage({ autoPct, total });
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // C2-R: cross-device resume. Offer the most recent OTHER owned Prime conversation when it has
  // newer activity than this device's conversation (e.g. a chat continued on the phone). It is
  // only an offer — the active conversation is never switched automatically — and a pending
  // explicit selection (Chat History / launcher) always wins. Summary title when available,
  // otherwise a fallback title (sessions whose AI summary failed are still offered).
  const pendingRequestedSessionId = useAtomValue(primeRequestedSessionIdAtom);
  // UX-P2a: layout mode of the single mounted chat (Quick / Expanded / Workspace).
  const [chatMode, setChatMode] = useAtom(primeChatModeAtom);
  // UX-P2b: in Workspace the messages and composer sit in a centred 760px column.
  const workspaceGutter = workspaceSideGutter(chatMode);
  useEffect(() => {
    if (!historyChecked) return;
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      if (!sb || !userId || pendingRequestedSessionId) { setLastSessionChecked(true); return; }
      try {
        const { data: recent, error } = await sb
          .from("chat_messages")
          .select("session_id, created_at")
          .eq("user_id", userId)
          .in("role", ["user", "assistant"])
          .order("created_at", { ascending: false })
          .limit(60);
        if (error) throw error;
        const recentRows = (recent ?? []) as RecentActivityRow[];
        const ids = [...new Set(recentRows.map(r => r.session_id))].filter(id => id && id !== sessionId).slice(0, 10);
        let sessionRows: SessionRow[] = [];
        if (ids.length > 0) {
          const { data: rows } = await sb
            .from("chat_sessions")
            .select("id, employee_slug, title, created_at")
            .eq("user_id", userId)
            .in("id", ids);
          sessionRows = (rows ?? []) as SessionRow[];
        }
        const currentLast = history.length > 0 ? (history[history.length - 1].createdAt ?? null) : null;
        const candidate = selectResumeCandidate({
          recent: recentRows,
          sessions: sessionRows,
          currentSessionId: sessionId ?? null,
          currentLastActivity: typeof currentLast === "string" ? currentLast : null,
          state: readResumeState(userId),
        });
        let summaryRow: { title?: string | null; summary?: string | null } | null = null;
        if (candidate) {
          const { data: srow } = await sb
            .from("chat_convo_summaries")
            .select("title, summary")
            .eq("user_id", userId)
            .eq("conversation_id", candidate.sessionId)
            .maybeSingle();
          summaryRow = srow ?? null;
        }
        if (cancelled) return;
        setLastSession(candidate ? {
          sessionId: candidate.sessionId,
          lastActivity: candidate.lastActivity,
          title: summaryRow?.title || candidate.title || primeConversationFallbackTitle({ id: candidate.sessionId, employee_slug: "prime-boss", title: null }, candidate.lastActivity),
          summary: summaryRow?.summary || "",
        } : null);
      } catch (error) {
        console.warn("[PrimeChatV2] resume lookup failed", error);
        if (!cancelled) setLastSession(null);
      } finally {
        if (!cancelled) setLastSessionChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, sessionId, historyChecked, history, pendingRequestedSessionId]);

  // Hydrate chat history from the existing Prime session so returning users see
  // their prior conversation immediately on panel mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      if (!sb || !userId || !sessionId) { setHistoryChecked(true); return; }
      const { data: rows, error } = await sb
        .from("chat_messages")
        .select("id, role, content, created_at, metadata")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      if (error) {
        console.warn("[PrimeChatV2] history fetch failed", error);
        setHistoryChecked(true);
        return;
      }
      const mapped: ChatMessage[] = (rows ?? [])
        .filter((r: any) => (r.role === "user" || r.role === "assistant") && r.metadata?.hidden !== true)
        .reverse()
        .map((r: any) => ({ id: r.id, role: r.role, content: r.content ?? "", createdAt: r.created_at, meta: r.metadata || undefined }));
      // Pre-seed typedIdsRef with all hydrated assistant messages so they
      // render immediately without typewriter animation (Bug 2 fix).
      for (const m of mapped) {
        if (m.role === 'assistant') typedIdsRef.current.add(m.id);
      }
      setHistory(mapped);
      setHistoryChecked(true);
    })();
    return () => { cancelled = true; };
  }, [sessionId, userId]);

  // First-time users (no prior Prime session and no history) skip the resume
  // card and go straight to the briefing cascade.
  useEffect(() => {
    if (lastSessionChecked && historyChecked && !lastSession && history.length === 0 && !freshWelcome) setShowBriefing(true);
  }, [lastSessionChecked, historyChecked, lastSession, history.length, freshWelcome]);

  // Returning users with hydrated history: collapse the briefing so only the
  // conversation is visible. Without this the full 8-step cascade renders
  // alongside 40+ history messages, making the panel look "endless."
  useEffect(() => {
    if (historyChecked && history.length > 0) setBriefingCollapsed(true);
  }, [historyChecked, history.length]);

  // Sequential reveal - each step unlocks the next briefing section
  useEffect(() => {
    if (data.loading || data.transactionCount === 0) return;
    if (!showBriefing) return;
    if (revealStarted.current) return;
    revealStarted.current = true;
    const steps = [400, 1300, 3000, 4500, 5700, 7000, 8500, 10000];
    steps.forEach((delay, i) => { setTimeout(() => setRevealStep(i + 1), delay); });
  }, [data.loading, data.transactionCount, showBriefing]);

  const [promptsUsed, setPromptsUsed] = useState(false);
  const [briefingCollapsed, setBriefingCollapsed] = useState(false);
  const [uploadMessages, setUploadMessages] = useState<{ id: string; text: string; type: "info" | "success" | "error" }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const dragCountRef = useRef(0);
  const typedIdsRef = useRef<Set<string>>(new Set());
  // Candidate card reveal (presentation only). Mirrors typedIdsRef as STATE so a
  // completed typewriter re-renders and reveals the transaction card.
  const [typedMessageIds, setTypedMessageIds] = useState<ReadonlySet<string>>(() => new Set());
  const cardVisibilityRef = useRef<Map<string, boolean>>(new Map());
  // While true, a just-revealed candidate response is anchored at its start and the
  // bottom-pinning observer stands down. Released by user scroll, send, or new message.
  const candidateAnchorHoldRef = useRef(false);
  // Our own anchor scroll must not be read as the user scrolling up.
  const programmaticScrollRef = useRef(false);
  const handleMessageTyped = useCallback((id: string) => {
    typedIdsRef.current.add(id);
    setTypedMessageIds(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

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
      openers.push({ weight: 10, lead: `${data.uncategorizedCount} transactions still need your call${nameSuffix}.` });
      openers.push({ weight: 8, lead: `Heads up${nameSuffix} — Tag's queue is at ${data.uncategorizedCount}.` });
    }
    if (data.pendingImports > 0) {
      openers.push({ weight: 10, lead: `${data.pendingImports} import${data.pendingImports > 1 ? 's' : ''} waiting to commit${nameSuffix}.` });
    }
    if (data.trendAlert) {
      const dir = data.trendAlert.direction === 'up' ? 'climbing' : 'dropping';
      openers.push({ weight: 9, lead: `Your ${data.trendAlert.category.toLowerCase()} is ${dir} three months running${nameSuffix}.` });
    }

    // Priority 2: Net flow framing (if meaningful income/expense)
    if (data.totalIncome > 0 && data.totalSpent > 0) {
      const net = data.totalIncome - data.totalSpent;
      if (net < -1000) {
        openers.push({ weight: 6, lead: `Expenses outpacing income by $${Math.abs(net).toLocaleString()}${nameSuffix}.` });
        openers.push({ weight: 5, lead: `${namePrefix}${firstName ? 'the' : 'The'} gap is $${Math.abs(net).toLocaleString()} this period.` });
      } else if (net > 1000) {
        openers.push({ weight: 6, lead: `Net positive by $${net.toLocaleString()}${nameSuffix}.` });
      }
    }

    // Priority 3: Month-over-month framing
    if (Math.abs(data.monthOverMonthPct) >= 15 && Math.abs(data.monthOverMonthPct) < 500) {
      const dir = data.monthOverMonthPct > 0 ? 'up' : 'down';
      openers.push({ weight: 5, lead: `Spending ${dir} ${Math.abs(data.monthOverMonthPct)}% from last month${nameSuffix}.` });
    }

    // Priority 4: Top category framing
    if (data.categoryBreakdown[0] && data.categoryBreakdown[0].label !== 'Other' && data.totalSpent > 0) {
      const top = data.categoryBreakdown[0];
      const pct = Math.round((top.amount / data.totalSpent) * 100);
      if (pct >= 30) {
        openers.push({ weight: 4, lead: `${top.label} is ${pct}% of your spend${nameSuffix}.` });
      }
    }

    // Priority 5: Deductions
    if (data.deductions.total > 500) {
      openers.push({ weight: 4, lead: `$${data.deductions.total.toLocaleString()} in potential deductions on the table${nameSuffix}.` });
    }

    // Priority 6: Generic varied openers (always available as fallback)
    openers.push({ weight: 2, lead: `${namePrefix}${firstName ? 'here' : 'Here'}'s where things stand.` });
    openers.push({ weight: 2, lead: `Quick read on your books${nameSuffix}.` });
    openers.push({ weight: 2, lead: `Your numbers right now${nameSuffix}.` });
    openers.push({ weight: 2, lead: `Let's run the tape${nameSuffix}.` });
    openers.push({ weight: 1, lead: `Good ${timeOfDay}${nameSuffix}.` });

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
  }, [data.loading, data.uncategorizedCount, data.pendingImports, data.trendAlert, data.totalIncome, data.totalSpent, data.monthOverMonthPct, data.categoryBreakdown, data.deductions.total, firstName, nameSuffix, namePrefix]);

  // Filter to only visible messages - skip hidden user prompts and greeting instructions
  const chatMessages = messages.filter(m => {
    if (m.role === 'user' && m.meta?.hidden) return false;
    if (m.role === 'user' && String(m.content || '').startsWith('[PRIME_GREETING]')) return false;
    return true;
  });

  // ── Employee history navigation (read-only, UI-only) ──
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
  const [viewedStopIndex, setViewedStopIndex] = useState<number | null>(null);
  const currentEmployeeSlug = activeEmployeeSlug || 'prime-boss';
  const employeeStops = useMemo(
    () => deriveEmployeeStops(chatMessages as any[], currentEmployeeSlug),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatMessages.length, currentEmployeeSlug],
  );
  useEffect(() => { setViewedStopIndex(null); }, [chatMessages.length, currentEmployeeSlug]);
  const handleSelectStop = useCallback((stopIndex: number) => {
    setViewedStopIndex(stopIndex);
    const stop = employeeStops[stopIndex];
    if (!stop?.startMessageId) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`msg-${stop.startMessageId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [employeeStops]);
  const toggleHistoryDropdown = useCallback(() => {
    setHistoryDropdownOpen(prev => !prev);
  }, []);
  const isMobileWidth = typeof window !== 'undefined' && window.innerWidth <= 768;

  // ── Auto-scroll logic ──
  // Track the length of the last assistant message so we scroll during streaming too
  // (length changes as content streams in, not just when a new message appears).
  const lastAssistantLen = chatMessages.length > 0
    ? String(chatMessages[chatMessages.length - 1]?.content || '').length
    : 0;

  // A new message or upload ends any candidate anchor hold (runs before auto-scroll below).
  useEffect(() => {
    candidateAnchorHoldRef.current = false;
  }, [chatMessages.length, uploadMessages.length]);

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
  }, [chatMessages.length, uploadMessages.length, lastAssistantLen]);

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
      if (candidateAnchorHoldRef.current) return; // candidate response anchored at its start
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearBottom || !userScrolledUpRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    };
    const observer = new MutationObserver(scrollToBottom);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [data.loading]);

  // Force-scroll to the bottom (used on user send and briefing collapse).
  // Clears userScrolledUpRef because sending a message = "I want to see the response."
  const forceScrollToBottom = useCallback(() => {
    userScrolledUpRef.current = false;
    candidateAnchorHoldRef.current = false;
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

  // Start a fresh Prime conversation — generates a new session ID so prior
  // messages don't contaminate the new thread.
  const handleNewChat = useCallback(() => {
    if (!userId) return;
    const newId = crypto.randomUUID();
    localStorage.setItem(primeSessionStorageKey(userId), newId);
    writeResumeState(userId, { ...readResumeState(userId), baseline: new Date().toISOString() });
    setSessionId(newId);
    clearMessages();
    resetThread();
    resetActiveEmployee();
    setHistory([]);
    setHistoryChecked(false);
    setLastSession(null);
    // P2-A: a new chat shows the existing welcome/briefing immediately. lastSessionChecked used
    // to be reset to false here, but the effect that sets it only re-runs on userId changes, so
    // the welcome area stayed blank. Jump straight to the final briefing step (no 10s replay).
    setLastSessionChecked(true);
    setShowBriefing(false);
    setFreshWelcome(true); // C2-F: short welcome + suggestions; briefing on demand
    setSessionsOpen(false);
    setPromptsUsed(false);
    setBriefingCollapsed(false);
    setRevealStep(0);
    revealStarted.current = false;
    setUploadMessages([]);
    typedIdsRef.current.clear();
    userScrolledUpRef.current = false;
  }, [userId]);

  // ── C2-B: open a specific Prime conversation requested by the launcher (e.g. Chat History) ──
  // The request takes precedence over the stored default, but only after the signed-in user is
  // shown to own the session (the server's ensureSession also rejects foreign IDs). On success
  // it becomes the stored selection, so a refresh restores it. Same reset steps as New chat.
  const [requestedSessionId, setRequestedSessionId] = useAtom(primeRequestedSessionIdAtom);
  const sessionSwitchInFlightRef = useRef<string | null>(null);
  useEffect(() => {
    const target = requestedSessionId;
    if (!target || !userId) return;
    if (sessionSwitchInFlightRef.current === target) return;
    if (target === sessionId) {
      setRequestedSessionId(null);
      return;
    }
    sessionSwitchInFlightRef.current = target;
    (async () => {
      try {
        const owned = await verifyOwnedPrimeSession(getSupabase() as unknown as SessionOwnershipClient, userId, target);
        if (!owned) {
          console.warn('[PrimeChatV2] requested conversation is not available for this user — keeping the current conversation');
          return;
        }
        storePrimeSessionId(userId, target);
        writeResumeState(userId, { ...readResumeState(userId), baseline: new Date().toISOString() });
        setSessionId(target);
        clearMessages();
        resetThread();
        resetActiveEmployee();
        setHistory([]);
        setHistoryChecked(false);
        setUploadMessages([]);
        setFreshWelcome(false);
        typedIdsRef.current.clear();
        userScrolledUpRef.current = false;
      } finally {
        sessionSwitchInFlightRef.current = null;
        setRequestedSessionId(null);
      }
    })();
  }, [requestedSessionId, userId, sessionId, setRequestedSessionId, clearMessages, resetThread, resetActiveEmployee]);

  // C2-F: open a saved Prime conversation from the panel. Same verified path as Chat History.
  // C2-E2A: "Review with Tag" on a server-verified card row. Navigation only: opens the
  // existing Tag panel on Transactions, focused on this ID (Tag re-reads the row
  // server-side, scoped to the user). The Prime session is untouched (shared session key).
  const handleReviewWithTag = useCallback((transactionId: string) => {
    const path = buildTagReviewPath(transactionId);
    if (path) navigate(path);
  }, [navigate]);

  const handleOpenHistorySession = useCallback((id: string) => {
    setSessionsOpen(false);
    if (id && id !== sessionId) setRequestedSessionId(id);
  }, [sessionId, setRequestedSessionId]);
  const toggleSessionsOpen = useCallback(() => {
    setSessionsOpen(open => {
      if (!open) void loadHistorySessions();
      return !open;
    });
  }, [loadHistorySessions]);

  // C2-R: Continue opens the offered conversation through the ownership-verified C2-B flow above.
  // It sends no message and creates no session. Dismiss only records the offer as seen.
  const handleResumeContinue = useCallback((target: { sessionId?: string; lastActivity?: string } | null) => {
    if (!userId || !target?.sessionId) return;
    const st = readResumeState(userId);
    writeResumeState(userId, { ...st, dismissed: { ...(st.dismissed ?? {}), [target.sessionId]: target.lastActivity ?? new Date().toISOString() } });
    setLastSession(null);
    setRequestedSessionId(target.sessionId);
  }, [userId, setRequestedSessionId]);
  const handleResumeDismiss = useCallback((target: { sessionId?: string; lastActivity?: string } | null) => {
    if (!userId || !target?.sessionId) return;
    const st = readResumeState(userId);
    writeResumeState(userId, { ...st, dismissed: { ...(st.dismissed ?? {}), [target.sessionId]: target.lastActivity ?? new Date().toISOString() } });
    setLastSession(null);
  }, [userId]);

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
        // Attachments C2: PDFs/images are attached for DISCUSSION (chat document, never imported).
        // Until the owner activates chat documents on the server, this falls back to the existing
        // import path below, so behaviour is unchanged.
        const attached = await attachForDiscussion({ file, authToken });
        if (attached.kind === "attached") {
          setUploadMessages(prev =>
            prev.map(m => m.id === msgId ? { ...m, text: `Attached ${file.name} - ready to discuss.`, type: "success" as const } : m)
          );
          await sendMessage(`I've attached ${file.name}. Please read it and tell me what's in it.`, { documentIds: [attached.documentId] });
          return;
        }
        if (attached.kind === "failed") {
          if (attached.label) {
            setUploadMessages(prev =>
              prev.map(m => m.id === msgId ? { ...m, text: `${file.name}: ${attached.label}`, type: "error" as const } : m)
            );
          } else {
            setUploadMessages(prev => prev.filter(m => m.id !== msgId));
          }
          return;
        }
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

  // ── Candidate card reveal + one-time scroll anchor (presentation only) ──
  const anchorCandidateMessage = useCallback((id: string) => {
    // Double RAF: runs after the card mount and the MutationObserver bottom-pin.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = scrollRef.current;
        const el = document.getElementById(`msg-${id}`);
        if (!container || !el) return;
        if (!shouldAnchorCandidateMessage({
          messageHeight: el.offsetHeight,
          viewportHeight: container.clientHeight,
          userScrolledUp: userScrolledUpRef.current,
        })) return;
        const target = messageStartScrollTop({
          messageTop: el.getBoundingClientRect().top,
          containerTop: container.getBoundingClientRect().top,
          currentScrollTop: container.scrollTop,
        });
        candidateAnchorHoldRef.current = true;
        if (Math.abs(container.scrollTop - target) > 1) {
          programmaticScrollRef.current = true;
          container.scrollTop = target;
        }
      });
    });
  }, []);

  const candidateLastMsgId = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].id : null;
  const candidateCardVisible = new Map<string, boolean>();
  for (const m of chatMessages) {
    if (m.role !== 'assistant') continue;
    if (!parseTxCandidates(m.meta as Parameters<typeof parseTxCandidates>[0])) continue;
    candidateCardVisible.set(m.id, shouldRevealCandidateCard({
      hasCandidates: true,
      isStreaming: isStreaming && m.id === candidateLastMsgId,
      isTyped: typedIdsRef.current.has(m.id) || typedMessageIds.has(m.id),
      content: String(m.content || ''),
    }));
  }
  const candidateVisibilityKey = Array.from(candidateCardVisible, ([id, v]) => `${id}:${v ? 1 : 0}`).join('|');
  useEffect(() => {
    for (const [id, visible] of candidateCardVisible) {
      const previous = cardVisibilityRef.current.get(id);
      cardVisibilityRef.current.set(id, visible);
      if (isCandidateCardRevealTransition(previous, visible)) anchorCandidateMessage(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateVisibilityKey]);

  if (data.loading) {
    return (
      <div style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        background: THEME.bg, color: THEME.text, width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <AgentDot agent="Prime" size={CHAT_VISUALS.welcomeLogo} />
          </div>
          <div style={{ marginTop: 16, fontSize: 15, color: THEME.textMuted }}>
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
      {/* P1-e: full-height conversation history drawer (replaces the 280px popover).
          Selection still goes through handleOpenHistorySession → setRequestedSessionId →
          verifyOwnedPrimeSession; titles render as plain text. */}
      <ConversationHistoryDrawer
        open={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
        items={primeHistory.map(h => ({ id: h.id, title: h.title, lastActivity: h.last_message_at || h.created_at }))}
        loading={historyLoading}
        currentId={sessionId}
        onSelect={handleOpenHistorySession}
        onNewChat={handleNewChat}
        accent={THEME.accent}
        fallbackTitle="Prime conversation"
      />
      {/* HEADER */}
      <div style={{
        padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 10,
        borderBottom: `1px solid ${THEME.border}`,
        background: `linear-gradient(180deg, ${THEME.surface} 0%, ${THEME.bg} 100%)`,
        flexShrink: 0,
      }}>
        <div style={{
          width: CHAT_VISUALS.headerLogo, height: CHAT_VISUALS.headerLogo, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 24px ${THEME.accent}33`, fontSize: 24,
        }} aria-hidden="true">{"\u2655"}</div>
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: CHAT_VISUALS.headerName, fontWeight: 800, letterSpacing: 0.2 }}>Prime</span>
            {employeeStops.length > 1 && (
              <HistoryDropdownTrigger onClick={toggleHistoryDropdown} isOpen={historyDropdownOpen} />
            )}
          </div>
          <div style={{ fontSize: CHAT_VISUALS.headerSubtitle, color: THEME.textMuted }}>Your Financial Assistant</div>
          {/* Desktop dropdown */}
          {!isMobileWidth && (
            <ConversationHistoryDropdown
              stops={employeeStops}
              isOpen={historyDropdownOpen}
              onToggle={toggleHistoryDropdown}
              onSelectStop={handleSelectStop}
              isMobile={false}
            />
          )}
        </div>
        <div style={{
          padding: "3px 9px", borderRadius: 20,
          background: `${THEME.green}0e`, border: `1px solid ${THEME.green}22`,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: THEME.green }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: THEME.green }}>Secured</span>
        </div>
        {/* LIVE-UI-03: Workspace was reachable only by typing /dashboard/chat/prime. A labelled
            control now opens it (desktop), and Workspace offers a labelled way back. Same route,
            same single mounted chat and conversation. */}
        {!isMobileWidth && (
          <button
            type="button"
            onClick={() => {
              if (chatMode === 'workspace') {
                if (window.history.length > 1) navigate(-1); else navigate('/dashboard');
              } else {
                navigate('/dashboard/chat/prime');
              }
            }}
            aria-label={chatMode === 'workspace' ? "Exit full screen" : "Open Prime full screen"}
            title={chatMode === 'workspace' ? "Exit full screen" : "Full screen"}
            style={{
              minHeight: CHAT_VISUALS.touchTarget, padding: "0 12px", borderRadius: 10, flexShrink: 0,
              background: "transparent", border: `1px solid ${THEME.border}`, color: THEME.textMuted,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {chatMode === 'workspace'
                ? <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                : <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />}
            </svg>
            <span>{chatMode === 'workspace' ? "Exit full screen" : "Full screen"}</span>
          </button>
        )}
        {/* UX-P2a: Quick ↔ Expanded on the same mounted chat (desktop only; not in Workspace,
            where Close returns to the dashboard). */}
        {!isMobileWidth && chatMode !== 'workspace' && (
          <button
            type="button"
            onClick={() => setChatMode(nextExpandMode(chatMode))}
            aria-pressed={chatMode !== 'quick'}
            aria-label={chatMode === 'quick' ? "Expand chat" : "Collapse chat"}
            title={chatMode === 'quick' ? "Expand chat" : "Collapse chat"}
            style={{
              width: CHAT_VISUALS.touchTarget, height: CHAT_VISUALS.touchTarget, borderRadius: 10, flexShrink: 0,
              background: chatMode !== 'quick' ? THEME.surface : "transparent", border: `1px solid ${THEME.border}`,
              color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {chatMode === 'quick'
                ? <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
                : <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />}
            </svg>
          </button>
        )}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={toggleSessionsOpen}
            title="Chat history"
            aria-label="Chat history"
            aria-haspopup="dialog"
            aria-expanded={sessionsOpen}
            style={{
              height: CHAT_VISUALS.touchTarget, padding: "0 12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: sessionsOpen ? THEME.surface : "transparent", border: `1px solid ${THEME.border}`,
              color: THEME.textMuted, cursor: "pointer",
            }}
          >
            History
          </button>
        </div>
        <button
          onClick={handleNewChat}
          title="New chat"
          aria-label="New chat"
          style={{
            width: CHAT_VISUALS.touchTarget, height: CHAT_VISUALS.touchTarget, borderRadius: 10,
            background: "transparent", border: `1px solid ${THEME.border}`,
            color: THEME.textMuted, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = THEME.surface; e.currentTarget.style.color = THEME.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = THEME.textMuted; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
          </svg>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close Prime"
            style={{
              width: CHAT_VISUALS.touchTarget, height: CHAT_VISUALS.touchTarget, borderRadius: 10,
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

      {/* Mobile history panel — full-width below header */}
      {isMobileWidth && historyDropdownOpen && (
        <ConversationHistoryDropdown
          stops={employeeStops}
          isOpen={historyDropdownOpen}
          onToggle={toggleHistoryDropdown}
          onSelectStop={handleSelectStop}
          isMobile={true}
        />
      )}

      {/* SCROLLABLE BODY */}
      <style>{`
        @keyframes primeReveal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes primeDot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; } 40% { transform: scale(1); opacity: 0.8; } }
      `}</style>
      <div ref={scrollRef} onScroll={(e) => {
        const el = e.currentTarget;
        if (programmaticScrollRef.current) {
          // Candidate anchor scroll — not the user scrolling up.
          programmaticScrollRef.current = false;
          return;
        }
        candidateAnchorHoldRef.current = false;
        userScrolledUpRef.current = (el.scrollHeight - el.scrollTop - el.clientHeight) > 120;
      }} style={{ flex: 1, overflowY: "auto", padding: `18px ${workspaceGutter} 16px`, minHeight: 0 }}>

        {/* ══════════ BRIEFING SECTION ══════════ */}

        {/* Wait for the last-session lookup before deciding what to show, so a
            returning user never sees a flash of the briefing cascade. */}
        {!lastSessionChecked ? null : lastSession && !showBriefing && !promptsUsed && history.length === 0 ? (
          /* ── Returning-user resume card ── */
          <div style={{ animation: 'primeReveal 0.4s ease forwards' }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <AgentDot agent="Prime" size={CHAT_VISUALS.welcomeRowLogo} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.accent }}>Prime</span>
                  <span style={{ fontSize: 10, color: THEME.textDim }}>just now</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: THEME.text, lineHeight: 1.5 }}>
                  Hey{firstName ? ` ${firstName}` : ""} — want to pick up where we left off?
                </div>
                <div style={{
                  fontSize: 13, color: THEME.textMuted, marginTop: 8, lineHeight: 1.6,
                  padding: "10px 14px", borderRadius: 12, background: THEME.accentGlow,
                  borderLeft: `3px solid ${THEME.accent}55`,
                }}>
                  Last session: <span style={{ color: THEME.text, fontWeight: 600 }}>{lastSession.title}</span>
                  {lastSession.summary ? <><br />{lastSession.summary}</> : null}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                  <button
                    onClick={() => handleResumeContinue(lastSession)}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
                      border: "none", color: "#0b1220", cursor: "pointer",
                    }}
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => setShowBriefing(true)}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                      background: THEME.surface, border: `1px solid ${THEME.border}`,
                      color: THEME.text, cursor: "pointer",
                    }}
                  >
                    Show today's briefing
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : freshWelcome && !showBriefing && history.length === 0 && !(!data.loading && data.transactionCount === 0) ? (
          /* ── C2-F: New Chat welcome — short greeting + suggestions; full briefing on demand ── */
          <div style={{ display: "flex", gap: 10, marginBottom: 8, animation: 'primeReveal 0.4s ease forwards' }}>
            <AgentDot agent="Prime" size={CHAT_VISUALS.welcomeRowLogo} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.accent }}>Prime</span>
                <span style={{ fontSize: 10, color: THEME.textDim }}>just now</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: THEME.text, lineHeight: 1.5 }}>
                Hey{firstName ? ` ${firstName}` : ""} — fresh page. What do you want to dig into?
              </div>
              {!promptsUsed && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {["How much did I spend last month?", "What are my biggest spending categories?", "Show me my recent transactions"].map((q) => (
                    <button key={q} onClick={() => handleSend(q)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500, background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text, cursor: "pointer" }}>
                      {q}
                    </button>
                  ))}
                  <button onClick={() => { setFreshWelcome(false); setShowBriefing(true); setRevealStep(8); revealStarted.current = true; }} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500, background: "transparent", border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer" }}>
                    Show today&apos;s briefing
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : briefingCollapsed ? (
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
        ) : !data.loading && data.transactionCount === 0 ? (
          /* ── P2-A: no-data welcome (step-1 greeting style). The briefing cascade only reveals
             when there is data, so a new account used to see an empty area here. ── */
          <div style={{ display: "flex", gap: 10, marginBottom: 4, animation: 'primeReveal 0.4s ease forwards' }}>
            <AgentDot agent="Prime" size={CHAT_VISUALS.welcomeRowLogo} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.accent }}>Prime</span>
                <span style={{ fontSize: 10, color: THEME.textDim }}>just now</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: THEME.text, lineHeight: 1.5 }}>
                Hi{firstName ? ` ${firstName}` : ""} — I&apos;m Prime. Import a statement and I&apos;ll show you where your money goes.
              </div>
              {!promptsUsed && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {["What can you help me with?", "How do I import a statement?"].map((q) => (
                    <button key={q} onClick={() => handleSend(q)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500, background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text, cursor: "pointer" }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Full briefing (sequential reveal) ── */
          <>
            {/* STEP 1 - Greeting */}
            {revealStep >= 1 && (
              <div style={{ display: "flex", gap: 10, marginBottom: 4, animation: 'primeReveal 0.4s ease forwards' }}>
                <AgentDot agent="Prime" size={CHAT_VISUALS.welcomeRowLogo} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.accent }}>Prime</span>
                    <span style={{ fontSize: 10, color: THEME.textDim }}>just now</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>
                    {greeting} Here&apos;s your briefing.
                  </div>
                  {coverage && coverage.total > 0 && (
                    <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4 }}>
                      Tag auto-categorized <span style={{ color: THEME.accent, fontWeight: 700 }}>{coverage.autoPct}%</span> of your {coverage.total.toLocaleString()} transactions.
                    </div>
                  )}
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

        {/* ══════════ UPLOAD STATUS MESSAGES ══════════ */}
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

        {/* ── C2-R: newer conversation elsewhere (offer only; never auto-switches) ── */}
        {lastSessionChecked && lastSession?.sessionId && (history.length > 0 || chatMessages.length > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 12px", marginBottom: 12, borderRadius: 10, background: THEME.accentGlow, border: `1px solid ${THEME.accent}33` }}>
            <AgentDot agent="Prime" size={18} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: THEME.textMuted }}>
              More recent conversation: <span style={{ color: THEME.text, fontWeight: 600 }}>{lastSession.title}</span>
            </span>
            <button onClick={() => handleResumeContinue(lastSession)} style={{ padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`, border: "none", color: "#0b1220", cursor: "pointer" }}>
              Continue recent conversation
            </button>
            <button onClick={() => handleResumeDismiss(lastSession)} style={{ padding: "5px 10px", borderRadius: 8, fontSize: 11, background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text, cursor: "pointer" }}>
              Dismiss
            </button>
          </div>
        )}

        {/* ══════════ CONVERSATION SECTION (live chat) ══════════ */}

        {chatMessages.length > 0 && (
          <div style={{ marginTop: 24, borderTop: `1px solid ${THEME.border}`, paddingTop: 18 }}>
            {chatMessages.map((msg) => {
              // Render structured lifecycle messages (handoff, specialist complete).
              // Skip unstructured system messages.
              if (msg.role === "system") {
                const lifecycle = parseLifecycleMessage(msg.meta as Record<string, unknown>);
                if (!lifecycle) return null;
                if (lifecycle.type === 'employee_handoff') {
                  return <div key={msg.id} id={`msg-${msg.id}`} style={{ marginBottom: 12 }}><TeamHandoffAnnouncement data={lifecycle} /></div>;
                }
                if (lifecycle.type === 'specialist_complete') {
                  return <div key={msg.id} id={`msg-${msg.id}`} style={{ marginBottom: 12 }}><SpecialistCompleteMessage data={lifecycle} /></div>;
                }
                return null;
              }
              if (msg.role === "user") {
                return (
                  <div key={msg.id} id={`msg-${msg.id}`} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <div style={{
                      maxWidth: "80%", padding: "12px 16px", borderRadius: 16,
                      borderBottomRightRadius: 4,
                      background: THEME.surfaceLight, border: `1px solid ${THEME.borderLight}`,
                      fontSize: chatTextSize(isMobileWidth), color: THEME.text, lineHeight: 1.55,
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
                <div key={msg.id} id={`msg-${msg.id}`} style={{ display: "flex", gap: 10, marginBottom: CHAT_VISUALS.messageGap }}>
                  <AgentDot agent={agentForMsg} size={CHAT_VISUALS.messageAvatar} />
                  <div style={{
                    maxWidth: "85%", padding: "12px 16px", borderRadius: 16,
                    borderBottomLeftRadius: 4,
                    background: AGENT_BG[agentForMsg], borderLeft: `3px solid ${AGENT_COLORS[agentForMsg]}44`,
                    fontSize: chatTextSize(isMobileWidth), color: THEME.text, lineHeight: CHAT_VISUALS.lineHeight, minWidth: 40,
                  }}>
                    {isThisStreaming && isEmpty ? (
                      // Thinking indicator while waiting for the first token of a real request.
                      <ThinkingIndicator color={AGENT_COLORS[agentForMsg]} label={`${agentForMsg} is thinking…`} />
                    ) : (() => {
                      const metaAny = msg.meta as any;
                      const actionReceipt = parseActionReceipt(metaAny?.toolConfirmationResult) || parseActionReceipt(metaAny?.actionReceipt);
                      if (actionReceipt) return <ActionReceiptCard receipt={actionReceipt} />;
                      const txCandidates = parseTxCandidates(metaAny);
                      // L-A: only for consultations the server recorded on this assistant message.
                      const consultations = parseSpecialistConsultations(metaAny, msg.role);
                      return (
                        <>
                          <SpecialistConsultationMarker consultations={consultations} />
                          <TypingMessage
                            content={msg.content}
                            messageId={msg.id}
                            isStreaming={isThisStreaming}
                            isTyped={typedIdsRef.current.has(msg.id)}
                            onTyped={handleMessageTyped}
                            charDelay={12}
                            maxDuration={2800}
                          />
                          {/* Revealed only after the framing above has finished typing */}
                          {txCandidates && candidateCardVisible.get(msg.id) === true && (
                            <TransactionCandidateListCard
                              candidates={txCandidates}
                              // Live reveals animate; hydrated history (typed via ref only) does not.
                              animateReveal={typedMessageIds.has(msg.id) || !typedIdsRef.current.has(msg.id)}
                              onReviewWithTag={handleReviewWithTag}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {pendingConfirmation && (
          <ConfirmationCard
            pending={pendingConfirmation}
            onConfirm={confirmToolExecution}
            onCancel={cancelToolExecution}
            disabled={isStreaming}
          />
        )}
        <div ref={bottomRef} />
      </div>

      {/* BOTTOM INPUT BAR - flex child, not absolute */}
      <div style={{
        flexShrink: 0,
        borderTop: `1px solid ${THEME.border}`,
        padding: `10px ${workspaceGutter} 12px`,
        background: THEME.bg,
      }}>
        <div className="md:hidden" style={{ marginBottom: 8 }}>
          <QuickActionChips chips={[
            { icon: "\uD83D\uDCCA", label: "Categories", action: () => { onClose?.(); navigate("/dashboard/smart-categories"); } },
            { icon: "\uD83E\uDDFE", label: "Tax summary", action: () => { onClose?.(); navigate("/dashboard/tax-assistant"); } },
            { icon: "\uD83D\uDCC8", label: "Trends", action: () => { onClose?.(); navigate("/dashboard/analytics-ai"); } },          ]} />
        </div>
        <PrimeChatInput onSend={handleSend} onFileSelected={handleFileSelected} userId={userId} sessionId={sessionId} />
      </div>
    </div>
  );
}

export default PrimeChatV2Content;

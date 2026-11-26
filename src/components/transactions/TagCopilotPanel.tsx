import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { computeComposerHeight, COMPOSER_MAX_HEIGHT_PX } from "@/lib/chatComposer";
import { CHAT_VISUALS, chatTextSize } from "@/lib/chatVisualStandards";
import { formatCalendarDate } from "@/lib/calendarDate";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { ThinkingIndicator } from "@/components/chat/ThinkingIndicator";
import { Trash2, RefreshCw, History as HistoryIcon, SquarePen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ConversationHistoryDrawer } from "@/components/chat/ConversationHistoryDrawer";
import { useChatSessions } from "@/hooks/useChatSessions";
import {
  readCachedConversation, writeCachedConversation, loadEmployeeSessions, verifyOwnedSession,
  restoreSessionMessages, type RestoredMessage,
} from "@/lib/conversationStore";
import { newClientMessageId, tagReplyOutcome, legacyTagTranscript } from "@/lib/tagConversation";
import { buildActionConversation, interpretActionResponse, isRejection, ACTION_UNKNOWN_OUTCOME, detectUserActionIntent, detectFocusedChangeRequest, type ActionTurnResult } from "@/lib/tagActionConversation";
import toast from "react-hot-toast";
import { THEME } from "@/pages/CategoriesV2/categoryConfig";
import { Reveal } from "@/pages/PrimeChatV2/Reveal";
import { getSupabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { buildTagReviewPath, anomalyAmountDisplay } from "@/lib/tagReview";
import type { FlaggedTransaction, SubcategorySuggestion } from "@/pages/CategoriesV2/useCategoriesData";
import { useIsMobile } from "@/hooks/useIsMobile";
import { TypingMessage } from "@/components/chat/TypingMessage";

const CYAN = "#22d3ee";

const T = {
  bg:        "#080f1c",
  surface:   "#0d1526",
  surface2:  "#111d33",
  border:    "#1a2740",
  borderHi:  "#223355",
  cyan:      "#22d3ee",
  cyanDim:   "rgba(34,211,238,0.12)",
  cyanGlow:  "rgba(34,211,238,0.25)",
  green:     "#34d399",
  orange:    "#fb923c",
  purple:    "#a78bfa",
  text:      "#e8f0fc",
  textMuted: "#8899b4",
  textDim:   "#4a5f7a",
  gold:      "#c8a64e",
} as const;

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');

  @keyframes tagSlideIn   { from { opacity:0; transform:translateX(24px) } to { opacity:1; transform:translateX(0) } }
  @keyframes tagFadeUp    { from { opacity:0; transform:translateY(8px)  } to { opacity:1; transform:translateY(0) } }
  @keyframes tagPulse     { 0%,100%{ opacity:0.4; transform:scale(1)    } 50%{ opacity:1; transform:scale(1.15) } }
  @keyframes tagDot       { 0%,80%,100%{ transform:translateY(0)   } 40%{ transform:translateY(-5px) } }
  @keyframes tagRing      { 0%{ box-shadow:0 0 0 0 rgba(34,211,238,0.4) } 70%{ box-shadow:0 0 0 9px rgba(34,211,238,0) } 100%{ box-shadow:0 0 0 0 rgba(34,211,238,0) } }
  @keyframes tagGlow      { 0%,100%{ opacity:0.6 } 50%{ opacity:1 } }
  @keyframes tagShimmer   { 0%{ background-position:200% 0 } 100%{ background-position:-200% 0 } }
  @keyframes tagSpin      { to{ transform:rotate(360deg) } }

  .tag-panel-scrollbar::-webkit-scrollbar       { width:3px }
  .tag-panel-scrollbar::-webkit-scrollbar-track { background:transparent }
  .tag-panel-scrollbar::-webkit-scrollbar-thumb { background:rgba(34,211,238,0.2); border-radius:4px }

  .tag-input:focus { outline:none }
  .tag-btn-send:hover { filter:brightness(1.15); transform:scale(1.05) }
  .tag-btn-send        { transition:all 0.15s ease }
  .tag-chip:hover      { background:rgba(34,211,238,0.18) !important; border-color:rgba(34,211,238,0.45) !important }
  .tag-chip            { transition:all 0.15s ease }
  .tag-clear:hover     { color:#e8f0fc !important }
  .tag-clear           { transition:color 0.15s }
  .tag-close:hover     { background:#1a2740 !important }
  .tag-close           { transition:background 0.15s }
  .tag-toggle:hover    { color:#4dd4ec !important }
  .tag-toggle          { transition:color 0.15s }
  .tag-stat-card:hover { border-color:rgba(34,211,238,0.22) !important; transform:translateY(-1px) }
  .tag-stat-card       { transition:all 0.18s ease; flex: 0 0 auto; min-width: 112px }
  .tag-stats-row::-webkit-scrollbar { display: none }
  @media (max-width: 640px) {
    .tag-stat-card     { min-width: 100px; padding: 12px 10px !important }
  }
  .tag-flag-card:hover { border-color:rgba(251,146,60,0.25) !important }
  .tag-flag-card       { transition:border-color 0.15s }
  .tag-ask-btn:hover   { filter:brightness(1.12) }
  .tag-ask-btn         { transition:filter 0.15s }
`;

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} style={{ color: T.cyan, fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i} style={{ color: "#c8d0e0" }}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split("\n").map((line, idx) => {
    const h = line.match(/^#{1,3}\s+(.+)/);
    if (h) return <div key={idx} style={{ fontWeight: 700, color: T.text, marginBottom: 4, marginTop: idx > 0 ? 8 : 0, fontFamily: "'Syne',sans-serif" }}>{h[1]}</div>;
    const b = line.match(/^[-*]\s+(.+)/);
    if (b) return (
      <div key={idx} style={{ display: "flex", gap: 7, marginBottom: 3 }}>
        <span style={{ color: T.cyan, flexShrink: 0, fontSize: 11 }}>{">"}</span>
        <span style={{ color: T.textMuted }}>{renderInline(b[1])}</span>
      </div>
    );
    const n = line.match(/^(\d+)\.\s+(.+)/);
    if (n) return (
      <div key={idx} style={{ display: "flex", gap: 7, marginBottom: 3 }}>
        <span style={{ color: T.cyan, flexShrink: 0, minWidth: 16, fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{n[1]}.</span>
        <span style={{ color: T.textMuted }}>{renderInline(n[2])}</span>
      </div>
    );
    if (!line.trim()) return <div key={idx} style={{ height: 8 }} />;
    return <div key={idx} style={{ marginBottom: 3, color: T.textMuted }}>{renderInline(line)}</div>;
  });
}


// C3 containment: review-only. This card never writes financial data. It explains that an
// amount may need attention and opens the exact transaction (existing ?tagTx reveal path).
// Dismiss only hides the card locally. No amount editing, no activity-log write.
function AmountAnomalyCard({ issue }: { issue: any }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = React.useState(false);
  const firstId = Array.isArray(issue?.transactionIds) ? issue.transactionIds[0] : undefined;
  const reviewPath = buildTagReviewPath(firstId);
  const amount = anomalyAmountDisplay(issue);

  if (dismissed) return null;

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14,
      background: "#0d1526",
      border: "1px solid rgba(239,68,68,0.22)",
      marginBottom: 8,
      boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#e8f0fc", fontFamily: "'Syne',sans-serif" }}>Review transaction amount</span>
        <span aria-label={amount.ariaLabel} style={{
          fontSize: 13, fontWeight: 700, color: "#ffffff",
          fontFamily: "'DM Mono',monospace",
          background: "rgba(239,68,68,0.18)",
          border: "1px solid rgba(239,68,68,0.38)",
          padding: "1px 8px", borderRadius: 6,
        }}>{amount.text}</span>
      </div>
      {issue.merchant && (
        <div style={{ fontSize: 12, color: "#e8f0fc", marginBottom: 4 }}>{issue.merchant}</div>
      )}
      <div style={{ fontSize: 12, color: "#8899b4", marginBottom: 12, lineHeight: 1.5 }}>
        Tag thinks this amount may be a misread. Compare it with your statement. Amount corrections are temporarily unavailable.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => { if (reviewPath) navigate(reviewPath); }}
          disabled={!reviewPath}
          style={{
            padding: "7px 14px", borderRadius: 9, fontSize: 11, fontWeight: 700,
            background: "rgba(34,211,238,0.15)",
            border: "1px solid rgba(34,211,238,0.3)",
            color: "#22d3ee", cursor: reviewPath ? "pointer" : "default",
            opacity: reviewPath ? 1 : 0.5,
            fontFamily: "'Syne',sans-serif", letterSpacing: 0.3,
          }}
        >Review transaction</button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            padding: "7px 14px", borderRadius: 9, fontSize: 11, fontWeight: 700,
            background: "transparent",
            border: "1px solid #1a2740",
            color: "#8899b4", cursor: "pointer",
            fontFamily: "'Syne',sans-serif",
          }}
        >Dismiss</button>
      </div>
    </div>
  );
}

function TagAvatar({ size = 36 }: { size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0.06) 100%)",
        border: "1.5px solid rgba(34,211,238,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 700, color: T.cyan,
        animation: "tagRing 2.4s ease-out infinite",
        boxShadow: "0 0 0 0 rgba(34,211,238,0.4), inset 0 1px 0 rgba(34,211,238,0.2)",
      }}>T</div>
    </div>
  );
}

function SectionRule({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: color, boxShadow: `0 0 8px ${color}88` }} />
      <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, color, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${color}30 0%, transparent 100%)` }} />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="tag-stat-card" style={{
      flex: 1, padding: "14px 12px", borderRadius: 12,
      background: T.surface, border: `1px solid ${T.border}`,
      textAlign: "center", cursor: "default",
    }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, color: T.textDim, fontWeight: 700, marginBottom: 8, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'Plus Jakarta Sans',sans-serif", textShadow: `0 0 16px ${color}55`, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

interface TagCopilotPanelProps {
  initialMessage?: string; onClose: () => void; firstName?: string;
  /** C2-E2A: shown only when Tag was opened from Prime; reopens the existing Prime panel. */
  onBackToPrime?: () => void;
  /** D-4: when Tag was opened from a transaction drawer, reopens that transaction. */
  onBackToTransaction?: () => void;
  /** D-6: display-only "Issuer •••• 1234" for the context card (from owner-scoped
   * tag-explain). Never added to focusedTransaction or sent to Tag. */
  focusedAccountLabel?: string | null;
  flaggedCount: number; categorizedCount: number; totalCount: number;
  avgConfidence: number; rulesCount: number;
  flaggedTransactions?: FlaggedTransaction[]; subcategorySuggestions?: SubcategorySuggestion[];
  totalSpent?: number; totalIncome?: number; txCount?: number;
  topCategories?: { category: string; total: number; transactionCount: number; budget?: number; topMerchant?: string }[];
  /** When Tag is opened from a specific import (e.g. ?import_id=X from upload),
   * the greeting scopes its opening line to that import instead of the global picture.
   * Presence of importId ALSO triggers a fresh-briefing session - stale localStorage
   * chat is cleared on mount so the user doesn't see yesterday's conversation about
   * a different import. */
  importId?: string;
  /** Human-readable institution label when scoped to an import (e.g. "RBC", "Triangle"). */
  importLabel?: string;
  /** Transaction count specific to the scoped import, when available. */
  importTxCount?: number;
  /** When a sibling surface (e.g. the transaction drawer) wants Tag to start
   * a conversation about something specific, it passes a message here. The
   * message is auto-sent to tag-copilot as if the user typed it, so Tag's
   * first reply is already on-topic about that thing. Changes to this prop
   * trigger a new auto-send - callers should set it, let it fire, then
   * reset to null before reusing. */
  injectedMessage?: string | null;
  /** When Tag is opened with a specific transaction in focus (drawer's
   * "Ask Tag" button), pass the row here. Tag will use it as the default
   * subject of "this transaction" references and follow the two-step flow:
   * update THIS transaction first, then offer to extend to the merchant
   * and create a rule. Absent ? falls back to merchant-level rule flow. */
  focusedTransaction?: {
    id: string;
    merchant_name: string;
    amount: number;
    posted_at?: string | null;
    date?: string | null;
    category?: string | null;
    subcategory?: string | null;
  } | null;
}
interface LearnedRule { id?: string; source?: 'category_rules' | 'vendor_memory'; merchant: string; category: string; confidence: number; createdAt?: string; updatedAt?: string }
interface ChatMessage { role: "user" | "assistant"; content: string }

export function TagCopilotPanel({
  initialMessage, onClose, firstName,
  flaggedCount, categorizedCount, totalCount, avgConfidence, rulesCount,
  flaggedTransactions = [], subcategorySuggestions = [],
  totalSpent, totalIncome, txCount, topCategories,
  importId, importLabel, importTxCount,
  injectedMessage,
  focusedTransaction,
  onBackToPrime,
  onBackToTransaction,
  focusedAccountLabel,
}: TagCopilotPanelProps) {
  // D-4: focused-transaction context card starts collapsed for each new transaction.
  const [contextOpen, setContextOpen] = useState(false);
  useEffect(() => { setContextOpen(false); }, [focusedTransaction?.id]);

  // Presence of importId means this is an upload-handoff session - start fresh so
  // the user sees a briefing scoped to their import, not yesterday's conversation.
  const freshBriefing = Boolean(importId);

  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(initialMessage || "");
  const [learnedRules, setLearnedRules] = useState<LearnedRule[]>([]);
  const [rulesRefreshing, setRulesRefreshing] = useState(false);
  const [reapplying, setReapplying] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const [smartReviewIssues, setSmartReviewIssues] = useState<any[]>([]);
  const [coveragePct, setCoveragePct] = useState<number | null>(null);
  const [showAllOcr, setShowAllOcr] = useState(false);
  const [showAllRules, setShowAllRules] = useState(false);

  // Auto-categorization coverage %, same RPC the Tag Rules page uses.
  // Fetch once on mount; if the user has zero transactions yet, stays at null.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      if (!sb) return;
      const { data: { user } } = await sb.auth.getUser();
      if (!user || cancelled) return;
      const { data: raw, error } = await sb.rpc("get_rules_coverage", { p_user_id: user.id });
      if (cancelled || error) return;
      const counts = (raw ?? {}) as Record<string, number>;
      const get = (k: string) => counts[k] ?? 0;
      const auto = get("tag_rule") + get("hardcoded") + get("ai") + get("learned") + get("tag_chat");
      const manual = get("user_override") + get("user_type_fix");
      const pending = get("_null") + get("needs_review");
      const total = auto + manual + pending;
      if (total > 0) setCoveragePct(Math.round((auto / total) * 100));
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDeleteRule = async (rule: LearnedRule) => {
    if (!rule.id || rule.source !== 'category_rules') {
      toast.error("Can't delete this rule type");
      return;
    }
    if (!window.confirm(`Delete rule for ${rule.merchant}?`)) return;
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase
        .from("category_rules")
        .delete()
        .eq("id", rule.id);
      if (error) throw error;
      toast.success("Rule deleted");
      // Optimistic local removal + refetch
      setLearnedRules(prev => prev.filter(r => r.id !== rule.id));
      void fetchLearnedRules();
      try {
        window.dispatchEvent(new Event("tag:stats-refresh"));
        window.dispatchEvent(new Event("transactions:refresh"));
      } catch { /* noop */ }
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  const handleReapplyRules = async () => {
    if (reapplying) return;
    setReapplying(true);
    try {
      const supabase = getSupabase();
      if (!supabase) { toast.error("Not logged in"); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error("Not logged in"); return; }
      const res = await fetch("/.netlify/functions/apply-category-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ limit: 1000 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success(`Re-applied rules - ${data.updated || 0} updated`);
        try {
          window.dispatchEvent(new Event("tag:stats-refresh"));
          window.dispatchEvent(new Event("transactions:refresh"));
        } catch { /* noop */ }
      } else {
        toast.error(data.error || "Re-apply failed");
      }
    } catch {
      toast.error("Re-apply failed");
    } finally {
      setReapplying(false);
    }
  };

  const handleAutoFix = async () => {
    if (autoFixing) return;
    setAutoFixing(true);
    try {
      const supabase = getSupabase();
      if (!supabase) { toast.error("Not logged in"); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error("Not logged in"); return; }
      const res = await fetch("/.netlify/functions/tag-categorize-committed", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ limit: 500 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        const fixed = data.typeEnforced || 0;
        if (fixed > 0) {
          toast.success(`Fixed ${fixed} income ? expense correction${fixed !== 1 ? 's' : ''}`);
          window.dispatchEvent(new Event("tag:stats-refresh"));
          window.dispatchEvent(new Event("transactions:refresh"));
        } else {
          toast.success("All transactions look correct - nothing to fix");
        }
      } else {
        toast.error(data.error || "Auto-fix failed");
      }
    } catch {
      toast.error("Auto-fix failed");
    } finally {
      setAutoFixing(false);
    }
  };

  const fetchLearnedRules = async () => {
    try {
      setRulesRefreshing(true);
      const supabase = getSupabase();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Prefer category_rules (user-defined conversational rules)
      const { data: crData } = await supabase
        .from("category_rules")
        .select("id, merchant_pattern, category, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (crData?.length) {
        setLearnedRules(crData.map((r: any) => ({
          id: r.id,
          source: 'category_rules' as const,
          merchant: String(r.merchant_pattern || "").toUpperCase(),
          category: r.category,
          confidence: 100,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })));
        return;
      }
      // Fallback: vendor_category_memory
      const { data } = await supabase
        .from("vendor_category_memory")
        .select("vendor_key, category, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(8);
      if (data?.length) {
        setLearnedRules(data.map((r: any) => ({
          merchant: String(r.vendor_key || "").toUpperCase(),
          category: r.category,
          confidence: 100,
          createdAt: r.updated_at,
        })));
      } else {
        setLearnedRules([]);
      }
    } catch { /* silent */ }
    finally { setRulesRefreshing(false); }
  };

  // T-H2: the server is the source of truth for Tag conversations. The old browser-only
  // transcript (tag_chat_history) is no longer wiped after 6 hours; it is read once, shown
  // only until the server copy loads, and never sent to the server.
  const normalizeStoredMessages = (): ChatMessage[] => {
    try { return legacyTagTranscript(localStorage.getItem("tag_chat_history")); } catch { return []; }
  };

  // If the panel opened via an upload handoff (?openTag=1), we used to wipe
  // tag_chat_history here so the user saw a briefing scoped to the import
  // they just uploaded. That wipe was too aggressive - it ran in the render
  // body (not a useEffect), firing on every re-render with a truthy importId,
  // which nuked the user's chat history any time the panel re-rendered.
  //
  // Behaviour now: the greeting effect below builds the scoped briefing fresh
  // regardless of stored history, so upload handoffs still feel "fresh". The
  // stored chat history persists as the source of truth and is only cleared
  // via (a) the 6-hour idle cutoff in normalizeStoredMessages, (b) the
  // explicit Clear button in the header.

  const [messages, setMessages] = useState<ChatMessage[]>(
    freshBriefing ? [] : normalizeStoredMessages
  );
  const [hasRestoredHistory] = useState(() =>
    freshBriefing ? false : normalizeStoredMessages().length > 0
  );
  const [isLoading, setIsLoading] = useState(false);
  // T-H2: server conversation (sessionId), save notices and history.
  const { userId } = useAuth();
  const [tagSessionId, setTagSessionId] = useState<string | null>(null);
  const tagSessionIdRef = useRef<string | null>(null);
  tagSessionIdRef.current = tagSessionId;
  const startNewConversationRef = useRef(false);
  const [saveNotice, setSaveNotice] = useState<
    | { kind: "not_saved"; text: string; clientMessageId: string }
    | { kind: "conflict" }
    | { kind: "failed"; text: string; clientMessageId: string }
    | null
  >(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { sessions: tagHistory, isLoading: tagHistoryLoading, loadSessions: loadTagHistory } =
    useChatSessions({ employee: "tag-ai", limit: 40, autoLoad: false });
  // Pending proposal that Tag has verbalized but not yet committed.
  // Captured from Tag's previous reply; fires commit when user confirms
  // ("yes" / "confirm" / "do it" / "go ahead"). Bypasses LLM to guarantee
  // the action runs even if Tag forgets to re-emit JSON.
  // T-LIVE-02: a pending proposal is either merchant-wide (preview of all matches) or ONE focused
  // transaction. Both were recorded by the server as Tag's previous reply; a "yes" is honoured only
  // for that recorded proposal.
  const [pendingProposal, setPendingProposal] = useState<
    | { kind: 'single'; transactionId: string; targetCategory: string; targetSubcategory: string | null }
    // T-ACT-SAFE: a rule / bulk move / rename Tag proposed; echoed back exactly as the server signed it.
    | { kind: 'action'; action: string; subject: Record<string, string | number | null> }
    | null
  >(null);
  const [greetingText, setGreetingText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const visibleViewport = useVisualViewport(isMobile);
  // Tracks whether user was near the bottom at last scroll. Used by the auto-scroll
  // effect below to avoid hijacking scroll position when user is reading history.
  // Bug fix: users reported the chat was "locked" - they couldn't scroll up because
  // every message/isLoading change was forcing scrollTop to the bottom unconditionally.
  const wasNearBottomRef = useRef(false);
  // Tracks which assistant messages have already finished their typewriter animation.
  // Warm-filled on mount with currently-loaded messages (restored from localStorage),
  // so re-hydrated history doesn't replay the typewriter on every panel re-open.
  const typedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { requestAnimationFrame(() => setOpen(true)); }, []);

  // Mount-only: mark all currently-loaded assistant messages as already typed,
  // so localStorage-restored history shows immediately instead of replaying.
  useEffect(() => {
    messages.forEach((m, i) => {
      if (m.role === "assistant") {
        typedIdsRef.current.add(`tag-${i}|${(m.content ?? "").slice(0, 32)}`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restored messages show at once (no typewriter replay).
  const markAllTyped = (list: ChatMessage[]) => {
    list.forEach((m, i) => {
      if (m.role === "assistant") typedIdsRef.current.add(`tag-${i}|${(m.content ?? "").slice(0, 32)}`);
    });
  };
  const toChat = (rows: RestoredMessage[]): ChatMessage[] =>
    rows.map(r => ({ role: r.role, content: r.content })).filter(m => m.content.trim().length > 0);

  // T-H2: on open, show this account's cached copy, then the server copy of the latest Tag
  // conversation (so desktop and iPhone resume the same conversation). Owner- and
  // employee-scoped; on any failure, what is on screen is kept.
  const restoredForUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || freshBriefing || restoredForUserRef.current === userId) return;
    restoredForUserRef.current = userId;
    let cancelled = false;
    let cachedSession: string | null = null;
    try {
      const cached = readCachedConversation(window.localStorage, userId, "tag-ai");
      if (cached) {
        cachedSession = cached.sessionId;
        if (cached.messages.length > 0) {
          const list = toChat(cached.messages);
          markAllTyped(list);
          setMessages(list);
        }
        if (cached.sessionId) setTagSessionId(cached.sessionId);
      }
    } catch { /* cache only */ }
    (async () => {
      const sb = getSupabase();
      if (!sb) return;
      let target = cachedSession;
      if (target && !(await verifyOwnedSession(sb, userId, target, "tag-ai"))) target = null;
      if (!target) target = (await loadEmployeeSessions(sb, userId, "tag-ai", 1))[0]?.id ?? null;
      if (!target || cancelled || startNewConversationRef.current) return;
      const rows = await restoreSessionMessages(sb, userId, target);
      if (cancelled || startNewConversationRef.current || !rows || rows.length === 0) return;
      const list = toChat(rows);
      markAllTyped(list);
      setMessages(list);
      setTagSessionId(target);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, freshBriefing]);

  // T-H2: New conversation — a fresh server conversation (newConversation:true) and the
  // stored sessionId dropped. Earlier conversations stay in History; nothing is deleted.
  const startNewConversation = () => {
    startNewConversationRef.current = true;
    setTagSessionId(null);
    setMessages([]);
    setSaveNotice(null);
    setPendingProposal(null);
    setGreetingText("");
    try { writeCachedConversation(window.localStorage, userId, "tag-ai", { sessionId: null, messages: [] }); } catch { /* cache only */ }
  };

  // T-H2: open a previous conversation from History (ownership + employee checked first).
  const openTagConversation = async (id: string) => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    if (!(await verifyOwnedSession(sb, userId, id, "tag-ai"))) {
      toast.error("That conversation isn't available.");
      return;
    }
    const rows = await restoreSessionMessages(sb, userId, id);
    if (!rows) { toast.error("Couldn't load that conversation. Try again."); return; }
    const list = toChat(rows);
    markAllTyped(list);
    startNewConversationRef.current = false;
    setMessages(list);
    setTagSessionId(id);
    setSaveNotice(null);
    setPendingProposal(null);
    setHistoryOpen(false);
  };

  const lastSentMsg = { current: "" };
  useEffect(() => {
    if (initialMessage && initialMessage.trim() && initialMessage !== lastSentMsg.current) {
      lastSentMsg.current = initialMessage;
      const t = setTimeout(() => handleSend(initialMessage.trim()), 400);
      return () => clearTimeout(t);
    }
  }, [initialMessage]);

  useEffect(() => { fetchLearnedRules(); }, []);
  useEffect(() => { fetchSmartReview(); }, []);

  const fetchSmartReview = async () => {
    try {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/.netlify/functions/tag-smart-review", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.ok && Array.isArray(json.issues)) {
        setSmartReviewIssues(json.issues.filter((i: any) => i.issueType === "amount_anomaly"));
      }
    } catch (e) {
      console.warn("[Tag] fetchSmartReview failed:", e);
    }
  };



  const handleClose = () => { setOpen(false); setTimeout(onClose, 320); };

  // Detect confirmation words - when user says "yes" / "confirm" / "do it" /
  // "go ahead" in response to a pending proposal, fire commit directly.
  const isConfirmation = (text: string): boolean => {
    const t = text.trim().toLowerCase();
    return /^(yes|yep|yeah|yup|confirm|confirmed|do it|go ahead|sure|ok|okay|apply|apply it)\b[!.\s]*$/.test(t);
  };

  // extractProposal removed Apr 25 2026 as part of tool-use refactor.
  // Old behavior: regex-extracted "move X to Y" patterns from Tag's reply text
  // and persisted them in pendingProposal so a later "yes" would fire the action.
  // This was the source of the Yo Yo Massage / save-on-foods state leak -
  // when the regex didn't match Tag's actual phrasing, pendingProposal kept
  // its stale value from earlier in the session and committed against the
  // wrong merchant. Now: the LLM calls a server tool directly via the
  // Anthropic tools API, server runs the DB write, server returns the
  // verified outcome. No client-side proposal extraction needed.

  // T-H1b (Tag HQ): action turns go to tag-action WITH the conversation, so the customer's words,
  // Tag's server-written reply and the server receipt (proposed / completed / failed / cancelled)
  // are saved in the same Tag conversation. The panel never composes "Done" itself.
  const postTagAction = async (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase!.auth.getSession();
    const token = session?.access_token ?? '';
    const res = await fetch('/.netlify/functions/tag-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const actionConversation = (customerText: string) => buildActionConversation({
    sessionId: tagSessionIdRef.current,
    clientMessageId: newClientMessageId(),
    customerText,
    startNewConversation: startNewConversationRef.current,
  });

  // Show Tag's server reply and keep the T-H2 session / save notice in step with tag-copilot turns.
  const applyActionTurn = (r: ActionTurnResult, customerText: string, clientMessageId: string) => {
    if (r.sessionId) { setTagSessionId(r.sessionId); startNewConversationRef.current = false; }
    if (r.kind === 'conflict') setSaveNotice({ kind: 'conflict' });
    else if (r.kind === 'not_saved') setSaveNotice({ kind: 'not_saved', text: customerText, clientMessageId });
    setMessages(prev => [...prev, { role: 'assistant', content: r.reply }]);
  };

  const commitPendingProposal = async (proposal: NonNullable<typeof pendingProposal>, customerText: string) => {
    setIsLoading(true);
    setSaveNotice(null);
    const conversation = actionConversation(customerText);
    try {
      // The server matches the transactions itself and honours this confirmation only for the
      // proposal it recorded as Tag's previous reply.
      const data = proposal.kind === 'action'
        ? await postTagAction({ intent: 'commit_proposal', action: proposal.action, subject: proposal.subject, conversation })
        : await postTagAction({
          intent: 'commit_single',
          transactionId: proposal.transactionId,
          targetCategory: proposal.targetCategory,
          targetSubcategory: proposal.targetSubcategory,
          conversation,
        });
      const r = interpretActionResponse(data, "I couldn't make that change, so nothing was moved.");
      applyActionTurn(r, customerText, conversation.clientMessageId);
      if (r.completed) {
        toast.success(`${r.affectedCount} transaction${r.affectedCount !== 1 ? 's' : ''} updated`);
        // Refresh transactions list + badges
        try {
          window.dispatchEvent(new Event('transactions:refresh'));
          window.dispatchEvent(new Event('tag:stats-refresh'));
        } catch { /* noop */ }
        void fetchLearnedRules();
      }
    } catch {
      // The request itself failed: the outcome is unknown. No automatic or chat-path retry.
      setMessages(prev => [...prev, { role: 'assistant', content: ACTION_UNKNOWN_OUTCOME }]);
    } finally {
      setPendingProposal(null);
      setIsLoading(false);
    }
  };

  const cancelPendingProposal = async (customerText: string) => {
    setIsLoading(true);
    setSaveNotice(null);
    const conversation = actionConversation(customerText);
    try {
      const data = await postTagAction({ intent: 'cancel_proposal', conversation });
      applyActionTurn(interpretActionResponse(data, "Okay, I won't change anything."), customerText, conversation.clientMessageId);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Okay, I won't change anything." }]);
    } finally {
      setPendingProposal(null);
      setIsLoading(false);
    }
  };

  // Merchant-wide typed intents are detected by detectUserActionIntent (lib/tagActionConversation),
  // which never treats "this" / "it" / "this expense" as a merchant name (T-LIVE-02).

  // Preview against tag-action WITH the conversation: the server records the customer's request and
  // Tag's proposal (receipt 'proposed') or "no matches" (receipt 'failed'). Nothing is changed.
  const previewAction = async (
    intent: { matchValue: string; targetCategory: string; matchType: 'contains' | 'exact' },
    customerText: string,
  ): Promise<{ result: ActionTurnResult; clientMessageId: string; data: Record<string, unknown> } | null> => {
    const conversation = actionConversation(customerText);
    try {
      const data = await postTagAction({
        intent: 'preview',
        matchValue: intent.matchValue,
        targetCategory: intent.targetCategory,
        matchType: intent.matchType,
        conversation,
      });
      const result = interpretActionResponse(
        data,
        `I searched your transactions but didn't find any matching "${intent.matchValue}". Want to try a different keyword, or tell me the merchant name you see in your list?`,
      );
      return { result, clientMessageId: conversation.clientMessageId, data };
    } catch {
      return null;
    }
  };

  // T-LIVE-02: preview a change to the FOCUSED transaction. Only its id and the customer's words are
  // sent; tag-action re-verifies ownership, resolves the category against the available categories and
  // writes Tag's proposal (receipt 'proposed') — or asks which category, without proposing anything.
  const previewSingle = async (
    transactionId: string,
    targetPhrase: string,
    customerText: string,
  ): Promise<{ result: ActionTurnResult; clientMessageId: string; data: Record<string, unknown> } | null> => {
    const conversation = actionConversation(customerText);
    try {
      const data = await postTagAction({ intent: 'preview_single', transactionId, targetPhrase, conversation });
      const result = interpretActionResponse(data, "I couldn't check that transaction, so nothing has changed. Try again?");
      return { result, clientMessageId: conversation.clientMessageId, data };
    } catch {
      return null;
    }
  };

  const handleSend = async (overrideText?: string, retryClientMessageId?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isLoading) return;
    // T-H2: a resend of a chat message goes straight back to tag-copilot with the same
    // clientMessageId. It never re-enters the action interceptors below, so a retry can
    // never re-run a preview or a confirmation.

    // INTERCEPTOR 1: If a proposal is pending and user said yes, fire commit
    // directly. Bypass the LLM so the action is guaranteed to run.
    if (!retryClientMessageId && pendingProposal && isConfirmation(text)) {
      setInputValue("");
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      await commitPendingProposal(pendingProposal, text);
      return;
    }

    // INTERCEPTOR 1b (T-H1b): the customer declines the pending proposal — record the cancellation.
    if (!retryClientMessageId && pendingProposal && isRejection(text)) {
      setInputValue("");
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      await cancelPendingProposal(text);
      return;
    }

    // INTERCEPTOR 1c (T-LIVE-02): a change request about the FOCUSED transaction ("change this to …",
    // "this should be …"). Runs before the merchant interceptor, so "this" can never become a merchant
    // search. One transaction only; never a rule, never other transactions.
    const focusedChange = !retryClientMessageId && focusedTransaction?.id ? detectFocusedChangeRequest(text) : null;
    if (focusedChange && focusedTransaction?.id) {
      setInputValue("");
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      setIsLoading(true);
      setSaveNotice(null);
      try {
        const preview = await previewSingle(focusedTransaction.id, focusedChange.targetPhrase, text);
        if (!preview) {
          setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong checking that transaction, so nothing has changed. Try again?" }]);
          setPendingProposal(null);
        } else {
          applyActionTurn(preview.result, text, preview.clientMessageId);
          const tc = typeof preview.data.targetCategory === 'string' ? preview.data.targetCategory : null;
          const ts = typeof preview.data.targetSubcategory === 'string' ? preview.data.targetSubcategory : null;
          setPendingProposal(preview.result.proposalPending && tc
            ? { kind: 'single', transactionId: focusedTransaction.id, targetCategory: tc, targetSubcategory: ts }
            : null);
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // INTERCEPTOR 2: Did the user ask for a categorization action?
    // If so, preview against real data BEFORE asking Tag. Tag's prompt
    // doesn't include merchant names, so he can't reliably confirm what
    // exists - but the DB can. We go straight to the source of truth.
    const userIntent = retryClientMessageId ? null : detectUserActionIntent(text);
    if (userIntent) {
      setInputValue("");
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      setIsLoading(true);
      setSaveNotice(null);
      try {
        const preview = await previewAction(userIntent, text);
        if (!preview) {
          setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong checking your transactions, so nothing has changed. Try again?" }]);
          setPendingProposal(null);
        } else {
          // Tag's proposal text comes from the server; a "yes" is honoured only for a proposal the
          // server recorded (receipt 'proposed').
          applyActionTurn(preview.result, text, preview.clientMessageId);
          // T-ACT-FINAL: the typed request is the same signed proposal contract — hold exactly what the
          // server signed; "yes" confirms it through commit_proposal.
          const tp = preview.data.proposal as { kind?: string; action?: unknown; subject?: unknown } | undefined;
          setPendingProposal(preview.result.proposalPending && tp && tp.kind === 'action' && typeof tp.action === 'string' && tp.subject && typeof tp.subject === 'object'
            ? { kind: 'action', action: tp.action, subject: tp.subject as Record<string, string | number | null> }
            : null);
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setInputValue("");
    // User entered the conversational LLM path - they're not confirming a
    // prior typed-command proposal. Clear any stale pendingProposal so a
    // later "yes" can't fire an action they no longer want. (Tool-use
    // path: server fires the action directly, no client-side proposal carry.)
    if (pendingProposal) setPendingProposal(null);
    // T-H2: a retry of the same message reuses its clientMessageId and does not repeat the
    // user's bubble; any other send gets a new id.
    const isRetry = !!retryClientMessageId;
    const clientMessageId = retryClientMessageId || newClientMessageId();
    setSaveNotice(null);
    if (!isRetry) {
      const userMsg: ChatMessage = { role: "user", content: text };
      setMessages(prev => [...prev, userMsg]);
    }
    setIsLoading(true);
    // User just sent a message - reset position tracker and force scroll to bottom.
    // This bypasses the conditional auto-scroll since the user action is explicit.
    wasNearBottomRef.current = true;
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/.netlify/functions/tag-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          message: text,
          // T-H2: the server keeps the conversation; client history is never sent.
          sessionId: tagSessionIdRef.current || undefined,
          clientMessageId,
          ...(startNewConversationRef.current && !tagSessionIdRef.current ? { newConversation: true } : {}),
          // Tool-use refactor (Apr 25 2026): we deliberately do NOT send a
          // systemPromptOverride from this code path. The previous override
          // contained pre-tool-use "proposal phrasing" instructions that told
          // Tag to write JSON-shaped prose like 'move X to Y', which now
          // conflicts with the structured tool calls. The server-side
          // buildSystemPrompt now has the full two-step flow rules + tool
          // guidance + focused-transaction handling, and that's authoritative.
          //
          // focusedTransaction: when present, server renders a FOCUSED
          // TRANSACTION block into the prompt and Tag follows the two-step
          // flow (update this row first, then offer to extend to merchant +
          // rule). When absent, Tag uses the standard merchant-rule flow.
          focusedTransaction: focusedTransaction || null,
        }),
      });
      if (!res.ok) throw new Error(`tag-copilot ${res.status}`);
      const data = await res.json();
      const outcome = tagReplyOutcome(data);
      if (outcome.sessionId) { setTagSessionId(outcome.sessionId); startNewConversationRef.current = false; }
      if (outcome.kind === "conflict") setSaveNotice({ kind: "conflict" });
      else if (outcome.kind === "not_saved") setSaveNotice({ kind: "not_saved", text, clientMessageId });
      let replyText: string = data.reply || "";
      // Strip HANDOFF JSON if present; capture target for graceful message
      let handoffTo: string | null = null;
      const handoffMatch = replyText.match(/HANDOFF:\s*\{[^}]*"to"\s*:\s*"([^"]+)"[^}]*\}/);
      if (handoffMatch) {
        handoffTo = handoffMatch[1];
        replyText = replyText.replace(/\s*HANDOFF:\s*\{[^}]+\}/g, "").trim();
      }
      if (!replyText) {
        replyText = handoffTo
          ? `Let me connect you to ${handoffTo.split("-")[0]} for this one...`
          : "I couldn't process that. Try again.";
      } else if (handoffTo) {
        replyText += `\n\nConnecting you to ${handoffTo.split("-")[0]}...`;
      }
      setMessages(prev => [...prev, { role: "assistant", content: replyText }]);

      // Tool-use refactor (Apr 25 2026): the LLM no longer writes "move X to Y"
      // prose for actions - it calls a server-side tool, and the server runs
      // the DB write deterministically. So the old extractProposal path is
      // gone. Any pending proposal here is stale (set by detectUserActionIntent
      // path before this LLM round-trip) and we should NOT carry it forward
      // past an unrelated LLM reply, since the user has moved on. If the
      // server fired a tool, that's the source of truth - clear pending.
      // T-H2: a duplicate (already handled) or conflict (nothing ran) reply is display-only:
      // nothing is applied or refreshed again.
      if (!outcome.mayApply) return;
      // T-LIVE-02: Tag proposed a change to ONE transaction (nothing was written). Hold it so the
      // customer's explicit "yes" goes to tag-action commit_single, which binds to the server-signed
      // proposal. Only a proposal the server saved (`proposal` is present only when persisted) counts.
      const p = data.proposal;
      if (p && p.kind === 'single' && typeof p.transactionId === 'string' && typeof p.targetCategory === 'string') {
        setPendingProposal({ kind: 'single', transactionId: p.transactionId, targetCategory: p.targetCategory, targetSubcategory: typeof p.targetSubcategory === 'string' ? p.targetSubcategory : null });
        return;
      }
      // T-ACT-SAFE: Tag proposed a rule / bulk move / rename (nothing written). "yes" → commit_proposal.
      if (p && p.kind === 'action' && typeof p.action === 'string' && p.subject && typeof p.subject === 'object') {
        setPendingProposal({ kind: 'action', action: p.action, subject: p.subject });
        return;
      }
      const actionFired = !!(data.action?.applied || data.rule_saved || (data.backfill_count || 0) > 0);
      if (actionFired) {
        setPendingProposal(null);
      }

      // If Tag performed any write (rule saved, bulk apply, correction),
      // tell the transactions list + badge to refresh.
      if (data.rule_saved || data.action?.applied || (data.backfill_count || 0) > 0) {
        try {
          window.dispatchEvent(new Event("transactions:refresh"));
          window.dispatchEvent(new Event("tag:stats-refresh"));
        } catch { /* noop */ }
        void fetchLearnedRules();
      }
    } catch {
      // T-H2: no automatic retry. The customer can resend the same message (same id).
      setSaveNotice({ kind: "failed", text, clientMessageId });
    } finally {
      setIsLoading(false);
      // Only auto-scroll on response if user didn't scroll up to read history mid-request.
      setTimeout(() => {
        if (scrollRef.current && wasNearBottomRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  // Auto-send a message passed in from a sibling surface (e.g. the transaction
  // drawer's "Ask Tag about this" button). Fires once per distinct injection,
  // tracked by a ref so remounts/re-renders don't re-fire the same message.
  const lastInjectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!injectedMessage) return;
    if (lastInjectedRef.current === injectedMessage) return;
    lastInjectedRef.current = injectedMessage;
    void handleSend(injectedMessage);
    // handleSend intentionally omitted from deps - stable per render is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectedMessage]);

  // When importId changes (user navigates between imports while panel is open),
  // reset the in-memory greeting and conversation so they see a fresh briefing
  // for the new import context. Without this, greetingText would persist from
  // the first import.
  //
  // We intentionally do NOT wipe localStorage here - that would destroy the
  // user's chat history the moment they navigate between scopes, even if they
  // just meant to take a quick look. The stored history survives; when the user
  // returns to the scope it was written in (or to the global view), the panel
  // can re-read it on next mount.
  const prevImportIdRef = useRef<string | undefined>(importId);
  useEffect(() => {
    if (prevImportIdRef.current !== importId) {
      prevImportIdRef.current = importId;
      setGreetingText("");
      setMessages([]);
    }
  }, [importId]);

  useEffect(() => {
    if (greetingText) return;
    const count = txCount || totalCount || 0;
    if (count === 0 && (topCategories || []).length === 0) return;

    const hi = firstName ? `Hey ${firstName}` : "Hey";
    const sorted = [...(topCategories || [])].sort((a, b) => b.total - a.total);
    const realCategories = sorted.filter(c => c.category !== "Transfers");
    const fmtAmount = (n: number) =>
      `$${n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // "Since last visit" detection - only for global view, not scoped imports
    // We store the visit timestamp + a snapshot of count on each panel open.
    // On subsequent open, diff against snapshot to surface what's new.
    let sinceVisitLine = "";
    if (!importId) {
      try {
        const lastVisitTs = Number(localStorage.getItem("tag_last_visit_ts") || 0);
        const lastVisitCount = Number(localStorage.getItem("tag_last_visit_count") || 0);
        const now = Date.now();
        const DAY_MS = 24 * 60 * 60 * 1000;

        // Only greet about "since last visit" if the previous visit was =1 hour ago
        // (avoids awkward "welcome back, 0 new transactions since 3 min ago").
        if (lastVisitTs > 0 && now - lastVisitTs > 60 * 60 * 1000) {
          const deltaCount = count - lastVisitCount;
          const daysAgo = Math.round((now - lastVisitTs) / DAY_MS);
          const whenPhrase =
            daysAgo <= 0 ? "today" :
            daysAgo === 1 ? "yesterday" :
            daysAgo < 7 ? `${daysAgo} days ago` :
            daysAgo < 14 ? "a week ago" :
            daysAgo < 35 ? `${Math.round(daysAgo / 7)} weeks ago` :
            "a while back";

          if (deltaCount > 5) {
            sinceVisitLine = `Welcome back - **${deltaCount} new transactions** since ${whenPhrase}. `;
          } else if (daysAgo >= 3) {
            sinceVisitLine = `Welcome back - it's been ${whenPhrase}. `;
          }
        }

        // Persist this visit for next time
        localStorage.setItem("tag_last_visit_ts", String(now));
        localStorage.setItem("tag_last_visit_count", String(count));
      } catch {
        // localStorage blocked / full - skip the personalization
      }
    }

    // Compose a casual chat message with real numbers woven in.
    // Bold (**) wraps numeric/category highlights - renderMarkdown handles the styling.
    let text = "";

    if (importId) {
      // Scoped to a specific import (user landed here via ?import_id=X from upload)
      const label = importLabel ? `your ${importLabel} statement` : "that statement";
      const txPart = importTxCount
        ? `your **${importTxCount} transactions** from ${label}`
        : `your transactions from ${label}`;
      const flaggedPart =
        flaggedCount > 0
          ? `**${flaggedCount} flagged** transaction${flaggedCount !== 1 ? "s" : ""} I'd love your eyes on.`
          : `Nothing flagged - everything categorized cleanly.`;
      const topPart = realCategories[0]
        ? `Biggest spend was **${realCategories[0].category}** at **${fmtAmount(realCategories[0].total)}**.`
        : "";
      text = `${hi} - I've got ${txPart} sorted out. ${flaggedPart} ${topPart}\n\nWant me to walk through the flagged ones, or dig into a specific category?`;
    } else if (flaggedCount > 0) {
      // Global view with flagged items - lead with the action
      const top3 = realCategories.slice(0, 3);
      const catsList = top3.length
        ? top3.map(c => `**${c.category}** ${fmtAmount(c.total)}`).join(", ")
        : "";
      text = `${sinceVisitLine}${hi} - I've got your **${count} transactions** sorted across your books. There ${flaggedCount === 1 ? "is" : "are"} **${flaggedCount} flagged** transaction${flaggedCount !== 1 ? "s" : ""} I'd love your eyes on.${catsList ? ` Your top categories: ${catsList}.` : ""}\n\nWant to review the flagged ones first, or dig into a category?`;
    } else if (realCategories.length > 0) {
      // Global view, clean books - summary + invitation
      const top = realCategories[0];
      const top3 = realCategories.slice(0, 3);
      const catsList = top3
        .slice(1)
        .map(c => `**${c.category}** ${fmtAmount(c.total)}`)
        .join(", ");
      text = `${sinceVisitLine}${hi} - I've got your **${count} transactions** sorted out. Nothing needs your review right now. Your biggest spend is **${top.category}** at **${fmtAmount(top.total)}**${catsList ? `, then ${catsList}` : ""}.\n\nWant me to break down what's in ${top.category}, or look for anything deductible?`;
    } else {
      // Fallback - no category data yet
      text = `${hi} - I'm your categorization engine. Want to reclassify a merchant, see what may be tax-relevant, or build a rule for any spending pattern?`;
    }

    setGreetingText(text);
  }, [txCount, totalCount, topCategories, totalSpent, flaggedCount, rulesCount, importId, importLabel, importTxCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].role === "assistant") return i; }
    return -1;
  }, [messages]);

  // Scroll position tracker. Fires on every scroll; records whether the user is
  // near the bottom (within 120px). Used below to decide whether to auto-scroll.
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    wasNearBottomRef.current = distanceFromBottom < 120;
  };

  // Scroll-keeper: MutationObserver watches the chat container for any DOM
  // change (new message appends AND per-character text growth from <TypingMessage>).
  // Pinned to bottom only when user was already near bottom, so reading history
  // is never hijacked. Replaces the old [messages, isLoading] effect, which only
  // fired on full message-array changes and missed the intermediate DOM mutations
  // during the typewriter animation.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const stickToBottom = () => {
      if (wasNearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    };
    stickToBottom();
    const obs = new MutationObserver(stickToBottom);
    obs.observe(el, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, []);

  // T-H2: account-scoped cache (per user and employee) for a fast first paint only; the server
  // copy replaces it. The old global tag_chat_history key is no longer written.
  useEffect(() => {
    if (!userId || messages.length === 0) return;
    writeCachedConversation(window.localStorage, userId, "tag-ai", {
      sessionId: tagSessionId,
      messages: messages.map((m, i) => ({ id: `c${i}`, role: m.role, content: m.content, createdAt: "" })),
    });
  }, [messages, tagSessionId, userId]);

  const canSend = inputValue.trim() && !isLoading;

  // UX-C1: auto-grow the composer from one line up to COMPOSER_MAX_HEIGHT_PX, then scroll.
  // Re-measures on every value change, including the reset to "" after sending.
  const composerRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    const { height, scrollable } = computeComposerHeight(el.scrollHeight);
    el.style.height = `${height}px`;
    el.style.overflowY = scrollable ? "auto" : "hidden";
  }, [inputValue]);

  return (
    <>
      <style>{STYLES}</style>
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        // UX-P2d: on phones, fit the visible viewport so the composer stays above the keyboard.
        ...(isMobile && visibleViewport ? { top: visibleViewport.offsetTop, bottom: "auto", height: visibleViewport.height } : null),
        width: "min(500px, 100vw)",
        maxWidth: "100vw",
        background: T.bg,
        borderLeft: `1px solid ${T.border}`,
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundImage: `
          radial-gradient(ellipse 60% 40% at 90% 0%, rgba(34,211,238,0.04) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 10% 100%, rgba(167,139,250,0.03) 0%, transparent 70%)
        `,
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.38s cubic-bezier(0.16,1,0.3,1)",
        zIndex: 999,
        display: "flex", flexDirection: "column",
        overscrollBehavior: "contain",
        boxShadow: "-24px 0 80px rgba(0,0,0,0.6), -1px 0 0 rgba(34,211,238,0.06)",
      }}>

        {/* T-H2: the shared history drawer (same component as Prime), Tag's conversations only. */}
        <ConversationHistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          items={tagHistory.map(h => ({ id: h.id, title: h.title, lastActivity: h.last_message_at || h.created_at }))}
          loading={tagHistoryLoading}
          currentId={tagSessionId}
          onSelect={(id) => { void openTagConversation(id); }}
          onNewChat={() => { startNewConversation(); setHistoryOpen(false); }}
          accent={T.cyan}
          fallbackTitle="Tag conversation"
        />
        {/* Header — UX-C1: clears the iPhone status bar in the installed app
            (index.html uses viewport-fit=cover); env() is 0 elsewhere. */}
        <div style={{
          padding: "calc(18px + env(safe-area-inset-top, 0px)) 20px 16px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", gap: 12,
          background: "linear-gradient(180deg, rgba(13,21,38,0.95) 0%, rgba(8,15,28,0.8) 100%)",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
        }}>
          <TagAvatar size={CHAT_VISUALS.headerLogo} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: CHAT_VISUALS.headerName, fontWeight: 800, color: T.text, letterSpacing: 0.2, lineHeight: 1.2 }}>
              Tag <span style={{ fontWeight: 500, color: T.textMuted }}>Copilot</span>
            </div>
            <div style={{ fontSize: CHAT_VISUALS.headerSubtitle, color: T.textMuted, marginTop: 2, letterSpacing: 0.1 }}>Categorization intelligence</div>
          </div>
          <div style={{
            padding: "4px 10px", borderRadius: 20,
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.2)",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%", background: T.green,
              animation: "tagGlow 2s ease-in-out infinite",
              boxShadow: `0 0 6px ${T.green}`,
            }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: T.green }}>LIVE</span>
          </div>
          {/* T-H2: History (previous Tag conversations) and New conversation. Nothing is deleted. */}
          <button
            type="button"
            onClick={() => { setHistoryOpen(true); void loadTagHistory(); }}
            aria-label="Previous Tag conversations"
            title="History"
            style={{ width: 44, height: 44, background: "none", border: `1px solid ${T.border}`, cursor: "pointer", color: T.textMuted, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, flexShrink: 0 }}
          >
            <HistoryIcon size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={startNewConversation}
            aria-label="New conversation"
            title="New conversation"
            style={{ width: 44, height: 44, background: "none", border: `1px solid ${T.border}`, cursor: "pointer", color: T.textMuted, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, flexShrink: 0 }}
          >
            <SquarePen size={18} aria-hidden="true" />
          </button>
          {onBackToPrime && (
            <button
              type="button"
              onClick={onBackToPrime}
              aria-label="Back to Prime"
              data-testid="tag-back-to-prime"
              style={{ height: 30, padding: "0 10px", borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, color: T.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {"← Back to Prime"}
            </button>
          )}
          <button
            className="tag-close"
            onClick={handleClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, color: T.textMuted, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
          >{"x"}</button>
        </div>

        {/* Focused-transaction pill - shows when Tag was opened from a drawer
            or single-row context. Tells the user which row Tag is anchored
            to, so the two-step flow ("change THIS one, then offer to extend")
            has visible grounding. */}
        {/* D-4: compact, expandable context card for the focused transaction. Same
            focusedTransaction data; nothing here changes what is sent to Tag. */}
        {focusedTransaction && focusedTransaction.id && (() => {
          const ftAmount = Number(focusedTransaction.amount || 0);
          const ftAmountText = `${ftAmount < 0 ? '−' : ftAmount > 0 ? '+' : ''}$${Math.abs(ftAmount).toFixed(2)}`;
          const ftDate = formatCalendarDate(focusedTransaction.posted_at || focusedTransaction.date, 'long');
          const ftClass = [focusedTransaction.category || 'Uncategorized', focusedTransaction.subcategory].filter(Boolean).join(' · ');
          return (
            <div style={{ background: "rgba(34,211,238,0.05)", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setContextOpen(v => !v)}
                aria-expanded={contextOpen}
                aria-controls="tag-focused-context"
                style={{
                  width: "100%", minHeight: 52, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10,
                  background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: T.cyan, flexShrink: 0 }}>Looking at</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {focusedTransaction.merchant_name || 'Transaction'}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.text, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{ftAmountText}</span>
                <span aria-hidden="true" style={{ color: T.textMuted, flexShrink: 0, transform: contextOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
              </button>
              {contextOpen && (
                <div id="tag-focused-context" style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <dl style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px 16px", margin: 0 }}>
                    {ftDate && (
                      <div style={{ minWidth: 0 }}>
                        <dt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: T.textMuted }}>Date</dt>
                        <dd style={{ margin: "2px 0 0", fontSize: 15, color: T.text }}>{ftDate}</dd>
                      </div>
                    )}
                    {focusedAccountLabel && (
                      <div style={{ minWidth: 0 }}>
                        <dt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: T.textMuted }}>Account</dt>
                        <dd style={{ margin: "2px 0 0", fontSize: 15, color: T.text, overflowWrap: "anywhere" }}>{focusedAccountLabel}</dd>
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <dt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: T.textMuted }}>Category</dt>
                      <dd style={{ margin: "2px 0 0", fontSize: 15, color: T.text, overflowWrap: "anywhere" }}>{ftClass}</dd>
                    </div>
                  </dl>
                  {onBackToTransaction && (
                    <button
                      type="button"
                      onClick={onBackToTransaction}
                      style={{
                        alignSelf: "flex-start", minHeight: 44, padding: "0 14px", borderRadius: 10,
                        border: "1px solid rgba(34,211,238,0.35)", background: "rgba(34,211,238,0.08)",
                        color: T.cyan, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {'←'} Back to transaction
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Body */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="tag-panel-scrollbar"
          style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "24px 20px 16px", display: "flex", flexDirection: "column", justifyContent: "flex-start", WebkitOverflowScrolling: "touch" }}
        >
          {/* Greeting */}
          {greetingText && messages.length === 0 && (
            <div style={{ display: "flex", gap: 10, marginBottom: 8, animation: "tagFadeUp 0.22s ease forwards" }}>
              <TagAvatar size={CHAT_VISUALS.messageAvatar} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: T.cyan, fontFamily: "'Syne',sans-serif" }}>Tag</span>
                  <span style={{ fontSize: 9.5, color: T.textDim }}>just now</span>
                </div>
                <div style={{
                  fontSize: chatTextSize(isMobile), color: T.text, lineHeight: 1.6,
                  padding: "13px 16px", borderRadius: "4px 14px 14px 14px",
                  background: "linear-gradient(135deg, rgba(34,211,238,0.07) 0%, rgba(34,211,238,0.03) 100%)",
                  border: "1px solid rgba(34,211,238,0.14)",
                  borderLeft: "3px solid rgba(34,211,238,0.5)",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.25)",
                }}>
                  {renderMarkdown(greetingText)}
                </div>
              </div>
            </div>
          )}

          {/* Category intelligence summary card - renders whenever we have
              category data and no active conversation, independent of the
              greeting text (which may load async). */}
          {messages.length === 0 && (topCategories || []).length > 0 && (() => {
            const sorted = [...(topCategories || [])].sort((a, b) => b.total - a.total).slice(0, 3);
            const fmtCad = (n: number) => n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
            const spike = (topCategories || []).find(c => c.budget && c.budget > 0 && c.total > c.budget * 2);
            const insight = spike
              ? `${spike.category} is ${Math.round((spike.total / (spike.budget || 1)) * 100)}% of budget - want me to break that down?`
              : sorted[0]
              ? `${sorted[0].category} is your biggest category at $${fmtCad(sorted[0].total)}. Ask me anything about it.`
              : null;
            return (
              <div style={{
                marginLeft: 38,
                marginTop: 12,
                marginBottom: 8,
                padding: "14px 16px",
                borderRadius: 14,
                background: "linear-gradient(135deg, rgba(34,211,238,0.05) 0%, rgba(34,211,238,0.01) 100%)",
                border: "1px solid rgba(34,211,238,0.12)",
                animation: "tagFadeUp 0.3s ease forwards",
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: T.cyan, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  Top Categories
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sorted.map((c, i) => (
                    <div key={c.category} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textDim, width: 14, fontFamily: "'DM Mono',monospace" }}>{i + 1}.</div>
                      <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: T.text }}>{c.category}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.cyan, fontFamily: "'DM Mono',monospace" }}>${fmtCad(c.total)}</div>
                      <div style={{ fontSize: 10, color: T.textDim, fontFamily: "'DM Mono',monospace", minWidth: 38, textAlign: "right" }}>{c.transactionCount} tx</div>
                    </div>
                  ))}
                </div>
                {insight && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(34,211,238,0.08)", fontSize: 11.5, color: T.textMuted, lineHeight: 1.5 }}>
                    {insight}
                  </div>
                )}
                <div style={{ marginTop: 10, fontSize: 10, color: T.textDim, fontStyle: "italic" }}>
                  Ask about a category - "how much on groceries?" or "show me coffee"
                </div>
              </div>
            );
          })()}

          {/* Details toggle */}
          {!hasRestoredHistory && greetingText && (
            <div style={{ marginLeft: 38, marginTop: 10, marginBottom: detailsOpen ? 10 : 18 }}>
              <button
                type="button"
                className="tag-toggle"
                onClick={() => setDetailsOpen(!detailsOpen)}
                style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, padding: 0, fontSize: 11, fontWeight: 700, color: T.cyan, fontFamily: "'Syne',sans-serif", letterSpacing: 0.3 }}
              >
                <span style={{ transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1)", transform: detailsOpen ? "rotate(90deg)" : "rotate(0deg)", fontSize: 8, opacity: 0.7 }}>{"\u25B6"}</span>
                {detailsOpen ? "Hide details" : "Show stats, flagged & rules"}
              </button>
            </div>
          )}

          {/* Stats */}
          {greetingText && detailsOpen && (
            <Reveal delay={0} style={{ marginLeft: 38, marginTop: 4, marginBottom: 22 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 8,
                  paddingBottom: 4,
                }}
                className="tag-stats-row"
              >
                <StatCard
                  label="Categorized"
                  value={`${categorizedCount ?? 0}`}
                  color={T.green}
                />

                <StatCard
                  label="Flagged"
                  value={Number.isFinite(flaggedCount) ? `${flaggedCount ?? 0}` : "-"}
                  color={T.orange}
                />
                <StatCard
                  label="Rules"
                  value={`${learnedRules.length || rulesCount || 0}`}
                  color={T.purple}
                />
                <StatCard
                  label="Coverage"
                  value={coveragePct !== null ? `${coveragePct}%` : "-"}
                  color={T.cyan}
                />
              </div>
            </Reveal>
          )}

          {/* Flagged transactions */}
          {greetingText && detailsOpen && flaggedTransactions.length > 0 && (
            <Reveal delay={200} style={{ marginLeft: 38, marginBottom: 22 }}>
              <SectionRule color={T.orange} label="Needs Your Review" />
              {flaggedTransactions.map((f, i) => (
                <div
                  key={f.id || i}
                  className="tag-flag-card"
                  style={{
                    padding: "14px 16px", borderRadius: 14,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    marginBottom: 8,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text, fontFamily: "'Syne',sans-serif" }}>{f.merchant}</span>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: "#ffffff",
                      fontFamily: "'DM Mono',monospace",
                      background: "rgba(251,146,60,0.18)",
                      border: "1px solid rgba(251,146,60,0.38)",
                      padding: "1px 8px", borderRadius: 6,
                    }}>{f.amount}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12, lineHeight: 1.5 }}>{f.issue}</div>
                  <button
                    className="tag-ask-btn"
                    onClick={() => handleSend(`Help me categorize ${f.merchant} ${f.amount}`)}
                    style={{
                      padding: "7px 14px", borderRadius: 9, fontSize: 11, fontWeight: 700,
                      background: "rgba(34,211,238,0.1)",
                      border: "1px solid rgba(34,211,238,0.22)",
                      color: "#ffffff", cursor: "pointer",
                      fontFamily: "'Syne',sans-serif", letterSpacing: 0.3,
                    }}
                  >Ask Tag {"->"}</button>
                </div>
              ))}
            </Reveal>
          )}


          {/* Amount anomaly cards */}
          {greetingText && detailsOpen && smartReviewIssues && smartReviewIssues.filter((i: any) => i.issueType === 'amount_anomaly').length > 0 && (
            <Reveal delay={300} style={{ marginLeft: 38, marginBottom: 22 }}>
              <SectionRule color="#ef4444" label="Possible OCR Misreads" />
              {(() => {
                const ocrIssues = smartReviewIssues.filter((i: any) => i.issueType === 'amount_anomaly');
                const visible = showAllOcr ? ocrIssues : ocrIssues.slice(0, 3);
                return (
                  <>
                    {visible.map((issue: any) => (
                      <AmountAnomalyCard key={issue.id} issue={issue} />
                    ))}
                    {ocrIssues.length > 3 && (
                      <button
                        onClick={() => setShowAllOcr(s => !s)}
                        style={{
                          background: "transparent",
                          border: `1px dashed ${T.border}`,
                          borderRadius: 8,
                          padding: "8px 12px",
                          color: T.textDim,
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          letterSpacing: 0.4,
                          width: "100%",
                          marginTop: 6,
                        }}
                      >
                        {showAllOcr ? "Show top 3 only" : `Show all ${ocrIssues.length} misreads`}
                      </button>
                    )}
                  </>
                );
              })()}
            </Reveal>
          )}
          {/* Subcategory suggestions */}
          {greetingText && detailsOpen && subcategorySuggestions.length > 0 && (
            <Reveal delay={400} style={{ marginLeft: 38, marginBottom: 22 }}>
              <SectionRule color={T.purple} label="Subcategory Splits Detected" />
              {subcategorySuggestions.map((sg, idx) => (
                <div key={idx} style={{
                  padding: "16px", borderRadius: 14,
                  background: "rgba(167,139,250,0.04)",
                  border: "1px solid rgba(167,139,250,0.12)",
                  marginBottom: 10,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, marginBottom: 3, fontFamily: "'Syne',sans-serif" }}>
                    Split "{sg.parentCategory}" {"->"} {sg.subcategories.length} subcategories
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>Distinct spending patterns detected</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {sg.subcategories.map(s => (
                      <div key={s.name} style={{
                        display: "flex", alignItems: "center", gap: 11,
                        padding: "9px 13px", borderRadius: 10,
                        background: T.surface2, border: `1px solid ${T.border}`,
                      }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: sg.parentColor, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: "'Syne',sans-serif" }}>{s.name}</div>
                          <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 1 }}>{s.count} txns {"\u00b7"} Top: {s.topMerchant}</div>
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text, fontFamily: "'DM Mono',monospace" }}>{s.amount}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="tag-ask-btn"
                    onClick={() => handleSend(`Split my ${sg.parentCategory} category into subcategories: ${sg.subcategories.map(s => s.name).join(", ")}`)}
                    style={{
                      width: "100%", padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: `linear-gradient(135deg, ${T.cyan}, #0891b2)`,
                      border: "none", color: "#080f1c", cursor: "pointer",
                      boxShadow: "0 2px 16px rgba(34,211,238,0.25)",
                      fontFamily: "'Syne',sans-serif", letterSpacing: 0.4,
                    }}
                  >Ask Tag to Apply Split</button>
                </div>
              ))}
            </Reveal>
          )}

          {/* Learned rules */}
          {greetingText && detailsOpen && (
            <Reveal delay={600} style={{ marginLeft: 38, marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <SectionRule color={T.green} label="Rules I've Learned" />
                </div>
                <button
                  onClick={handleReapplyRules}
                  disabled={reapplying}
                  title="Re-apply all rules to your transactions"
                  style={{
                    background: reapplying ? "rgba(52,211,153,0.15)" : "rgba(52,211,153,0.08)",
                    border: `1px solid ${T.green}55`,
                    borderRadius: 6,
                    padding: "4px 10px",
                    color: T.green,
                    cursor: reapplying ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 14,
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    letterSpacing: 0.3,
                  }}
                >
                  <RefreshCw size={11} style={{ animation: reapplying ? "tagSpin 0.9s linear infinite" : "none" }} />
                  {reapplying ? "Applying..." : "Re-apply Rules"}
                </button>
                <button
                  onClick={fetchLearnedRules}
                  disabled={rulesRefreshing}
                  title="Refresh rules list"
                  style={{
                    background: "transparent",
                    border: `1px solid ${T.border}`,
                    borderRadius: 6,
                    padding: "4px 6px",
                    color: T.green,
                    cursor: rulesRefreshing ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <RefreshCw size={12} style={{ animation: rulesRefreshing ? "tagSpin 0.9s linear infinite" : "none" }} />
                </button>
                <button
                  onClick={handleAutoFix}
                  disabled={autoFixing}
                  title="Auto-fix income/expense errors from OCR delta cascade"
                  style={{
                    background: autoFixing ? "rgba(251,146,60,0.15)" : "rgba(251,146,60,0.08)",
                    border: "1px solid rgba(251,146,60,0.35)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    color: "#fb923c",
                    cursor: autoFixing ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 14,
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    letterSpacing: 0.3,
                  }}
                >
                  <RefreshCw size={11} style={{ animation: autoFixing ? "tagSpin 0.9s linear infinite" : "none" }} />
                  {autoFixing ? "Fixing..." : "Auto-Fix"}
                </button>
              </div>
              <div style={{
                padding: "4px 0", borderRadius: 14,
                background: T.surface, border: `1px solid ${T.border}`,
                overflow: "hidden",
                boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
              }}>
                {(showAllRules ? learnedRules : learnedRules.slice(0, 5)).map((r, i, arr) => (
                  <div key={i} style={{
                    display: "flex", flexDirection: "column", gap: 4,
                    padding: "10px 16px",
                    borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: T.text, flex: 1, fontFamily: "'DM Mono',monospace", letterSpacing: 0.5 }}>{r.merchant}</span>
                      <span style={{ fontSize: 11, color: T.textDim }}>{"->"}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "#ffffff",
                        background: "rgba(34,211,238,0.12)",
                        border: "1px solid rgba(34,211,238,0.22)",
                        padding: "2px 9px", borderRadius: 6, minWidth: 90, textAlign: "center",
                      }}>{r.category}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: T.green, fontFamily: "'DM Mono',monospace" }}>{r.confidence}%</span>
                      {r.id && r.source === 'category_rules' && (
                        <button
                          onClick={() => handleDeleteRule(r)}
                          title="Delete rule"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#f87171",
                            cursor: "pointer",
                            padding: 4,
                            display: "flex",
                            alignItems: "center",
                            opacity: 0.7,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    {(r.createdAt || r.updatedAt) && (() => {
                      const fmtD = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
                      const created = r.createdAt ? fmtD(r.createdAt) : null;
                      const updated = r.updatedAt ? fmtD(r.updatedAt) : null;
                      const label = updated && created && updated !== created
                        ? `Updated ${updated}`
                        : created
                        ? `Added ${created}`
                        : updated ? `Updated ${updated}` : null;
                      return label ? (
                        <div style={{ fontSize: 9.5, color: T.textDim, fontFamily: "'DM Mono',monospace", letterSpacing: 0.3 }}>
                          {label}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
              {learnedRules.length > 5 && (
                <button
                  onClick={() => setShowAllRules(s => !s)}
                  style={{
                    background: "transparent",
                    border: `1px dashed ${T.border}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: T.textDim,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    letterSpacing: 0.4,
                    width: "100%",
                    marginTop: 8,
                  }}
                >
                  {showAllRules ? "Show top 5 only" : `Show all ${learnedRules.length} rules`}
                </button>
              )}
            </Reveal>
          )}

          {/* Tag recommends */}
          {greetingText && detailsOpen && messages.length === 0 && (
            <Reveal delay={800} style={{ marginLeft: 38 }}>
              <SectionRule color={T.cyan} label="Tag Recommends" />
              <div style={{
                fontSize: chatTextSize(isMobile), color: T.textMuted, lineHeight: 1.6,
                padding: "14px 16px", borderRadius: 14,
                background: "linear-gradient(135deg, rgba(34,211,238,0.06) 0%, transparent 100%)",
                border: "1px solid rgba(34,211,238,0.12)",
              }}>
                {flaggedCount > 0
                  ? `Start with the ${flaggedCount} flagged transaction${flaggedCount !== 1 ? "s" : ""} - once those are categorized, your spending totals will be accurate and Prime can give you a better summary.`
                  : subcategorySuggestions.length > 0
                  ? "All transactions look good. Consider approving the subcategory splits - it will give Crystal better data for trend analysis."
                  : "Everything looks clean. Your categories are well organized and Tag confidence is high."
                }
              </div>
            </Reveal>
          )}

          {/* Chat thread */}
          {/* Parse category suggestion chips from a Tag reply */}
          {(() => { /* noop - closure for helper */ return null; })()}
          {messages.map((msg, i) => {
            const isLastAssistant = msg.role === "assistant" && i === lastAssistantIdx;
            const isUser = msg.role === "user";
            // Detect merchant-queue question and extract suggested category chips
            const isMerchantQuestion = !isUser && isLastAssistant && !isLoading &&
              /what (?:are|is) (?:these|this) usually\??/i.test(msg.content || "");
            let suggestedChips: string[] = [];
            if (isMerchantQuestion) {
              const text = msg.content || "";
              const afterQ = text.split(/what (?:are|is) (?:these|this) usually\??/i)[1] || "";
              // Parse comma/slash/or-separated category names, strip punctuation
              const candidates = afterQ
                .replace(/[\[\]\(\)]/g, "")
                .split(/[,/]|\bor\b/i)
                .map(s => s.trim().replace(/[.?!]+$/, "").trim())
                .filter(s => s.length >= 3 && s.length <= 40 && /[A-Za-z]/.test(s));
              suggestedChips = Array.from(new Set(candidates)).slice(0, 3);
            }
            return (
              <div key={i} style={{
                display: "flex", gap: 9, marginTop: 18,
                flexDirection: isUser ? "row-reverse" : "row",
                animation: isLastAssistant ? "tagFadeUp 0.2s ease forwards" : "none",
              }}>
                {!isUser && <TagAvatar size={CHAT_VISUALS.messageAvatar} />}
                <div style={{
                  maxWidth: "78%",
                  padding: "12px 16px",
                  fontSize: chatTextSize(isMobile), lineHeight: 1.6,
                  ...(isUser ? {
                    borderRadius: "14px 4px 14px 14px",
                    background: "rgba(34,211,238,0.1)",
                    border: "1px solid rgba(34,211,238,0.2)",
                    color: T.text,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
                  } : {
                    borderRadius: "4px 14px 14px 14px",
                    background: "linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(34,211,238,0.02) 100%)",
                    border: "1px solid rgba(34,211,238,0.1)",
                    borderLeft: "3px solid rgba(34,211,238,0.4)",
                    color: T.textMuted,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
                  }),
                }}>
                  {isUser ? msg.content : (
                    <TypingMessage
                      content={msg.content ?? ""}
                      messageId={`tag-${i}|${(msg.content ?? "").slice(0, 32)}`}
                      isStreaming={false}
                      isTyped={typedIdsRef.current.has(`tag-${i}|${(msg.content ?? "").slice(0, 32)}`)}
                      onTyped={(id) => typedIdsRef.current.add(id)}
                      charDelay={12}
                      maxDuration={2800}
                      renderer={(text) => <>{renderMarkdown(text)}</>}
                    />
                  )}
                  {isMerchantQuestion && suggestedChips.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {suggestedChips.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleSend(cat)}
                          className="tag-chip"
                          style={{
                            fontSize: 11, fontWeight: 700,
                            padding: "5px 11px", borderRadius: 999,
                            background: "rgba(34,211,238,0.12)",
                            border: "1px solid rgba(34,211,238,0.28)",
                            color: T.cyan,
                            cursor: "pointer",
                            fontFamily: "'DM Mono',monospace",
                          }}
                        >{cat}</button>
                      ))}
                      <button
                        onClick={() => handleSend("skip")}
                        className="tag-chip"
                        style={{
                          fontSize: 11, fontWeight: 700,
                          padding: "5px 11px", borderRadius: 999,
                          background: "rgba(148,163,184,0.1)",
                          border: "1px solid rgba(148,163,184,0.25)",
                          color: T.textMuted,
                          cursor: "pointer",
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >Skip -&gt;</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div style={{ display: "flex", gap: 9, marginTop: 18, animation: "tagFadeUp 0.18s ease forwards" }}>
              <TagAvatar size={CHAT_VISUALS.messageAvatar} />
              <div style={{
                padding: "10px 16px", borderRadius: "4px 14px 14px 14px",
                background: "rgba(34,211,238,0.05)",
                border: "1px solid rgba(34,211,238,0.1)",
                borderLeft: "3px solid rgba(34,211,238,0.35)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
              }}>
                <ThinkingIndicator color={T.cyan} label="Tag is thinking…" />
              </div>
            </div>
          )}
        </div>

        {/* T-H2: honest save status. Never retried automatically. */}
        {saveNotice && (
          <div role="status" style={{ flexShrink: 0, margin: "0 16px 8px", padding: "10px 12px", borderRadius: 12, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.35)", display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#fde68a" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              {saveNotice.kind === "conflict"
                ? "Nothing was changed. Please send that again."
                : saveNotice.kind === "not_saved"
                  ? "This conversation couldn't be saved, so it won't appear in History or on your other devices."
                  : "That message didn't go through."}
            </span>
            {/* Retry only when the message never got an answer: same clientMessageId, so the
                server can recognise it. A reply that arrived unsaved is not re-sent (Tag would
                run again). */}
            {saveNotice.kind === "failed" && (
              <button type="button" disabled={isLoading}
                onClick={() => { const n = saveNotice; if (n.kind === "failed") void handleSend(n.text, n.clientMessageId); }}
                style={{ minHeight: 40, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(251,191,36,0.45)", background: "transparent", color: "#fcd34d", fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                Retry
              </button>
            )}
            <button type="button" onClick={() => setSaveNotice(null)} aria-label="Dismiss"
              style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "transparent", color: "#fde68a", cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>
        )}
        {/* Input — UX-C1: an in-flow flex child below the message list (no longer floats
            over the last messages), with its own home-indicator spacing. */}
        <div style={{
          flexShrink: 0,
          background: T.bg,
          borderTop: `1px solid ${T.border}`,
          padding: "12px 20px calc(12px + env(safe-area-inset-bottom, 0px))",
        }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 9,
            background: T.surface,
            borderRadius: 14,
            border: `1px solid ${T.borderHi}`,
            padding: "8px 8px 8px 16px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}>
            <textarea
              ref={composerRef}
              className="tag-input"
              rows={1}
              aria-label="Message Tag"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                // Enter sends, Shift+Enter = newline. Defensive: also guards against
                // IME composition (foreign keyboard input) where pressing Enter commits
                // the composition rather than sending the message.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (inputValue.trim() && !isLoading) handleSend();
                }
              }}
              placeholder="Ask Tag anything about categories..."
              spellCheck={false}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: T.text,
                // 16px on mobile prevents iOS auto-zoom when the textarea is focused.
                // Anything below 16px triggers the zoom-to-input behavior that breaks layout.
                fontSize: isMobile ? 16 : 15,
                // Vertical padding centres a single line against the 38px Send button.
                padding: "7px 8px 7px 0",
                fontFamily: "inherit", resize: "none", lineHeight: 1.55,
                maxHeight: COMPOSER_MAX_HEIGHT_PX,
                overflowY: "hidden",
              }}
            />
            <button
              className="tag-btn-send"
              onClick={() => handleSend()}
              disabled={!canSend}
              aria-label="Send message to Tag"
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: canSend ? `linear-gradient(135deg, ${T.cyan} 0%, #0891b2 100%)` : T.surface2,
                border: canSend ? "none" : `1px solid ${T.border}`,
                cursor: canSend ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: canSend ? "0 2px 16px rgba(34,211,238,0.3)" : "none",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill={canSend ? "#080f1c" : T.textDim} />
              </svg>
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 9 }}>
            <div style={{
              width: 4, height: 4, borderRadius: "50%", background: T.green,
              boxShadow: `0 0 7px ${T.green}`,
              animation: "tagGlow 2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 9.5, color: T.textDim, letterSpacing: 0.4, fontFamily: "'DM Mono',monospace" }}>
              Tag {"\u00b7"} AI categorization engine {"\u00b7"} XspensesAI
            </span>
          </div>
        </div>

      </div>
    </>
  );
}


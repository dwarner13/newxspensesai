import React, { useState, useEffect, useRef, useMemo } from "react";
import { Trash2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { THEME } from "@/pages/CategoriesV2/categoryConfig";
import { Reveal } from "@/pages/PrimeChatV2/Reveal";
import { getSupabase } from "@/lib/supabase";
import type { FlaggedTransaction, SubcategorySuggestion } from "@/pages/CategoriesV2/useCategoriesData";
import { useIsMobile } from "@/hooks/useIsMobile";

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
  .tag-stat-card       { transition:all 0.18s ease }
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


function AmountAnomalyCard({ issue, onFixed, supabase }: { issue: any; onFixed: () => void; supabase: any }) {
  const [correcting, setCorrecting] = React.useState(false);
  const [correctedValue, setCorrectedValue] = React.useState(issue.medianAmount ? issue.medianAmount.toFixed(2) : "");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    const newAmt = parseFloat(correctedValue);
    if (!Number.isFinite(newAmt) || newAmt <= 0) return;
    setSaving(true);
    try {
      const sb = supabase;
      const txId = issue.transactionIds[0];
      const oldAmt = issue.totalAmount;
      // Fix the amount
      await sb.from("transactions").update({ amount: newAmt }).eq("id", txId);
      // Log to tag_activity_log so Tag remembers this correction
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user?.id) {
        await sb.from("tag_activity_log").insert({
          user_id: session.user.id,
          transaction_id: txId,
          merchant_name: issue.merchant,
          action: "amount_corrected",
          old_value: String(oldAmt),
          new_value: String(newAmt),
          reason: `OCR misread detected — corrected from ${Number(oldAmt).toFixed(2)} to ${newAmt.toFixed(2)}`,
          source: "tag_anomaly_review",
        });
      }
      onFixed();
      setCorrecting(false);
    } catch (e) {
      console.error("Amount fix failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14,
      background: "#0d1526",
      border: "1px solid rgba(239,68,68,0.22)",
      marginBottom: 8,
      boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#e8f0fc", fontFamily: "'Syne',sans-serif" }}>{issue.merchant}</span>
        <span style={{
          fontSize: 13, fontWeight: 700, color: "#ffffff",
          fontFamily: "'DM Mono',monospace",
          background: "rgba(239,68,68,0.18)",
          border: "1px solid rgba(239,68,68,0.38)",
          padding: "1px 8px", borderRadius: 6,
        }}>${Math.abs(issue.totalAmount).toFixed(2)}</span>
      </div>
      <div style={{ fontSize: 12, color: "#8899b4", marginBottom: 12, lineHeight: 1.5 }}>{issue.reason}</div>
      {!correcting ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setCorrecting(true)}
            style={{
              padding: "7px 14px", borderRadius: 9, fontSize: 11, fontWeight: 700,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#ffffff", cursor: "pointer",
              fontFamily: "'Syne',sans-serif", letterSpacing: 0.3,
            }}
          >Correct Amount</button>
          <button
            onClick={onFixed}
            style={{
              padding: "7px 14px", borderRadius: 9, fontSize: 11, fontWeight: 700,
              background: "transparent",
              border: "1px solid #1a2740",
              color: "#8899b4", cursor: "pointer",
              fontFamily: "'Syne',sans-serif",
            }}
          >Looks Fine</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#8899b4", fontFamily: "'DM Mono',monospace" }}>$</span>
          <input
            type="number"
            value={correctedValue}
            onChange={e => setCorrectedValue(e.target.value)}
            style={{
              flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 13,
              background: "#111d33", border: "1px solid rgba(34,211,238,0.3)",
              color: "#e8f0fc", fontFamily: "'DM Mono',monospace",
              outline: "none",
            }}
            placeholder={issue.medianAmount ? issue.medianAmount.toFixed(2) : "Enter correct amount"}
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "7px 14px", borderRadius: 9, fontSize: 11, fontWeight: 700,
              background: saving ? "rgba(34,211,238,0.1)" : "rgba(34,211,238,0.15)",
              border: "1px solid rgba(34,211,238,0.3)",
              color: "#22d3ee", cursor: saving ? "default" : "pointer",
              fontFamily: "'Syne',sans-serif",
            }}
          >{saving ? "Saving..." : "Save"}</button>
          <button
            onClick={() => setCorrecting(false)}
            style={{
              padding: "7px 10px", borderRadius: 9, fontSize: 11,
              background: "transparent", border: "1px solid #1a2740",
              color: "#4a5f7a", cursor: "pointer",
            }}
          >✕</button>
        </div>
      )}
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
      <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, color, fontFamily: "'Syne',sans-serif" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${color}30 0%, transparent 100%)` }} />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="tag-stat-card" style={{
      flex: 1, padding: "12px 10px", borderRadius: 12,
      background: T.surface, border: `1px solid ${T.border}`,
      textAlign: "center", cursor: "default",
    }}>
      <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 1.8, color: T.textDim, fontWeight: 700, marginBottom: 6, fontFamily: "'Syne',sans-serif" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color, fontFamily: "'Syne',sans-serif", textShadow: `0 0 16px ${color}55` }}>{value}</div>
    </div>
  );
}

interface TagCopilotPanelProps {
  initialMessage?: string; onClose: () => void; firstName?: string;
  flaggedCount: number; categorizedCount: number; totalCount: number;
  avgConfidence: number; rulesCount: number;
  flaggedTransactions?: FlaggedTransaction[]; subcategorySuggestions?: SubcategorySuggestion[];
  totalSpent?: number; totalIncome?: number; txCount?: number;
  topCategories?: { category: string; total: number; transactionCount: number; budget?: number; topMerchant?: string }[];
  /** When Tag is opened from a specific import (e.g. ?import_id=X from upload),
   * the greeting scopes its opening line to that import instead of the global picture.
   * Presence of importId ALSO triggers a fresh-briefing session — stale localStorage
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
   * trigger a new auto-send — callers should set it, let it fire, then
   * reset to null before reusing. */
  injectedMessage?: string | null;
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
}: TagCopilotPanelProps) {

  // Presence of importId means this is an upload-handoff session — start fresh so
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
          toast.success(`Fixed ${fixed} income → expense correction${fixed !== 1 ? 's' : ''}`);
          window.dispatchEvent(new Event("tag:stats-refresh"));
          window.dispatchEvent(new Event("transactions:refresh"));
        } else {
          toast.success("All transactions look correct — nothing to fix");
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

  // Session cutoff for the chat history — after 6 hours of inactivity we
  // drop the stored messages so the user gets a fresh greeting instead of
  // resuming a stale conversation. Tag's real learning lives in
  // category_rules / vendor_category_memory, not the transcript.
  const SESSION_WINDOW_MS = 6 * 60 * 60 * 1000;
  const normalizeStoredMessages = (): ChatMessage[] => {
    try {
      const saved = localStorage.getItem("tag_chat_history");
      if (!saved) return [];
      const raw = JSON.parse(saved);
      const lastActive = Number(localStorage.getItem("tag_chat_last_active") || 0);
      if (lastActive && Date.now() - lastActive > SESSION_WINDOW_MS) {
        localStorage.removeItem("tag_chat_history");
        localStorage.removeItem("tag_chat_last_active");
        return [];
      }
      return raw
        .map((m: any) => ({
          role: (m.role === "tag" ? "assistant" : m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: String(m.content || m.text || "").trim(),
        }))
        .filter((m: ChatMessage) => m.content.length > 0);
    } catch { return []; }
  };

  // If the panel opened via an upload handoff (?openTag=1), we used to wipe
  // tag_chat_history here so the user saw a briefing scoped to the import
  // they just uploaded. That wipe was too aggressive — it ran in the render
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
  // Pending proposal that Tag has verbalized but not yet committed.
  // Captured from Tag's previous reply; fires commit when user confirms
  // ("yes" / "confirm" / "do it" / "go ahead"). Bypasses LLM to guarantee
  // the action runs even if Tag forgets to re-emit JSON.
  const [pendingProposal, setPendingProposal] = useState<{
    matchValue: string;
    targetCategory: string;
    matchType: 'contains' | 'exact';
  } | null>(null);
  const [greetingText, setGreetingText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  // Tracks whether user was near the bottom at last scroll. Used by the auto-scroll
  // effect below to avoid hijacking scroll position when user is reading history.
  // Bug fix: users reported the chat was "locked" — they couldn't scroll up because
  // every message/isLoading change was forcing scrollTop to the bottom unconditionally.
  const wasNearBottomRef = useRef(true);

  useEffect(() => { requestAnimationFrame(() => setOpen(true)); }, []);

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

  // Detect confirmation words — when user says "yes" / "confirm" / "do it" /
  // "go ahead" in response to a pending proposal, fire commit directly.
  const isConfirmation = (text: string): boolean => {
    const t = text.trim().toLowerCase();
    return /^(yes|yep|yeah|yup|confirm|confirmed|do it|go ahead|sure|ok|okay|apply|apply it)\b[!.\s]*$/.test(t);
  };

  // Extract a "change X to Y" proposal from Tag's reply so we can commit
  // when the user confirms on the next turn. Keeps Tag fully conversational
  // — the LLM still speaks — but the action fires via deterministic code.
  const extractProposal = (reply: string): { matchValue: string; targetCategory: string; matchType: 'contains' | 'exact' } | null => {
    const r = reply.toLowerCase();
    // "move/change/categorize [all] "X" to/as Y"
    const m1 = r.match(/(?:move|change|set|mark|categorize|recategorize|put|tag|assign|update)\s+(?:all\s+)?["']?([^"']+?)["']?\s+(?:to|as|into)\s+["']?([^"'.,!?\n]+)["']?/);
    if (m1) {
      return {
        matchValue: m1[1].trim(),
        targetCategory: m1[2].trim().replace(/\b\w/g, c => c.toUpperCase()),
        matchType: 'contains',
      };
    }
    return null;
  };

  const commitPendingProposal = async (proposal: NonNullable<typeof pendingProposal>) => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';

      // Preview (gets count + ids)
      const previewRes = await fetch('/.netlify/functions/tag-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          intent: 'preview',
          matchValue: proposal.matchValue,
          targetCategory: proposal.targetCategory,
          matchType: proposal.matchType,
        }),
      });
      const preview = await previewRes.json();
      if (!preview.ok || !preview.matchCount) {
        setMessages(prev => [...prev, { role: 'assistant', content: `I couldn't find any transactions matching "${proposal.matchValue}" to change. Can you describe them differently?` }]);
        setPendingProposal(null);
        return;
      }

      // Commit
      const commitRes = await fetch('/.netlify/functions/tag-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          intent: 'commit',
          matchValue: proposal.matchValue,
          targetCategory: proposal.targetCategory,
          matchType: proposal.matchType,
          affectedIds: preview.affectedIds,
        }),
      });
      const commit = await commitRes.json();
      if (commit.ok) {
        const count = commit.updatedCount ?? preview.matchCount ?? 0;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Done. Moved ${count} transaction${count !== 1 ? 's' : ''} to ${proposal.targetCategory} and saved a rule so future "${proposal.matchValue}" transactions auto-categorize.`,
        }]);
        toast.success(`${count} transactions updated`);
        // Refresh transactions list + badges
        try { window.dispatchEvent(new Event('transactions:refresh')); } catch { /* noop */ }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Hit a snag: ${commit.error || 'commit failed'}. Try rephrasing?` }]);
      }
    } catch (e: any) {
      console.error('[Tag] commitPendingProposal error:', e);
      setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong on my end. Try again?" }]);
    } finally {
      setPendingProposal(null);
      setIsLoading(false);
    }
  };

  // Detect user-typed action intents BEFORE sending to tag-copilot LLM.
  // tag-copilot's prompt only has category summaries, not merchant names,
  // so Tag refuses to propose changes for merchants he can't verify.
  // This function short-circuits that: runs a preview against real data,
  // then either proposes with real numbers or reports honestly.
  const detectUserActionIntent = (msg: string): { matchValue: string; targetCategory: string; matchType: 'contains' | 'exact' } | null => {
    const t = msg.trim().toLowerCase();
    // "change/move/categorize [all] X to/as [category Y]"
    const patterns = [
      /(?:can you\s+)?(?:change|move|set|mark|categorize|recategorize|put|tag|assign|update)\s+(?:all\s+)?["']?([^"']+?)["']?\s+(?:to|as|into)\s+(?:the\s+)?(?:category\s+)?["']?([^"'.,!?\n]+?)["']?\s*$/i,
    ];
    for (const re of patterns) {
      const m = msg.match(re);
      if (m) {
        const matchValue = m[1].trim().replace(/^(all|every|my|the)\s+/i, '').trim();
        const targetCategory = m[2].trim().replace(/\b\w/g, c => c.toUpperCase());
        if (matchValue && targetCategory && matchValue.length > 1) {
          return { matchValue, targetCategory, matchType: 'contains' };
        }
      }
    }
    return null;
  };

  // Preview directly against tag-action; return data to caller without committing.
  const previewAction = async (intent: { matchValue: string; targetCategory: string; matchType: 'contains' | 'exact' }): Promise<{ matchCount: number; samples: any[]; affectedIds: string[] } | null> => {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch('/.netlify/functions/tag-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          intent: 'preview',
          matchValue: intent.matchValue,
          targetCategory: intent.targetCategory,
          matchType: intent.matchType,
        }),
      });
      const data = await res.json();
      if (!data.ok) return null;
      return { matchCount: data.matchCount, samples: data.samples || [], affectedIds: data.affectedIds || [] };
    } catch (e) {
      console.error('[Tag] previewAction error:', e);
      return null;
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isLoading) return;

    // INTERCEPTOR 1: If a proposal is pending and user said yes, fire commit
    // directly. Bypass the LLM so the action is guaranteed to run.
    if (pendingProposal && isConfirmation(text)) {
      setInputValue("");
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      await commitPendingProposal(pendingProposal);
      return;
    }

    // INTERCEPTOR 2: Did the user ask for a categorization action?
    // If so, preview against real data BEFORE asking Tag. Tag's prompt
    // doesn't include merchant names, so he can't reliably confirm what
    // exists — but the DB can. We go straight to the source of truth.
    const userIntent = detectUserActionIntent(text);
    if (userIntent) {
      setInputValue("");
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      setIsLoading(true);
      try {
        const preview = await previewAction(userIntent);
        if (!preview || preview.matchCount === 0) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `I searched your transactions but didn't find any matching "${userIntent.matchValue}". Want to try a different keyword, or tell me the merchant name you see in your list?`,
          }]);
        } else {
          const sampleText = preview.samples
            .slice(0, 3)
            .map((s: any) => `• ${s.merchant_name} — $${Math.abs(Number(s.amount || 0)).toFixed(2)} (currently: ${s.current_category || 'Uncategorized'})`)
            .join('\n');
          const extra = preview.matchCount > 3 ? `\n...and ${preview.matchCount - 3} more` : '';
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `I found **${preview.matchCount}** transaction${preview.matchCount !== 1 ? 's' : ''} matching "${userIntent.matchValue}". Here's a sample:\n\n${sampleText}${extra}\n\nMove all ${preview.matchCount} to **${userIntent.targetCategory}** and save a rule for future imports? Say yes to confirm.`,
          }]);
          setPendingProposal(userIntent);
        }
      } catch (e) {
        console.error('[Tag] action preview error:', e);
        setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong checking your transactions. Try again?" }]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setInputValue("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
    // User just sent a message — reset position tracker and force scroll to bottom.
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
          history: updatedMessages.slice(0, -1),
          systemPromptOverride:
            "STRICT CHAT RULES - violating these breaks the experience:\n1. Max 2 sentences. Hard limit. No exceptions.\n2. Ask ONE question then STOP. Never ask multiple questions.\n3. Zero bullet points. Zero numbered lists. Zero headers. Plain conversational sentences only.\n4. Never write analysis, breakdowns, or math. Just talk.\n5. You already have the financial data - reference it naturally, don't explain it back.\n\nYou are Tag - XspensesAI's categorization expert. You're having a focused chat, not writing a report.\n\nPROPOSAL PHRASING RULE - critical for actions:\nWhen you propose to change categories, phrase it as exactly: 'move [merchant or keyword] to [category]' or 'change [merchant] to [category]'. Use quotes around the merchant name. Example: 'Want me to move \"GFS PAY\" to Income?' Then stop and wait for yes. Do not emit any JSON in the reply; the confirmation handler works from the phrasing alone.\n\nAMOUNT ANOMALY RULE - this is critical:\nIf the user asks about a transaction where the amount is unusually high for that merchant (more than 3x what you'd expect based on the merchant type), you MUST flag it. Be specific - name the merchant, state the amount, give a realistic comparison (e.g. 'A $147 charge at 7-Eleven is about 18x a typical visit'). Always end with exactly this sentence: 'I'd verify this against your bank app or original statement before I lock in a category - this one looks off.' Never skip this when the amount is suspicious. This protects the user and is non-negotiable.\n\nUSER'S FINANCIAL DATA:\n- Total spent: " +
            (totalSpent || 0).toFixed(2) + " CAD\n- Total income: " + (totalIncome || 0).toFixed(2) +
            " CAD\n- Total transactions: " + (txCount || 0) + "\n- Spending categories:\n" +
            (topCategories || []).map(c => {
              let line = "  - " + c.category + ": $" + c.total.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " spent";
              if (c.budget && c.budget > 0) { line += " / $" + c.budget + " budget"; if (c.total > c.budget) line += " (OVER BUDGET)"; }
              line += " \u00b7 " + c.transactionCount + " txns";
              if (c.topMerchant) line += " \u00b7 Top: " + c.topMerchant;
              return line;
            }).join("\n") +
            "\n\nYou are looking at the Categories page with the user. Answer questions about their spending categories, budget status, tax deductibility, business vs personal split, and category optimization for Canadian self-employed. Reference the real numbers above.\nTag personality: detective-like, precise, witty, always helpful. When something looks wrong, say so directly - that's what makes Tag trustworthy.",
        }),
      });
      if (!res.ok) throw new Error(`tag-copilot ${res.status}`);
      const data = await res.json();
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

      // Capture any proposal Tag made so we can commit when user confirms.
      // If backend already ran an action (LLM emitted JSON reliably), clear
      // any pending proposal to avoid double-firing.
      const actionFired = !!(data.rule_saved || data.action || (data.backfill_count || 0) > 0);
      if (actionFired) {
        setPendingProposal(null);
      } else {
        const proposal = extractProposal(replyText);
        if (proposal) setPendingProposal(proposal);
      }

      // If Tag performed any write (rule saved, bulk apply, correction),
      // tell the transactions list + badge to refresh.
      if (data.rule_saved || data.action || (data.backfill_count || 0) > 0) {
        try {
          window.dispatchEvent(new Event("transactions:refresh"));
          window.dispatchEvent(new Event("tag:stats-refresh"));
        } catch { /* noop */ }
        void fetchLearnedRules();
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I ran into an issue. Try again in a moment." }]);
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
    // handleSend intentionally omitted from deps — stable per render is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectedMessage]);

  // When importId changes (user navigates between imports while panel is open),
  // reset the in-memory greeting and conversation so they see a fresh briefing
  // for the new import context. Without this, greetingText would persist from
  // the first import.
  //
  // We intentionally do NOT wipe localStorage here — that would destroy the
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

    // Compose a casual chat message with real numbers woven in.
    // Bold (**) wraps numeric/category highlights — renderMarkdown handles the styling.
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
          : `Nothing flagged — everything categorized cleanly.`;
      const topPart = realCategories[0]
        ? `Biggest spend was **${realCategories[0].category}** at **${fmtAmount(realCategories[0].total)}**.`
        : "";
      text = `${hi} — I've got ${txPart} sorted out. ${flaggedPart} ${topPart}\n\nWant me to walk through the flagged ones, or dig into a specific category?`;
    } else if (flaggedCount > 0) {
      // Global view with flagged items — lead with the action
      const top3 = realCategories.slice(0, 3);
      const catsList = top3.length
        ? top3.map(c => `**${c.category}** ${fmtAmount(c.total)}`).join(", ")
        : "";
      text = `${hi} — I've got your **${count} transactions** sorted across your books. There ${flaggedCount === 1 ? "is" : "are"} **${flaggedCount} flagged** transaction${flaggedCount !== 1 ? "s" : ""} I'd love your eyes on.${catsList ? ` Your top categories: ${catsList}.` : ""}\n\nWant to review the flagged ones first, or dig into a category?`;
    } else if (realCategories.length > 0) {
      // Global view, clean books — summary + invitation
      const top = realCategories[0];
      const top3 = realCategories.slice(0, 3);
      const catsList = top3
        .slice(1)
        .map(c => `**${c.category}** ${fmtAmount(c.total)}`)
        .join(", ");
      text = `${hi} — I've got your **${count} transactions** sorted out. Nothing needs your review right now. Your biggest spend is **${top.category}** at **${fmtAmount(top.total)}**${catsList ? `, then ${catsList}` : ""}.\n\nWant me to break down what's in ${top.category}, or look for anything deductible?`;
    } else {
      // Fallback — no category data yet
      text = `${hi} — I'm your categorization engine. Want to reclassify a merchant, check what's tax-deductible, or build a rule for any spending pattern?`;
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

  useEffect(() => {
    if (!scrollRef.current) return;
    // Only auto-scroll to the bottom when the user was already at/near the bottom.
    // If they scrolled up to read previous messages, leave their position alone —
    // this is the fix for the "chat locked, can't scroll up" bug.
    if (wasNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length === 0) return;
    localStorage.setItem("tag_chat_history", JSON.stringify(messages.slice(-20)));
    localStorage.setItem("tag_chat_last_active", String(Date.now()));
  }, [messages]);

  const canSend = inputValue.trim() && !isLoading;

  return (
    <>
      <style>{STYLES}</style>
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 500,
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

        {/* Header */}
        <div style={{
          padding: "18px 20px 16px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", gap: 12,
          background: "linear-gradient(180deg, rgba(13,21,38,0.95) 0%, rgba(8,15,28,0.8) 100%)",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
        }}>
          <TagAvatar size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: 0.3, lineHeight: 1.2 }}>
              Tag <span style={{ fontWeight: 500, color: T.textMuted }}>Copilot</span>
            </div>
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1, letterSpacing: 0.2 }}>Categorization intelligence</div>
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
          <button
            className="tag-clear"
            onClick={() => { localStorage.removeItem("tag_chat_history"); setMessages([]); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.textDim, fontSize: 11, display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", borderRadius: 7 }}
          >
            <Trash2 size={12} />
            <span style={{ fontWeight: 600 }}>Clear</span>
          </button>
          <button
            className="tag-close"
            onClick={handleClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, color: T.textMuted, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
          >{"x"}</button>
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="tag-panel-scrollbar"
          style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "24px 20px 148px", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}
        >
          {/* Greeting */}
          {greetingText && messages.length === 0 && (
            <div style={{ display: "flex", gap: 10, marginBottom: 8, animation: "tagFadeUp 0.22s ease forwards" }}>
              <TagAvatar size={28} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: T.cyan, fontFamily: "'Syne',sans-serif" }}>Tag</span>
                  <span style={{ fontSize: 9.5, color: T.textDim }}>just now</span>
                </div>
                <div style={{
                  fontSize: 15, color: T.text, lineHeight: 1.6,
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

          {/* Category intelligence summary card — renders whenever we have
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
                <div style={{ fontSize: 9.5, fontWeight: 700, color: T.cyan, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10, fontFamily: "'Syne',sans-serif" }}>
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
              <div style={{ display: "flex", gap: 7 }}>
                <StatCard label="Categorized" value={`${categorizedCount}/${totalCount}`} color={T.green} />
                <StatCard label="Confidence" value={`${avgConfidence}%`} color={T.cyan} />
                <StatCard label="Flagged" value={`${flaggedCount}`} color={T.orange} />
                <StatCard label="Rules" value={`${learnedRules.length || rulesCount}`} color={T.purple} />
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
              {smartReviewIssues.filter((i: any) => i.issueType === 'amount_anomaly').map((issue: any) => (
                <AmountAnomalyCard key={issue.id} issue={issue} onFixed={() => { fetchSmartReview && fetchSmartReview(); }} supabase={getSupabase()} />
              ))}
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
                    fontFamily: "'Syne',sans-serif",
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
                    fontFamily: "'Syne',sans-serif",
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
                {learnedRules.map((r, i) => (
                  <div key={i} style={{
                    display: "flex", flexDirection: "column", gap: 4,
                    padding: "10px 16px",
                    borderBottom: i < learnedRules.length - 1 ? `1px solid ${T.border}` : "none",
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
            </Reveal>
          )}

          {/* Tag recommends */}
          {greetingText && detailsOpen && messages.length === 0 && (
            <Reveal delay={800} style={{ marginLeft: 38 }}>
              <SectionRule color={T.cyan} label="Tag Recommends" />
              <div style={{
                fontSize: 15, color: T.textMuted, lineHeight: 1.6,
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
                {!isUser && <TagAvatar size={28} />}
                <div style={{
                  maxWidth: "78%",
                  padding: "12px 16px",
                  fontSize: 15, lineHeight: 1.6,
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
                  {isUser ? msg.content : renderMarkdown(msg.content ?? "")}
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
              <TagAvatar size={28} />
              <div style={{
                padding: "13px 18px", borderRadius: "4px 14px 14px 14px",
                background: "rgba(34,211,238,0.05)",
                border: "1px solid rgba(34,211,238,0.1)",
                borderLeft: "3px solid rgba(34,211,238,0.35)",
                display: "flex", gap: 5, alignItems: "center",
                boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
              }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{
                    width: 6, height: 6, borderRadius: "50%", background: T.cyan,
                    animation: `tagDot 1.3s ease-in-out ${d * 0.18}s infinite`,
                    opacity: 0.7,
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: `linear-gradient(0deg, ${T.bg} 70%, transparent)`,
          padding: "28px 20px 16px",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 9,
            background: T.surface,
            borderRadius: 14,
            border: `1px solid ${T.borderHi}`,
            padding: "12px 12px 12px 20px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}>
            <textarea
              className="tag-input"
              rows={2}
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
                color: T.text, fontSize: 15, padding: "10px 12px 10px 0",
                fontFamily: "inherit", resize: "none", lineHeight: 1.55,
                minHeight: isMobile ? 50 : 46,
              }}
            />
            <button
              className="tag-btn-send"
              onClick={() => handleSend()}
              disabled={!canSend}
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


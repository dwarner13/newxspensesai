import { useEffect, useMemo, useRef, useState } from "react";
import { CHAT_VISUALS } from "@/lib/chatVisualStandards";
import { formatHistoryTime, groupHistoryItems, type HistoryDrawerItem } from "@/lib/historyDrawer";

export type { HistoryDrawerItem };

/**
 * P1-e — full-height conversation history drawer, shown inside a chat panel.
 *
 * Presentational only. The caller owns loading, selection and New chat; selecting a row
 * calls onSelect(id), which in Prime goes through the existing ownership-verified switch
 * (setRequestedSessionId → verifyOwnedPrimeSession). Titles render as plain text.
 */

interface ConversationHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  items: HistoryDrawerItem[];
  loading: boolean;
  currentId: string | null | undefined;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  /** Identity colour (Prime gold by default). */
  accent?: string;
  /** Shown when a title is empty. */
  fallbackTitle?: string;
}

const C = {
  bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", borderHi: "#2a3f66",
  text: "#e8ecf4", muted: "#c8d0e0", dim: "#9ba8bc",
};

export function ConversationHistoryDrawer({
  open, onClose, items, loading, currentId, onSelect, onNewChat,
  accent = "#c8a64e", fallbackTitle = "Conversation",
}: ConversationHistoryDrawerProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus the search when opened; Escape closes.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  const groups = useMemo(() => groupHistoryItems(items, query), [items, query]);

  if (!open) return null;

  const row = (i: HistoryDrawerItem) => {
    const isCurrent = !!currentId && i.id === currentId;
    return (
      <li key={i.id}>
        <button
          type="button"
          onClick={() => onSelect(i.id)}
          aria-current={isCurrent ? "true" : undefined}
          style={{
            width: "100%", minHeight: 56, padding: "8px 12px", display: "flex", flexDirection: "column",
            justifyContent: "center", gap: 2, textAlign: "left", borderRadius: 10, cursor: "pointer",
            border: isCurrent ? `1px solid ${accent}55` : "1px solid transparent",
            background: isCurrent ? `${accent}14` : "transparent", color: C.text, fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
            {i.title || fallbackTitle}
          </span>
          <span style={{ fontSize: 13, color: C.dim }}>
            {[formatHistoryTime(i.lastActivity), isCurrent ? "Current" : null].filter(Boolean).join(" · ")}
          </span>
        </button>
      </li>
    );
  };

  const section = (label: string, list: HistoryDrawerItem[]) => list.length === 0 ? null : (
    <section aria-label={label}>
      <h3 style={{ margin: "14px 12px 6px", fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: C.dim }}>{label}</h3>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>{list.map(row)}</ul>
    </section>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Conversations"
      style={{
        position: "absolute", inset: 0, zIndex: 30, display: "flex", flexDirection: "column",
        background: C.bg, fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "calc(12px + env(safe-area-inset-top, 0px)) 12px 12px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: 19, fontWeight: 800, color: C.text }}>Conversations</h2>
        <button
          type="button"
          onClick={onNewChat}
          style={{ minHeight: CHAT_VISUALS.touchTarget, padding: "0 14px", borderRadius: 12, border: `1px solid ${accent}55`, background: `${accent}14`, color: accent, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          + New chat
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close conversations"
          style={{ width: CHAT_VISUALS.touchTarget, height: CHAT_VISUALS.touchTarget, borderRadius: 12, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 20, cursor: "pointer" }}
        >
          ×
        </button>
      </div>
      <div style={{ padding: "12px 16px 4px", flexShrink: 0 }}>
        <label style={{ display: "flex" }}>
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search conversations</span>
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search conversations"
            style={{ flex: 1, minHeight: CHAT_VISUALS.touchTarget, padding: "0 14px", borderRadius: 12, border: `1px solid ${C.borderHi}`, background: C.surface, color: C.text, fontSize: 16, fontFamily: "inherit", outline: "none" }}
          />
        </label>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 4px calc(16px + env(safe-area-inset-bottom, 0px))" }}>
        {loading && items.length === 0 ? (
          <p role="status" style={{ margin: 16, fontSize: 15, color: C.muted }}>Loading conversations…</p>
        ) : items.length === 0 ? (
          <p style={{ margin: 16, fontSize: 15, color: C.muted }}>No saved conversations yet.</p>
        ) : groups.total === 0 ? (
          <p role="status" style={{ margin: 16, fontSize: 15, color: C.muted }}>No conversations match “{query}”.</p>
        ) : (
          <>
            {section("Today", groups.today)}
            {section("Earlier", groups.earlier)}
          </>
        )}
      </div>
    </div>
  );
}

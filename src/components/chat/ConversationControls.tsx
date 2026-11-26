import { useState } from "react";
import { History as HistoryIcon, SquarePen } from "lucide-react";
import { ConversationHistoryDrawer } from "@/components/chat/ConversationHistoryDrawer";
import type { HistoryDrawerItem } from "@/lib/historyDrawer";

/**
 * Universal employee conversation history — the shared header controls (History +
 * New conversation, 44px) and the shared history drawer. Render it inside the panel's
 * positioned root; the drawer covers the panel (full screen on phones, as the panels are).
 * Nothing here deletes anything.
 */
export function ConversationControls({
  employeeName, accent, border, color,
  items, loading, currentId, onLoad, onOpen, onNew,
}: {
  employeeName: string;
  accent: string;
  border: string;
  color: string;
  items: HistoryDrawerItem[];
  loading: boolean;
  currentId: string | null | undefined;
  onLoad: () => void | Promise<void>;
  onOpen: (id: string) => Promise<boolean>;
  onNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const btn = {
    width: 44, height: 44, flexShrink: 0, borderRadius: 10, background: "transparent",
    border: `1px solid ${border}`, color, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  } as const;
  return (
    <>
      <button type="button" style={btn} aria-label={`Previous ${employeeName} conversations`} title="History"
        onClick={() => { setError(null); setOpen(true); void onLoad(); }}>
        <HistoryIcon size={18} aria-hidden="true" />
      </button>
      <button type="button" style={btn} aria-label="New conversation" title="New conversation" onClick={onNew}>
        <SquarePen size={18} aria-hidden="true" />
      </button>
      <ConversationHistoryDrawer
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        loading={loading}
        currentId={currentId}
        onSelect={async (id) => {
          const ok = await onOpen(id);
          if (ok) setOpen(false);
          else setError("That conversation isn't available.");
        }}
        onNewChat={() => { onNew(); setOpen(false); }}
        accent={accent}
        fallbackTitle={`${employeeName} conversation`}
      />
      {open && error && (
        <div role="alert" style={{ position: "absolute", left: 16, right: 16, bottom: 16, zIndex: 31, padding: "10px 12px", borderRadius: 10, background: "#2a1a1a", border: "1px solid rgba(248,113,113,0.4)", color: "#fecaca", fontSize: 14 }}>
          {error}
        </div>
      )}
    </>
  );
}

/** The honest save notice under an assistant reply the server could not save. */
export function UnsavedReplyNotice() {
  return (
    <div role="status" style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.35)", fontSize: 13, color: "#fde68a", lineHeight: 1.5 }}>
      This conversation couldn&apos;t be saved, so it won&apos;t appear in History or on your other devices.
    </div>
  );
}

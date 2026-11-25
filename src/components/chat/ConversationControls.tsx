import { useState } from "react";
import { ChatToolbar } from "@/components/chat/ChatHeader";
import { ConversationHistoryDrawer } from "@/components/chat/ConversationHistoryDrawer";
import type { HistoryDrawerItem } from "@/lib/historyDrawer";

/**
 * Universal employee conversation history — the shared header controls, rendered as the
 * universal ChatToolbar (TB-4: New conversation, History, Close), and the shared history drawer. Render it inside the panel's
 * positioned root; the drawer covers the panel (full screen on phones, as the panels are).
 * Nothing here deletes anything.
 */
export function ConversationControls({
  employeeName, accent, isMobile = false,
  items, loading, currentId, onLoad, onOpen, onNew, onClose,
}: {
  employeeName: string;
  accent: string;
  isMobile?: boolean;
  items: HistoryDrawerItem[];
  loading: boolean;
  currentId: string | null | undefined;
  onLoad: () => void | Promise<void>;
  onOpen: (id: string) => Promise<boolean>;
  onNew: () => void;
  /** Close the employee panel (shown as the toolbar's last button). */
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <ChatToolbar
        employeeName={employeeName}
        accent={accent}
        isMobile={isMobile}
        onNew={onNew}
        history={{ open, onToggle: () => { if (!open) { setError(null); void onLoad(); } setOpen(v => !v); } }}
        onClose={onClose}
      />
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

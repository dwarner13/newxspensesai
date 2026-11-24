import { useState } from "react";
import type { ChatAttachmentView } from "@/lib/chatDocuments/attachmentHistory";
import { splitVisibleAttachments } from "@/lib/chatDocuments/attachmentHistory";
import { chipPresentation, middleTruncate, chipAccessibleLabel, type ChipTone } from "@/lib/attachmentChip";
import { CHAT_VISUALS } from "@/lib/chatVisualStandards";

/**
 * AttachmentChip — shared presentation for a chat attachment (UI/UX Studio; data contract
 * from Attachments HQ). Stateless: renders only what it is given. Status is text + icon,
 * announced once (aria-live="polite").
 */

const TONE: Record<ChipTone, { fg: string; border: string; bg: string }> = {
  progress: { fg: "#c8d0e0", border: "#24365a", bg: "#111a2e" },
  ok: { fg: "#86efac", border: "rgba(52,211,153,0.35)", bg: "rgba(52,211,153,0.06)" },
  warn: { fg: "#fcd34d", border: "rgba(251,191,36,0.4)", bg: "rgba(251,191,36,0.06)" },
  muted: { fg: "#9ba8bc", border: "#1e2d4a", bg: "#0e1626" },
};

function StatusIcon({ tone }: { tone: ChipTone }) {
  const common = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (tone === "ok") return <svg {...common}><path d="M5 12l5 5 9-10" /></svg>;
  if (tone === "warn") return <svg {...common}><path d="M12 8v5M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>;
  if (tone === "muted") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9" strokeOpacity="0.3" /><path d="M12 3a9 9 0 0 1 9 9" /></svg>;
}

function FileIcon({ kind }: { kind: ChatAttachmentView["kind"] }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ba8bc" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      {kind === "image"
        ? <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 17-5-5-8 8" /></>
        : <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>}
    </svg>
  );
}

interface AttachmentChipProps {
  attachment: ChatAttachmentView;
  onRemove?: (documentId: string) => void;
  onRetry?: (documentId: string) => void;
  /** True only while the original File is still in memory (live upload). */
  canRetry?: boolean;
}

export function AttachmentChip({ attachment, onRemove, onRetry, canRetry = false }: AttachmentChipProps) {
  const p = chipPresentation(attachment, { canRetry: canRetry && !!onRetry });
  if (!p) return null;
  const tone = TONE[p.tone];
  const btn = {
    minWidth: CHAT_VISUALS.touchTarget, minHeight: CHAT_VISUALS.touchTarget, padding: "0 10px", borderRadius: 10,
    border: "none", background: "transparent", color: "#c8d0e0", fontSize: 13, fontWeight: 600 as const, cursor: "pointer", fontFamily: "inherit",
  };
  return (
    <div
      title={attachment.fileName}
      style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", maxWidth: "100%", boxSizing: "border-box",
        padding: "4px 4px 4px 10px", borderRadius: 12, border: `1px solid ${tone.border}`, background: tone.bg,
      }}
    >
      <FileIcon kind={attachment.kind} />
      <span style={{ flex: "1 1 120px", minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#e8ecf4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {middleTruncate(attachment.fileName)}
        </span>
        <span aria-live="polite" aria-label={chipAccessibleLabel(attachment, p)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: tone.fg }}>
          <StatusIcon tone={p.tone} />
          <span>{p.label}</span>
          {p.detail && <span style={{ color: "#9ba8bc" }}>{"·"} {p.detail}</span>}
        </span>
      </span>
      {p.showRetry && onRetry && (
        <button type="button" onClick={() => onRetry(attachment.documentId)} style={btn}>Retry</button>
      )}
      {p.showRemove && onRemove && (
        <button type="button" onClick={() => onRemove(attachment.documentId)} aria-label={`Remove ${attachment.fileName}`} style={{ ...btn, fontSize: 18, padding: 0 }}>
          ×
        </button>
      )}
    </div>
  );
}

interface AttachmentChipListProps {
  attachments: ChatAttachmentView[];
  onRemove?: (documentId: string) => void;
  onRetry?: (documentId: string) => void;
  canRetry?: (documentId: string) => boolean;
  /** Align to the right under the user's own message. */
  alignEnd?: boolean;
}

/** Vertical list: 3 visible, then "+N more" which expands in place. */
export function AttachmentChipList({ attachments, onRemove, onRetry, canRetry, alignEnd = false }: AttachmentChipListProps) {
  const [expanded, setExpanded] = useState(false);
  const { visible, hiddenCount } = splitVisibleAttachments(attachments, expanded);
  if (attachments.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: alignEnd ? "flex-end" : "stretch", width: "100%" }}>
      {visible.map((a) => (
        <div key={a.documentId} style={{ width: "100%", maxWidth: 360 }}>
          <AttachmentChip attachment={a} onRemove={onRemove} onRetry={onRetry} canRetry={canRetry ? canRetry(a.documentId) : false} />
        </div>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{ minHeight: CHAT_VISUALS.touchTarget, padding: "0 12px", borderRadius: 10, border: "1px solid #24365a", background: "transparent", color: "#c8d0e0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
}

/**
 * Attachments Phase C3 — client data contract for attachment chips (no rendering here).
 *
 * UI/UX Studio owns AttachmentChip and its rendering. This module only:
 *  - reads attachment references from a hydrated chat message's metadata,
 *  - asks the server for each document's CURRENT status (chat-attachments-status), so reopened
 *    conversations never show a stale "Reading…",
 *  - provides the agreed "3 visible, then +N more" split.
 * It never fetches or holds document text.
 */
import type { ChatDocumentFailure } from './uploadChatDocument';

export type AttachmentChipStatus = 'uploading' | 'processing' | 'ready' | 'unreadable' | 'removed';

export type ChatAttachmentView = {
  documentId: string;
  fileName: string;
  kind: 'pdf' | 'image' | 'file';
  pageCount: number | null;
  status: AttachmentChipStatus;
  /** Set for live uploads that failed (drives the agreed label table); null for restored messages. */
  failureReason?: ChatDocumentFailure | null;
};

export const VISIBLE_ATTACHMENTS = 3;
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function kindOf(mime: unknown): ChatAttachmentView['kind'] {
  const m = String(mime || '').toLowerCase();
  if (m === 'application/pdf') return 'pdf';
  if (m.startsWith('image/')) return 'image';
  return 'file';
}

/** Attachment refs stored on a message (metadata.attachments), validated; status starts as 'processing'. */
export function attachmentsFromMeta(meta: unknown): ChatAttachmentView[] {
  const list = (meta as { attachments?: unknown } | null | undefined)?.attachments;
  if (!Array.isArray(list)) return [];
  const out: ChatAttachmentView[] = [];
  for (const a of list) {
    const id = (a as { document_id?: unknown })?.document_id;
    if (typeof id !== 'string' || !ID_RE.test(id) || out.some((o) => o.documentId === id)) continue;
    const pages = Number((a as { pages?: unknown }).pages);
    out.push({
      documentId: id,
      fileName: String((a as { name?: unknown }).name || 'document').slice(0, 180),
      kind: kindOf((a as { mime?: unknown }).mime),
      pageCount: Number.isInteger(pages) && pages > 0 ? pages : null,
      status: 'processing',
      failureReason: null,
    });
    if (out.length >= 10) break;
  }
  return out;
}

export type AttachmentStatusMap = Map<string, { status: Exclude<AttachmentChipStatus, 'uploading'>; pages: number | null }>;

/**
 * Current status for the given document ids (owner-scoped on the server). On failure returns an
 * empty map; callers keep the chip in 'processing' and may retry later.
 */
export async function fetchAttachmentStatuses(
  documentIds: string[],
  authToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AttachmentStatusMap> {
  const ids = Array.from(new Set(documentIds.filter((d) => ID_RE.test(d)))).slice(0, 50);
  const out: AttachmentStatusMap = new Map();
  if (!ids.length || !authToken) return out;
  try {
    const res = await fetchImpl('/.netlify/functions/chat-attachments-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ documentIds: ids }),
    });
    if (!res.ok) return out;
    const body = (await res.json()) as { items?: Array<{ document_id?: unknown; status?: unknown; pages?: unknown }> };
    for (const item of Array.isArray(body?.items) ? body.items : []) {
      const id = typeof item?.document_id === 'string' ? item.document_id : '';
      const s = item?.status;
      if (!ids.includes(id) || (s !== 'processing' && s !== 'ready' && s !== 'unreadable' && s !== 'removed')) continue;
      const pages = Number(item.pages);
      out.set(id, { status: s, pages: Number.isInteger(pages) && pages > 0 ? pages : null });
    }
  } catch {
    /* leave empty */
  }
  return out;
}

/** Apply live statuses to a message's attachments. Unknown ids stay as they are. */
export function applyAttachmentStatuses(list: ChatAttachmentView[], statuses: AttachmentStatusMap): ChatAttachmentView[] {
  return list.map((a) => {
    const s = statuses.get(a.documentId);
    if (!s) return a;
    return { ...a, status: s.status, pageCount: s.status === 'removed' ? null : s.pages ?? a.pageCount };
  });
}

/** The agreed layout: 3 visible, then "+N more" (expanded shows all). */
export function splitVisibleAttachments<T>(list: T[], expanded: boolean): { visible: T[]; hiddenCount: number } {
  if (expanded || list.length <= VISIBLE_ATTACHMENTS) return { visible: list, hiddenCount: 0 };
  return { visible: list.slice(0, VISIBLE_ATTACHMENTS), hiddenCount: list.length - VISIBLE_ATTACHMENTS };
}

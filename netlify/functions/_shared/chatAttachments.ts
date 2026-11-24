/**
 * Attachments Phase C3 — attachment history for chat (SERVER-ONLY).
 *
 * - Attachment REFERENCES (never document text) are stored on the user's chat message in
 *   chat_messages.metadata.attachments: [{ document_id, name, mime, pages }].
 * - Only the verified user's own chat documents are referenced.
 * - A conversation's "active documents" are the most recent distinct attachments of that user's
 *   earlier messages in the same session (max 10). They give follow-up questions document
 *   context through the existing buildAttachmentContext path, which re-checks ownership, purpose
 *   and status on every request, so removed, purged or foreign documents never resurface.
 * - Restore/status: resolveAttachmentStatuses() maps ids to processing | ready | unreadable |
 *   removed for the verified owner only; anything not owned is reported as 'removed' (no leak).
 *
 * Nothing here reads or logs document text.
 */

export const MAX_ATTACHMENTS_PER_MESSAGE = 10;
export const MAX_ACTIVE_DOCUMENTS_PER_CONVERSATION = 10;

export type ChatAttachmentRef = { document_id: string; name: string; mime: string | null; pages: number | null };
export type ChatAttachmentStatus = 'processing' | 'ready' | 'unreadable' | 'removed';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase service-role query builder
type Sb = { from: (table: string) => any };

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanIds(ids: unknown, max: number): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id === 'string' && ID_RE.test(id) && !out.includes(id)) out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

function safeName(raw: unknown): string {
  // eslint-disable-next-line no-control-regex -- strip control characters from a display name
  return String(raw ?? 'document').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || 'document';
}

/** Validate attachment refs read back from stored metadata (defensive: metadata is JSON). */
export function readAttachmentRefs(metadata: unknown): ChatAttachmentRef[] {
  const list = (metadata as { attachments?: unknown } | null)?.attachments;
  if (!Array.isArray(list)) return [];
  const out: ChatAttachmentRef[] = [];
  for (const a of list) {
    const id = (a as { document_id?: unknown })?.document_id;
    if (typeof id !== 'string' || !ID_RE.test(id) || out.some((o) => o.document_id === id)) continue;
    const pages = Number((a as { pages?: unknown }).pages);
    out.push({
      document_id: id,
      name: safeName((a as { name?: unknown }).name),
      mime: typeof (a as { mime?: unknown }).mime === 'string' ? String((a as { mime: string }).mime).slice(0, 100) : null,
      pages: Number.isInteger(pages) && pages > 0 ? pages : null,
    });
    if (out.length >= MAX_ATTACHMENTS_PER_MESSAGE) break;
  }
  return out;
}

/**
 * References for THIS message: only the user's own chat documents among the requested ids
 * (≤ 10, request order). Import documents and foreign ids are never referenced.
 */
export async function resolveAttachmentRefs(sb: Sb, userId: string, documentIds: unknown): Promise<ChatAttachmentRef[]> {
  const ids = cleanIds(documentIds, MAX_ATTACHMENTS_PER_MESSAGE);
  if (!userId || !ids.length) return [];
  try {
    const { data, error } = await sb
      .from('user_documents')
      .select('id, user_id, original_name, mime_type, purpose, pages_detected')
      .eq('user_id', userId)
      .in('id', ids);
    if (error || !Array.isArray(data)) return [];
    const byId = new Map(
      data
        .filter((r: { user_id?: string; purpose?: string }) => r?.user_id === userId && r?.purpose === 'chat_document')
        .map((r: { id: string }) => [r.id, r]),
    );
    return ids
      .filter((id) => byId.has(id))
      .map((id) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose DB row
        const r: any = byId.get(id);
        const pages = Number(r.pages_detected);
        return {
          document_id: id,
          name: safeName(r.original_name),
          mime: typeof r.mime_type === 'string' ? r.mime_type : null,
          pages: Number.isInteger(pages) && pages > 0 ? pages : null,
        };
      });
  } catch {
    return [];
  }
}

/** Add attachment refs to a user message's metadata; unchanged (same value) when there are none. */
export function withAttachmentRefs<T extends Record<string, unknown> | undefined>(
  metadata: T,
  refs: ChatAttachmentRef[] | null | undefined,
): T | Record<string, unknown> {
  if (!refs || refs.length === 0) return metadata;
  return { ...(metadata || {}), attachments: refs.slice(0, MAX_ATTACHMENTS_PER_MESSAGE) };
}

/**
 * Active documents of a conversation: distinct document ids from this user's earlier messages in
 * the session, most recent first, at most 10. Ownership/status are NOT trusted here; the context
 * builder re-checks them.
 */
export async function loadActiveDocumentIds(sb: Sb, userId: string, sessionId: string | null | undefined): Promise<string[]> {
  if (!userId || !sessionId) return [];
  try {
    const { data, error } = await sb
      .from('chat_messages')
      .select('metadata, created_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !Array.isArray(data)) return [];
    const out: string[] = [];
    for (const row of data) {
      for (const ref of readAttachmentRefs(row?.metadata)) {
        if (!out.includes(ref.document_id)) out.push(ref.document_id);
        if (out.length >= MAX_ACTIVE_DOCUMENTS_PER_CONVERSATION) return out;
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Ids for this turn's document context: the message's own first, then active ones (≤ 10). */
export function mergeContextDocumentIds(current: unknown, active: string[]): string[] {
  const out = cleanIds(current, MAX_ATTACHMENTS_PER_MESSAGE);
  // Non-UUID ids from callers are kept for the existing path (buildAttachmentContext checks them).
  if (Array.isArray(current)) {
    for (const id of current) if (typeof id === 'string' && id.length > 0 && id.length <= 64 && !out.includes(id)) out.push(id);
  }
  for (const id of active) {
    if (out.length >= MAX_ACTIVE_DOCUMENTS_PER_CONVERSATION) break;
    if (!out.includes(id)) out.push(id);
  }
  return out.slice(0, MAX_ACTIVE_DOCUMENTS_PER_CONVERSATION);
}

/** Current status of each id for the verified owner. Not found / not owned / not a chat document → 'removed'. */
export async function resolveAttachmentStatuses(
  sb: Sb,
  userId: string,
  documentIds: unknown,
  max = 50,
): Promise<Array<{ document_id: string; status: ChatAttachmentStatus; pages: number | null }>> {
  const ids = cleanIds(documentIds, max);
  if (!userId || !ids.length) return [];
  const { data, error } = await sb
    .from('user_documents')
    .select('id, user_id, purpose, status, pages_detected')
    .eq('user_id', userId)
    .in('id', ids);
  if (error) throw new Error('status_lookup_failed');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose DB rows
  const byId = new Map<string, any>((data || []).filter((r: { user_id?: string }) => r?.user_id === userId).map((r: { id: string }) => [r.id, r]));
  return ids.map((id) => {
    const r = byId.get(id);
    if (!r || r.purpose !== 'chat_document') return { document_id: id, status: 'removed' as const, pages: null };
    const s = String(r.status || '').toLowerCase();
    const status: ChatAttachmentStatus =
      s === 'ready' ? 'ready' : s === 'purged' || s === 'deleted' ? 'removed' : s === 'rejected' || s === 'failed' ? 'unreadable' : 'processing';
    const pages = Number(r.pages_detected);
    return { document_id: id, status, pages: status === 'removed' ? null : Number.isInteger(pages) && pages > 0 ? pages : null };
  });
}

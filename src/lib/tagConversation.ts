/**
 * T-H2 — Tag conversation client rules (contract agreed with Tag HQ, T-H1 / T-H1b):
 * request { message, sessionId?, clientMessageId, newConversation?, importId?, focusedTransaction? }
 * response { reply, action, sessionId, persisted, duplicate?, conflict?, actionOutcome? }.
 *
 * - duplicate:true → this message was already handled: show the stored reply, apply nothing.
 * - conflict:true  → nothing ran and nothing was saved: show the reply (it asks to resend);
 *                    a resend is a NEW message (new clientMessageId).
 * - persisted:false (no duplicate / conflict) → "couldn't be saved"; Retry reuses the SAME id.
 * Retries are never automatic.
 */
import { isValidClientMessageId } from '@/shared/conversation-identity';
import { isConversationId } from '@/lib/conversationStore';

export function newClientMessageId(): string {
  try {
    const id = globalThis.crypto?.randomUUID?.();
    if (id && isValidClientMessageId(id)) return id;
  } catch { /* fall through */ }
  const rand = Math.random().toString(36).slice(2, 12);
  return `m_${Date.now().toString(36)}_${rand}`;
}

export type TagReplyKind = 'ok' | 'duplicate' | 'conflict' | 'not_saved';

export interface TagReplyOutcome {
  kind: TagReplyKind;
  /** Whether the client may refresh / apply effects of this reply (never for duplicate or conflict). */
  mayApply: boolean;
  sessionId: string | null;
}

export function tagReplyOutcome(data: unknown): TagReplyOutcome {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const sessionId = isConversationId(d.sessionId) ? (d.sessionId as string) : null;
  if (d.duplicate === true) return { kind: 'duplicate', mayApply: false, sessionId };
  if (d.conflict === true) return { kind: 'conflict', mayApply: false, sessionId };
  if (d.persisted === false) return { kind: 'not_saved', mayApply: true, sessionId };
  return { kind: 'ok', mayApply: true, sessionId };
}

/**
 * The old browser-only transcript (tag_chat_history), read for display during the transition:
 * no 6-hour expiry, never sent to the server, never written again.
 */
export function legacyTagTranscript(raw: string | null): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .map((m: { role?: unknown; content?: unknown; text?: unknown }) => ({
        role: (m?.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: String(m?.content ?? m?.text ?? '').trim(),
      }))
      .filter(m => m.content.length > 0)
      .slice(-20);
  } catch {
    return [];
  }
}

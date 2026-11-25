/**
 * Universal employee conversation platform (owner directive, 2026-11-25). Prime HQ owns this contract.
 *
 * ONE persistence path for every customer-facing employee, built on the existing infrastructure:
 * chat_sessions / chat_messages via _shared/session.ts (ensureSession, getRecentMessages). No new
 * tables, no per-employee stores. The chat_messages insert trigger already maintains
 * chat_sessions.last_message_at / message_count.
 *
 * Guarantees (server-side):
 * - Ownership: a session id is used only if it belongs to the verified user (ensureSession).
 * - Employee identity: a session owned by the user but belonging to ANOTHER employee is never
 *   continued — a fresh session for this employee is opened instead.
 * - Model context comes only from stored history (toModelHistory); client-sent history is ignored.
 * - Customer text is PII-masked (shared pii.ts patterns) before it is stored.
 * - Retries with the same client message id do not create duplicate messages.
 * - The session gets a title from the first (masked) customer message.
 * Persistence never grants tools, documents or paid actions: those stay with each employee's own
 * capability checks (src/shared/capabilities.ts).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureSession, getRecentMessages } from './session.js';
import { maskPII } from './pii.js';
import {
  canonicalEmployeeSlug,
  deriveConversationTitle,
  isValidClientMessageId,
  toModelHistory,
  DEFAULT_SESSION_TITLE,
  type ConversationEmployeeSlug,
} from '../../../src/shared/conversation-identity';

export interface OpenedConversation {
  sessionId: string;
  employeeSlug: ConversationEmployeeSlug;
  /** True when the requested id was not usable (absent, foreign, or another employee's). */
  isNew: boolean;
}

export async function openEmployeeConversation(
  sb: SupabaseClient,
  params: { userId: string; employeeSlug: string; requestedSessionId?: string | null },
): Promise<OpenedConversation> {
  const employee = canonicalEmployeeSlug(params.employeeSlug);
  if (!employee) throw new Error(`Unknown conversation employee: ${String(params.employeeSlug).slice(0, 40)}`);
  const requested = params.requestedSessionId || undefined;

  const first = await ensureSession(sb, params.userId, requested, employee);
  if (canonicalEmployeeSlug(first.employee_slug) === employee) {
    return { sessionId: first.sessionId, employeeSlug: employee, isNew: first.sessionId !== requested };
  }
  // Owned by this customer but another employee's conversation: never continue it here.
  const fresh = await ensureSession(sb, params.userId, undefined, employee);
  return { sessionId: fresh.sessionId, employeeSlug: employee, isNew: true };
}

/** Stored history for the model (user/assistant only), within an AI context budget. */
export async function loadConversationHistory(
  sb: SupabaseClient,
  params: { sessionId: string; userId: string; maxTokens?: number; maxMessages?: number },
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const rows = await getRecentMessages(sb, params.sessionId, params.userId, params.maxTokens ?? 4000, params.maxMessages ?? 50);
  return toModelHistory(rows);
}

export interface RecordedTurn {
  duplicate: boolean;
  maskedUserText: string;
}

/**
 * Persist one customer turn and the employee's reply. Customer text is masked before storage.
 * With a valid clientMessageId, a retry of an already-stored turn is skipped (duplicate: true).
 */
export async function recordConversationTurn(
  sb: SupabaseClient,
  params: {
    sessionId: string;
    userId: string;
    employeeSlug: ConversationEmployeeSlug;
    userText: string;
    assistantText: string;
    clientMessageId?: string | null;
    assistantMetadata?: Record<string, unknown>;
  },
): Promise<RecordedTurn> {
  const maskedUserText = maskPII(String(params.userText ?? '')).masked;
  const clientMessageId = isValidClientMessageId(params.clientMessageId) ? params.clientMessageId : null;

  if (clientMessageId) {
    const { data: existing } = await sb
      .from('chat_messages')
      .select('id')
      .eq('session_id', params.sessionId)
      .eq('user_id', params.userId)
      .eq('role', 'user')
      .eq('metadata->>client_message_id', clientMessageId)
      .limit(1);
    if (Array.isArray(existing) && existing.length > 0) return { duplicate: true, maskedUserText };
  }

  const base = { session_id: params.sessionId, user_id: params.userId, thread_id: params.sessionId };
  const { error: userErr } = await sb.from('chat_messages').insert({
    ...base,
    role: 'user',
    content: maskedUserText,
    redacted_content: maskedUserText,
    tokens: Math.ceil(maskedUserText.length / 4),
    metadata: { employee_slug: params.employeeSlug, ...(clientMessageId ? { client_message_id: clientMessageId } : {}) },
  });
  if (userErr) throw new Error('Failed to save conversation message');

  const assistantText = String(params.assistantText ?? '');
  const { error: asstErr } = await sb.from('chat_messages').insert({
    ...base,
    role: 'assistant',
    content: assistantText,
    redacted_content: assistantText,
    tokens: Math.ceil(assistantText.length / 4),
    metadata: { employee_slug: params.employeeSlug, ...(clientMessageId ? { reply_to: clientMessageId } : {}), ...(params.assistantMetadata ?? {}) },
  });
  if (asstErr) throw new Error('Failed to save conversation reply');

  // Title from the first customer message (only while the session still has the default title).
  const title = deriveConversationTitle(maskedUserText);
  if (title) {
    await sb.from('chat_sessions')
      .update({ title })
      .eq('id', params.sessionId)
      .eq('user_id', params.userId)
      .eq('title', DEFAULT_SESSION_TITLE);
  }
  return { duplicate: false, maskedUserText };
}

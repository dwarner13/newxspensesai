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
 * - Customer text is PII-masked before it is stored (critical detectors from pii-patterns.ts, as chat.ts).
 * - Retries with the same client message id do not create duplicate messages.
 * - The session gets a title from the first (masked) customer message.
 * Persistence never grants tools, documents or paid actions: those stay with each employee's own
 * capability checks (src/shared/capabilities.ts).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureSession, getRecentMessages } from './session.js';
import { maskSpecificPII, getCriticalDetectors } from './pii.js';
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

/**
 * Customer text as it may be sent to an employee's model: the CRITICAL PII detectors only (card
 * numbers, SSN/SIN, bank accounts, email, phone). This is the same default set chat.ts applies
 * through guardrails (getCriticalDetectors), without that module's network client or event writes.
 * Merchant names, store numbers, dates and amounts are kept so categorization still works.
 * (Added by Tag HQ for T-H1; Prime HQ owns this file and reviews it.)
 */
export function maskCustomerTextForModel(text: unknown): string {
  return maskSpecificPII(String(text ?? ''), getCriticalDetectors().map(d => d.name)).masked;
}

/**
 * chat_messages.employee_key (NOT NULL live) for a canonical slug, matching chat.ts's fallback
 * derivation (`slug.split('-')[0]`): 'prime-boss' -> 'prime', 'tag-ai' -> 'tag', 'custodian' -> 'custodian'.
 */
export function employeeKeyForSlug(slug: ConversationEmployeeSlug): string {
  return slug.split('-')[0] || slug;
}

/** A conversation idle longer than this is not resumed implicitly (it is kept, never deleted). */
export const IMPLICIT_RESUME_IDLE_MS = 6 * 60 * 60 * 1000;

/**
 * The customer's most recent conversation with this employee that was active within the idle
 * window, or null. Used when a client sends no session id (older cached app versions), so turns
 * keep their context instead of each opening a new conversation. Ownership: user_id filter on the
 * verified user; employee identity: alias-aware slug match. Never deletes or modifies anything.
 * (Added by Tag HQ for T-H1; Prime HQ owns this file and reviews it.)
 */
export async function findRecentEmployeeConversation(
  sb: SupabaseClient,
  params: { userId: string; employeeSlug: string; now?: number; maxIdleMs?: number },
): Promise<string | null> {
  const employee = canonicalEmployeeSlug(params.employeeSlug);
  if (!employee) return null;
  const { data, error } = await sb
    .from('chat_sessions')
    .select('id, employee_slug, created_at, last_message_at')
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
    .limit(25);
  if (error || !Array.isArray(data)) return null;
  const now = params.now ?? Date.now();
  const maxIdle = params.maxIdleMs ?? IMPLICIT_RESUME_IDLE_MS;
  let best: { id: string; at: number } | null = null;
  for (const s of data as Array<{ id?: unknown; employee_slug?: unknown; created_at?: unknown; last_message_at?: unknown }>) {
    if (typeof s.id !== 'string' || canonicalEmployeeSlug(s.employee_slug) !== employee) continue;
    const at = Math.max(Date.parse(String(s.last_message_at ?? '')) || 0, Date.parse(String(s.created_at ?? '')) || 0);
    if (!at || now - at > maxIdle) continue;
    if (!best || at > best.at) best = { id: s.id, at };
  }
  return best?.id ?? null;
}

export interface PriorTurn {
  /** A customer message with this client message id is already stored in this session. */
  found: boolean;
  /** The stored employee reply to it, or null if the reply was not saved. */
  reply: string | null;
}

/**
 * Retry check BEFORE an employee runs its model or tools: if this client message id was already
 * stored, return the stored reply so a retry never re-executes actions or double-charges usage.
 * (Added by Tag HQ for T-H1; Prime HQ owns this file and reviews it.)
 */
export async function findRecordedTurn(
  sb: SupabaseClient,
  params: { sessionId: string; userId: string; clientMessageId?: string | null },
): Promise<PriorTurn> {
  if (!isValidClientMessageId(params.clientMessageId)) return { found: false, reply: null };
  const id = params.clientMessageId;
  const { data: userRows, error: userErr } = await sb
    .from('chat_messages')
    .select('id')
    .eq('session_id', params.sessionId)
    .eq('user_id', params.userId)
    .eq('role', 'user')
    .eq('metadata->>client_message_id', id)
    .limit(1);
  if (userErr) throw new Error('Failed to check for a previous message');
  if (!Array.isArray(userRows) || userRows.length === 0) return { found: false, reply: null };
  const { data: replyRows } = await sb
    .from('chat_messages')
    .select('content')
    .eq('session_id', params.sessionId)
    .eq('user_id', params.userId)
    .eq('role', 'assistant')
    .eq('metadata->>reply_to', id)
    .limit(1);
  const reply = Array.isArray(replyRows) && typeof replyRows[0]?.content === 'string' ? replyRows[0].content : null;
  return { found: true, reply };
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
  // Stored text is masked the same way chat.ts stores Prime's messages (critical detectors), so
  // merchant names, store numbers, dates and amounts stay usable in the conversation history.
  const maskedUserText = maskCustomerTextForModel(params.userText);
  const clientMessageId = isValidClientMessageId(params.clientMessageId) ? params.clientMessageId : null;
  const employeeKey = employeeKeyForSlug(params.employeeSlug);

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

  // Live schema (owner P-1/P-2, 2026-11-24): chat_messages has NO redacted_content column, and
  // employee_key is NOT NULL. Masked text goes in `content` (as in chat.ts). employee_key uses the
  // short key chat.ts derives from the slug ('tag-ai' -> 'tag'); employee_slug stays in metadata.
  const base = { session_id: params.sessionId, user_id: params.userId, thread_id: params.sessionId, employee_key: employeeKey };
  const { error: userErr } = await sb.from('chat_messages').insert({
    ...base,
    role: 'user',
    content: maskedUserText,
    // Top-level client_message_id column (live) on the customer row only, plus the metadata copy
    // that chat.ts's retry check reads. The reply row never carries it, so a unique index on the
    // column (P-5, unverified) cannot reject the reply.
    ...(clientMessageId ? { client_message_id: clientMessageId } : {}),
    tokens: Math.ceil(maskedUserText.length / 4),
    metadata: { employee_slug: params.employeeSlug, ...(clientMessageId ? { client_message_id: clientMessageId } : {}) },
  });
  if (userErr) {
    // A unique-key conflict on client_message_id means a concurrent retry already stored this turn.
    if (clientMessageId && (userErr as { code?: string }).code === '23505') return { duplicate: true, maskedUserText };
    throw new Error('Failed to save conversation message');
  }

  const assistantText = String(params.assistantText ?? '');
  const { error: asstErr } = await sb.from('chat_messages').insert({
    ...base,
    role: 'assistant',
    content: assistantText,
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

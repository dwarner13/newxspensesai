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
 * TEMPORARY backward compatibility (owner, 2026-11-25): only for clients that send no session id.
 * A conversation idle longer than this is not resumed implicitly — it is KEPT, never deleted, and
 * stays available in history. Remove once every client sends its session id.
 */
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
    .order('last_message_at', { ascending: false, nullsFirst: false })
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
 * Insert one chat_messages row. `redacted_content` is written when the live schema has it; if the
 * column is missing (PostgREST PGRST204), the row is written without it — never failing the save.
 * Pending owner read-only check of the live schema (see TAG/UNIVERSAL plan, prerequisite SQL).
 */
async function insertMessageRow(sb: SupabaseClient, row: Record<string, unknown>): Promise<{ id: string | null; error: unknown }> {
  let res = await sb.from('chat_messages').insert(row).select('id, created_at').single();
  if (res.error && (res.error as { code?: string }).code === 'PGRST204' && String((res.error as { message?: string }).message || '').includes('redacted_content')) {
    const { redacted_content: _omit, ...rest } = row;
    void _omit;
    res = await sb.from('chat_messages').insert(rest).select('id, created_at').single();
  }
  const data = res.data as { id?: string } | null;
  return { id: data?.id ?? null, error: res.error ?? null };
}

export type TurnClaim =
  | { status: 'claimed'; maskedUserText: string; userMessageId: string | null }
  | { status: 'duplicate'; reply: string | null }
  | { status: 'unsaved'; maskedUserText: string };

/**
 * CLAIM-FIRST retry protection (Prime HQ review of T-H1). Store the customer message BEFORE the
 * employee runs its model or any tool. Only the request that owns the claim may run actions:
 * - this client message id already stored (retry, or a retry after a partial failure) → 'duplicate'
 *   with the stored reply (or null): the caller must NOT run the model or tools again;
 * - two concurrent requests with the same id → both insert, then the earliest row wins; the other
 *   gets 'duplicate'. (A database unique index — owner-gated migration — makes this airtight;
 *   until then the race window is the few milliseconds between the two inserts.)
 * - the claim could not be written → 'unsaved': the caller may answer, but must report
 *   persisted:false. Without a valid clientMessageId there is no retry protection at all.
 */
export async function claimConversationTurn(
  sb: SupabaseClient,
  params: { sessionId: string; userId: string; employeeSlug: ConversationEmployeeSlug; userText: string; clientMessageId?: string | null },
): Promise<TurnClaim> {
  const maskedUserText = maskCustomerTextForModel(params.userText);
  const clientMessageId = isValidClientMessageId(params.clientMessageId) ? params.clientMessageId : null;

  if (clientMessageId) {
    const prior = await findRecordedTurn(sb, { sessionId: params.sessionId, userId: params.userId, clientMessageId });
    if (prior.found) return { status: 'duplicate', reply: prior.reply };
  }

  const inserted = await insertMessageRow(sb, {
    session_id: params.sessionId, user_id: params.userId, thread_id: params.sessionId,
    role: 'user', content: maskedUserText, redacted_content: maskedUserText,
    tokens: Math.ceil(maskedUserText.length / 4),
    metadata: { employee_slug: params.employeeSlug, ...(clientMessageId ? { client_message_id: clientMessageId } : {}) },
  });
  if (inserted.error) return { status: 'unsaved', maskedUserText };

  if (clientMessageId) {
    // Concurrency: if another request stored the same client id, the earliest row owns the turn.
    const { data: rows } = await sb
      .from('chat_messages')
      .select('id, created_at')
      .eq('session_id', params.sessionId)
      .eq('user_id', params.userId)
      .eq('role', 'user')
      .eq('metadata->>client_message_id', clientMessageId)
      .order('created_at', { ascending: true })
      .limit(5);
    if (Array.isArray(rows) && rows.length > 1) {
      const first = [...rows].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)))[0];
      if (first && first.id !== inserted.id) return { status: 'duplicate', reply: null };
    }
  }

  const title = deriveConversationTitle(maskedUserText);
  if (title) {
    await sb.from('chat_sessions').update({ title })
      .eq('id', params.sessionId).eq('user_id', params.userId).eq('title', DEFAULT_SESSION_TITLE);
  }
  return { status: 'claimed', maskedUserText, userMessageId: inserted.id };
}

/** Store the employee's reply to a claimed turn. Throws on failure (caller reports persisted:false). */
export async function completeConversationTurn(
  sb: SupabaseClient,
  params: { sessionId: string; userId: string; employeeSlug: ConversationEmployeeSlug; assistantText: string; clientMessageId?: string | null; assistantMetadata?: Record<string, unknown> },
): Promise<void> {
  const clientMessageId = isValidClientMessageId(params.clientMessageId) ? params.clientMessageId : null;
  const assistantText = String(params.assistantText ?? '');
  const res = await insertMessageRow(sb, {
    session_id: params.sessionId, user_id: params.userId, thread_id: params.sessionId,
    role: 'assistant', content: assistantText, redacted_content: assistantText,
    tokens: Math.ceil(assistantText.length / 4),
    metadata: { employee_slug: params.employeeSlug, ...(clientMessageId ? { reply_to: clientMessageId } : {}), ...(params.assistantMetadata ?? {}) },
  });
  if (res.error) throw new Error('Failed to save conversation reply');
}

/**
 * Persist a customer turn and the reply in one call (for paths that run no tools). Paths that can
 * run actions must use claimConversationTurn BEFORE acting and completeConversationTurn after.
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
  const claim = await claimConversationTurn(sb, params);
  if (claim.status === 'duplicate') return { duplicate: true, maskedUserText: maskCustomerTextForModel(params.userText) };
  if (claim.status === 'unsaved') throw new Error('Failed to save conversation message');
  await completeConversationTurn(sb, params);
  return { duplicate: false, maskedUserText: claim.maskedUserText };
}

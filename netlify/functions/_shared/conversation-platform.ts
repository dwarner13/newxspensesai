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
import { createHash } from 'crypto';
import { ensureSession, getRecentMessages } from './session.js';
import { ensureThread } from './ensureThread.js';
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
  /** The recorded outcome of any action taken for that turn (assistant metadata), or null if unknown. */
  actionOutcome: Record<string, unknown> | null;
}

/**
 * Retry check BEFORE an employee runs its model or tools: if this client message id was already
 * stored in THIS session for THIS customer, return the stored reply and action outcome, so a retry
 * never re-executes actions. (Added by Tag HQ for T-H1; extended by Prime HQ.)
 */
export async function findRecordedTurn(
  sb: SupabaseClient,
  params: { sessionId: string; userId: string; clientMessageId?: string | null },
): Promise<PriorTurn> {
  const none: PriorTurn = { found: false, reply: null, actionOutcome: null };
  if (!isValidClientMessageId(params.clientMessageId)) return none;
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
  if (!Array.isArray(userRows) || userRows.length === 0) return none;
  const { data: replyRows } = await sb
    .from('chat_messages')
    .select('content, metadata')
    .eq('session_id', params.sessionId)
    .eq('user_id', params.userId)
    .eq('role', 'assistant')
    .eq('metadata->>reply_to', id)
    .limit(1);
  const row = Array.isArray(replyRows) ? (replyRows[0] as { content?: unknown; metadata?: Record<string, unknown> } | undefined) : undefined;
  const reply = typeof row?.content === 'string' ? row.content : null;
  const receipt = row?.metadata && typeof row.metadata.actionReceipt === 'object' ? (row.metadata.actionReceipt as Record<string, unknown>) : null;
  return { found: true, reply, actionOutcome: receipt };
}

// ─── Shared action-receipt contract (T-H1b, Tag HQ; reusable by every employee) ───────────────
// Receipts are written ONLY by the server from the verified outcome of an action; browser text is
// never stored as an employee reply or receipt. Shared history never grants another employee's
// permissions: each employee still authorises and executes its own actions.
// Lifecycle: proposed (server-verified matches, awaiting confirmation) → the customer's confirming
// message carries metadata.actionIntent.state = 'confirmed' → completed | failed; or cancelled.

export const ACTION_STATES = ['proposed', 'confirmed', 'completed', 'failed', 'cancelled'] as const;
export type ActionState = typeof ACTION_STATES[number];

export interface ActionReceipt {
  v: 1;
  /** Canonical slug of the employee that owns the action. */
  employee: ConversationEmployeeSlug;
  /** Employee-specific action name, e.g. 'recategorize_by_merchant'. */
  action: string;
  state: ActionState;
  /** Non-secret parameters the action is about, e.g. { matchValue, targetCategory }. */
  subject?: Record<string, string | number | null>;
  /** Server-verified counts. */
  result?: { affectedCount?: number; matchCount?: number };
  /** Machine reason for failed / cancelled states, e.g. 'no_matches'. */
  reason?: string;
  /** Client message id of the turn whose reply carried the proposal this receipt resolves. */
  proposalRef?: string | null;
  /** Prime HQ's outcome fields (tool, success, count), mirrored for every employee. */
  tool?: string;
  success?: boolean;
  count?: number;
}

/** Validate a stored receipt (metadata comes from the database). Null when malformed. */
export function parseActionReceipt(raw: unknown): ActionReceipt | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1 || typeof r.action !== 'string' || !ACTION_STATES.includes(r.state as ActionState)) return null;
  const employee = canonicalEmployeeSlug(r.employee);
  if (!employee) return null;
  return { ...(r as unknown as ActionReceipt), employee };
}

/**
 * The newest action receipt among the last `lookback` employee replies in a conversation, with the
 * client message id of the turn it answered. Used to bind a confirmation to the proposal the SERVER
 * recorded (never to a proposal the browser claims was made).
 */
export async function findLatestActionReceipt(
  sb: SupabaseClient,
  params: { sessionId: string; userId: string; lookback?: number },
): Promise<{ receipt: ActionReceipt; replyTo: string | null } | null> {
  const { data, error } = await sb
    .from('chat_messages')
    .select('metadata, created_at')
    .eq('session_id', params.sessionId)
    .eq('user_id', params.userId)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(params.lookback ?? 5);
  if (error || !Array.isArray(data)) return null;
  for (const row of data as Array<{ metadata?: Record<string, unknown> | null }>) {
    const receipt = parseActionReceipt(row?.metadata?.actionReceipt);
    if (receipt) {
      const replyTo = typeof row.metadata?.reply_to === 'string' ? (row.metadata.reply_to as string) : null;
      return { receipt, replyTo };
    }
  }
  return null;
}

/**
 * The conversation an employee endpoint should use: the requested one (when owned and this
 * employee's); otherwise — unless the customer asked for a new conversation — their recent one
 * (temporary compatibility, see findRecentEmployeeConversation); otherwise a new one.
 */
export async function resolveEmployeeConversation(
  sb: SupabaseClient,
  params: { userId: string; employeeSlug: string; requestedSessionId?: string | null; newConversation?: boolean },
): Promise<OpenedConversation> {
  let requested = params.requestedSessionId || null;
  if (!requested && params.newConversation !== true) {
    requested = await findRecentEmployeeConversation(sb, { userId: params.userId, employeeSlug: params.employeeSlug });
  }
  return openEmployeeConversation(sb, { userId: params.userId, employeeSlug: params.employeeSlug, requestedSessionId: requested });
}

export interface RecordedTurn {
  duplicate: boolean;
  maskedUserText: string;
}

/**
 * chat_messages.employee_key for an employee. The live column is NOT NULL with a default of 'user'
 * (owner P-2), so it is ALWAYS set explicitly. Same order as chat.ts: the employee_profiles registry
 * row for the canonical slug first, else the slug prefix. Never 'user'. Aliases are already resolved by
 * canonicalEmployeeSlug, so the registry's resolve_employee_slug RPC (which recurses without a
 * guard) is not used here.
 */
export function employeeKeyForSlug(slug: ConversationEmployeeSlug): string {
  return slug.split('-')[0] || slug;
}
const employeeKeyCache = new Map<string, string>();
export async function resolveEmployeeKey(sb: SupabaseClient, slug: ConversationEmployeeSlug): Promise<string> {
  const cached = employeeKeyCache.get(slug);
  if (cached) return cached;
  let key = employeeKeyForSlug(slug);
  try {
    const { data } = await sb.from('employee_profiles').select('employee_key').eq('slug', slug).maybeSingle();
    const fromRegistry = (data as { employee_key?: unknown } | null)?.employee_key;
    if (typeof fromRegistry === 'string' && /^[a-z][a-z0-9_-]{0,40}$/.test(fromRegistry) && fromRegistry !== 'user') key = fromRegistry;
  } catch { /* registry unavailable: slug prefix, as chat.ts falls back */ }
  employeeKeyCache.set(slug, key);
  return key;
}

/**
 * Live schema (owner P-1..P-5): chat_messages.thread_id has a FOREIGN KEY to chat_threads(id)
 * ON DELETE CASCADE, and chat_threads is UNIQUE(user_id, assistant_key): ONE thread per customer and
 * employee. Architecture (same as chat.ts): the THREAD is the employee-level container
 * (ensureThread), each SESSION is one independent conversation. Every message carries both.
 * Never put a session id in thread_id. Never delete a thread to delete a conversation — the cascade
 * would remove every conversation with that employee (see deleteEmployeeConversation).
 */
async function resolveThread(sb: SupabaseClient, userId: string, employeeKey: string): Promise<string> {
  try {
    return await ensureThread(sb, userId, employeeKey);
  } catch {
    // Concurrent first messages: the other request created the thread (UNIQUE user_id+assistant_key
    // rejected ours). Look again — ensureThread returns the existing thread.
    return ensureThread(sb, userId, employeeKey);
  }
}

function baseRow(p: { sessionId: string; userId: string; employeeKey: string; threadId: string }) {
  return { session_id: p.sessionId, user_id: p.userId, thread_id: p.threadId, employee_key: p.employeeKey };
}

/**
 * Deterministic message_uid for a customer message (live UNIQUE index on chat_messages.message_uid;
 * client_message_id has NO unique index). Derived from customer + session + client message id, so a
 * concurrent duplicate insert is rejected by the database (23505) instead of creating a second row.
 * UUID-formatted (version 5 / RFC 4122 variant bits) so it is valid for a uuid or text column.
 */
export function deterministicMessageUid(userId: string, sessionId: string, clientMessageId: string): string {
  const h = createHash('sha256').update(`chat_messages:user:${userId}:${sessionId}:${clientMessageId}`).digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export type TurnClaim =
  | { status: 'claimed'; maskedUserText: string; userMessageId: string | null }
  | { status: 'duplicate'; reply: string | null; actionOutcome: Record<string, unknown> | null }
  | { status: 'conflict' }
  | { status: 'unsaved'; maskedUserText: string };

/**
 * CLAIM-FIRST retry protection. Store the customer message BEFORE the employee runs its model or
 * any tool; only the request that owns the claim may act.
 * - 'duplicate': this client message id is ALREADY STORED in this session for this customer —
 *   verified by reading the stored customer message (and its reply / action outcome if saved).
 *   The caller must not run the model or tools; it reports the stored reply, or — when the reply
 *   or outcome was not saved — that the outcome is unknown (never "done").
 * - 'conflict': the insert hit a unique-key conflict (23505) but no matching customer message
 *   exists in this session (e.g. the id is used elsewhere). Nothing is assumed: the caller must not
 *   act and should ask the customer to resend.
 * - 'unsaved': the claim could not be written for another reason; the caller may answer but must
 *   report persisted:false. Without a valid clientMessageId there is no retry protection.
 * Concurrency: the customer row carries a deterministic message_uid (live unique index), so of two
 * concurrent requests with the same client message id exactly one insert succeeds; the other gets
 * 23505 and is resolved by READING what is stored (never assumed).
 */
export async function claimConversationTurn(
  sb: SupabaseClient,
  params: {
    sessionId: string; userId: string; employeeSlug: ConversationEmployeeSlug; userText: string; clientMessageId?: string | null;
    /** Extra metadata for the customer row, e.g. { actionIntent: { state: 'confirmed', ... } } (T-H1b). */
    metadata?: Record<string, unknown>;
  },
): Promise<TurnClaim> {
  const maskedUserText = maskCustomerTextForModel(params.userText);
  const clientMessageId = isValidClientMessageId(params.clientMessageId) ? params.clientMessageId : null;

  if (clientMessageId) {
    const prior = await findRecordedTurn(sb, { sessionId: params.sessionId, userId: params.userId, clientMessageId });
    if (prior.found) return { status: 'duplicate', reply: prior.reply, actionOutcome: prior.actionOutcome };
  }

  const employeeKey = await resolveEmployeeKey(sb, params.employeeSlug);
  let threadId: string;
  try {
    threadId = await resolveThread(sb, params.userId, employeeKey);
  } catch {
    return { status: 'unsaved', maskedUserText };
  }
  const res = await sb.from('chat_messages').insert({
    ...baseRow({ sessionId: params.sessionId, userId: params.userId, employeeKey, threadId }),
    ...(clientMessageId ? { message_uid: deterministicMessageUid(params.userId, params.sessionId, clientMessageId) } : {}),
    role: 'user',
    content: maskedUserText,
    tokens: Math.ceil(maskedUserText.length / 4),
    ...(clientMessageId ? { client_message_id: clientMessageId } : {}),
    metadata: { ...(params.metadata ?? {}), employee_slug: params.employeeSlug, ...(clientMessageId ? { client_message_id: clientMessageId } : {}) },
  }).select('id, created_at').single();

  if (res.error) {
    if (clientMessageId && (res.error as { code?: string }).code === '23505') {
      // Never assume completion from a unique conflict: verify what is actually stored.
      const prior = await findRecordedTurn(sb, { sessionId: params.sessionId, userId: params.userId, clientMessageId });
      return prior.found ? { status: 'duplicate', reply: prior.reply, actionOutcome: prior.actionOutcome } : { status: 'conflict' };
    }
    return { status: 'unsaved', maskedUserText };
  }
  const insertedId = (res.data as { id?: string } | null)?.id ?? null;

  const title = deriveConversationTitle(maskedUserText);
  if (title) {
    await sb.from('chat_sessions').update({ title })
      .eq('id', params.sessionId).eq('user_id', params.userId).eq('title', DEFAULT_SESSION_TITLE);
  }
  return { status: 'claimed', maskedUserText, userMessageId: insertedId };
}

/**
 * Store the employee's reply to a claimed turn. Put the AUTHORITATIVE action outcome (what the tool
 * actually did, e.g. { actionReceipt: { tool, success, count } }) in assistantMetadata so a retry
 * reports the real outcome. Throws on failure (caller reports persisted:false).
 */
export async function completeConversationTurn(
  sb: SupabaseClient,
  params: { sessionId: string; userId: string; employeeSlug: ConversationEmployeeSlug; assistantText: string; clientMessageId?: string | null; assistantMetadata?: Record<string, unknown> },
): Promise<void> {
  const clientMessageId = isValidClientMessageId(params.clientMessageId) ? params.clientMessageId : null;
  const assistantText = String(params.assistantText ?? '');
  const employeeKey = await resolveEmployeeKey(sb, params.employeeSlug);
  const threadId = await resolveThread(sb, params.userId, employeeKey);
  const { error } = await sb.from('chat_messages').insert({
    ...baseRow({ sessionId: params.sessionId, userId: params.userId, employeeKey, threadId }),
    role: 'assistant',
    content: assistantText,
    tokens: Math.ceil(assistantText.length / 4),
    metadata: { employee_slug: params.employeeSlug, ...(clientMessageId ? { reply_to: clientMessageId } : {}), ...(params.assistantMetadata ?? {}) },
  });
  if (error) throw new Error('Failed to save conversation reply');
}

/**
 * Persist a customer turn and the reply in one call (for paths that run no tools). Paths that can
 * run actions must call claimConversationTurn BEFORE acting and completeConversationTurn after.
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
  if (claim.status !== 'claimed') throw new Error('Failed to save conversation message');
  await completeConversationTurn(sb, params);
  return { duplicate: false, maskedUserText: claim.maskedUserText };
}

/**
 * Delete ONE conversation (customer-controlled deletion; not yet wired to any endpoint or UI).
 * Removes only this session's messages and the session row, scoped to the verified customer and the
 * employee. NEVER deletes the chat_threads row: its ON DELETE CASCADE would erase every conversation
 * the customer has with that employee. Returns false when the session is not this customer's
 * conversation with this employee (nothing is deleted).
 */
export async function deleteEmployeeConversation(
  sb: SupabaseClient,
  params: { userId: string; employeeSlug: string; sessionId: string },
): Promise<boolean> {
  const employee = canonicalEmployeeSlug(params.employeeSlug);
  if (!employee) return false;
  const { data: session } = await sb
    .from('chat_sessions')
    .select('id, employee_slug')
    .eq('id', params.sessionId)
    .eq('user_id', params.userId)
    .maybeSingle();
  if (!session || canonicalEmployeeSlug((session as { employee_slug?: unknown }).employee_slug) !== employee) return false;
  const { error: msgErr } = await sb.from('chat_messages').delete().eq('session_id', params.sessionId).eq('user_id', params.userId);
  if (msgErr) throw new Error('Failed to delete conversation messages');
  const { error: sesErr } = await sb.from('chat_sessions').delete().eq('id', params.sessionId).eq('user_id', params.userId);
  if (sesErr) throw new Error('Failed to delete conversation');
  return true;
}

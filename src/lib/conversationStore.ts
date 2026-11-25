/**
 * T-H2 (owner GO) — shared, employee-agnostic conversation persistence helpers for every
 * customer-facing employee (Prime, Tag, Crystal, Goalie, Custodian…). Built on the shared
 * identity rules in src/shared/conversation-identity.ts; the server is the source of truth.
 *
 * - loadEmployeeSessions: the employee's own conversations, from chat_sessions (the
 *   authoritative employee_slug), owner-scoped, newest activity first, empty ones skipped.
 * - verifyOwnedSession: a session may be reopened only if it belongs to this user AND this
 *   employee. Fails closed.
 * - restoreSessionMessages: the session's visible messages, owner-scoped, oldest first
 *   (same mapping as Prime's history restore: metadata → meta, hidden rows excluded).
 * - Account-scoped browser cache (per user AND employee): only a fast first paint, replaced by
 *   the server copy; never shared between accounts on one device.
 */
import { isEmployeeConversation, DEFAULT_SESSION_TITLE, type ConversationEmployeeSlug } from '@/shared/conversation-identity';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isConversationId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v.trim());

/* eslint-disable @typescript-eslint/no-explicit-any -- narrow structural Supabase client */
type Client = { from(table: string): any };

export interface EmployeeSession {
  id: string;
  employee_slug: string;
  title: string | null;
  last_message_at: string | null;
  created_at: string | null;
}

export async function loadEmployeeSessions(
  client: Client | null | undefined,
  userId: string | null | undefined,
  employee: ConversationEmployeeSlug,
  limit = 40,
): Promise<EmployeeSession[]> {
  if (!client || !userId) return [];
  const { data: rows, error } = await client
    .from('chat_sessions')
    .select('id, employee_slug, title, last_message_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit * 4);
  if (error || !Array.isArray(rows)) return [];
  const mine = (rows as EmployeeSession[]).filter(r => r?.id && isEmployeeConversation(r.employee_slug, employee));
  if (mine.length === 0) return [];

  // Latest message per session; sessions with no messages have nothing to reopen.
  const { data: activity } = await client
    .from('chat_messages')
    .select('session_id, created_at')
    .eq('user_id', userId)
    .in('session_id', mine.map(r => r.id))
    .order('created_at', { ascending: false })
    .limit(2000);
  const latest = new Map<string, string>();
  for (const a of (activity ?? []) as Array<{ session_id: string; created_at: string }>) {
    if (a?.session_id && !latest.has(a.session_id)) latest.set(a.session_id, a.created_at);
  }
  return mine
    .filter(r => latest.has(r.id))
    .map(r => ({
      ...r,
      title: r.title && r.title.trim() && r.title !== DEFAULT_SESSION_TITLE ? r.title : null,
      last_message_at: latest.get(r.id) ?? r.last_message_at ?? r.created_at,
    }))
    .sort((a, b) => String(b.last_message_at).localeCompare(String(a.last_message_at)))
    .slice(0, limit);
}

export async function verifyOwnedSession(
  client: Client | null | undefined,
  userId: string | null | undefined,
  sessionId: unknown,
  employee: ConversationEmployeeSlug,
): Promise<boolean> {
  if (!client || !userId || !isConversationId(sessionId)) return false;
  try {
    const { data, error } = await client
      .from('chat_sessions')
      .select('id, employee_slug')
      .eq('id', sessionId.trim())
      .eq('user_id', userId)
      .maybeSingle();
    return !error && data?.id === sessionId.trim() && isEmployeeConversation(data?.employee_slug, employee);
  } catch {
    return false;
  }
}

export interface RestoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}

/** Pure mapping shared with tests: visible user/assistant rows, oldest first. */
export function mapRestoredRows(rows: unknown): RestoredMessage[] {
  if (!Array.isArray(rows)) return [];
  return (rows as Array<Record<string, any>>)
    .filter(r => r && (r.role === 'user' || r.role === 'assistant') && r.metadata?.hidden !== true && typeof r.id === 'string')
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .map(r => ({
      id: r.id,
      role: r.role,
      content: typeof r.content === 'string' ? r.content : '',
      createdAt: String(r.created_at ?? ''),
      meta: r.metadata && typeof r.metadata === 'object' ? r.metadata : undefined,
    }));
}

export async function restoreSessionMessages(
  client: Client | null | undefined,
  userId: string | null | undefined,
  sessionId: unknown,
  limit = 40,
): Promise<RestoredMessage[] | null> {
  if (!client || !userId || !isConversationId(sessionId)) return null;
  try {
    const { data, error } = await client
      .from('chat_messages')
      .select('id, role, content, created_at, metadata')
      .eq('session_id', sessionId.trim())
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return null;
    return mapRestoredRows(data);
  } catch {
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ── Account-scoped browser cache (fast first paint only) ─────────────────── */

export const CONVERSATION_CACHE_MAX_MESSAGES = 20;

export function conversationCacheKey(userId: string, employee: ConversationEmployeeSlug): string {
  return `xai.conversation.${employee}.${userId}`;
}

export interface CachedConversation {
  sessionId: string | null;
  messages: RestoredMessage[];
}

export function readCachedConversation(storage: Pick<Storage, 'getItem'> | null | undefined, userId: string | null | undefined, employee: ConversationEmployeeSlug): CachedConversation | null {
  if (!storage || !userId) return null;
  try {
    const raw = storage.getItem(conversationCacheKey(userId, employee));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<CachedConversation>;
    const sessionId = isConversationId(v.sessionId) ? v.sessionId : null;
    const messages = mapRestoredRows((Array.isArray(v.messages) ? v.messages : []).map(m => ({ ...m, created_at: (m as RestoredMessage).createdAt, metadata: (m as RestoredMessage).meta })));
    return { sessionId, messages: messages.slice(-CONVERSATION_CACHE_MAX_MESSAGES) };
  } catch {
    return null;
  }
}

export function writeCachedConversation(storage: Pick<Storage, 'setItem'> | null | undefined, userId: string | null | undefined, employee: ConversationEmployeeSlug, value: CachedConversation): void {
  if (!storage || !userId) return;
  try {
    storage.setItem(conversationCacheKey(userId, employee), JSON.stringify({
      sessionId: isConversationId(value.sessionId) ? value.sessionId : null,
      messages: value.messages.slice(-CONVERSATION_CACHE_MAX_MESSAGES),
    }));
  } catch { /* cache only */ }
}

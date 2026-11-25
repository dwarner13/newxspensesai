/**
 * T-H2 — shared, employee-agnostic conversation helpers (Prime, Tag, Crystal, Goalie,
 * Custodian…): owner- and employee-scoped history, restore and account-scoped cache.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadEmployeeSessions, verifyOwnedSession, restoreSessionMessages, mapRestoredRows,
  conversationCacheKey, readCachedConversation, writeCachedConversation, CONVERSATION_CACHE_MAX_MESSAGES,
} from '../conversationStore';

const U = 'user-1';
const S1 = '11111111-1111-4111-8111-111111111111';
const S2 = '22222222-2222-4222-8222-222222222222';
const S3 = '33333333-3333-4333-8333-333333333333';

/** Minimal chainable fake of the Supabase query builder; records filters. */
function fakeClient(tables: Record<string, Array<Record<string, unknown>>>, opts: { error?: boolean } = {}) {
  const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
  return {
    calls,
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      calls.push({ table, filters });
      let rows = [...(tables[table] ?? [])];
      const q: any = {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push([c, v]); rows = rows.filter(r => r[c] === v); return q; },
        in: (c: string, vs: unknown[]) => { filters.push([c, vs]); rows = rows.filter(r => vs.includes(r[c])); return q; },
        order: (c: string, o: { ascending: boolean }) => { rows.sort((a, b) => String(a[c]).localeCompare(String(b[c])) * (o.ascending ? 1 : -1)); return q; },
        limit: (n: number) => { rows = rows.slice(0, n); return q; },
        maybeSingle: () => Promise.resolve(opts.error ? { data: null, error: 'x' } : { data: rows[0] ?? null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve(opts.error ? { data: null, error: 'x' } : { data: rows, error: null }).then(res),
      };
      return q;
    },
  };
}

const db = () => fakeClient({
  chat_sessions: [
    { id: S1, user_id: U, employee_slug: 'tag-ai', title: 'Gas station charges', created_at: '2026-11-20T10:00:00Z', last_message_at: null },
    { id: S2, user_id: U, employee_slug: 'tag-categorizer', title: 'New Chat', created_at: '2026-11-21T10:00:00Z', last_message_at: null },
    { id: S3, user_id: U, employee_slug: 'prime-boss', title: 'Prime', created_at: '2026-11-22T10:00:00Z', last_message_at: null },
    { id: 'other', user_id: 'user-2', employee_slug: 'tag-ai', title: 'Not mine', created_at: '2026-11-23T10:00:00Z' },
  ],
  chat_messages: [
    { id: 'm1', session_id: S1, user_id: U, role: 'user', content: 'Why is Shell in Travel?', created_at: '2026-11-20T10:01:00Z', metadata: null },
    { id: 'm2', session_id: S1, user_id: U, role: 'assistant', content: 'It matched a rule.', created_at: '2026-11-20T10:02:00Z', metadata: { specialistConsultations: [] } },
    { id: 'm3', session_id: S1, user_id: U, role: 'system', content: 'x', created_at: '2026-11-20T10:03:00Z', metadata: null },
    { id: 'm4', session_id: S1, user_id: U, role: 'assistant', content: 'hidden', created_at: '2026-11-20T10:04:00Z', metadata: { hidden: true } },
    { id: 'm5', session_id: S2, user_id: U, role: 'user', content: 'Costco?', created_at: '2026-11-24T09:00:00Z', metadata: null },
    { id: 'm6', session_id: S3, user_id: U, role: 'user', content: 'Prime q', created_at: '2026-11-24T12:00:00Z', metadata: null },
  ],
});

describe('loadEmployeeSessions', () => {
  it("only this user's sessions for this employee (aliases included), newest activity first", async () => {
    const c = db();
    const rows = await loadEmployeeSessions(c, U, 'tag-ai');
    expect(rows.map(r => r.id)).toEqual([S2, S1]);
    expect(rows[0].title).toBeNull(); // 'New Chat' → fallback title in the drawer
    expect(rows[1].title).toBe('Gas station charges');
    expect(c.calls[0].filters).toContainEqual(['user_id', U]);
    expect(c.calls[1].filters).toContainEqual(['user_id', U]);
  });
  it('Custodian and other employees work the same way; nothing without a user', async () => {
    expect(await loadEmployeeSessions(db(), U, 'custodian')).toEqual([]);
    expect(await loadEmployeeSessions(db(), null, 'tag-ai')).toEqual([]);
    expect((await loadEmployeeSessions(db(), U, 'prime-boss')).map(r => r.id)).toEqual([S3]);
  });
});

describe('verifyOwnedSession', () => {
  it('requires this user AND this employee; fails closed', async () => {
    expect(await verifyOwnedSession(db(), U, S1, 'tag-ai')).toBe(true);
    expect(await verifyOwnedSession(db(), U, S2, 'tag-ai')).toBe(true); // alias
    expect(await verifyOwnedSession(db(), U, S3, 'tag-ai')).toBe(false); // Prime's session
    expect(await verifyOwnedSession(db(), 'user-2', S1, 'tag-ai')).toBe(false);
    expect(await verifyOwnedSession(db(), U, 'not-a-uuid', 'tag-ai')).toBe(false);
    expect(await verifyOwnedSession(fakeClient({}, { error: true }), U, S1, 'tag-ai')).toBe(false);
  });
});

describe('restoreSessionMessages', () => {
  it('visible user/assistant messages, oldest first, metadata as meta, owner-scoped', async () => {
    const c = db();
    const msgs = await restoreSessionMessages(c, U, S1);
    expect(msgs?.map(m => m.id)).toEqual(['m1', 'm2']);
    expect(msgs?.[1].meta).toEqual({ specialistConsultations: [] });
    expect(c.calls[0].filters).toEqual([['session_id', S1], ['user_id', U]]);
  });
  it('null (not empty) on error or bad input, so callers keep what they have', async () => {
    expect(await restoreSessionMessages(fakeClient({}, { error: true }), U, S1)).toBeNull();
    expect(await restoreSessionMessages(db(), U, 'x')).toBeNull();
    expect(mapRestoredRows('nope')).toEqual([]);
  });
});

describe('account-scoped cache', () => {
  it('keyed by employee AND user; another account never reads it', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
    const msgs = Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, role: 'user' as const, content: `hi ${i}`, createdAt: `2026-11-20T10:${String(i).padStart(2, '0')}:00Z` }));
    writeCachedConversation(storage, U, 'tag-ai', { sessionId: S1, messages: msgs });
    expect(conversationCacheKey(U, 'tag-ai')).toBe('xai.conversation.tag-ai.user-1');
    const back = readCachedConversation(storage, U, 'tag-ai');
    expect(back?.sessionId).toBe(S1);
    expect(back?.messages).toHaveLength(CONVERSATION_CACHE_MAX_MESSAGES);
    expect(back?.messages[0].id).toBe('m10');
    expect(readCachedConversation(storage, 'user-2', 'tag-ai')).toBeNull();
    expect(readCachedConversation(storage, U, 'prime-boss')).toBeNull();
    store.set(conversationCacheKey(U, 'tag-ai'), '{bad');
    expect(readCachedConversation(storage, U, 'tag-ai')).toBeNull();
  });
});

describe('useChatSessions', () => {
  const hook = fs.readFileSync(path.resolve(__dirname, '../../hooks/useChatSessions.ts'), 'utf8');
  it('takes an employee and uses the shared loader; default behaviour unchanged', () => {
    expect(hook).toMatch(/employee\?: ConversationEmployeeSlug;/);
    expect(hook).toMatch(/if \(employee\) \{\s*const rows = await loadEmployeeSessions\(supabase, userId, employee, limit\);/);
    expect(hook).toMatch(/\.in\('employee_slug', \['prime-boss', 'prime'\]\)/); // existing all-employee path kept
  });
});

/**
 * Session ownership security — "possession of another user's session UUID is
 * insufficient authorization."
 *
 * Exercises PRODUCTION ensureSession / getRecentMessages / ensureThread against
 * an in-memory stand-in for Supabase (service-role semantics: no RLS, primary
 * keys are globally unique, so a foreign ID collides with 23505). chat.ts wiring
 * is asserted structurally because the Netlify handler is not unit-testable.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ensureSession, getRecentMessages } from '../session';
import { ensureThread } from '../ensureThread';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
const db: Record<string, Row[]> = { chat_sessions: [], chat_messages: [], chat_threads: [] };
const calls: Array<{ table: string; op: string; filters: Array<[string, unknown]> }> = [];
/** Simulates a concurrent request creating the row between our lookup and insert. */
let beforeInsert: ((table: string, row: Row) => void) | null = null;

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | null = null;
  let order: { col: string; asc: boolean } | null = null;
  let limit = Infinity;
  const matches = () => db[table].filter(r => filters.every(([k, v]) => r[k] === v));
  const run = () => {
    calls.push({ table, op, filters: [...filters] });
    if (op === 'insert') {
      if (beforeInsert) { const hook = beforeInsert; beforeInsert = null; hook(table, payload!); }
      if (db[table].some(r => r.id === payload!.id)) {
        return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
      }
      const row = { id: payload!.id ?? `gen-${db[table].length + 1}`, created_at: new Date().toISOString(), ...payload };
      db[table].push(row);
      return { data: [row], error: null };
    }
    if (op === 'upsert') {
      // onConflict: 'id' — overwrite the existing row with that id, whoever owns it
      const existing = db[table].find(r => r.id === payload!.id);
      if (existing) { Object.assign(existing, payload); return { data: [existing], error: null }; }
      const row = { created_at: new Date().toISOString(), ...payload };
      db[table].push(row);
      return { data: [row], error: null };
    }
    if (op === 'update') {
      const rows = matches();
      rows.forEach(r => Object.assign(r, payload));
      return { data: rows, error: null };
    }
    let rows = matches();
    if (order) {
      const { col, asc } = order;
      rows = [...rows].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
    }
    return { data: rows.slice(0, limit), error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
  const q: any = {
    select: () => q,
    insert: (p: Row) => { op = 'insert'; payload = p; return q; },
    update: (p: Row) => { op = 'update'; payload = p; return q; },
    upsert: (p: Row) => { op = 'upsert'; payload = p; return q; },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    order: (col: string, o?: { ascending?: boolean }) => { order = { col, asc: o?.ascending !== false }; return q; },
    limit: (n: number) => { limit = n; return q; },
    maybeSingle: async () => { const r = run(); return { data: r.data?.[0] ?? null, error: r.error }; },
    single: async () => {
      const r = run();
      if (r.error) return r;
      return r.data?.[0] ? { data: r.data[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    },
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return q;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- passed where a SupabaseClient is expected
const sb: any = { from: (table: string) => query(table) };

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const SESSION_A = 'aaaaaaaa-0000-4000-8000-00000000000a';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

beforeEach(() => {
  db.chat_sessions = [{ id: SESSION_A, user_id: A, employee_slug: 'tag-ai', title: 'A secret chat', context: { secret: 'A' }, message_count: 2 }];
  db.chat_messages = [
    { id: 'm1', session_id: SESSION_A, user_id: A, role: 'user', content: 'A: my SIN is …', tokens: 5, created_at: '2026-01-01T00:00:01Z', thread_id: 'thread-a' },
    { id: 'm2', session_id: SESSION_A, user_id: A, role: 'assistant', content: 'A: private answer', tokens: 5, created_at: '2026-01-01T00:00:02Z', thread_id: 'thread-a' },
  ];
  db.chat_threads = [{ id: 'thread-a', user_id: A, employee_key: 'prime', assistant_key: 'prime', created_at: '2026-01-01T00:00:00Z' }];
  calls.length = 0;
  beforeInsert = null;
});

const sessionA = () => db.chat_sessions.find(r => r.id === SESSION_A)!;

describe('ensureSession ownership', () => {
  it('A. own session is reused with its employee_slug', async () => {
    const r = await ensureSession(sb, A, SESSION_A, 'prime-boss');
    expect(r).toEqual({ sessionId: SESSION_A, employee_slug: 'tag-ai' });
    expect(db.chat_sessions).toHaveLength(1);
  });

  it('B. foreign session: never returned, fresh session minted, no foreign employee_slug', async () => {
    const r = await ensureSession(sb, B, SESSION_A, 'prime-boss');
    expect(r.sessionId).not.toBe(SESSION_A);
    expect(r.sessionId).toMatch(UUID_RE);
    expect(r.employee_slug).toBe('prime-boss');
    expect(db.chat_sessions.find(s => s.id === r.sessionId)!.user_id).toBe(B);
    expect(sessionA()).toMatchObject({ user_id: A, employee_slug: 'tag-ai', context: { secret: 'A' } });
  });

  it('B. no chat_sessions read by id alone (every id lookup carries user_id)', async () => {
    await ensureSession(sb, B, SESSION_A, 'prime-boss');
    const reads = calls.filter(c => c.table === 'chat_sessions' && c.op === 'select');
    expect(reads.length).toBeGreaterThan(0);
    for (const c of reads) expect(c.filters.map(f => f[0]).sort()).toEqual(['id', 'user_id']);
  });

  it('C. duplicate-key race on an OWNED session is safely reused', async () => {
    const NEW = 'cccccccc-0000-4000-8000-00000000000c';
    beforeInsert = () => db.chat_sessions.push({ id: NEW, user_id: A, employee_slug: 'prime-boss', context: {} });
    const r = await ensureSession(sb, A, NEW, 'prime-boss');
    expect(r).toEqual({ sessionId: NEW, employee_slug: 'prime-boss' });
    expect(db.chat_sessions.filter(s => s.id === NEW)).toHaveLength(1);
  });

  it('D. duplicate-key collision with a FOREIGN session never returns the foreign ID', async () => {
    const NEW = 'dddddddd-0000-4000-8000-00000000000d';
    // Another user's row appears between our ownership lookup and our insert.
    beforeInsert = () => db.chat_sessions.push({ id: NEW, user_id: A, employee_slug: 'goalie-ai', context: { secret: 'A' } });
    const r = await ensureSession(sb, B, NEW, 'prime-boss');
    expect(r.sessionId).not.toBe(NEW);
    expect(r.employee_slug).toBe('prime-boss');
    expect(db.chat_sessions.find(s => s.id === r.sessionId)!.user_id).toBe(B);
    expect(db.chat_sessions.find(s => s.id === NEW)!.user_id).toBe(A);
  });

  it('H. new chat: unknown client UUID is created for this user; no ID gets a fresh one', async () => {
    const NEW = 'eeeeeeee-0000-4000-8000-00000000000e';
    expect(await ensureSession(sb, B, NEW, 'prime-boss')).toEqual({ sessionId: NEW, employee_slug: 'prime-boss' });
    const fresh = await ensureSession(sb, B, undefined, 'prime-boss');
    expect(fresh.sessionId).toMatch(UUID_RE);
    expect(db.chat_sessions.find(s => s.id === fresh.sessionId)!.user_id).toBe(B);
  });

  it('always returns the { sessionId, employee_slug } object (no bare-string path)', async () => {
    const r = await ensureSession(sb, B, 'not-a-uuid', 'prime-boss');
    expect(typeof r).toBe('object');
    expect(r.sessionId).toMatch(UUID_RE);
  });
});

describe('history isolation', () => {
  it('E. foreign user gets ZERO of the session owner\'s messages', async () => {
    expect(await getRecentMessages(sb, SESSION_A, B)).toEqual([]);
  });

  it('G. owner still gets their own history in order', async () => {
    const msgs = await getRecentMessages(sb, SESSION_A, A);
    expect(msgs.map(m => m.content)).toEqual(['A: my SIN is …', 'A: private answer']);
  });
});

describe('ensureThread ownership', () => {
  it('foreign threadId is never upserted, re-owned, or returned', async () => {
    const t = await ensureThread(sb, B, 'prime', 'thread-a');
    expect(t).not.toBe('thread-a');
    expect(db.chat_threads.find(r => r.id === 'thread-a')!.user_id).toBe(A);
    expect(db.chat_threads.find(r => r.id === t)!.user_id).toBe(B);
  });

  it('own threadId is returned unchanged', async () => {
    expect(await ensureThread(sb, A, 'prime', 'thread-a')).toBe('thread-a');
  });
});

// chat.ts is a large Netlify handler; assert the ownership wiring structurally.
describe('chat.ts wiring', () => {
  const CHAT = fs.readFileSync(path.resolve(__dirname, '../../chat.ts'), 'utf8');

  it('never falls back to the raw client sessionId', () => {
    expect(CHAT).toContain('finalSessionId = sessionResult?.sessionId ?? null;');
    expect(CHAT).not.toMatch(/sessionResult\?\.sessionId \?\? normalizeSessionId\(sessionId\)/);
    expect(CHAT).not.toMatch(/const fallbackId = normalizeSessionId\(sessionId\)/);
  });

  it('E. every session/thread message-content read is user-scoped', () => {
    const reads = CHAT.match(/\.from\('chat_messages'\)\s*\.select\('[^']*content[^']*'\)\s*\.eq\('(session_id|thread_id)'[^)]*\)\s*\.eq\('user_id', userId\)/g) || [];
    const all = CHAT.match(/\.from\('chat_messages'\)\s*\.select\('[^']*content[^']*'\)\s*\.eq\('(session_id|thread_id)'/g) || [];
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(reads.length).toBe(all.length);
    expect(CHAT).toContain('getRecentMessages(sb, normalizedSessionIdForMessages, userId, tokenLimit)');
  });

  it('F. employee_slug updates on the request session are owner-scoped', () => {
    for (const slug of ['finalEmployeeSlug', "'prime-boss'", 'targetSlug']) {
      const re = new RegExp(`\\.update\\(\\{ employee_slug: ${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\}\\)\\s*\\.eq\\('id', finalSessionId\\)\\s*\\.eq\\('user_id', userId\\)`);
      expect(CHAT).toMatch(re);
    }
  });

  it('session context reads are owner-scoped', () => {
    const ctxReads = CHAT.match(/\.from\('chat_sessions'\)\s*\.select\('context'\)\s*\.eq\('id', [^)]+\)\s*(\.eq\('user_id', userId\))?/g) || [];
    expect(ctxReads.length).toBeGreaterThanOrEqual(5);
    for (const r of ctxReads) expect(r).toContain(".eq('user_id', userId)");
  });
});

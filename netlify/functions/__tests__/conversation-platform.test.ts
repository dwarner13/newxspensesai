/**
 * Universal employee conversation platform — behavioural tests against an in-memory Supabase fake.
 * The real ensureSession / getRecentMessages code runs; only the database is simulated.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { openEmployeeConversation, loadConversationHistory, recordConversationTurn, claimConversationTurn, completeConversationTurn, maskCustomerTextForModel, findRecentEmployeeConversation } from '../_shared/conversation-platform';
import { canonicalEmployeeSlug, isTagSlug, deriveConversationTitle, toModelHistory, isValidClientMessageId } from '../../../src/shared/conversation-identity';

// The in-memory Supabase fake is intentionally untyped (rows and chained builder).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
const hooks: { beforeInsert?: (table: string, row: Row) => { code: string; message: string } | null } = {};
const get = (row: Row, col: string) => (col.includes('->>') ? (row[col.split('->>')[0]] || {})[col.split('->>')[1]] : row[col]);

function builder(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op: 'select' | 'insert' | 'update' = 'select';
  let payload: Row | null = null;
  let order: { col: string; asc: boolean } | null = null;
  let lim = Infinity;
  const rows = () => (db[table] ||= []);
  const matches = () => rows().filter(r => filters.every(([c, v]) => get(r, c) === v));
  const run = () => {
    if (op === 'insert') {
      const injected = hooks.beforeInsert?.(table, payload!);
      if (injected) return { data: null, error: injected };
      if (table === 'chat_sessions' && rows().some(r => r.id === payload!.id)) return { data: null, error: { code: '23505', message: 'duplicate' } };
      const row = { created_at: new Date(Date.now() + rows().length).toISOString(), ...payload };
      rows().push(row);
      return { data: row, error: null };
    }
    if (op === 'update') { const m = matches(); m.forEach(r => Object.assign(r, payload)); return { data: m, error: null }; }
    let m = matches();
    if (order) m = [...m].sort((a, b) => (order!.asc ? 1 : -1) * String(a[order!.col]).localeCompare(String(b[order!.col])));
    return { data: m.slice(0, lim), error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {
    select: () => b, eq: (c: string, v: unknown) => { filters.push([c, v]); return b; },
    order: (col: string, o?: { ascending?: boolean }) => { order = { col, asc: o?.ascending !== false }; return b; },
    limit: (n: number) => { lim = n; return b; },
    insert: (r: Row) => { op = 'insert'; payload = r; return b; },
    update: (p: Row) => { op = 'update'; payload = p; return b; },
    maybeSingle: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }; },
    single: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }; },
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return b;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = { from: (t: string) => builder(t) };

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
beforeEach(() => { for (const k of Object.keys(db)) delete db[k]; hooks.beforeInsert = undefined; });

describe('conversation identity (pure)', () => {
  it('canonical slugs, aliases, unknowns', () => {
    expect(canonicalEmployeeSlug('tag')).toBe('tag-ai');
    expect(canonicalEmployeeSlug('TAG-AI')).toBe('tag-ai');
    expect(canonicalEmployeeSlug('byte-doc')).toBe('byte-docs');
    expect(canonicalEmployeeSlug('goalie-coach')).toBe('goalie-goals');
    expect(canonicalEmployeeSlug('evil')).toBeNull();
    expect(isTagSlug('tag')).toBe(true);
    expect(isTagSlug('prime-boss')).toBe(false);
  });
  it('titles, client ids, model history', () => {
    expect(deriveConversationTitle('  Why is   Uber in Travel? ')).toBe('Why is Uber in Travel?');
    expect(deriveConversationTitle('x'.repeat(80))!.length).toBe(58);
    expect(isValidClientMessageId('msg_abc12345')).toBe(true);
    expect(isValidClientMessageId('a b')).toBe(false);
    expect(toModelHistory([{ role: 'system', content: 'x' }, { role: 'assistant', content: 'ok' }, { role: 'user', content: '' }])).toEqual([{ role: 'assistant', content: 'ok' }]);
  });
});

describe('openEmployeeConversation — ownership and employee identity', () => {
  it('creates a Tag session owned by the verified user', async () => {
    const c = await openEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'tag' });
    expect(c.employeeSlug).toBe('tag-ai');
    expect(c.isNew).toBe(true);
    expect(db.chat_sessions[0]).toMatchObject({ id: c.sessionId, user_id: ALICE, employee_slug: 'tag-ai', title: 'New Chat' });
  });
  it('resumes the same session for the same user and employee', async () => {
    const c = await openEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'tag-ai' });
    const again = await openEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'tag-ai', requestedSessionId: c.sessionId });
    expect(again).toEqual({ sessionId: c.sessionId, employeeSlug: 'tag-ai', isNew: false });
  });
  it("rejects another customer's session id (fresh session instead)", async () => {
    const bobs = await openEmployeeConversation(sb, { userId: BOB, employeeSlug: 'tag-ai' });
    const c = await openEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'tag-ai', requestedSessionId: bobs.sessionId });
    expect(c.sessionId).not.toBe(bobs.sessionId);
    expect(c.isNew).toBe(true);
  });
  it("never continues the customer's own Prime conversation inside Tag", async () => {
    const prime = await openEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'prime-boss' });
    const tag = await openEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'tag-ai', requestedSessionId: prime.sessionId });
    expect(tag.sessionId).not.toBe(prime.sessionId);
    expect(tag.employeeSlug).toBe('tag-ai');
  });
  it('unknown employees are refused', async () => {
    await expect(openEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'nope' })).rejects.toThrow(/Unknown conversation employee/);
  });
});

describe('recordConversationTurn + loadConversationHistory', () => {
  it('persists masked customer text and the reply; history comes from the server only', async () => {
    const c = await openEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'tag-ai' });
    await recordConversationTurn(sb, { sessionId: c.sessionId, userId: ALICE, employeeSlug: 'tag-ai', userText: 'my card 4111 1111 1111 1111 — why Travel?', assistantText: 'Because…', clientMessageId: 'msg_0001aaaa' });
    const stored = db.chat_messages;
    expect(stored).toHaveLength(2);
    expect(stored[0].content).not.toContain('4111 1111 1111 1111');
    expect(stored[0].metadata).toMatchObject({ employee_slug: 'tag-ai', client_message_id: 'msg_0001aaaa' });
    expect(stored[1]).toMatchObject({ role: 'assistant', content: 'Because…', user_id: ALICE });
    const history = await loadConversationHistory(sb, { sessionId: c.sessionId, userId: ALICE });
    expect(history.map(h => h.role)).toEqual(['user', 'assistant']);
    // another customer cannot read it
    expect(await loadConversationHistory(sb, { sessionId: c.sessionId, userId: BOB })).toEqual([]);
  });
  it('a retry with the same client message id is not stored twice', async () => {
    const c = await openEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'tag-ai' });
    const t = { sessionId: c.sessionId, userId: ALICE, employeeSlug: 'tag-ai' as const, userText: 'hi', assistantText: 'hello', clientMessageId: 'msg_retry001' };
    expect((await recordConversationTurn(sb, t)).duplicate).toBe(false);
    expect((await recordConversationTurn(sb, t)).duplicate).toBe(true);
    expect(db.chat_messages).toHaveLength(2);
  });
  it('titles the session from the first customer message only', async () => {
    const c = await openEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'tag-ai' });
    await recordConversationTurn(sb, { sessionId: c.sessionId, userId: ALICE, employeeSlug: 'tag-ai', userText: 'Why is Uber in Travel?', assistantText: 'a' });
    await recordConversationTurn(sb, { sessionId: c.sessionId, userId: ALICE, employeeSlug: 'tag-ai', userText: 'second question', assistantText: 'b' });
    expect(db.chat_sessions[0].title).toBe('Why is Uber in Travel?');
  });
});

describe('Prime HQ review of T-H1: claim-first retries, masking, schema, resume', () => {
  const T = { userId: ALICE, employeeSlug: 'tag-ai' as const };
  it('partial failure: action ran, reply not saved → a retry is a duplicate and must not act again', async () => {
    const c = await openEmployeeConversation(sb, T);
    const first = await claimConversationTurn(sb, { ...T, sessionId: c.sessionId, userText: 'recategorize Uber', clientMessageId: 'msg_partial01' });
    expect(first.status).toBe('claimed');
    // (tool runs here; reply save fails → completeConversationTurn never stored)
    const retry = await claimConversationTurn(sb, { ...T, sessionId: c.sessionId, userText: 'recategorize Uber', clientMessageId: 'msg_partial01' });
    expect(retry).toEqual({ status: 'duplicate', reply: null });
  });
  it('a retry after a completed turn returns the stored reply', async () => {
    const c = await openEmployeeConversation(sb, T);
    await claimConversationTurn(sb, { ...T, sessionId: c.sessionId, userText: 'hi', clientMessageId: 'msg_done0001' });
    await completeConversationTurn(sb, { ...T, sessionId: c.sessionId, assistantText: 'Done — moved 3 rides.', clientMessageId: 'msg_done0001' });
    expect(await claimConversationTurn(sb, { ...T, sessionId: c.sessionId, userText: 'hi', clientMessageId: 'msg_done0001' }))
      .toEqual({ status: 'duplicate', reply: 'Done — moved 3 rides.' });
  });
  it('concurrent duplicates: when another request stored the same id first, this one does not act', async () => {
    const c = await openEmployeeConversation(sb, T);
    let injected = false;
    hooks.beforeInsert = (table, row) => {
      // simulate the competing request inserting the same client id just before this one
      if (!injected && table === 'chat_messages' && row.role === 'user') {
        injected = true;
        db.chat_messages.push({ id: 'competitor', created_at: '2000-01-01T00:00:00.000Z', session_id: c.sessionId, user_id: ALICE, role: 'user', content: 'x', metadata: { client_message_id: 'msg_race0001' } });
      }
      return null;
    };
    const r = await claimConversationTurn(sb, { ...T, sessionId: c.sessionId, userText: 'apply rule', clientMessageId: 'msg_race0001' });
    expect(r.status).toBe('duplicate');
  });
  it('claim not writable → unsaved (caller answers with persisted:false)', async () => {
    const c = await openEmployeeConversation(sb, T);
    hooks.beforeInsert = (table) => (table === 'chat_messages' ? { code: '500', message: 'down' } : null);
    expect((await claimConversationTurn(sb, { ...T, sessionId: c.sessionId, userText: 'x', clientMessageId: 'msg_down0001' })).status).toBe('unsaved');
  });
  it('masking keeps merchants, store numbers, dates, amounts and references; masks card numbers', () => {
    const m = maskCustomerTextForModel('STARBUCKS #1234 on 2026-11-01 for $12.50, ref TX-99881, card 4111 1111 1111 1111');
    for (const keep of ['STARBUCKS #1234', '2026-11-01', '$12.50', 'TX-99881']) expect(m).toContain(keep);
    expect(m).not.toContain('4111 1111 1111 1111');
  });
  it('stored customer text uses the same masking as the model (no extra over-masking)', async () => {
    const c = await openEmployeeConversation(sb, T);
    const text = 'Why is COSTCO WHSE #0542 in Groceries? Amount $84.19 on Nov 3';
    await recordConversationTurn(sb, { ...T, sessionId: c.sessionId, userText: text, assistantText: 'ok' });
    expect(db.chat_messages[0].content).toBe(maskCustomerTextForModel(text));
    expect(db.chat_messages[0].content).toContain('COSTCO WHSE #0542');
  });
  it('redacted_content missing in the live schema → the row is still saved without it', async () => {
    const c = await openEmployeeConversation(sb, T);
    hooks.beforeInsert = (table, row) => (table === 'chat_messages' && 'redacted_content' in row ? { code: 'PGRST204', message: "Could not find the 'redacted_content' column" } : null);
    await recordConversationTurn(sb, { ...T, sessionId: c.sessionId, userText: 'hello', assistantText: 'hi' });
    expect(db.chat_messages).toHaveLength(2);
    expect('redacted_content' in db.chat_messages[0]).toBe(false);
  });
  it('implicit resume (temporary, no session id): most recently ACTIVE Tag conversation, owner-scoped', async () => {
    const now = Date.parse('2026-11-25T12:00:00Z');
    db.chat_sessions = [
      { id: 'old-active', user_id: ALICE, employee_slug: 'tag-ai', created_at: '2026-01-01T00:00:00Z', last_message_at: '2026-11-25T11:00:00Z' },
      { id: 'new-idle', user_id: ALICE, employee_slug: 'tag-ai', created_at: '2026-11-24T00:00:00Z', last_message_at: '2026-11-24T00:10:00Z' },
      { id: 'prime', user_id: ALICE, employee_slug: 'prime-boss', created_at: '2026-11-25T11:30:00Z', last_message_at: '2026-11-25T11:59:00Z' },
      { id: 'bob', user_id: BOB, employee_slug: 'tag-ai', created_at: '2026-11-25T11:50:00Z', last_message_at: '2026-11-25T11:58:00Z' },
    ];
    expect(await findRecentEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'tag-ai', now })).toBe('old-active');
    // idle beyond the window: not resumed implicitly, but nothing is deleted
    expect(await findRecentEmployeeConversation(sb, { userId: ALICE, employeeSlug: 'tag-ai', now: now + 7 * 3600_000 })).toBeNull();
    expect(db.chat_sessions).toHaveLength(4);
  });
});

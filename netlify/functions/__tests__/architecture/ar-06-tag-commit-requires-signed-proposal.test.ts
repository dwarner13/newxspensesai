/**
 * AR-6 (P2 Secure actions) — owner: Tag HQ. NEW_CODE_PROTECTION_POLICY.md §4.
 * A commit with a missing / unresolvable conversation updates 0 rows; a stale fingerprint is rejected.
 * Synthetic data only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
const faults = { txUpdate: false, assistantInsert: false, uniqueOnClaim: false, activityLog: false };
let txUpdateCalls = 0;
const get = (row: Row, col: string) => (col.includes('->>') ? (row[col.split('->>')[0]] || {})[col.split('->>')[1]] : row[col]);

function builder(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  let op: 'select' | 'insert' | 'update' | 'upsert' = 'select';
  let payload: Row | null = null;
  let onConflict: string[] = [];
  let order: { col: string; asc: boolean } | null = null;
  let lim = Infinity;
  let rng: [number, number] | null = null;
  let head = false;
  const rows = () => (db[table] ||= []);
  const matches = () => rows().filter(r => filters.every(f => f(r)));
  const run = () => {
    if (op === 'insert') {
      if (table === 'tag_activity_log' && faults.activityLog) return { data: null, error: { message: 'log down' } };
      if (table === 'chat_messages' && faults.uniqueOnClaim && payload!.role === 'user' && payload!.client_message_id) return { data: null, error: { code: '23505', message: 'duplicate key' } };
      if (table === 'chat_messages' && faults.assistantInsert && payload!.role === 'assistant') return { data: null, error: { code: '500', message: 'down' } };
      if (table === 'chat_sessions' && rows().some(r => r.id === payload!.id)) return { data: null, error: { code: '23505', message: 'duplicate' } };
      const row = { id: payload!.id ?? `${table}-${rows().length + 1}`, created_at: new Date(Date.now() + rows().length).toISOString(), ...payload };
      rows().push(row);
      return { data: row, error: null };
    }
    if (op === 'update') {
      if (table === 'transactions') { txUpdateCalls++; if (faults.txUpdate) return { data: null, error: { message: 'tx update failed' } }; }
      const m = matches(); m.forEach(r => Object.assign(r, payload)); return { data: m, error: null };
    }
    if (op === 'upsert') {
      const existing = rows().find(r => onConflict.every(c => r[c] === payload![c]));
      if (existing) Object.assign(existing, payload); else rows().push({ ...payload });
      return { data: null, error: null };
    }
    let m = matches();
    if (order) m = [...m].sort((a, b) => (order!.asc ? 1 : -1) * String(a[order!.col]).localeCompare(String(b[order!.col])));
    const count = m.length;
    if (rng) m = m.slice(rng[0], rng[1] + 1);
    return { data: head ? null : m.slice(0, lim), error: null, count };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (_c?: string, o?: any) => { if (o?.head) head = true; return b; },
    neq: (c: string, v: unknown) => { filters.push(r => get(r, c) !== v); return b; },
    gte: (c: string, v: string) => { filters.push(r => r[c] != null && r[c] >= v); return b; },
    lte: (c: string, v: string) => { filters.push(r => r[c] != null && r[c] <= v); return b; },
    is: (c: string, v: unknown) => { filters.push(r => (r[c] ?? null) === v); return b; },
    ilike: (c: string, pat: string) => {
      const re = new RegExp('^' + pat.split('%').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
      filters.push(r => re.test(String(r[c] ?? '')));
      return b;
    },
    or: () => b,
    not: () => b,
    range: (a: number, z: number) => { rng = [a, z]; return b; },
    eq: (c: string, v: unknown) => { filters.push(r => get(r, c) === v); return b; },
    in: (c: string, vs: unknown[]) => { filters.push(r => vs.includes(get(r, c))); return b; },
    order: (col: string, o?: { ascending?: boolean }) => { order = { col, asc: o?.ascending !== false }; return b; },
    limit: (n: number) => { lim = n; return b; },
    insert: (r: Row) => { op = 'insert'; payload = r; return b; },
    update: (p: Row) => { op = 'update'; payload = p; return b; },
    upsert: (p: Row, o?: { onConflict?: string }) => { op = 'upsert'; payload = p; onConflict = (o?.onConflict || '').split(',').filter(Boolean); return b; },
    maybeSingle: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }; },
    single: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }; },
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return b;
}
const fakeClient = { from: (t: string) => builder(t), rpc: () => builder('rpc') };
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient }));

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const authState = { userId: ALICE as string | null };
vi.mock('../../_shared/verifyAuth.js', () => ({
  verifyAuth: async () => (authState.userId ? { userId: authState.userId, error: null } : { userId: null, error: 'unauthorized' }),
}));

process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.CONVERSATION_SIGNING_SECRET = 'test-signing-secret-not-real-0123456789abcdef';

type Res = { statusCode: number; body: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function act(body: Record<string, unknown>): Promise<{ res: Res; json: any }> {
  const { handler } = await import('../../tag-action');
  const res = await (handler as unknown as (e: unknown, c: unknown) => Promise<Res>)(
    { httpMethod: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify(body) }, {},
  );
  return { res, json: JSON.parse(res.body) };
}
const convo = (customerText: string, clientMessageId: string, extra: Record<string, unknown> = {}) => ({ conversation: { customerText, clientMessageId, ...extra } });


// Synthetic data only.
const IMP = 'imp-ar6-statement';
const r = (id: string, user: string, merchant: string, category: string | null, source: string | null) => ({
  id, user_id: user, merchant_name: merchant, merchant, description: `POS ${merchant}`, amount: -4.5, type: 'expense',
  posted_at: '2026-11-03', date: '2026-11-03', category, subcategory: null, category_source: source, import_id: IMP,
});
beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  Object.assign(faults, { txUpdate: false, assistantInsert: false, uniqueOnClaim: false, activityLog: false });
  txUpdateCalls = 0; authState.userId = ALICE;
  db.transactions = [
    r('ar6-a1', ALICE, 'CORNER COFFEE 7', 'Uncategorized', null),
    r('ar6-a2', ALICE, 'CORNER COFFEE 8', 'Needs Review', 'needs_review'),
  ];
  db.category_rules = [{ user_id: ALICE, match_type: 'contains', match_value: 'corner coffee', merchant_pattern: 'CORNER COFFEE', category: 'Food & Dining', is_active: true }];
  for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });
const propose = (id: string) => act({ intent: 'propose_import_suggestions', importId: IMP, ...convo("Apply Tag's suggestions", id) });
const unchanged = () => {
  expect(txUpdateCalls).toBe(0);
  expect(db.transactions.map(t => t.category)).toEqual(['Uncategorized', 'Needs Review']);
};

describe('AR-6 — a commit without a resolvable signed proposal updates 0 rows', () => {
  it('commit_proposal with no conversation', async () => {
    const p = await propose('msg_ar6_0001');
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject });
    expect(c.res.statusCode).toBeGreaterThanOrEqual(400);
    unchanged();
  });
  it('commit_proposal in a session that does not exist', async () => {
    const p = await propose('msg_ar6_0002');
    await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar6_0003', { sessionId: '99999999-9999-4999-8999-999999999999' }) });
    unchanged();
  });
  it('commit_proposal whose subject differs from what was signed (tampered)', async () => {
    const p = await propose('msg_ar6_0004');
    const subject = { ...p.json.proposal.subject, affected: Number(p.json.proposal.subject.affected) + 1 };
    await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject, ...convo('yes', 'msg_ar6_0005', { sessionId: p.json.conversation.sessionId }) });
    unchanged();
  });
  it("another customer cannot confirm this customer's proposal", async () => {
    const p = await propose('msg_ar6_0006');
    authState.userId = BOB;
    await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar6_0007', { sessionId: p.json.conversation.sessionId }) });
    unchanged();
  });
  it('commit_single with no conversation', async () => {
    const c = await act({ intent: 'commit_single', transactionId: 'ar6-a1', targetCategory: 'Food & Dining' });
    expect(c.res.statusCode).toBeGreaterThanOrEqual(400);
    unchanged();
  });
  it('the legacy commit intent returns 410', async () => {
    const c = await act({ intent: 'commit', matchValue: 'corner coffee', targetCategory: 'Food & Dining' });
    expect(c.res.statusCode).toBe(410);
    unchanged();
  });
});

describe('AR-6 — a stale fingerprint is rejected', () => {
  it('the scope changed after the proposal → reason stale, 0 rows', async () => {
    const p = await propose('msg_ar6_0008');
    db.transactions.push(r('ar6-a3', ALICE, 'CORNER COFFEE 9', 'Uncategorized', null));
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar6_0009', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt.reason).toBe('stale');
    expect(txUpdateCalls).toBe(0);
  });
});

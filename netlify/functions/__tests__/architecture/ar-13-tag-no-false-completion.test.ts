/**
 * AR-13 (§2 reliability standard) — Tag HQ's part. NEW_CODE_PROTECTION_POLICY.md §4.
 * Fixtures force write failures and prove Tag does not claim completion: categorized counts,
 * learned flags, rule saved, suggestions applied. Synthetic data only.
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


vi.mock('../../_shared/supabase.js', () => ({ serverSupabase: () => fakeClient, admin: () => fakeClient, supabaseAdmin: fakeClient }));
vi.mock('../../_shared/internalJobAuth.js', () => ({
  authenticateUser: async () => (authState.userId ? { ok: true, principal: { userId: authState.userId } } : { ok: false }),
  claimedUserIdMatches: (claimed: unknown, userId: string) => !claimed || claimed === userId,
}));
vi.mock('../../../../src/lib/ai/userActivity.js', () => ({ logUserEvent: async () => undefined, recalcFluency: async () => undefined }));
const realFetch = globalThis.fetch;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call(fn: string, body: Record<string, unknown>): Promise<{ res: Res; json: any }> {
  const mod = await import(`../../${fn}`);
  const res = await (mod.handler as (e: unknown, c: unknown) => Promise<Res>)(
    { httpMethod: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify(body) }, {},
  );
  return { res, json: JSON.parse(res.body) };
}

// Synthetic data only.
const IMP = 'imp-ar13-statement';
const r = (id: string, merchant: string, category: string | null, source: string | null) => ({
  id, user_id: ALICE, merchant_name: merchant, merchant, description: `POS ${merchant}`, amount: -6.1, type: 'expense',
  posted_at: '2026-11-04', date: '2026-11-04', category, subcategory: null, category_source: source, import_id: IMP,
});
// Owner 2026-11-26: Tag notices live in `notifications`; every stored row may use LIVE columns only
// (live-schema.json), so a nonexistent column fails here exactly as it would in PostgREST (42703).
import LIVE_SCHEMA_JSON from '../../../../src/shared/__tests__/fixtures/live-schema.json';
const LIVE_NOTIFICATION_COLUMNS = new Set<string>((LIVE_SCHEMA_JSON as Record<string, string[]>).notifications);
const notes = (type: string) => {
  expect(db.user_notifications ?? [], 'Tag never writes user_notifications').toEqual([]);
  const rows = (db.notifications ?? []).filter(n => n.type === type);
  for (const row of rows) for (const col of Object.keys(row)) expect(LIVE_NOTIFICATION_COLUMNS.has(col), `notifications.${col} is not a live column`).toBe(true);
  return rows;
};
const failing = { memory: false, rules: false };
const baseFrom = fakeClient.from;
const CLAIM = /\b(saved|applied|updated|done|learned|categori[sz]ed \d)/i;

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  Object.assign(faults, { txUpdate: false, assistantInsert: false, uniqueOnClaim: false, activityLog: false });
  Object.assign(failing, { memory: false, rules: false });
  txUpdateCalls = 0; authState.userId = ALICE;
  db.transactions = [r('ar13-a1', 'CORNER COFFEE 7', 'Uncategorized', null), r('ar13-a2', 'CORNER COFFEE 8', 'Needs Review', 'needs_review')];
  db.category_rules = [{ user_id: ALICE, match_type: 'contains', match_value: 'corner coffee', merchant_pattern: 'CORNER COFFEE', category: 'Food & Dining', is_active: true }];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fakeClient as any).from = (t: string) => {
    const b = baseFrom(t);
    const fail = (t === 'vendor_category_memory' && failing.memory) || (t === 'category_rules' && failing.rules);
    if (fail) b.upsert = () => ({ then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'write down' } }).then(res) });
    return b;
  };
  globalThis.fetch = (async () => new Response('{}', { status: 200 })) as typeof fetch;
  for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); globalThis.fetch = realFetch; });

describe('AR-13 — forced write failures: Tag never claims completion', () => {
  it('categorized count: confirmed suggestions whose update fails → no completed receipt, no "saved" notification, no claim', async () => {
    const p = await act({ intent: 'propose_import_suggestions', importId: IMP, ...convo("Apply Tag's suggestions", 'msg_ar13_0001') });
    faults.txUpdate = true;
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar13_0002', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt.state).not.toBe('completed');
    expect(c.json.conversation.receipt.success).not.toBe(true);
    expect(c.json.conversation.reply).not.toMatch(CLAIM);
    expect(notes('tag_suggestions_applied')).toHaveLength(0);
    expect(db.transactions.map(t => t.category)).toEqual(['Uncategorized', 'Needs Review']);
    expect(txUpdateCalls).toBeGreaterThan(0); // the write was attempted and failed — not skipped
  });
  it('suggestions are never reported as saved by the post-import sweep', async () => {
    await call('tag-background-sweep', { importId: IMP });
    const [n] = notes('import_complete');
    expect(n.payload).toMatchObject({ applied_count: 0, auto_count: 0 });
    expect(n.payload.suggested_count).toBeGreaterThan(0);
  });
  it('learned flag: merchant-memory write fails → learned false everywhere', async () => {
    failing.memory = true;
    const learn = await call('tag-learn', { transactionId: 'ar13-a1', merchant: 'CORNER COFFEE 7', oldCategory: 'Uncategorized', newCategory: 'Food & Dining' });
    expect(learn.json.learned).toBe(false);
    expect(learn.json.message).not.toMatch(/learned this merchant/i);
    const edit = await call('tx-update-category', { id: 'ar13-a2', category: 'Food & Dining' });
    expect(edit.json.learned.applied).toBe(false);
  });
  it('rule saved: the rule write fails → error, no "saved" activity record', async () => {
    failing.rules = true;
    const s = await act({ intent: 'save_rule', matchValue: 'corner coffee', targetCategory: 'Food & Dining' });
    expect(s.res.statusCode).toBeGreaterThanOrEqual(500);
    expect((db.tag_activity_log ?? []).filter(x => x.action_type === 'save_merchant_rule')).toHaveLength(0);
  });
});

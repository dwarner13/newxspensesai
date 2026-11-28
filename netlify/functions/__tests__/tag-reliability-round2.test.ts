/**
 * Owner GO 2026-11-25 "Tag reliability round 2": items 1-3 (sweep accuracy, verified learning,
 * manual-correction provenance) + the §4.5 legacy-path regression. Synthetic data only.
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
    if (op === 'insert' && Array.isArray(payload)) {
      // Batch insert (history-first change records): one row per element; returns the inserted rows.
      if (table === 'tag_activity_log' && faults.activityLog) return { data: null, error: { message: 'log down' } };
      const inserted = (payload as unknown as Row[]).map(one => ({ id: `${table}-${rows().length + 1}`, ...one })).map(r => { rows().push(r); return r; });
      return { data: inserted, error: null };
    }
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
vi.mock('../_shared/verifyAuth.js', () => ({
  verifyAuth: async () => (authState.userId ? { userId: authState.userId, error: null } : { userId: null, error: 'unauthorized' }),
}));

process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.CONVERSATION_SIGNING_SECRET = 'test-signing-secret-not-real-0123456789abcdef';

type Res = { statusCode: number; body: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function act(body: Record<string, unknown>): Promise<{ res: Res; json: any }> {
  const { handler } = await import('../tag-action');
  const res = await (handler as unknown as (e: unknown, c: unknown) => Promise<Res>)(
    { httpMethod: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify(body) }, {},
  );
  return { res, json: JSON.parse(res.body) };
}
const convo = (customerText: string, clientMessageId: string, extra: Record<string, unknown> = {}) => ({ conversation: { customerText, clientMessageId, ...extra } });


// Server modules that use the shared admin / server client, auth helpers and side channels.
vi.mock('../_shared/supabase.js', () => ({ serverSupabase: () => fakeClient, admin: () => fakeClient, supabaseAdmin: fakeClient }));
vi.mock('../_shared/internalJobAuth.js', () => ({
  authenticateUser: async () => (authState.userId ? { ok: true, principal: { userId: authState.userId } } : { ok: false }),
  claimedUserIdMatches: (claimed: unknown, userId: string) => !claimed || claimed === userId,
}));
vi.mock('../../../src/lib/ai/userActivity.js', () => ({ logUserEvent: async () => undefined, recalcFluency: async () => undefined }));
const fetchCalls: string[] = [];
const realFetch = globalThis.fetch;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call(fn: string, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}): Promise<{ res: Res; json: any }> {
  const mod = await import(`../${fn}`);
  const res = await (mod.handler as (e: unknown, c: unknown) => Promise<Res>)(
    { httpMethod: 'POST', headers: { authorization: 'Bearer test', ...extraHeaders }, body: JSON.stringify(body) }, {},
  );
  return { res, json: JSON.parse(res.body) };
}

// Synthetic data only.
const IMP = 'imp-r2-statement';
const TX = 'eeeeeeee-0000-4000-8000-000000000001';
const r = (id: string, merchant: string, category: string | null, source: string | null) => ({
  id, user_id: ALICE, merchant_name: merchant, merchant, description: `POS ${merchant}`, amount: -7.25, type: 'expense',
  posted_at: '2026-11-02', date: '2026-11-02', category, subcategory: null, category_source: source, import_id: IMP,
});
// Owner 2026-11-26: Tag notices live in `notifications`; every stored row may use LIVE columns only
// (live-schema.json), so a nonexistent column fails here exactly as it would in PostgREST (42703).
import LIVE_SCHEMA_JSON from '../../../src/shared/__tests__/fixtures/live-schema.json';
const LIVE_NOTIFICATION_COLUMNS = new Set<string>((LIVE_SCHEMA_JSON as Record<string, string[]>).notifications);
const notes = (type: string) => {
  expect(db.user_notifications ?? [], 'Tag never writes user_notifications').toEqual([]);
  const rows = (db.notifications ?? []).filter(n => n.type === type);
  for (const row of rows) for (const col of Object.keys(row)) expect(LIVE_NOTIFICATION_COLUMNS.has(col), `notifications.${col} is not a live column`).toBe(true);
  return rows;
};
let failMemory = false;
const baseFrom = fakeClient.from;

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  Object.assign(faults, { txUpdate: false, assistantInsert: false, uniqueOnClaim: false, activityLog: false });
  txUpdateCalls = 0; authState.userId = ALICE; failMemory = false; fetchCalls.length = 0;
  db.transactions = [
    r(TX, 'CORNER COFFEE 7', 'Uncategorized', null),
    r('r2-a2', 'CORNER COFFEE 8', 'Needs Review', 'needs_review'),
    r('r2-a3', 'CORNER COFFEE 9', 'Other', 'manual'),
  ];
  db.category_rules = [{ user_id: ALICE, match_type: 'contains', match_value: 'corner coffee', merchant_pattern: 'CORNER COFFEE', category: 'Food & Dining', is_active: true }];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fakeClient as any).from = (t: string) => {
    const b = baseFrom(t);
    if (t === 'vendor_category_memory' && failMemory) {
      b.upsert = () => ({ then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'memory down' } }).then(res) });
    }
    return b;
  };
  globalThis.fetch = (async (url: unknown) => { fetchCalls.push(String(url)); return new Response('{}', { status: 200 }); }) as typeof fetch;
  for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); globalThis.fetch = realFetch; });

describe('Item 1 — sweep accuracy: suggestions are never reported as saved changes', () => {
  it('the post-import notification separates suggestions from saved changes (saved = 0) and never says "categorized automatically"', async () => {
    const { json } = await call('tag-background-sweep', { importId: IMP });
    expect(json.confident_count).toBe(2);
    const [n] = notes('import_complete');
    expect(n.payload).toMatchObject({ suggested_count: 2, applied_count: 0, auto_count: 0 });
    expect(n.message).toContain('2 suggested from your own rules and history (not applied yet');
    expect(n.message).not.toMatch(/categorized automatically|auto-categorized/i);
    expect(txUpdateCalls).toBe(0);
  });
  it('after the customer confirms, the inbox gets the VERIFIED saved count', async () => {
    const p = await act({ intent: 'propose_import_suggestions', importId: IMP, ...convo("Apply Tag's suggestions", 'msg_r2_0001') });
    await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_r2_0002', { sessionId: p.json.conversation.sessionId }) });
    const [n] = notes('tag_suggestions_applied');
    expect(n.payload).toEqual({ import_id: IMP, applied_count: 2, verified: true });
    expect(n.message).toBe("You confirmed Tag's suggestions: 2 transactions saved.");
  });
  it('no notification of saved changes when nothing was saved (stale proposal)', async () => {
    const p = await act({ intent: 'propose_import_suggestions', importId: IMP, ...convo("Apply Tag's suggestions", 'msg_r2_0003') });
    db.transactions.push(r('r2-a4', 'CORNER COFFEE 10', 'Uncategorized', null));
    await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_r2_0004', { sessionId: p.json.conversation.sessionId }) });
    expect(notes('tag_suggestions_applied')).toHaveLength(0);
  });
});

describe('Item 2 — verified learning: "learned" only after the memory is saved', () => {
  it('tag-learn: success → learned:true', async () => {
    const { json } = await call('tag-learn', { transactionId: TX, merchant: 'CORNER COFFEE 7', oldCategory: 'Uncategorized', newCategory: 'Food & Dining' });
    expect(json).toMatchObject({ success: true, learned: true, memory: 'saved' });
    expect(db.vendor_category_memory?.[0]).toMatchObject({ user_id: ALICE, category: 'Food & Dining' });
  });
  it('tag-learn: memory save fails → the correction is saved but learned:false, said honestly', async () => {
    failMemory = true;
    const { json } = await call('tag-learn', { transactionId: TX, merchant: 'CORNER COFFEE 7', oldCategory: 'Uncategorized', newCategory: 'Food & Dining' });
    expect(json).toMatchObject({ success: true, learned: false, memory: 'failed' });
    expect(json.message).toBe("Correction saved, but Tag couldn't save what it learned about this merchant.");
  });
  it('tx-update-category reports learned.applied from the shared module — no HTTP hop, no legacy fallback', async () => {
    failMemory = true;
    const { json } = await call('tx-update-category', { id: TX, category: 'Food & Dining' });
    expect(json.learned).toMatchObject({ applied: false, memory: 'failed', method: 'tag-learning' });
    expect(fetchCalls.filter(u => /tag-learn|update-vendor-category/.test(u))).toHaveLength(0);
    failMemory = false;
    const ok = await call('tx-update-category', { id: 'r2-a2', category: 'Food & Dining' });
    expect(ok.json.learned).toMatchObject({ applied: true, memory: 'saved' });
  });
});

describe('Item 3 — manual correction provenance', () => {
  it('a customer edit records the genuine customer source and is verified', async () => {
    const { json } = await call('tx-update-category', { id: TX, category: 'Groceries', subcategory: 'Supermarket', applyToVendor: false });
    expect(json.ok).toBe(true);
    expect(db.transactions.find(t => t.id === TX)).toMatchObject({ category: 'Groceries', category_source: 'user_edit', subcategory_source: 'user_edit' });
  });
  it('an AI-origin request is refused and changes nothing', async () => {
    const { res, json } = await call('tx-update-category', { id: TX, category: 'Groceries' }, { 'x-xai-origin': 'ai-tool' });
    expect(res.statusCode).toBe(403);
    expect(json.error).toBe('ai_origin_refused');
    expect(db.transactions.find(t => t.id === TX)).toMatchObject({ category: 'Uncategorized', category_source: null });
  });
  it('another customer\'s transaction is not found (nothing changed)', async () => {
    authState.userId = BOB;
    const { res } = await call('tx-update-category', { id: TX, category: 'Groceries' });
    expect(res.statusCode).toBe(404);
    expect(db.transactions.find(t => t.id === TX)?.category).toBe('Uncategorized');
  });
  it('AI tools never claim customer approval (source guarantees)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const read = (f: string) => readFileSync(resolve(__dirname, '../../../src/agent/tools/impl', f), 'utf8');
    expect(read('tx_update_category.ts')).toContain("'x-xai-origin': 'ai-tool'");
    for (const f of ['tag_update_transaction_category.ts', 'tag_create_manual_transaction.ts']) {
      expect(read(f)).not.toMatch(/category_source:\s*'(manual|user_[a-z_]+)'/);
      expect(read(f)).toContain("category_source: 'tag_assisted'");
    }
  });
});

describe('§4.5 — the replaced legacy learning path cannot produce the result any more', () => {
  it('tx-update-category no longer calls tag-learn or update-vendor-category over HTTP', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../tx-update-category.ts'), 'utf8');
    expect(src).not.toMatch(/functions\/tag-learn|functions\/update-vendor-category|getInternalBaseUrl/);
    expect(src).toContain('learnFromCorrection(');
    const learn = readFileSync(resolve(__dirname, '../tag-learn.ts'), 'utf8');
    expect(learn).toContain('learnFromCorrection(');
    expect(learn).not.toMatch(/from\('vendor_category_memory'\)/);
  });
});

describe('Notifications fix (owner 2026-11-26): Tag notices use the notifications table, failures are never silent', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTagNotices = async (): Promise<{ res: Res; json: any }> => {
    const mod = await import('../tag-notifications');
    const res = await (mod.handler as (e: unknown, c: unknown) => Promise<Res>)({ httpMethod: 'GET', headers: { authorization: 'Bearer test' }, body: '' }, {});
    return { res, json: JSON.parse(res.body) };
  };
  const failTable = (table: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fakeClient as any).from = (t: string) => {
      const b = baseFrom(t);
      if (t === table) {
        const failed = { then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { code: '42703', message: 'column does not exist' } }).then(res) };
        // Every chained call returns the same thenable, so the handler sees a RETURNED error (not a throw).
        const chain: Record<string, unknown> = new Proxy(failed, { get: (o, k) => (k === 'then' ? o.then : () => chain) });
        for (const m of ['insert', 'select', 'update']) b[m] = () => chain;
      }
      return b;
    };
  };
  it("the sweep's notice is stored in notifications and the response says so", async () => {
    const { json } = await call('tag-background-sweep', { importId: IMP });
    expect(json.notification_saved).toBe(true);
    expect(notes('import_complete')).toHaveLength(1);
  });
  it('a failed notice is reported (notification_saved:false), never silent, and never blocks the sweep', async () => {
    failTable('notifications');
    const { res, json } = await call('tag-background-sweep', { importId: IMP });
    expect(res.statusCode).toBe(200);
    expect(json).toMatchObject({ ok: true, notification_saved: false, confident_count: 2 });
  });
  it("tag-notifications reads Tag's unread notices from notifications", async () => {
    await call('tag-background-sweep', { importId: IMP });
    const { res, json } = await getTagNotices();
    expect(res.statusCode).toBe(200);
    expect(json.notifications.map((n: { type: string }) => n.type)).toContain('import_complete');
  });
  it('tag-notifications reports a read failure as an error, not an empty inbox', async () => {
    failTable('notifications');
    const { res, json } = await getTagNotices();
    expect(res.statusCode).toBe(503);
    expect(json.error).toBe('notifications_unavailable');
  });
});

describe('"View all" (owner 2026-11-26): every proposed change is inspectable before confirming', () => {
  it('proposalDetails lists every change, in reply order, and matches the signed proposal exactly', async () => {
    const p = await act({ intent: 'propose_import_suggestions', importId: IMP, ...convo("Apply Tag's suggestions", 'msg_r2_va01') });
    const d = p.json.proposalDetails;
    expect(d.fingerprint).toBe(p.json.proposal.subject.fingerprint);
    expect(d.total).toBe(p.json.proposal.subject.affected);
    expect(d.items.reduce((n: number, i: { count: number }) => n + i.count, 0)).toBe(d.total);
    expect(d.protectedCount).toBe(1); // the customer's own "Other" is left alone and counted
    for (const item of d.items) expect(item.rows).toHaveLength(item.count);
    const rows = d.items.flatMap((i: { rows: unknown[] }) => i.rows);
    expect(rows).toEqual(expect.arrayContaining([
      { date: '2026-11-02', amount: -7.25, description: 'POS CORNER COFFEE 7', fromCategory: 'Uncategorized' },
      { date: '2026-11-02', amount: -7.25, description: 'POS CORNER COFFEE 8', fromCategory: 'Needs Review' },
    ]));
    expect(d.items[0]).toMatchObject({ toCategory: 'Food & Dining' });
    // Reply text shows the first items in the same order.
    expect(p.json.conversation.reply.indexOf(d.items[0].merchant)).toBeGreaterThan(-1);
  });
  it('the details are not stored in the signed receipt / chat history', async () => {
    const p = await act({ intent: 'propose_import_suggestions', importId: IMP, ...convo("Apply Tag's suggestions", 'msg_r2_va02') });
    expect(p.json.conversation.receipt.result).toEqual({ matchCount: 2 });
    const stored = JSON.stringify((db.chat_messages ?? []).map(m => m.metadata));
    expect(stored).not.toContain('POS CORNER COFFEE');
  });
  it('a confirm can only apply what was listed: a changed import is rejected as stale', async () => {
    const p = await act({ intent: 'propose_import_suggestions', importId: IMP, ...convo("Apply Tag's suggestions", 'msg_r2_va03') });
    db.transactions.push(r('r2-va4', 'CORNER COFFEE 11', 'Uncategorized', null));
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_r2_va04', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt.reason).toBe('stale');
    expect(txUpdateCalls).toBe(0);
  });
});

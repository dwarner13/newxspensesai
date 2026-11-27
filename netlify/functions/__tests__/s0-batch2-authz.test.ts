/**
 * S0 Batch 2 — authorization for functions that used to trust a caller-supplied user ID.
 *
 * generate-tax-report, tag-explain, tag-merchant-insights and sync-recurring-obligations now:
 *  - verify the Supabase JWT before ANY data access (401 for missing/invalid tokens);
 *  - take the customer identity ONLY from that token;
 *  - reject an x-user-id header or body userId that disagrees with it (403, no data access);
 *  - scope every read and write to the verified user.
 * Callers (two server-side agent tools, three browser pages) forward the Authorization header.
 *
 * All Supabase access is an in-memory fake. No network, no database.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type Call = { table: string; ops: string[]; filters: Array<[string, unknown]>; payload?: unknown };

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const TOKEN_A = 'user-a-jwt';
const TX_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const TX_B = 'bbbbbbbb-0000-4000-8000-000000000001';

let db: Record<string, Row[]> = {};
let calls: Call[] = [];

function seed() {
  const yr = new Date().getFullYear() - 1;
  db = {
    transactions: [
      { id: TX_A, user_id: USER_A, merchant: 'Netflix', merchant_name: 'Netflix', description: 'Netflix', amount: -15, type: 'expense', category: 'Subscriptions', category_source: 'ai', date: `${yr}-03-01`, posted_at: `${yr}-03-01` },
      { id: TX_B, user_id: USER_B, merchant: 'Netflix', merchant_name: 'Netflix', description: 'Netflix', amount: -15, type: 'expense', category: 'Subscriptions', category_source: 'ai', date: `${yr}-03-01`, posted_at: `${yr}-03-01` },
    ],
    profiles: [
      { id: USER_A, display_name: 'User A', settings: {} },
      { id: USER_B, display_name: 'User B', settings: {} },
    ],
    tag_category_feedback: [
      { user_id: USER_A, merchant: 'Netflix', new_category: 'Subscriptions', created_at: '2026-01-01' },
      { user_id: USER_B, merchant: 'Netflix', new_category: 'Entertainment', created_at: '2026-01-01' },
    ],
    recurring_obligations: [],
  };
}

/** Chainable query-builder stand-in: records table, method names and eq/in filters. */
function query(table: string) {
  const call: Call = { table, ops: [], filters: [] };
  calls.push(call);
  // FST-2: generate-tax-report now pages (.range) with date bounds (.gte/.lte) and verifies the
  // row count (select(..., { count: 'exact', head: true })). The fake honours those; the identity
  // assertions below are unchanged (every query must still be filtered by the verified user).
  let range: [number, number] | null = null;
  let head = false;
  const bounds: Array<[string, 'gte' | 'lte', unknown]> = [];
  const matches = () => (db[table] || []).filter((r) =>
    call.filters.every(([k, v]) => (k.startsWith('in:') ? (v as unknown[]).includes(r[k.slice(3)]) : r[k] === v))
    // date bounds only for the paged/count reads (the authoritative ledger); other functions'
    // queries keep the original fake semantics so their existing assertions are unchanged
    && (!(range || head) || bounds.every(([k, op, v]) => (op === 'gte' ? String(r[k] ?? '') >= String(v) : String(r[k] ?? '') <= String(v)))));
  const run = () => {
    if (call.ops.includes('insert')) { (db[table] ||= []).push({ id: `${table}-${(db[table] || []).length + 1}`, ...(call.payload as Row) }); return { data: null, error: null }; }
    if (call.ops.includes('update')) { matches().forEach((r) => Object.assign(r, call.payload)); return { data: null, error: null }; }
    const all = matches();
    if (head) return { data: null, error: null, count: all.length };
    return { data: range ? all.slice(range[0], range[1] + 1) : all, error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic chain via Proxy
  const proxy: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej);
      if (prop === 'single' || prop === 'maybeSingle') return async () => { const r = run(); const row = (r.data as Row[] | null)?.[0] ?? null; return { data: row, error: null }; };
      return (...args: unknown[]) => {
        call.ops.push(prop);
        if (prop === 'eq') call.filters.push([String(args[0]), args[1]]);
        if (prop === 'in') call.filters.push([`in:${String(args[0])}`, args[1]]);
        if (prop === 'gte' || prop === 'lte') bounds.push([String(args[0]), prop, args[1]]);
        if (prop === 'range') range = [Number(args[0]), Number(args[1])];
        if (prop === 'select' && (args[1] as { head?: boolean } | undefined)?.head) head = true;
        if (prop === 'insert' || prop === 'update' || prop === 'upsert') call.payload = args[0];
        return proxy;
      };
    },
  });
  return proxy;
}

const fakeClient = {
  auth: {
    getUser: async (token: string) =>
      token === TOKEN_A ? { data: { user: { id: USER_A } }, error: null } : { data: { user: null }, error: { message: 'invalid JWT' } },
  },
  from: (table: string) => query(table),
};

const activity = vi.fn(async () => undefined);
vi.mock('../_shared/supabase', () => ({ admin: () => fakeClient, serverSupabase: () => fakeClient }));
vi.mock('../_shared/activity-logger', () => ({ logActivityEvent: (...a: unknown[]) => activity(...a) }));
vi.mock('../../../src/services/recurringDetection', () => ({
  detectRecurringPatternsForUser: (txs: Row[]) =>
    txs.length ? [{ merchant_name: 'Netflix', amount: 15, interval_days: 30, frequency: 'monthly', last_seen_date: '2026-03-01', first_seen_date: '2025-03-01', occurrences: 12, confidence: 0.9 }] : [],
}));

const fns = {
  'generate-tax-report': await import('../generate-tax-report'),
  'tag-explain': await import('../tag-explain'),
  'tag-merchant-insights': await import('../tag-merchant-insights'),
  'sync-recurring-obligations': await import('../sync-recurring-obligations'),
} as const;
type FnName = keyof typeof fns;

const validBody: Record<FnName, Row> = {
  'generate-tax-report': { year: new Date().getFullYear() - 1, format: 'html' },
  'tag-explain': { transactionId: TX_A },
  'tag-merchant-insights': { merchant: 'Netflix' },
  'sync-recurring-obligations': {},
};

async function invoke(name: FnName, headers: Record<string, string>, body: Row) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler typing
  const res: any = await (fns[name].handler as any)({ httpMethod: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, {});
  return { statusCode: res.statusCode as number, body: String(res.body || '') };
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const userScopedValues = () => calls.flatMap((c) => c.filters.filter(([k]) => k === 'user_id' || (c.table === 'profiles' && k === 'id')).map(([, v]) => v));

let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];
beforeEach(() => {
  seed();
  calls = [];
  activity.mockClear();
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => {
  logSpies.forEach((s) => s.mockRestore());
  vi.unstubAllGlobals();
  delete process.env.URL;
});

describe.each(Object.keys(fns) as FnName[])('%s — authentication and identity', (name) => {
  it('missing token → 401 and no database access', async () => {
    const r = await invoke(name, { 'x-user-id': USER_A }, { ...validBody[name], userId: USER_A });
    expect(r.statusCode).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('invalid token → 401 and no database access', async () => {
    const r = await invoke(name, { ...bearer('forged-token'), 'x-user-id': USER_A }, validBody[name]);
    expect(r.statusCode).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('malformed Authorization header → 401 and no database access', async () => {
    const r = await invoke(name, { authorization: TOKEN_A }, validBody[name]);
    expect(r.statusCode).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("User A's token claiming User B in x-user-id → 403 and no database access", async () => {
    const r = await invoke(name, { ...bearer(TOKEN_A), 'x-user-id': USER_B }, validBody[name]);
    expect(r.statusCode).toBe(403);
    expect(calls).toHaveLength(0);
    expect(r.body).not.toContain(USER_B);
  });

  it("User A's token claiming User B in body.userId → 403 and no database access", async () => {
    const r = await invoke(name, bearer(TOKEN_A), { ...validBody[name], userId: USER_B });
    expect(r.statusCode).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it('valid token, no claimed ID → 200 and every query is scoped to the verified user only', async () => {
    const r = await invoke(name, bearer(TOKEN_A), validBody[name]);
    expect(r.statusCode).toBe(200);
    expect(calls.length).toBeGreaterThan(0);
    const scoped = userScopedValues();
    expect(scoped.length).toBeGreaterThan(0);
    expect(new Set(scoped)).toEqual(new Set([USER_A]));
    expect(r.body).not.toContain(USER_B);
  });

  it('valid token with a matching x-user-id and body.userId (existing callers) → 200', async () => {
    const r = await invoke(name, { ...bearer(TOKEN_A), 'x-user-id': USER_A }, { ...validBody[name], userId: USER_A });
    expect(r.statusCode).toBe(200);
  });

  it('logs never contain user IDs or the token', async () => {
    await invoke(name, bearer(TOKEN_A), validBody[name]);
    await invoke(name, { ...bearer(TOKEN_A), 'x-user-id': USER_B }, validBody[name]);
    const logged = logSpies.flatMap((s) => s.mock.calls.map((c) => c.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '))).join('\n');
    expect(logged).not.toContain(USER_A);
    expect(logged).not.toContain(USER_B);
    expect(logged).not.toContain(TOKEN_A);
  });
});

describe('function-specific isolation', () => {
  it("tag-explain cannot read another customer's transaction (B's tx with A's token → not found)", async () => {
    const r = await invoke('tag-explain', bearer(TOKEN_A), { transactionId: TX_B });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('could not find');
    expect(calls.filter((c) => c.table === 'transactions').every((c) => c.filters.some(([k, v]) => k === 'user_id' && v === USER_A))).toBe(true);
  });

  it("tag-merchant-insights returns only the caller's corrections", async () => {
    const r = await invoke('tag-merchant-insights', bearer(TOKEN_A), { merchant: 'Netflix' });
    expect(JSON.parse(r.body).topCategory).toBe('Subscriptions');
  });

  it("generate-tax-report uses only the caller's transactions and profile", async () => {
    const r = await invoke('generate-tax-report', bearer(TOKEN_A), { year: new Date().getFullYear() - 1, format: 'html' });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('User A');
    expect(r.body).not.toContain('User B');
  });

  it('sync-recurring-obligations writes only to the caller, logs activity only for the caller, and no longer echoes userId', async () => {
    const r = await invoke('sync-recurring-obligations', bearer(TOKEN_A), {});
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body)).not.toHaveProperty('userId');
    const inserted = db.recurring_obligations;
    expect(inserted.length).toBeGreaterThan(0);
    expect(inserted.every((o) => o.user_id === USER_A)).toBe(true);
    expect(activity).toHaveBeenCalled();
    expect(activity.mock.calls.every((c) => c[0] === USER_A)).toBe(true);
  });

  it('sync-recurring-obligations with no transactions also returns no userId', async () => {
    db.transactions = db.transactions.filter((t) => t.user_id !== USER_A);
    const r = await invoke('sync-recurring-obligations', bearer(TOKEN_A), {});
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body)).not.toHaveProperty('userId');
    expect(r.body).not.toContain(USER_A);
  });

  it('sync-recurring-obligations scopes its update and deactivate writes to the caller (defense in depth)', async () => {
    db.recurring_obligations = [{ id: 'ro-a', user_id: USER_A, merchant_name: 'Netflix', is_active: true, last_seen_date: '2020-01-01', interval_days: 30 }];
    await invoke('sync-recurring-obligations', bearer(TOKEN_A), {});
    const writes = calls.filter((c) => c.table === 'recurring_obligations' && c.ops.includes('update'));
    expect(writes.length).toBeGreaterThan(0);
    for (const w of writes) expect(w.filters).toContainEqual(['user_id', USER_A]);
  });

  it.each(['null', '[]', '"x"'])('a non-object JSON body (%s) is a clean 400, not a 500, for tag-explain / tag-merchant-insights / generate-tax-report', async (raw) => {
    for (const name of ['tag-explain', 'tag-merchant-insights', 'generate-tax-report'] as FnName[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler typing
      const res: any = await (fns[name].handler as any)({ httpMethod: 'POST', headers: bearer(TOKEN_A), body: raw }, {});
      expect(res.statusCode).toBe(400);
    }
  });

  it('generate-tax-report lists Authorization explicitly in CORS (a wildcard does not cover it)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler typing
    const res: any = await (fns['generate-tax-report'].handler as any)({ httpMethod: 'OPTIONS', headers: {} }, {});
    expect(res.headers['Access-Control-Allow-Headers']).toContain('Authorization');
  });

  it('sync-recurring-obligations allows the Authorization header in CORS', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler typing
    const res: any = await (fns['sync-recurring-obligations'].handler as any)({ httpMethod: 'OPTIONS', headers: {} }, {});
    expect(res.headers['Access-Control-Allow-Headers']).toContain('Authorization');
  });
});

describe('server-side agent tool callers forward the Authorization header', async () => {
  const explainTool = await import('../../../src/agent/tools/impl/tag_explain');
  const insightsTool = await import('../../../src/agent/tools/impl/tag_merchant_insights');

  for (const [label, tool, input] of [
    ['tag_explain', explainTool, { transactionId: TX_A }],
    ['tag_merchant_insights', insightsTool, { merchant: 'Netflix' }],
  ] as const) {
    it(`${label}: sends Authorization (and a matching x-user-id) when the request is authenticated`, async () => {
      process.env.URL = 'https://example.test';
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ category: 'Subscriptions', merchant: 'Netflix', topCategory: 'Subscriptions', totalCorrections: 1 }), { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool input typing
      await (tool as any).execute(input, { userId: USER_A, authHeader: `Bearer ${TOKEN_A}` });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fetch init inspection
      const headers = (fetchMock.mock.calls[0] as any)[1].headers;
      expect(headers.Authorization).toBe(`Bearer ${TOKEN_A}`);
      expect(headers['x-user-id']).toBe(USER_A);
    });

    it(`${label}: without an authenticated request it fails cleanly and makes no call`, async () => {
      process.env.URL = 'https://example.test';
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      for (const authHeader of [undefined, '', 'not-a-bearer']) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool input typing
        const res = await (tool as any).execute(input, { userId: USER_A, authHeader });
        expect(res.ok).toBe(false);
      }
      expect(fetchMock).not.toHaveBeenCalled();
    });
  }
});

describe('browser callers send the session token read at call time', () => {
  const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');
  const cases: Array<[string, string]> = [
    ['src/pages/dashboard/TaxWorkspacePage.tsx', '/.netlify/functions/generate-tax-report'],
    ['src/pages/dashboard/TransactionsPageV2.tsx', '/.netlify/functions/tag-explain'],
    // TB-5 W7 (owner GO 2026-11-26): the unrouted orphan src/pages/TransactionsPageV2.tsx was
    // retired; the live page's row above stays.
  ];
  for (const [file, endpoint] of cases) {
    it(`${file} → ${endpoint}`, () => {
      const src = read(file);
      const at = src.indexOf(endpoint);
      expect(at).toBeGreaterThan(-1);
      const before = src.slice(Math.max(0, at - 700), at);
      const after = src.slice(at, at + 300);
      expect(before).toContain('auth.getSession()');
      expect(before).toMatch(/if \(!accessToken\) (return|throw)/);
      expect(after).toContain('Authorization: `Bearer ${accessToken}`');
    });
  }
});

describe('no function reads a claimed identity before authenticating', () => {
  for (const name of Object.keys(fns) as FnName[]) {
    it(`${name}`, () => {
      const src = fs.readFileSync(path.resolve(__dirname, `../${name}.ts`), 'utf8');
      const handlerAt = src.indexOf('export const handler');
      const authAt = src.indexOf('await authenticateUser(event)', handlerAt);
      expect(authAt).toBeGreaterThan(handlerAt);
      const firstDb = Math.min(...['admin()', 'serverSupabase()'].map((s) => { const i = src.indexOf(s, handlerAt); return i < 0 ? Infinity : i; }));
      expect(authAt).toBeLessThan(firstDb);
      expect(src).not.toMatch(/const userId = event\.headers\[/);
      expect(src).not.toMatch(/userId = body\.userId/);
      expect(src).toContain('userId = authn.principal.userId');
    });
  }
});

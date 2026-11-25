/**
 * P0-C2c — tag-learn and update-vendor-category authorization (+ the tx-update-category caller).
 *
 * Identity only from the verified Supabase JWT; x-user-id / body userId must match; affected
 * transactions must belong to the user; every write is scoped to the user; rejected requests
 * write nothing. All Supabase access is an in-memory fake.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type DbCall = { table: string; op: string; filters: Array<[string, unknown]>; payload?: unknown };

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const TOKEN_A = 'user-a-jwt';
const TX_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const TX_A2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const STG_A = 'aaaaaaaa-0000-4000-8000-0000000000aa';
const TX_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const DEPLOY = 'https://deploy-c2c--xspensesai-staging.netlify.app';

let db: Record<string, Row[]> = {};
let dbCalls: DbCall[] = [];
let failInsert = false;
let failTable: string | null = null;

function seed() {
  db = {
    transactions: [
      { id: TX_A, user_id: USER_A, category: 'Other', merchant: 'Starbucks', description: 'Starbucks #12' },
      { id: TX_A2, user_id: USER_A, category: 'Other', merchant: 'Starbucks', description: 'Starbucks #13' },
      { id: TX_B, user_id: USER_B, category: 'Travel', merchant: 'Starbucks', description: 'Starbucks' },
    ],
    transactions_staging: [
      { id: STG_A, user_id: USER_A, tag_status: 'needs_review', data_json: { description: 'Starbucks' } },
      { id: 'stg-a-other', user_id: USER_A, tag_status: 'needs_review', data_json: { description: 'Shell Gas' } },
      { id: 'stg-b', user_id: USER_B, tag_status: 'needs_review', data_json: { description: 'Starbucks' } },
    ],
    tag_category_feedback: [],
    vendor_category_memory: [
      { user_id: USER_B, vendor_key: 'starbucks', category: 'Travel', metadata: {} },
    ],
    categorization_rules: [
      { user_id: USER_B, keyword: 'starbucks', category: 'Travel', match_count: 4 },
    ],
  };
}

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | null = null;
  let upsertConflict: string[] = [];
  let range: [number, number] | null = null;
  const matches = () =>
    (db[table] || []).filter((r) => filters.every(([k, v]) => (k.startsWith('in:') ? (v as unknown[]).includes(r[k.slice(3)]) : r[k] === v)));
  const run = () => {
    dbCalls.push({ table, op, filters: [...filters], payload });
    if (failTable === table) return { data: null, error: { message: 'relation leaked-internal-detail' } };
    if (op === 'insert') {
      if (failInsert) return { data: null, error: { message: 'insert leaked-internal-detail' } };
      const row = { id: `${table}-${(db[table] || []).length + 1}`, ...payload };
      (db[table] ||= []).push(row);
      return { data: [row], error: null };
    }
    if (op === 'upsert') {
      const existing = (db[table] || []).find((r) => upsertConflict.every((k) => r[k] === (payload as Row)[k]));
      if (existing) Object.assign(existing, payload); else (db[table] ||= []).push({ ...payload });
      return { data: [payload], error: null };
    }
    if (op === 'update') { const rows = matches(); rows.forEach((r) => Object.assign(r, payload)); return { data: rows, error: null }; }
    const rows = matches();
    return { data: range ? rows.slice(range[0], range[1] + 1) : rows, error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
  const q: any = {
    select: () => q,
    insert: (p: Row) => { op = 'insert'; payload = p; return q; },
    update: (p: Row) => { op = 'update'; payload = p; return q; },
    upsert: (p: Row, o?: { onConflict?: string }) => { op = 'upsert'; payload = p; upsertConflict = String(o?.onConflict || '').split(','); return q; },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    in: (k: string, v: unknown[]) => { filters.push([`in:${k}`, v]); return q; },
    range: (a: number, b: number) => { range = [a, b]; return q; },
    order: () => q, limit: () => q,
    single: async () => { const r = run(); if (r.error) return r; const row = (r.data as Row[])[0]; return row ? { data: row, error: null } : { data: null, error: { message: 'no rows' } }; },
    maybeSingle: async () => { const r = run(); if (r.error) return r; return { data: (r.data as Row[])[0] ?? null, error: null }; },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return q;
}

const fakeClient = {
  auth: {
    getUser: async (token: string) =>
      token === TOKEN_A ? { data: { user: { id: USER_A } }, error: null } : { data: { user: null }, error: { message: 'invalid JWT' } },
  },
  from: (table: string) => query(table),
};

const activity = { log: vi.fn(async () => undefined), fluency: vi.fn(async () => undefined) };
vi.mock('../_shared/supabase', () => ({ admin: () => fakeClient, serverSupabase: () => fakeClient }));

// BYTE-LIVE-01: build-time deploy metadata as hosted Functions see it (null unless a test sets it).
const buildMeta = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
vi.mock('../_shared/deployMetadata.generated', () => ({
  get BUILD_DEPLOY_METADATA() {
    return buildMeta.current;
  },
}));
const HOSTED_ORIGIN = 'https://f00dfacef00dfacef00dface--synthetic-staging.netlify.app';
const HOSTED_META = { context: 'production', deployId: 'f00dfacef00dfacef00dface', siteName: 'synthetic-staging', deployUrl: HOSTED_ORIGIN, siteUrl: null };
/** Exactly what hosted staging Functions see: URL and the job secret, no DEPLOY_URL or CONTEXT. */
function hostedRuntime(meta: Record<string, unknown> | null = { ...HOSTED_META }) {
  delete process.env.DEPLOY_URL;
  delete process.env.CONTEXT;
  process.env.URL = 'https://synthetic-staging.netlify.app';
  buildMeta.current = meta;
}
afterEach(() => {
  buildMeta.current = null;
});
vi.mock('../../../src/lib/ai/userActivity', () => ({
  logUserEvent: (...a: unknown[]) => activity.log(...a),
  recalcFluency: (...a: unknown[]) => activity.fluency(...a),
}));

const tagLearn = await import('../tag-learn');
const vendorCat = await import('../update-vendor-category');
const txUpdate = await import('../tx-update-category');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler / response shapes
async function invoke(h: any, headers: Record<string, string>, body: Row) {
  const res = await h({ httpMethod: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, {});
  let json: Row = {};
  try { json = JSON.parse(res.body || '{}'); } catch { json = {}; }
  return { statusCode: res.statusCode as number, json, body: String(res.body || '') };
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const writes = () => dbCalls.filter((c) => c.op !== 'select');
const flush = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0)); };
const learnBody = { transactionId: TX_A, merchant: 'Starbucks', description: 'Starbucks #12', oldCategory: 'Other', newCategory: 'Coffee' };
let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeEach(() => {
  seed();
  dbCalls = []; failInsert = false; failTable = null;
  activity.log.mockClear(); activity.fluency.mockClear();
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => {
  logSpies.forEach((s) => s.mockRestore());
  vi.unstubAllGlobals();
  for (const k of ['DEPLOY_URL', 'CONTEXT', 'URL']) delete process.env[k];
});

// ── tag-learn ────────────────────────────────────────────────────────────────
describe('tag-learn', () => {
  const nothingWritten = async () => {
    await flush();
    expect(writes()).toHaveLength(0);
    expect(activity.log).not.toHaveBeenCalled();
    expect(db.vendor_category_memory.find((m) => m.user_id === USER_B)?.category).toBe('Travel');
    expect(db.transactions_staging.find((s) => s.id === 'stg-b')?.tag_status).toBe('needs_review');
  };

  it('the old x-user-id / body-userId call (no JWT) → 401 with no reads or writes', async () => {
    const r = await invoke(tagLearn.handler, { 'x-user-id': USER_B }, { ...learnBody, userId: USER_B, transactionId: TX_B });
    expect(r.statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
    await nothingWritten();
  });

  it('an invalid JWT → 401', async () => {
    expect((await invoke(tagLearn.handler, bearer('forged'), learnBody)).statusCode).toBe(401);
    await nothingWritten();
  });

  it('a spoofed x-user-id or body userId → 403 with no database access', async () => {
    expect((await invoke(tagLearn.handler, { ...bearer(TOKEN_A), 'x-user-id': USER_B }, learnBody)).statusCode).toBe(403);
    expect((await invoke(tagLearn.handler, bearer(TOKEN_A), { ...learnBody, userId: USER_B })).statusCode).toBe(403);
    expect(dbCalls).toHaveLength(0);
    await nothingWritten();
  });

  it.each([
    ["another user's transaction", TX_B],
    ['an unknown transaction', 'ffffffff-0000-4000-8000-000000000000'],
  ])('%s → 404: no feedback, no vendor memory, no retroactive staging re-tag', async (_l, transactionId) => {
    const r = await invoke(tagLearn.handler, bearer(TOKEN_A), { ...learnBody, transactionId });
    expect(r.statusCode).toBe(404);
    await nothingWritten();
    for (const c of dbCalls) expect(c.filters).toContainEqual(['user_id', USER_A]);
  });

  it("authorized correction on the user's committed transaction: feedback, memory and re-tag are all the user's own", async () => {
    const r = await invoke(tagLearn.handler, { ...bearer(TOKEN_A), 'x-user-id': USER_A }, learnBody);
    expect(r.statusCode).toBe(200);
    expect(r.json.success).toBe(true);
    await flush();
    expect(db.tag_category_feedback).toHaveLength(1);
    expect(db.tag_category_feedback[0]).toMatchObject({ user_id: USER_A, transaction_id: TX_A, new_category: 'Coffee' });
    expect(db.vendor_category_memory.find((m) => m.user_id === USER_A)).toMatchObject({ vendor_key: 'starbucks', category: 'Coffee' });
    // Retroactive apply: only A's matching needs_review row changes.
    expect(db.transactions_staging.find((s) => s.id === STG_A)).toMatchObject({ tag_status: 'auto', tag_category: 'Coffee' });
    expect(db.transactions_staging.find((s) => s.id === 'stg-a-other')?.tag_status).toBe('needs_review');
    expect(db.transactions_staging.find((s) => s.id === 'stg-b')?.tag_status).toBe('needs_review');
    expect(db.vendor_category_memory.find((m) => m.user_id === USER_B)?.category).toBe('Travel');
    for (const c of dbCalls) expect(c.filters.length === 0 || c.filters.some(([k, v]) => k === 'user_id' && v === USER_A), `${c.table} ${c.op}`).toBe(true);
    for (const c of writes().filter((w) => w.op === 'insert' || w.op === 'upsert')) expect((c.payload as Row).user_id).toBe(USER_A);
    expect(activity.log.mock.calls[0][0]).toMatchObject({ userId: USER_A });
  });

  it("a correction on the user's own staging row is accepted", async () => {
    const r = await invoke(tagLearn.handler, bearer(TOKEN_A), { ...learnBody, transactionId: STG_A });
    expect(r.statusCode).toBe(200);
  });

  it('database errors are not echoed', async () => {
    failInsert = true;
    const r = await invoke(tagLearn.handler, bearer(TOKEN_A), learnBody);
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain('leaked-internal-detail');
  });

  it('an ownership lookup failure fails closed (503) with no writes', async () => {
    failTable = 'transactions';
    const r = await invoke(tagLearn.handler, bearer(TOKEN_A), learnBody);
    expect(r.statusCode).toBe(503);
    await nothingWritten();
  });
});

// ── update-vendor-category ───────────────────────────────────────────────────
describe('update-vendor-category', () => {
  const vcBody = { vendor: 'Starbucks', category: 'Coffee', transactionIds: [TX_A, TX_A2] };
  const nothingWritten = () => {
    expect(writes()).toHaveLength(0);
    expect(db.transactions.find((t) => t.id === TX_B)?.category).toBe('Travel');
    expect(db.categorization_rules.find((r) => r.user_id === USER_B)?.category).toBe('Travel');
  };

  it('the old body-userId call (no JWT) → 401 with no reads or writes', async () => {
    const r = await invoke(vendorCat.handler, {}, { ...vcBody, userId: USER_B, transactionIds: [TX_B] });
    expect(r.statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
    nothingWritten();
  });

  it('a spoofed body userId or x-user-id → 403 with no database access', async () => {
    expect((await invoke(vendorCat.handler, bearer(TOKEN_A), { ...vcBody, userId: USER_B })).statusCode).toBe(403);
    expect((await invoke(vendorCat.handler, { ...bearer(TOKEN_A), 'x-user-id': USER_B }, vcBody)).statusCode).toBe(403);
    expect(dbCalls).toHaveLength(0);
  });

  it.each([
    ["another user's transaction", [TX_B]],
    ['a mix of own and foreign transactions', [TX_A, TX_B]],
    ['an unknown transaction', ['ffffffff-0000-4000-8000-000000000000']],
  ])('%s → 403 before any update or rule write', async (_l, transactionIds) => {
    const r = await invoke(vendorCat.handler, bearer(TOKEN_A), { ...vcBody, transactionIds });
    expect(r.statusCode).toBe(403);
    nothingWritten();
    expect(db.transactions.find((t) => t.id === TX_A)?.category).toBe('Other');
  });

  it('invalid transactionIds → 400', async () => {
    expect((await invoke(vendorCat.handler, bearer(TOKEN_A), { ...vcBody, transactionIds: 'x' })).statusCode).toBe(400);
    expect((await invoke(vendorCat.handler, bearer(TOKEN_A), { ...vcBody, transactionIds: Array.from({ length: 501 }, () => TX_A) })).statusCode).toBe(400);
    nothingWritten();
  });

  it("authorized: updates only the user's transactions and the user's own rule", async () => {
    const r = await invoke(vendorCat.handler, bearer(TOKEN_A), vcBody);
    expect(r.statusCode).toBe(200);
    expect(db.transactions.filter((t) => t.user_id === USER_A).every((t) => t.category === 'Coffee')).toBe(true);
    expect(db.transactions.find((t) => t.id === TX_B)?.category).toBe('Travel');
    expect(db.categorization_rules.find((x) => x.user_id === USER_A)).toMatchObject({ keyword: 'starbucks', category: 'Coffee' });
    expect(db.categorization_rules.find((x) => x.user_id === USER_B)?.category).toBe('Travel');
    for (const c of writes()) {
      if (c.op === 'update') expect(c.filters).toContainEqual(['user_id', USER_A]);
      if (c.op === 'upsert') expect((c.payload as Row).user_id).toBe(USER_A);
    }
  });

  it('a rule-only learning call (no transactionIds) writes only the user\'s rule', async () => {
    const r = await invoke(vendorCat.handler, bearer(TOKEN_A), { vendor: 'Starbucks', category: 'Coffee' });
    expect(r.statusCode).toBe(200);
    expect(db.categorization_rules.find((x) => x.user_id === USER_B)?.category).toBe('Travel');
  });

  it('errors are not echoed', async () => {
    failTable = 'transactions';
    const r = await invoke(vendorCat.handler, bearer(TOKEN_A), vcBody);
    expect(r.body).not.toContain('leaked-internal-detail');
  });
});

// ── tx-update-category → tag-learn / update-vendor-category ──────────────────
describe('tx-update-category learning calls', () => {
  function stubFetch() {
    const seen: Array<{ url: string; headers: Record<string, string>; body: Row }> = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      seen.push({ url: String(url), headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }));
    return seen;
  }

  it('forwards the verified JWT and the verified user id to tag-learn on this same deploy', async () => {
    process.env.DEPLOY_URL = DEPLOY;
    const seen = stubFetch();
    const r = await invoke(txUpdate.handler, bearer(TOKEN_A), { id: TX_A, category: 'Coffee' });
    expect(r.statusCode).toBe(200);
    expect(r.json.learned).toMatchObject({ applied: true, method: 'tag-learn' });
    expect(seen[0].url).toBe(`${DEPLOY}/.netlify/functions/tag-learn`);
    expect(seen[0].headers.authorization).toBe(`Bearer ${TOKEN_A}`);
    expect(seen[0].headers['x-user-id']).toBe(USER_A);
    expect(seen[0].body.userId).toBe(USER_A);
  });

  it('without a same-deploy URL (deploy preview) the category still updates but learning is skipped', async () => {
    process.env.CONTEXT = 'deploy-preview';
    process.env.URL = 'https://xspensesai-staging.netlify.app';
    const seen = stubFetch();
    const r = await invoke(txUpdate.handler, bearer(TOKEN_A), { id: TX_A, category: 'Coffee' });
    expect(r.statusCode).toBe(200);
    expect(r.json.learned).toMatchObject({ applied: false });
    expect(seen).toHaveLength(0);
  });

  it('BYTE-LIVE-01: reproduces the silent skip in the hosted runtime without metadata (category saved, no learning)', async () => {
    hostedRuntime(null);
    const seen = stubFetch();
    const r = await invoke(txUpdate.handler, bearer(TOKEN_A), { id: TX_A, category: 'Coffee' });
    expect(r.statusCode).toBe(200);
    expect(r.json.learned).toMatchObject({ applied: false });
    expect(seen).toHaveLength(0);
  });

  it('BYTE-LIVE-01: with build metadata, Tag learning resumes on this exact deploy with the verified identity', async () => {
    hostedRuntime();
    const seen = stubFetch();
    const r = await invoke(txUpdate.handler, bearer(TOKEN_A), { id: TX_A, category: 'Coffee' });
    expect(r.statusCode).toBe(200);
    expect(r.json.learned).toMatchObject({ applied: true, method: 'tag-learn' });
    expect(seen[0].url).toBe(`${HOSTED_ORIGIN}/.netlify/functions/tag-learn`);
    expect(seen[0].headers.authorization).toBe(`Bearer ${TOKEN_A}`);
    expect(seen[0].body.userId).toBe(USER_A);
  });
});

// ── frontend callers ─────────────────────────────────────────────────────────
describe('frontend callers send the user JWT', () => {
  const src = (p: string) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');
  it.each([
    ['src/pages/dashboard/DashboardTransactionsPage.tsx', 'functions/tag-learn'],
    ['src/utils/categorizationFlow.ts', 'functions/update-vendor-category'],
  ])('%s sends Authorization to %s', (file, fn) => {
    const s = src(file);
    const i = s.indexOf(fn);
    expect(s.slice(i, i + 400)).toMatch(/Authorization: `Bearer \$\{accessToken\}`/);
  });
});

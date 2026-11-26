/**
 * P0-C1c — smart-import-sync and commit-import authorization.
 *
 * Committing transactions requires the user's verified Supabase JWT. x-user-id / body userId are
 * never proof of identity; internal job tokens never authorize a commit; every record is scoped
 * to the verified user; sync forwards the verified JWT to this same deploy only.
 * All Supabase access, AI categorization and network calls are in-memory fakes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type DbCall = { table: string; op: string; filters: Array<[string, unknown]> };
type FnCall = { url: string; fn: string; headers: Record<string, string>; body: Row | null };

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const TOKEN_A = 'user-a-jwt';
const SERVICE_KEY = 'test-service-role-key-not-a-secret';
const DOC_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const DOC_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const DOC_ORPHAN = 'cccccccc-0000-4000-8000-000000000001';
const IMP_A = 'dddddddd-0000-4000-8000-000000000001';
const IMP_A2 = 'dddddddd-0000-4000-8000-000000000002';
const IMP_B = 'eeeeeeee-0000-4000-8000-000000000001';
const IMP_ORPHAN = 'ffffffff-0000-4000-8000-000000000001';
const SECRET = 'test-signing-secret-0123456789abcdef-c1c';
const DEPLOY = 'https://deploy-c1c--xspensesai-staging.netlify.app';

let db: Record<string, Row[]> = {};
let dbCalls: DbCall[] = [];
let fnCalls: FnCall[] = [];

function stagingRow(id: string, importId: string, userId: string, amount: number) {
  return {
    id, import_id: importId, user_id: userId, hash: `h-${id}`, parsed_at: '2026-10-01T00:00:00Z',
    data_json: { date: '2026-10-01', description: `Merchant ${id}`, merchant: `Merchant ${id}`, amount, type: amount < 0 ? 'debit' : 'credit' },
  };
}

function seed() {
  db = {
    user_documents: [
      { id: DOC_A, user_id: USER_A, status: 'ready', ocr_status: 'ready', mime_type: 'text/csv', original_name: 'a.csv', storage_path: `${USER_A}/${DOC_A}/a.csv`, metadata: {}, created_at: '2026-10-01T00:00:00Z' },
      { id: DOC_B, user_id: USER_B, status: 'ready', ocr_status: 'ready', mime_type: 'text/csv', original_name: 'b.csv', storage_path: `${USER_B}/${DOC_B}/b.csv`, metadata: {}, created_at: '2026-10-01T00:00:00Z' },
      { id: DOC_ORPHAN, user_id: null, status: 'ready', ocr_status: 'ready', mime_type: 'text/csv', original_name: 'o.csv', metadata: {} },
    ],
    imports: [
      // Statement totals match the two staged rows so the (unchanged) reconciliation gate passes.
      { id: IMP_A, user_id: USER_A, document_id: DOC_A, status: 'parsed', approved_at: '2026-10-02T00:00:00Z', file_url: 'a.csv', file_type: 'csv', created_at: '2026-10-01T00:00:00Z', metadata: {}, statement_breakdown_json: { statementTotals: { totalDeducted: 12.5, totalAdded: 300 } } },
      { id: IMP_A2, user_id: USER_A, document_id: DOC_A, status: 'parsed', approved_at: '2026-10-02T00:00:00Z', file_url: 'a2.csv', file_type: 'csv', created_at: '2026-10-01T00:00:00Z', metadata: {} },
      { id: IMP_B, user_id: USER_B, document_id: DOC_B, status: 'parsed', approved_at: '2026-10-02T00:00:00Z', file_url: 'b.csv', file_type: 'csv', created_at: '2026-10-01T00:00:00Z', metadata: {} },
      { id: IMP_ORPHAN, user_id: null, document_id: DOC_ORPHAN, status: 'parsed', approved_at: '2026-10-02T00:00:00Z', file_url: 'o.csv', file_type: 'csv', created_at: '2026-10-01T00:00:00Z', metadata: {} },
    ],
    transactions_staging: [
      stagingRow('s-a1', IMP_A, USER_A, -12.5),
      stagingRow('s-a2', IMP_A, USER_A, 300),
      stagingRow('s-b1', IMP_B, USER_B, -99),
    ],
    transactions: [],
    import_summaries: [],
    ocr_jobs: [],
  };
}

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | Row[] | null = null;
  let limit = Infinity;
  let wantCount = false;
  const matches = () =>
    (db[table] || []).filter((r) =>
      filters.every(([k, v]) => (k.startsWith('in:') ? (v as unknown[]).includes(r[k.slice(3)]) : r[k] === v))
    );
  const run = () => {
    dbCalls.push({ table, op, filters: [...filters] });
    const rows = matches();
    if (op === 'update') { rows.forEach((r) => Object.assign(r, payload)); return { data: rows, error: null }; }
    if (op === 'delete') { db[table] = (db[table] || []).filter((r) => !rows.includes(r)); return { data: rows, error: null }; }
    if (op === 'insert' || op === 'upsert') {
      const list = Array.isArray(payload) ? payload : [payload];
      const inserted = list.map((p, i) => ({ id: (p as Row)?.id ?? `${table}-${(db[table] || []).length + i + 1}`, ...(p as Row) }));
      (db[table] ||= []).push(...inserted);
      return { data: inserted, error: null };
    }
    return { data: rows.slice(0, limit), error: null, count: wantCount ? rows.length : null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
  const q: any = {
    select: (_c?: string, opts?: { count?: string }) => { if (opts?.count) wantCount = true; return q; },
    update: (p: Row) => { op = 'update'; payload = p; return q; },
    insert: (p: Row | Row[]) => { op = 'insert'; payload = p; return q; },
    upsert: (p: Row | Row[]) => { op = 'upsert'; payload = p; return q; },
    delete: () => { op = 'delete'; return q; },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    in: (k: string, v: unknown[]) => { filters.push([`in:${k}`, v]); return q; },
    neq: () => q, is: () => q, gte: () => q, lte: () => q, gt: () => q, lt: () => q, not: () => q, or: () => q, contains: () => q,
    order: () => q,
    range: () => q,
    limit: (n: number) => { limit = n; return q; },
    single: async () => { const r = run(); const row = (r.data as Row[])[0]; return row ? { data: row, error: null } : { data: null, error: { message: 'no rows', code: 'PGRST116' } }; },
    maybeSingle: async () => { const r = run(); return { data: (r.data as Row[])[0] ?? null, error: null }; },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return q;
}

const fakeClient = {
  auth: {
    getUser: async (token: string) =>
      token === TOKEN_A
        ? { data: { user: { id: USER_A } }, error: null }
        : { data: { user: null }, error: { message: 'invalid JWT' } },
  },
  from: (table: string) => query(table),
  rpc: async () => ({ data: null, error: null }),
  storage: { from: () => ({ download: async () => ({ data: null, error: { message: 'n/a' } }), remove: async () => ({ data: [], error: null }) }) },
};

const paid = { categorize: vi.fn(async () => ({ category: 'Dining', confidence: 0.9, source: 'rule' })), openai: vi.fn() };
vi.mock('../_shared/supabase', () => ({ admin: () => fakeClient }));

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
vi.mock('../_shared/categorize', () => ({ categorizeTransactionWithLearning: (...a: unknown[]) => paid.categorize(...a) }));
vi.mock('../_shared/recurringDetection', () => ({ detectAndUpsertRecurringObligations: async () => ({ upserted: 0 }) }));
vi.mock('../_shared/chimeNotifications', () => ({ queueUpcomingPaymentNotifications: async () => undefined }));
vi.mock('openai', () => {
  class FakeOpenAI { chat = { completions: { create: (...a: unknown[]) => paid.openai(...a) } }; }
  return { default: FakeOpenAI, OpenAI: FakeOpenAI };
});

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
const fakeFetch = vi.fn(async (url: string, init: RequestInit = {}) => {
  const headers: Record<string, string> = {};
  Object.entries((init.headers as Record<string, string>) || {}).forEach(([k, v]) => { headers[k.toLowerCase()] = v; });
  let body: Row | null = null;
  if (typeof init.body === 'string') { try { body = JSON.parse(init.body); } catch { body = null; } }
  const fn = String(url).match(/\/\.netlify\/functions\/([^/?]+)/)?.[1] ?? `external:${url}`;
  fnCalls.push({ url: String(url), fn, headers, body });
  if (fn === 'commit-import') return respond({ ok: true, committed: 2 });
  if (fn === 'normalize-transactions') return respond({ ok: true, completed: true, importId: IMP_A });
  return respond({ ok: true });
});

const lib = await import('../_shared/internalJobAuth');
const commit = await import('../commit-import');
const sync = await import('../smart-import-sync');
const { JOB_TOKEN_HEADER, issueJobToken, verifyOwnership, authenticateUser } = lib;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler / response shapes
async function invoke(h: any, headers: Record<string, string>, body: Row) {
  const res = await h({ httpMethod: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, {});
  let json: Row = {};
  try { json = JSON.parse(res.body || '{}'); } catch { json = {}; }
  return { statusCode: res.statusCode as number, json, body: String(res.body || '') };
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const writes = () => dbCalls.filter((c) => c.op !== 'select');
const txWrites = () => writes().filter((w) => w.table === 'transactions' || w.table === 'imports' || w.table === 'transactions_staging');
async function jobTokenFor(documentId: string, scope: 'normalize.run' | 'ocr.run' = 'normalize.run') {
  const a = await authenticateUser({ headers: bearer(TOKEN_A) });
  if (!a.ok) throw new Error('setup');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake client
  const o = await verifyOwnership(fakeClient as any, a.principal, { documentId });
  if (!o.ok) throw new Error('setup');
  return issueJobToken(o.proof, { scope, src: 'test' });
}
let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeEach(() => {
  seed();
  dbCalls = []; fnCalls = [];
  paid.categorize.mockClear(); paid.openai.mockClear();
  process.env.INTERNAL_JOB_SIGNING_SECRET = SECRET;
  process.env.DEPLOY_URL = DEPLOY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
  delete process.env.CONTEXT;
  vi.stubGlobal('fetch', fakeFetch);
  fakeFetch.mockClear();
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => {
  logSpies.forEach((s) => s.mockRestore());
  vi.unstubAllGlobals();
  for (const k of ['INTERNAL_JOB_SIGNING_SECRET', 'DEPLOY_URL', 'CONTEXT', 'URL']) delete process.env[k];
});

// ── commit-import ────────────────────────────────────────────────────────────
describe('commit-import — authentication', () => {
  const nothingTouched = () => {
    expect(dbCalls).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
    expect(paid.categorize).not.toHaveBeenCalled();
  };

  it('the old x-user-id-only call (as sync and ocr-background used to send) → 401, no database access', async () => {
    const r = await invoke(commit.handler, { 'x-user-id': USER_B }, { importId: IMP_B });
    expect(r.statusCode).toBe(401);
    nothingTouched();
  });

  it('the service-role key as a Bearer token → 401', async () => {
    const r = await invoke(commit.handler, { authorization: `Bearer ${SERVICE_KEY}`, 'x-user-id': USER_B }, { importId: IMP_B, userId: USER_B });
    expect(r.statusCode).toBe(401);
    expect(r.body).not.toContain(SERVICE_KEY);
    nothingTouched();
  });

  it('an invalid JWT → 401', async () => {
    expect((await invoke(commit.handler, bearer('forged'), { importId: IMP_A })).statusCode).toBe(401);
    nothingTouched();
  });

  it.each(['normalize.run', 'ocr.run'] as const)('a valid internal %s job token never authorizes a commit (even alongside a valid JWT)', async (scope) => {
    const t = await jobTokenFor(DOC_A, scope);
    dbCalls = [];
    expect((await invoke(commit.handler, { [JOB_TOKEN_HEADER]: t }, { importId: IMP_A })).statusCode).toBe(401);
    expect((await invoke(commit.handler, { [JOB_TOKEN_HEADER]: t, ...bearer(TOKEN_A) }, { importId: IMP_A })).statusCode).toBe(401);
    nothingTouched();
  });

  it('a spoofed x-user-id or body userId (another user) with a valid JWT → 403, no database access', async () => {
    expect((await invoke(commit.handler, { ...bearer(TOKEN_A), 'x-user-id': USER_B }, { importId: IMP_B })).statusCode).toBe(403);
    expect((await invoke(commit.handler, bearer(TOKEN_A), { importId: IMP_B, userId: USER_B })).statusCode).toBe(403);
    nothingTouched();
  });
});

describe('commit-import — ownership', () => {
  it.each([
    ["another user's import", IMP_B],
    ['an ownerless import', IMP_ORPHAN],
  ])('%s → 404 and no transactions, staging or import changes', async (_l, importId) => {
    const r = await invoke(commit.handler, bearer(TOKEN_A), { importId });
    expect(r.statusCode).toBe(404);
    expect(txWrites()).toHaveLength(0);
    expect(db.transactions).toHaveLength(0);
    expect(db.imports.find((i) => i.id === importId)?.status).toBe('parsed');
    expect(paid.categorize).not.toHaveBeenCalled();
    for (const c of dbCalls.filter((d) => d.table === 'imports')) expect(c.filters).toContainEqual(['user_id', USER_A]);
  });

  it("the owner's approved import commits only the owner's staged rows under the verified user id", async () => {
    const r = await invoke(commit.handler, { ...bearer(TOKEN_A), 'x-user-id': USER_A }, { importId: IMP_A });
    expect(r.statusCode, r.body.slice(0, 800)).toBe(200);
    expect(db.transactions.length).toBeGreaterThan(0);
    expect(db.transactions.every((t) => t.user_id === USER_A)).toBe(true);
    expect(db.transactions.some((t) => String(t.description || t.merchant || '').includes('s-b1'))).toBe(false);
    expect(db.imports.find((i) => i.id === IMP_B)?.status).toBe('parsed');
    for (const c of dbCalls.filter((d) => ['imports', 'transactions_staging', 'user_documents'].includes(d.table))) {
      expect(c.filters, `${c.table} ${c.op}`).toContainEqual(['user_id', USER_A]);
    }
  });
});

describe('commit-import — batch keeps the verified identity', () => {
  it('each self-call goes to this deploy with the caller\'s own JWT and x-user-id', async () => {
    const r = await invoke(commit.handler, bearer(TOKEN_A), { importIds: [IMP_A, IMP_A2] });
    expect(r.statusCode).toBe(200);
    const calls = fnCalls.filter((c) => c.fn === 'commit-import');
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c.url).toBe(`${DEPLOY}/.netlify/functions/commit-import`);
      expect(c.headers.authorization).toBe(`Bearer ${TOKEN_A}`);
      expect(c.headers['x-user-id']).toBe(USER_A);
      expect(c.headers[JOB_TOKEN_HEADER]).toBeUndefined();
    }
  });

  it('an unauthenticated batch is rejected before any self-call', async () => {
    const r = await invoke(commit.handler, { 'x-user-id': USER_B }, { importIds: [IMP_B] });
    expect(r.statusCode).toBe(401);
    expect(fnCalls).toHaveLength(0);
  });

  it('a batch in a deploy preview without DEPLOY_URL → 503, never the published URL', async () => {
    delete process.env.DEPLOY_URL;
    process.env.CONTEXT = 'deploy-preview';
    process.env.URL = 'https://xspensesai-staging.netlify.app';
    const r = await invoke(commit.handler, bearer(TOKEN_A), { importIds: [IMP_A] });
    expect(r.statusCode).toBe(503);
    expect(fnCalls).toHaveLength(0);
  });
});

// ── smart-import-sync ────────────────────────────────────────────────────────
describe('smart-import-sync — authentication and ownership', () => {
  const nothingTouched = () => {
    expect(writes()).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
    expect(paid.categorize).not.toHaveBeenCalled();
  };

  it('the old body-userId call → 401 before any database read', async () => {
    const r = await invoke(sync.handler, {}, { userId: USER_B, docIds: [DOC_B] });
    expect(r.statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
    nothingTouched();
  });

  it('an invalid JWT → 401', async () => {
    expect((await invoke(sync.handler, bearer('forged'), { docIds: [DOC_A] })).statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
  });

  it('a spoofed body userId → 403 before any database read', async () => {
    const r = await invoke(sync.handler, bearer(TOKEN_A), { userId: USER_B, docIds: [DOC_A] });
    expect(r.statusCode).toBe(403);
    expect(dbCalls).toHaveLength(0);
  });

  it.each([
    ["another user's document", [DOC_B]],
    ['a mix of own and foreign documents', [DOC_A, DOC_B]],
    ['an ownerless document', [DOC_ORPHAN]],
  ])('%s → 403; only ownership lookups run; no normalize, commit or writes', async (_l, docIds) => {
    const r = await invoke(sync.handler, bearer(TOKEN_A), { docIds, waitForOcrMs: 0 });
    expect(r.statusCode).toBe(403);
    expect(dbCalls.every((c) => c.table === 'user_documents' && c.op === 'select')).toBe(true);
    for (const c of dbCalls) expect(c.filters).toContainEqual(['user_id', USER_A]);
    nothingTouched();
  });

  it('non-string or excessive docIds → 400', async () => {
    expect((await invoke(sync.handler, bearer(TOKEN_A), { docIds: [{ id: DOC_A }] })).statusCode).toBe(400);
    expect((await invoke(sync.handler, bearer(TOKEN_A), { docIds: Array.from({ length: 51 }, () => DOC_A) })).statusCode).toBe(400);
  });

  it('deploy preview without DEPLOY_URL → 503 after ownership, with no downstream calls', async () => {
    delete process.env.DEPLOY_URL;
    process.env.CONTEXT = 'deploy-preview';
    const r = await invoke(sync.handler, bearer(TOKEN_A), { docIds: [DOC_A] });
    expect(r.statusCode).toBe(503);
    expect(r.json).toMatchObject({ retryable: true, error: 'processing_unavailable' });
    nothingTouched();
  });
});

describe('smart-import-sync — authorized synchronization', () => {
  it("the owner's sync forwards the verified JWT to this deploy's commit-import / Tag and touches only the owner's records", async () => {
    const r = await invoke(sync.handler, { ...bearer(TOKEN_A) }, { docIds: [DOC_A], importRunId: 'run-c1c', waitForOcrMs: 0, pollForOcrMs: 100 });
    expect(r.statusCode).toBe(200);
    const downstream = fnCalls.filter((c) => c.url.includes('/.netlify/functions/'));
    expect(downstream.length, r.body.slice(0, 1200)).toBeGreaterThan(0);
    for (const c of downstream) {
      expect(c.url.startsWith(`${DEPLOY}/.netlify/functions/`), c.url).toBe(true);
      expect(c.headers.authorization, c.fn).toBe(`Bearer ${TOKEN_A}`);
      expect(c.headers.authorization).not.toContain(SERVICE_KEY);
      if (c.headers['x-user-id']) expect(c.headers['x-user-id']).toBe(USER_A);
      expect(JSON.stringify(c.body || {})).not.toContain(USER_B);
    }
    expect(fnCalls.map((c) => c.fn)).toContain('commit-import');
    for (const c of dbCalls.filter((d) => ['user_documents', 'imports', 'transactions_staging', 'transactions'].includes(d.table))) {
      expect(c.filters, `${c.table} ${c.op}`).toContainEqual(['user_id', USER_A]);
    }
    expect(db.imports.find((i) => i.id === IMP_B)?.status).toBe('parsed');
  });
});

// -- BYTE-LIVE-01: hosted runtime without DEPLOY_URL/CONTEXT --
describe('sync / commit in the hosted runtime (BYTE-LIVE-01 build metadata)', () => {
  it('reproduces the staging failure without metadata: sync -> 503 after ownership, nothing downstream', async () => {
    hostedRuntime(null);
    const r = await invoke(sync.handler, bearer(TOKEN_A), { docIds: [DOC_A] });
    expect(r.statusCode).toBe(503);
    expect(fnCalls).toHaveLength(0);
    expect(writes()).toHaveLength(0);
  });

  it('sync reaches the downstream functions of this exact deploy with the owner JWT only', async () => {
    hostedRuntime();
    const r = await invoke(sync.handler, bearer(TOKEN_A), { docIds: [DOC_A], importRunId: 'run-hosted', waitForOcrMs: 0, pollForOcrMs: 100 });
    expect(r.statusCode).toBe(200);
    const downstream = fnCalls.filter((c) => c.url.includes('/.netlify/functions/'));
    expect(downstream.length).toBeGreaterThan(0);
    for (const c of downstream) {
      expect(c.url.startsWith(`${HOSTED_ORIGIN}/.netlify/functions/`), c.url).toBe(true);
      expect(c.headers.authorization).toBe(`Bearer ${TOKEN_A}`);
    }
    expect(fnCalls.map((c) => c.fn)).toContain('commit-import');
    for (const c of dbCalls.filter((d) => ['user_documents', 'imports', 'transactions_staging', 'transactions'].includes(d.table))) {
      expect(c.filters, `${c.table} ${c.op}`).toContainEqual(['user_id', USER_A]);
    }
  });

  it('commit-import batch self-calls go to this exact deploy with the verified identity', async () => {
    hostedRuntime();
    const r = await invoke(commit.handler, bearer(TOKEN_A), { importIds: [IMP_A, IMP_A2] });
    expect(r.statusCode).toBe(200);
    const calls = fnCalls.filter((c) => c.fn === 'commit-import');
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c.url).toBe(`${HOSTED_ORIGIN}/.netlify/functions/commit-import`);
      expect(c.headers['x-user-id']).toBe(USER_A);
      expect(c.headers[JOB_TOKEN_HEADER]).toBeUndefined();
    }
  });

  it('commit still refuses an unauthenticated caller in the hosted runtime', async () => {
    hostedRuntime();
    const r = await invoke(commit.handler, { 'x-user-id': USER_B }, { importIds: [IMP_B] });
    expect(r.statusCode).toBe(401);
    expect(fnCalls).toHaveLength(0);
  });
});

// ── static guards ────────────────────────────────────────────────────────────
describe('static guards for the sync / commit chain', () => {
  const fnDir = path.resolve(__dirname, '..');

  it('sync has no id-only user_id bypass, no main-site URL fallback, and no service-role Bearer', () => {
    const src = fs.readFileSync(path.join(fnDir, 'smart-import-sync.ts'), 'latin1');
    expect(src).not.toMatch(/bypassed user_id filter/);
    expect(src).not.toMatch(/sourceDocFallback|docDataById/);
    expect(src).not.toMatch(/process\.env\.(URL|NETLIFY_URL|DEPLOY_PRIME_URL)\b/);
    expect(src).not.toMatch(/SERVICE_ROLE/);
    expect(src).not.toMatch(/event\.headers\['x-authorization'\]/);
  });

  it('commit-import takes identity from the JWT, uses the same-deploy helper and has no unscoped fallback', () => {
    const src = fs.readFileSync(path.join(fnDir, 'commit-import.ts'), 'utf8');
    expect(src).toMatch(/authenticateUser\(event\)/);
    expect(src).not.toMatch(/const userId = event\.headers\['x-user-id'\]/);
    expect(src).not.toMatch(/process\.env\.(URL|NETLIFY_URL|DEPLOY_PRIME_URL|DEPLOY_URL)\b/);
    expect(src).not.toMatch(/SERVICE_ROLE/);
    expect(src).not.toMatch(/const fallback = await sb/);
  });

  it('original encodings are intact (sync non-UTF-8 bytes, commit-import BOM)', () => {
    const syncBytes = fs.readFileSync(path.join(fnDir, 'smart-import-sync.ts'));
    expect([...syncBytes].filter((b) => b > 127).length).toBe(16);
    expect([...syncBytes].includes(13)).toBe(false);
    const commitBytes = fs.readFileSync(path.join(fnDir, 'commit-import.ts'));
    expect([...commitBytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });
});

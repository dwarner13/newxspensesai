/**
 * P0-C1b — OCR / CSV chain authorization.
 *
 * finalize (user JWT + ownership) → ocr-background / parse-csv (ocr.run / csv.parse job token)
 *   → normalize-transactions (normalize.run job token, or user JWT forwarded by sync).
 * No body userId is ever proof of identity; no background path approves or commits.
 * All Supabase access, storage, paid OCR providers and network calls are in-memory fakes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHmac, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type DbCall = { table: string; op: string; filters: Array<[string, unknown]> };
type FnCall = { url: string; fn: string; headers: Record<string, string>; body: Row | null };

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const TOKEN_A = 'user-a-jwt';
const TOKEN_B = 'user-b-jwt';
const DOC_PDF_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const DOC_PDF_A_DONE = 'aaaaaaaa-0000-4000-8000-000000000002';
const DOC_CSV_A = 'aaaaaaaa-0000-4000-8000-000000000003';
const DOC_REJECTED_A = 'aaaaaaaa-0000-4000-8000-000000000004';
const DOC_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const SECRET = 'test-signing-secret-0123456789abcdef-c1b';
const DEPLOY = 'https://deploy-c1b--xspensesai-staging.netlify.app';
const CSV = 'Date,Description,Amount\n2026-10-01,Coffee Shop,-4.50\n2026-10-02,Payroll,1500.00\n';

let db: Record<string, Row[]> = {};
let dbCalls: DbCall[] = [];
let fnCalls: FnCall[] = [];
let downloads: string[] = [];
let statusMarks: Array<{ docId: string; status: string }> = [];

function seed() {
  db = {
    user_documents: [
      { id: DOC_PDF_A, user_id: USER_A, mime_type: 'application/pdf', original_name: 'a.pdf', storage_path: `${USER_A}/${DOC_PDF_A}/a.pdf`, status: 'uploaded', ocr_status: null, metadata: {} },
      { id: DOC_PDF_A_DONE, user_id: USER_A, mime_type: 'application/pdf', original_name: 'done.pdf', storage_path: `${USER_A}/${DOC_PDF_A_DONE}/done.pdf`, status: 'ready', ocr_status: 'ready', metadata: {} },
      { id: DOC_CSV_A, user_id: USER_A, mime_type: 'text/csv', original_name: 'stmt.csv', storage_path: `${USER_A}/${DOC_CSV_A}/stmt.csv`, status: 'uploaded', metadata: {} },
      { id: DOC_REJECTED_A, user_id: USER_A, mime_type: 'application/pdf', original_name: 'bad.pdf', storage_path: `${USER_A}/${DOC_REJECTED_A}/bad.pdf`, status: 'rejected', ocr_status: 'failed', metadata: { ocr: { error_code: 'malformed_pdf' } } },
      { id: DOC_B, user_id: USER_B, mime_type: 'application/pdf', original_name: 'victim.pdf', storage_path: `${USER_B}/${DOC_B}/victim.pdf`, status: 'uploaded', metadata: {} },
    ],
    imports: [],
    transactions_staging: [],
    ocr_jobs: [],
  };
}

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | null = null;
  let limit = Infinity;
  const matches = () =>
    (db[table] || []).filter((r) =>
      filters.every(([k, v]) => (k.startsWith('in:') ? (v as unknown[]).includes(r[k.slice(3)]) : r[k] === v))
    );
  const run = () => {
    dbCalls.push({ table, op, filters: [...filters] });
    const rows = matches();
    if (op === 'update') { rows.forEach((r) => Object.assign(r, payload)); return { data: rows, error: null }; }
    if (op === 'insert' || op === 'upsert') { (db[table] ||= []).push({ ...payload }); return { data: [payload], error: null }; }
    return { data: rows.slice(0, limit), error: null, count: rows.length };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
  const q: any = {
    select: () => q,
    update: (p: Row) => { op = 'update'; payload = p; return q; },
    insert: (p: Row) => { op = 'insert'; payload = p; return q; },
    upsert: (p: Row) => { op = 'upsert'; payload = p; return q; },
    delete: () => { op = 'delete'; return q; },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    neq: () => q,
    in: (k: string, v: unknown[]) => { filters.push([`in:${k}`, v]); return q; },
    is: () => q,
    gte: () => q,
    order: () => q,
    limit: (n: number) => { limit = n; return q; },
    single: async () => { const r = run(); const row = (r.data as Row[])[0]; return row ? { data: row, error: null } : { data: null, error: { message: 'not found' } }; },
    maybeSingle: async () => { const r = run(); return { data: (r.data as Row[])[0] ?? null, error: null }; },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return q;
}

const fakeClient = {
  auth: {
    getUser: async (token: string) =>
      token === TOKEN_A ? { data: { user: { id: USER_A } }, error: null }
        : token === TOKEN_B ? { data: { user: { id: USER_B } }, error: null }
          : { data: { user: null }, error: { message: 'invalid JWT' } },
  },
  from: (table: string) => query(table),
  storage: {
    from: () => ({
      list: async (_dir: string, opts: { search?: string }) => ({ data: [{ name: opts?.search, metadata: { size: 100 } }], error: null }),
      download: async (key: string) => {
        downloads.push(key);
        return { data: { text: async () => (key.endsWith('.csv') ? CSV : 'x') }, error: null };
      },
      remove: async () => ({ data: [], error: null }),
    }),
  },
};

// Paid providers / heavy modules: counting spies that must never run on a denied request.
const paid = { vision: vi.fn(), pdf: vi.fn(), ocrPage: vi.fn(), openai: vi.fn() };
vi.mock('openai', () => {
  class FakeOpenAI {
    chat = { completions: { create: (...a: unknown[]) => paid.openai(...a) } };
    responses = { create: (...a: unknown[]) => paid.openai(...a) };
  }
  return { default: FakeOpenAI, OpenAI: FakeOpenAI };
});
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
vi.mock('../_shared/upload', () => ({
  admin: () => fakeClient,
  markDocStatus: vi.fn(async (docId: string, status: string) => { statusMarks.push({ docId, status }); }),
}));
vi.mock('../_shared/guardrails-unified', () => ({
  runGuardrailsForText: async (text: string) => ({ ok: true, text, signals: { pii: false } }),
}));
vi.mock('../_shared/vision/googleVisionClient', () => ({
  callGoogleVisionOnImage: (...a: unknown[]) => paid.vision(...a),
  callGoogleVisionOnPdf: (...a: unknown[]) => paid.vision(...a),
}));
vi.mock('../_lib/pdfText', () => ({
  extractPdfTextWithPdfParse: (...a: unknown[]) => paid.pdf(...a),
  extractPdfTextWithLayout: (...a: unknown[]) => paid.pdf(...a),
}));
vi.mock('../lib/pdf/pdfToImages', () => ({ pdfToImages: (...a: unknown[]) => paid.pdf(...a) }));
vi.mock('../lib/ocr/ocrPageImage', () => ({
  ocrPageImage: (...a: unknown[]) => paid.ocrPage(...a),
  retryOcrPageFallback: (...a: unknown[]) => paid.ocrPage(...a),
}));
vi.mock('../../../src/lib/ai/userActivity', () => ({ logUserEvent: async () => undefined, recalcFluency: async () => undefined }));

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
  return respond({ ok: true });
});

const lib = await import('../_shared/internalJobAuth');
const { dispatchNormalize } = await import('../_shared/normalizeHandoff');
const finalize = await import('../smart-import-finalize');
const ocrBg = await import('../smart-import-ocr-background');
const parseCsv = await import('../smart-import-parse-csv');
const normalize = await import('../normalize-transactions');
const { JOB_TOKEN_HEADER, verifyJobToken, verifyOwnership, issueJobToken, authenticateUser, authenticateJobRequest } = lib;

// ── helpers ──────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler / response shapes
async function invoke(h: any, headers: Record<string, string>, body: Row) {
  const res = await h({ httpMethod: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, {});
  let json: Row = {};
  try { json = JSON.parse(res.body || '{}'); } catch { json = {}; }
  return { statusCode: res.statusCode as number, json, body: String(res.body || '') };
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
async function proofFor(token: string, documentId: string) {
  const a = await authenticateUser({ headers: bearer(token) });
  if (!a.ok) throw new Error('setup auth');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake client satisfies the ownership shape
  const o = await verifyOwnership(fakeClient as any, a.principal, { documentId });
  if (!o.ok) throw new Error('setup ownership');
  return o.proof;
}
async function jobToken(scope: 'ocr.run' | 'csv.parse' | 'normalize.run', documentId: string, opts: { retry?: boolean; now?: number } = {}) {
  return issueJobToken(await proofFor(TOKEN_A, documentId), { scope, src: 'test', retry: opts.retry, now: opts.now });
}
const b64u = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function craftToken(claims: Row) {
  const part = b64u(Buffer.from(JSON.stringify(claims)));
  return `v1.${part}.${b64u(createHmac('sha256', SECRET).update(`v1.${part}`).digest())}`;
}
const writes = () => dbCalls.filter((c) => c.op !== 'select');
const paidCalls = () =>
  paid.vision.mock.calls.length + paid.pdf.mock.calls.length + paid.ocrPage.mock.calls.length + paid.openai.mock.calls.length;
const externalPaid = () => fnCalls.filter((c) => /anthropic|googleapis|openai/.test(c.url));
let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];
const logged = () => logSpies.flatMap((s) => s.mock.calls).map((a) => a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')).join('\n');

beforeEach(() => {
  seed();
  dbCalls = []; fnCalls = []; downloads = []; statusMarks = [];
  paid.vision.mockClear(); paid.pdf.mockClear(); paid.ocrPage.mockClear(); paid.openai.mockClear();
  process.env.INTERNAL_JOB_SIGNING_SECRET = SECRET;
  process.env.DEPLOY_URL = DEPLOY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-not-a-secret';
  delete process.env.CONTEXT;
  delete process.env.NETLIFY_DEV;
  vi.stubGlobal('fetch', fakeFetch);
  fakeFetch.mockClear();
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => {
  logSpies.forEach((s) => s.mockRestore());
  vi.unstubAllGlobals();
  for (const k of ['INTERNAL_JOB_SIGNING_SECRET', 'DEPLOY_URL', 'CONTEXT', 'URL']) delete process.env[k];
});

// ── smart-import-finalize ────────────────────────────────────────────────────
describe('smart-import-finalize (user JWT + ownership → signed job)', () => {
  it('no JWT → 401: no DB, storage, status change or job dispatch', async () => {
    const r = await invoke(finalize.handler, {}, { userId: USER_A, docId: DOC_PDF_A });
    expect(r.statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
    expect(downloads).toHaveLength(0);
    expect(statusMarks).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
  });

  it('body userId naming another user → 403, nothing done', async () => {
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { userId: USER_B, docId: DOC_PDF_A });
    expect(r.statusCode).toBe(403);
    expect(statusMarks).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
  });

  it("another user's document → 403 before storage access, status change or OCR", async () => {
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: DOC_B });
    expect(r.statusCode).toBe(403);
    expect(downloads).toHaveLength(0);
    expect(statusMarks).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
  });

  it('owner PDF → OCR job at this deploy with an ocr.run token; no user JWT or userId forwarded', async () => {
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { userId: USER_A, docId: DOC_PDF_A });
    expect(r.statusCode).toBe(200);
    expect(r.json).toMatchObject({ started: true, queued: true, via: 'ocr' });
    expect(statusMarks).toContainEqual({ docId: DOC_PDF_A, status: 'ocr_processing' });
    const call = fnCalls.find((c) => c.fn === 'smart-import-ocr-background')!;
    expect(call.url).toBe(`${DEPLOY}/.netlify/functions/smart-import-ocr-background`);
    expect(call.headers.authorization).toBeUndefined();
    expect(call.body).not.toHaveProperty('userId');
    expect(call.body).not.toHaveProperty('isRetry');
    expect(verifyJobToken(call.headers[JOB_TOKEN_HEADER], { audience: 'smart-import-ocr-background', scope: 'ocr.run' }))
      .toMatchObject({ ok: true, claims: { sub: USER_A, doc: DOC_PDF_A, retry: false, src: 'smart-import-finalize' } });
  });

  it('explicit user retry → retry is signed into the token', async () => {
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: DOC_PDF_A_DONE, retry: true });
    expect(r.statusCode).toBe(200);
    const call = fnCalls.find((c) => c.fn === 'smart-import-ocr-background')!;
    expect(verifyJobToken(call.headers[JOB_TOKEN_HEADER], { audience: 'smart-import-ocr-background', scope: 'ocr.run' }))
      .toMatchObject({ ok: true, claims: { retry: true } });
  });

  it('owner CSV → parse-csv job with a csv.parse token; body carries text but no userId', async () => {
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: DOC_CSV_A });
    expect(r.statusCode).toBe(200);
    const call = fnCalls.find((c) => c.fn === 'smart-import-parse-csv')!;
    expect(call.url).toBe(`${DEPLOY}/.netlify/functions/smart-import-parse-csv`);
    expect(call.body).toMatchObject({ docId: DOC_CSV_A, csvText: CSV });
    expect(call.body).not.toHaveProperty('userId');
    expect(verifyJobToken(call.headers[JOB_TOKEN_HEADER], { audience: 'smart-import-parse-csv', scope: 'csv.parse' }))
      .toMatchObject({ ok: true, claims: { sub: USER_A, doc: DOC_CSV_A } });
  });

  it('signing not configured → 503 retryable and the document is left untouched', async () => {
    delete process.env.INTERNAL_JOB_SIGNING_SECRET;
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: DOC_PDF_A });
    expect(r.statusCode).toBe(503);
    expect(r.json).toMatchObject({ ok: false, retryable: true, error: 'processing_unavailable' });
    expect(statusMarks).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
  });

  it('deploy preview without DEPLOY_URL → 503; never falls back to the published site URL', async () => {
    delete process.env.DEPLOY_URL;
    process.env.CONTEXT = 'deploy-preview';
    process.env.URL = 'https://xspensesai-staging.netlify.app';
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: DOC_PDF_A });
    expect(r.statusCode).toBe(503);
    expect(statusMarks).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
  });
});

// ── smart-import-ocr-background ──────────────────────────────────────────────
describe('smart-import-ocr-background (ocr.run job token required)', () => {
  const base = { importRunId: 'run-1', traceId: 't-1' };
  const nothingHappened = () => {
    expect(paidCalls()).toBe(0);
    expect(externalPaid()).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
    expect(writes()).toHaveLength(0);
    expect(statusMarks).toHaveLength(0);
  };

  it('no job token (the old body-userId call) → 401 and no work, paid calls or writes', async () => {
    const r = await invoke(ocrBg.handler, {}, { ...base, userId: USER_B, docId: DOC_B, isRetry: true });
    expect(r.statusCode).toBe(401);
    nothingHappened();
  });

  it('a user JWT instead of a job token → 401', async () => {
    const r = await invoke(ocrBg.handler, bearer(TOKEN_A), { ...base, docId: DOC_PDF_A });
    expect(r.statusCode).toBe(401);
    nothingHappened();
  });

  it('a token for another scope (csv.parse) → 401', async () => {
    const t = await jobToken('csv.parse', DOC_CSV_A);
    const r = await invoke(ocrBg.handler, { [JOB_TOKEN_HEADER]: t }, { ...base, docId: DOC_CSV_A });
    expect(r.statusCode).toBe(401);
    nothingHappened();
  });

  it('an expired token → 401', async () => {
    const t = await jobToken('ocr.run', DOC_PDF_A, { now: Math.floor(Date.now() / 1000) - 3600 });
    const r = await invoke(ocrBg.handler, { [JOB_TOKEN_HEADER]: t }, { ...base, docId: DOC_PDF_A });
    expect(r.statusCode).toBe(401);
    nothingHappened();
  });

  it("a valid token whose body names a different document or another user's id → 403", async () => {
    const t = await jobToken('ocr.run', DOC_PDF_A);
    expect((await invoke(ocrBg.handler, { [JOB_TOKEN_HEADER]: t }, { ...base, docId: DOC_B })).statusCode).toBe(403);
    expect((await invoke(ocrBg.handler, { [JOB_TOKEN_HEADER]: t }, { ...base, userId: USER_B })).statusCode).toBe(403);
    expect(paidCalls()).toBe(0);
    expect(fnCalls).toHaveLength(0);
    expect(statusMarks).toHaveLength(0);
  });

  it("a correctly signed token for user A naming user B's document → 403 (database ownership)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const t = craftToken({ v: 1, sub: USER_A, doc: DOC_B, aud: 'smart-import-ocr-background', scope: 'ocr.run', retry: true, iat: now, exp: now + 600, jti: randomUUID(), src: 'attacker' });
    const r = await invoke(ocrBg.handler, { [JOB_TOKEN_HEADER]: t }, { ...base });
    expect(r.statusCode).toBe(403);
    nothingHappened();
  });

  it('unauthorized retry: body isRetry/explicitRecovery cannot force paid reprocessing of a rejected document', async () => {
    const t = await jobToken('ocr.run', DOC_REJECTED_A, { retry: false });
    const r = await invoke(ocrBg.handler, { [JOB_TOKEN_HEADER]: t }, {
      ...base, docId: DOC_REJECTED_A, isRetry: true, retry: true, explicitRecovery: true, importRunId: 'stale-retry-x',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json).toMatchObject({ skipped: true, reason: 'terminal_already_finalized:malformed_pdf' });
    expect(paidCalls()).toBe(0);
    expect(externalPaid()).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
  });

  it('denials never log the token', async () => {
    const t = await jobToken('ocr.run', DOC_PDF_A);
    await invoke(ocrBg.handler, { [JOB_TOKEN_HEADER]: t }, { ...base, docId: DOC_B });
    expect(logged()).not.toContain(t);
    expect(logged()).not.toContain(t.split('.')[1]);
  });
});

// ── normalize handoff helper ─────────────────────────────────────────────────
describe('dispatchNormalize (OCR/CSV → normalize)', () => {
  async function ocrPrincipal(documentId: string) {
    const t = await jobToken('ocr.run', documentId);
    const a = authenticateJobRequest({ headers: { [JOB_TOKEN_HEADER]: t } }, { audience: 'smart-import-ocr-background', scope: 'ocr.run' });
    if (!a.ok) throw new Error('setup');
    return a.principal;
  }

  it('posts to this deploy with a normalize.run token for the same user + document; no userId in body', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake client
    const r = await dispatchNormalize(fakeClient as any, await ocrPrincipal(DOC_PDF_A), DOC_PDF_A, { ocrText: 'TEXT', ocrTextLength: 4 }, { src: 'smart-import-ocr-background', traceId: 't' });
    expect(r.ok).toBe(true);
    if (r.ok) await r.dispatched;
    const call = fnCalls.find((c) => c.fn === 'normalize-transactions')!;
    expect(call.url).toBe(`${DEPLOY}/.netlify/functions/normalize-transactions`);
    expect(call.body).toEqual({ documentId: DOC_PDF_A, ocrText: 'TEXT', ocrTextLength: 4 });
    expect(call.headers.authorization).toBeUndefined();
    expect(verifyJobToken(call.headers[JOB_TOKEN_HEADER], { audience: 'normalize-transactions', scope: 'normalize.run' }))
      .toMatchObject({ ok: true, claims: { sub: USER_A, doc: DOC_PDF_A, src: 'smart-import-ocr-background' } });
  });

  it('a principal bound to one document cannot hand off another (even the same user\'s)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake client
    const r = await dispatchNormalize(fakeClient as any, await ocrPrincipal(DOC_PDF_A), DOC_CSV_A, {}, { src: 'x' });
    expect(r).toMatchObject({ ok: false, code: 'binding' });
    expect(fnCalls).toHaveLength(0);
  });

  it('signing or same-deploy URL unavailable → not_configured, nothing sent', async () => {
    const p = await ocrPrincipal(DOC_PDF_A);
    delete process.env.DEPLOY_URL;
    process.env.CONTEXT = 'deploy-preview';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake client
    expect(await dispatchNormalize(fakeClient as any, p, DOC_PDF_A, {}, { src: 'x' })).toMatchObject({ ok: false, code: 'not_configured' });
    expect(fnCalls).toHaveLength(0);
  });
});

// -- BYTE-LIVE-01: hosted runtime without DEPLOY_URL/CONTEXT --
describe('OCR chain in the hosted runtime (BYTE-LIVE-01 build metadata)', () => {
  async function ocrPrincipalHosted(documentId: string) {
    const t = await jobToken('ocr.run', documentId);
    const a = authenticateJobRequest({ headers: { [JOB_TOKEN_HEADER]: t } }, { audience: 'smart-import-ocr-background', scope: 'ocr.run' });
    if (!a.ok) throw new Error('setup');
    return a.principal;
  }

  it('reproduces the staging failure without metadata: finalize -> 503, document untouched', async () => {
    hostedRuntime(null);
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: DOC_PDF_A });
    expect(r.statusCode).toBe(503);
    expect(r.json).toMatchObject({ error: 'processing_unavailable' });
    expect(statusMarks).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
  });

  it('finalize -> OCR job (PDF) and CSV parse job at this exact deploy with scoped tokens', async () => {
    hostedRuntime();
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { userId: USER_A, docId: DOC_PDF_A });
    expect(r.statusCode).toBe(200);
    const ocr = fnCalls.find((c) => c.fn === 'smart-import-ocr-background')!;
    expect(ocr.url).toBe(`${HOSTED_ORIGIN}/.netlify/functions/smart-import-ocr-background`);
    expect(ocr.headers.authorization).toBeUndefined();
    expect(verifyJobToken(ocr.headers[JOB_TOKEN_HEADER], { audience: 'smart-import-ocr-background', scope: 'ocr.run' }))
      .toMatchObject({ ok: true, claims: { sub: USER_A, doc: DOC_PDF_A } });
    const r2 = await invoke(finalize.handler, bearer(TOKEN_A), { docId: DOC_CSV_A });
    expect(r2.statusCode).toBe(200);
    expect(fnCalls.find((c) => c.fn === 'smart-import-parse-csv')!.url).toBe(`${HOSTED_ORIGIN}/.netlify/functions/smart-import-parse-csv`);
    expect(fnCalls.some((c) => c.url.startsWith('https://synthetic-staging.netlify.app'))).toBe(false);
  });

  it('OCR -> normalize handoff reaches this exact deploy with a normalize.run token', async () => {
    hostedRuntime();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake client
    const r = await dispatchNormalize(fakeClient as any, await ocrPrincipalHosted(DOC_PDF_A), DOC_PDF_A, { ocrText: 'TEXT', ocrTextLength: 4 }, { src: 'smart-import-ocr-background', traceId: 't' });
    expect(r.ok).toBe(true);
    if (r.ok) await r.dispatched;
    const call = fnCalls.find((c) => c.fn === 'normalize-transactions')!;
    expect(call.url).toBe(`${HOSTED_ORIGIN}/.netlify/functions/normalize-transactions`);
    expect(verifyJobToken(call.headers[JOB_TOKEN_HEADER], { audience: 'normalize-transactions', scope: 'normalize.run' }))
      .toMatchObject({ ok: true, claims: { sub: USER_A, doc: DOC_PDF_A } });
  });

  it('metadata from another site is rejected -> handoff not_configured, nothing sent', async () => {
    const p = await ocrPrincipalHosted(DOC_PDF_A);
    hostedRuntime({ ...HOSTED_META, siteName: 'other-site', deployUrl: 'https://f00dfacef00dfacef00dface--other-site.netlify.app' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake client
    expect(await dispatchNormalize(fakeClient as any, p, DOC_PDF_A, {}, { src: 'x' })).toMatchObject({ ok: false, code: 'not_configured' });
    expect(fnCalls).toHaveLength(0);
  });

  it('normalize-transactions itself still requires a valid job token or user JWT', async () => {
    hostedRuntime();
    const r = await invoke(normalize.handler, { [JOB_TOKEN_HEADER]: 'probe-not-a-token' }, { documentId: DOC_PDF_A });
    expect(r.json?.error?.code ?? r.json?.error).toBe('unauthorized');
    expect(fnCalls).toHaveLength(0);
  });
});

// ── smart-import-parse-csv ───────────────────────────────────────────────────
describe('smart-import-parse-csv (csv.parse job token required)', () => {
  it('no token (old body-userId call with a victim storage key) → 401, no download, status or normalize', async () => {
    const r = await invoke(parseCsv.handler, {}, { userId: USER_B, docId: DOC_B, key: `${USER_B}/${DOC_B}/victim.pdf` });
    expect(r.statusCode).toBe(401);
    expect(downloads).toHaveLength(0);
    expect(statusMarks).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
  });

  it("a caller-supplied storage key is ignored; only the owned document's own file is read", async () => {
    const t = await jobToken('csv.parse', DOC_CSV_A);
    await invoke(parseCsv.handler, { [JOB_TOKEN_HEADER]: t }, { docId: DOC_CSV_A, key: `${USER_B}/${DOC_B}/victim.pdf` });
    expect(downloads).toEqual([`${USER_A}/${DOC_CSV_A}/stmt.csv`]);
  });

  it('valid CSV handoff → normalize with a normalize.run token; document marked ready; nothing committed', async () => {
    const t = await jobToken('csv.parse', DOC_CSV_A);
    const r = await invoke(parseCsv.handler, { [JOB_TOKEN_HEADER]: t }, { docId: DOC_CSV_A, csvText: CSV });
    expect(r.statusCode).toBe(200);
    expect(r.json).toMatchObject({ ok: true, parsed: 2 });
    const call = fnCalls.find((c) => c.fn === 'normalize-transactions')!;
    expect(call.body).toMatchObject({ documentId: DOC_CSV_A });
    expect(call.body).not.toHaveProperty('userId');
    expect(verifyJobToken(call.headers[JOB_TOKEN_HEADER], { audience: 'normalize-transactions', scope: 'normalize.run' }))
      .toMatchObject({ ok: true, claims: { sub: USER_A, doc: DOC_CSV_A } });
    expect(statusMarks).toContainEqual({ docId: DOC_CSV_A, status: 'ready' });
    expect(fnCalls.map((c) => c.fn)).not.toContain('commit-import');
    expect(writes().some((w) => w.table === 'imports' || w.table === 'transactions')).toBe(false);
  });

  it('body userId naming another user, or a different document → 403', async () => {
    const t = await jobToken('csv.parse', DOC_CSV_A);
    expect((await invoke(parseCsv.handler, { [JOB_TOKEN_HEADER]: t }, { userId: USER_B, csvText: CSV })).statusCode).toBe(403);
    expect((await invoke(parseCsv.handler, { [JOB_TOKEN_HEADER]: t }, { docId: DOC_B, csvText: CSV })).statusCode).toBe(403);
    expect(fnCalls).toHaveLength(0);
  });
});

// ── normalize-transactions ───────────────────────────────────────────────────
describe('normalize-transactions (normalize.run token, or user JWT from sync)', () => {
  // This endpoint pins HTTP 200 and reports the real status in http_status.
  const denied = (r: { json: Row }, status: number) => {
    expect(r.json.ok).toBe(false);
    expect(r.json.http_status).toBe(status);
  };

  it('the old body-userId call → 401 and no writes at all (no error stamping on the victim doc)', async () => {
    const r = await invoke(normalize.handler, {}, { userId: USER_B, documentId: DOC_B, ocrText: 'injected' });
    denied(r, 401);
    expect(writes()).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
  });

  it("user JWT for A naming B's document → 403, no writes", async () => {
    const r = await invoke(normalize.handler, bearer(TOKEN_A), { documentId: DOC_B, ocrText: 'x' });
    denied(r, 403);
    expect(writes()).toHaveLength(0);
  });

  it('job token for one document with a different body document → 403; mismatched body userId → 403', async () => {
    const t = await jobToken('normalize.run', DOC_PDF_A);
    denied(await invoke(normalize.handler, { [JOB_TOKEN_HEADER]: t }, { documentId: DOC_B }), 403);
    denied(await invoke(normalize.handler, { [JOB_TOKEN_HEADER]: t }, { documentId: DOC_PDF_A, userId: USER_B }), 403);
    expect(writes()).toHaveLength(0);
  });

  it('an ocr.run token is not accepted by normalize (wrong audience)', async () => {
    const t = await jobToken('ocr.run', DOC_PDF_A);
    denied(await invoke(normalize.handler, { [JOB_TOKEN_HEADER]: t }, { documentId: DOC_PDF_A }), 401);
  });

  it.each([
    ['a normalize.run job token', async () => ({ [JOB_TOKEN_HEADER]: await jobToken('normalize.run', DOC_PDF_A) })],
    ['the owner JWT forwarded by sync', async () => bearer(TOKEN_A)],
  ])('%s for an owned document gets past authorization; any writes are scoped to that owner', async (_l, hdrs) => {
    const r = await invoke(normalize.handler, await hdrs(), { documentId: DOC_PDF_A, ocrText: '' });
    expect([401, 403]).not.toContain(r.json.http_status);
    for (const w of writes().filter((x) => x.table === 'user_documents')) {
      expect(w.filters).toContainEqual(['id', DOC_PDF_A]);
    }
    expect(fnCalls.map((c) => c.fn)).not.toContain('commit-import');
  });
});

// ── static guards ────────────────────────────────────────────────────────────
describe('static guards for the C1b chain', () => {
  const fnDir = path.resolve(__dirname, '..');
  const read = (f: string, enc: BufferEncoding = 'utf8') => fs.readFileSync(path.join(fnDir, f), enc);

  it('ocr-background no longer approves/commits, sends the service-role key, falls back to doc.user_id, or logs OCR text', () => {
    const src = read('smart-import-ocr-background.ts');
    expect(src).not.toMatch(/commit-import/);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).not.toMatch(/approved_at/);
    expect(src).not.toMatch(/using doc\.user_id/);
    expect(src).not.toMatch(/_text_preview|raw_rescue_preview/);
    expect(src).not.toMatch(/preview:\s*[^,]*\.slice\(/);
    expect(src).not.toMatch(/process\.env\.NETLIFY_URL/);
  });

  it('no function in the C1b chain sends the service-role key as a Bearer token or uses NETLIFY_URL', () => {
    for (const f of ['smart-import-finalize.ts', 'smart-import-parse-csv.ts', 'smart-import-ocr-background.ts', 'normalize-transactions.ts', 'prime-router.ts', '_shared/normalizeHandoff.ts']) {
      const src = read(f);
      expect(src, f).not.toMatch(/Bearer \$\{[^}]*SERVICE_ROLE/);
      expect(src, f).not.toMatch(/process\.env\.NETLIFY_URL/);
    }
  });

  it('smart-import-sync forwards the user JWT to normalize and no longer sends a body userId there', () => {
    const src = read('smart-import-sync.ts', 'latin1');
    const block = src.slice(src.indexOf('async function ensureNormalized'), src.indexOf('async function buildDebugResponse'));
    expect(block).toMatch(/authorization: payload\.authorization/);
    const bodyPart = block.slice(block.indexOf("normalize-transactions"), block.indexOf('}),', block.indexOf('JSON.stringify')));
    expect(bodyPart).not.toMatch(/\n\s+userId,\n/);
    expect(src).toMatch(/authorization: inboundAuthorization/);
    // normalize / commit-import calls go to this same deploy via the fail-closed helper.
    expect(src).toMatch(/netlifyUrl = getInternalBaseUrl\(\);/);
    expect(src).not.toMatch(/const netlifyUrl = process\.env\.NETLIFY_URL/);
  });

  it('the legacy pipeline sends the user JWT to finalize', () => {
    const src = fs.readFileSync(path.resolve(fnDir, '../../src/lib/smartImport/runSmartImportPipeline.ts'), 'utf8');
    expect(src).toMatch(/smart-import-finalize', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json', \.\.\.getAuthHeaders\(input\) \}/);
  });
});

/**
 * P0-C2b — byte-ocr-parse, document-insights, approve-import, commit-import error hardening.
 *
 * Identity only from the verified Supabase JWT; ownership before any read or paid AI call;
 * no cross-user disclosure through AI answers; no database/verifier error text in responses.
 * All Supabase access and AI providers are in-memory fakes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type DbCall = { table: string; op: string; filters: Array<[string, unknown]> };

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const TOKEN_A = 'user-a-jwt';
const DOC_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const DOC_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const DOC_ORPHAN = 'cccccccc-0000-4000-8000-000000000001';
const IMP_A = 'dddddddd-0000-4000-8000-000000000001';
const IMP_B = 'eeeeeeee-0000-4000-8000-000000000001';
const IMP_ORPHAN = 'ffffffff-0000-4000-8000-000000000001';
const VICTIM_TEXT = 'VICTIM-STATEMENT-TEXT-DO-NOT-LEAK';
const DB_SECRET = 'relation leaked-internal-detail';

let db: Record<string, Row[]> = {};
let dbCalls: DbCall[] = [];
let failTable: string | null = null;

function seed() {
  db = {
    imports: [
      { id: IMP_A, user_id: USER_A, document_id: DOC_A, status: 'parsed', approved_at: null, ocr_text: 'OWNER TEXT 2026-10-01 Coffee 4.50' },
      { id: IMP_B, user_id: USER_B, document_id: DOC_B, status: 'parsed', approved_at: null, ocr_text: VICTIM_TEXT },
      { id: IMP_ORPHAN, user_id: null, document_id: DOC_ORPHAN, status: 'parsed', approved_at: null, ocr_text: VICTIM_TEXT },
    ],
    user_documents: [
      { id: DOC_A, user_id: USER_A, original_name: 'owner.pdf', doc_type: 'statement', ocr_text: 'OWNER TEXT 2026-10-01 Coffee 4.50', created_at: '2026-10-01' },
      { id: DOC_B, user_id: USER_B, original_name: 'victim.pdf', doc_type: 'statement', ocr_text: VICTIM_TEXT, created_at: '2026-10-01' },
      { id: DOC_ORPHAN, user_id: null, original_name: 'o.pdf', ocr_text: VICTIM_TEXT, created_at: '2026-10-01' },
    ],
    transactions_staging: [],
    transactions: [],
  };
}

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | null = null;
  const matches = () =>
    (db[table] || []).filter((r) => filters.every(([k, v]) => (k.startsWith('in:') ? (v as unknown[]).includes(r[k.slice(3)]) : r[k] === v)));
  const run = () => {
    dbCalls.push({ table, op, filters: [...filters] });
    if (failTable === table) return { data: null, error: { message: DB_SECRET, code: 'XX000' } };
    if (op === 'update') { const rows = matches(); rows.forEach((r) => Object.assign(r, payload)); return { data: rows, error: null }; }
    return { data: matches(), error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
  const q: any = {
    select: () => q,
    update: (p: Row) => { op = 'update'; payload = p; return q; },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    in: (k: string, v: unknown[]) => { filters.push([`in:${k}`, v]); return q; },
    order: () => q, limit: () => q, gte: () => q, lte: () => q, neq: () => q, is: () => q,
    single: async () => { const r = run(); if (r.error) return r; const row = (r.data as Row[])[0]; return row ? { data: row, error: null } : { data: null, error: { message: 'no rows' } }; },
    maybeSingle: async () => { const r = run(); if (r.error) return r; return { data: (r.data as Row[])[0] ?? null, error: null }; },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return q;
}

const fakeClient = {
  auth: {
    getUser: async (token: string) =>
      token === TOKEN_A ? { data: { user: { id: USER_A } }, error: null } : { data: { user: null }, error: { message: 'invalid JWT: signature verification failed (verifier-detail)' } },
  },
  from: (table: string) => query(table),
};

const paid = {
  normalize: vi.fn(async () => [{ date: '2026-10-01', merchant: 'Coffee', amount: -4.5 }]),
  openai: vi.fn(async () => ({ choices: [{ message: { content: 'Here is your summary.' } }] })),
};
vi.mock('../_shared/supabase', () => ({ admin: () => fakeClient }));
vi.mock('../_shared/ocr_normalize', () => ({ normalizeOcrResult: (...a: unknown[]) => paid.normalize(...a) }));
vi.mock('../_shared/contextInjection', () => ({
  buildContextInjection: async () => ({ systemContext: '' }),
  injectContextIntoMessages: (m: unknown) => m,
}));
vi.mock('../_shared/categorize', () => ({ categorizeTransactionWithLearning: async () => ({ category: 'Other', confidence: 0.5 }) }));
vi.mock('../_shared/recurringDetection', () => ({ detectAndUpsertRecurringObligations: async () => ({}) }));
vi.mock('../_shared/chimeNotifications', () => ({ queueUpcomingPaymentNotifications: async () => undefined }));
vi.mock('openai', () => {
  class FakeOpenAI { chat = { completions: { create: (...a: unknown[]) => paid.openai(...a) } }; }
  return { default: FakeOpenAI, OpenAI: FakeOpenAI };
});

process.env.OPENAI_API_KEY = 'test-openai-key-not-a-secret';
const byteParse = await import('../byte-ocr-parse');
const insights = await import('../document-insights');
const approve = await import('../approve-import');
const commit = await import('../commit-import');
const { JOB_TOKEN_HEADER } = await import('../_shared/internalJobAuth');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler / response shapes
async function invoke(h: any, headers: Record<string, string>, body: Row) {
  const res = await h({ httpMethod: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, {});
  let json: Row = {};
  try { json = JSON.parse(res.body || '{}'); } catch { json = {}; }
  return { statusCode: res.statusCode as number, json, body: String(res.body || '') };
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const writes = () => dbCalls.filter((c) => c.op !== 'select');
const noPaidCalls = () => { expect(paid.normalize).not.toHaveBeenCalled(); expect(paid.openai).not.toHaveBeenCalled(); };
let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeEach(() => {
  seed();
  dbCalls = []; failTable = null;
  paid.normalize.mockClear(); paid.openai.mockClear();
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => logSpies.forEach((s) => s.mockRestore()));

// ── byte-ocr-parse ───────────────────────────────────────────────────────────
describe('byte-ocr-parse', () => {
  it('the old unauthenticated importId call → 401 with no database read and no paid parsing', async () => {
    const r = await invoke(byteParse.handler, {}, { importId: IMP_B });
    expect(r.statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
    noPaidCalls();
  });

  it('an invalid JWT → 401 without echoing verifier detail; direct text is not parsed either', async () => {
    const r = await invoke(byteParse.handler, bearer('forged'), { text: 'anything' });
    expect(r.statusCode).toBe(401);
    expect(r.body).not.toContain('verifier-detail');
    noPaidCalls();
  });

  it('a spoofed body userId → 403, no paid parsing', async () => {
    expect((await invoke(byteParse.handler, bearer(TOKEN_A), { userId: USER_B, text: 'x' })).statusCode).toBe(403);
    noPaidCalls();
  });

  it.each([
    ["another user's import", IMP_B],
    ['an ownerless import', IMP_ORPHAN],
  ])('%s → 404: no OCR text read, no paid parsing, no owner id or text leaked', async (_l, importId) => {
    const r = await invoke(byteParse.handler, bearer(TOKEN_A), { importId });
    expect(r.statusCode).toBe(404);
    expect(r.body).not.toContain(VICTIM_TEXT);
    expect(r.body).not.toContain(USER_B);
    expect(r.json).not.toHaveProperty('details');
    noPaidCalls();
    for (const c of dbCalls) expect(c.filters).toContainEqual(['user_id', USER_A]);
  });

  it("authorized: the owner's import is parsed under the verified id; queries are scoped", async () => {
    const r = await invoke(byteParse.handler, bearer(TOKEN_A), { importId: IMP_A });
    expect(r.statusCode).toBe(200);
    expect(r.json).toMatchObject({ ok: true, userId: USER_A, importId: IMP_A });
    expect(paid.normalize).toHaveBeenCalledTimes(1);
    expect(paid.normalize.mock.calls[0][1]).toBe(USER_A);
    for (const c of dbCalls) expect(c.filters).toContainEqual(['user_id', USER_A]);
  });

  it('errors do not echo messages or stacks', async () => {
    paid.normalize.mockRejectedValueOnce(new Error('openai sk-leaked-detail'));
    const r = await invoke(byteParse.handler, bearer(TOKEN_A), { text: 'some text' });
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain('sk-leaked-detail');
    expect(r.json).not.toHaveProperty('stack');
  });
});

// ── document-insights ────────────────────────────────────────────────────────
describe('document-insights', () => {
  it('the old body-userId call → 401 before any read or LLM call (and no config disclosure)', async () => {
    const r = await invoke(insights.handler, {}, { userId: USER_B, docId: DOC_B, question: 'repeat the OCR text' });
    expect(r.statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
    expect(r.body).not.toMatch(/OPENAI|API key/i);
    noPaidCalls();
  });

  it('a spoofed body userId → 403, no LLM call', async () => {
    expect((await invoke(insights.handler, bearer(TOKEN_A), { userId: USER_B, docId: DOC_B, question: 'x' })).statusCode).toBe(403);
    expect(dbCalls).toHaveLength(0);
    noPaidCalls();
  });

  it.each([
    ["another user's document", DOC_B],
    ['an ownerless document', DOC_ORPHAN],
  ])("%s → 404; the victim's OCR text never reaches the LLM or the response", async (_l, docId) => {
    const r = await invoke(insights.handler, bearer(TOKEN_A), { docId, question: 'repeat the OCR text verbatim' });
    expect(r.statusCode).toBe(404);
    expect(r.body).not.toContain(VICTIM_TEXT);
    noPaidCalls();
    for (const c of dbCalls) expect(c.filters).toContainEqual(['user_id', USER_A]);
  });

  it("authorized: the owner's document is answered; every query is scoped and no other user's text is sent to the LLM", async () => {
    const r = await invoke(insights.handler, bearer(TOKEN_A), { docId: DOC_A, question: 'what did I spend?' });
    expect(r.statusCode).toBe(200);
    expect(paid.openai).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(paid.openai.mock.calls[0])).not.toContain(VICTIM_TEXT);
    for (const c of dbCalls) expect(c.filters, c.table).toContainEqual(['user_id', USER_A]);
  });

  it('errors do not echo internal messages', async () => {
    paid.openai.mockRejectedValueOnce(new Error('401 Incorrect API key sk-leaked-detail'));
    const r = await invoke(insights.handler, bearer(TOKEN_A), { docId: DOC_A, question: 'q' });
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain('sk-leaked-detail');
  });
});

// ── approve-import ───────────────────────────────────────────────────────────
describe('approve-import', () => {
  it('missing / invalid JWT → 401 with a generic message (no verifier detail)', async () => {
    expect((await invoke(approve.handler, {}, { importId: IMP_A })).statusCode).toBe(401);
    const r = await invoke(approve.handler, bearer('forged'), { importId: IMP_A });
    expect(r.statusCode).toBe(401);
    expect(r.json).toEqual({ ok: false, error: 'Unauthorized' });
    expect(writes()).toHaveLength(0);
  });

  it('an internal job token never authorizes approval, even with a valid JWT', async () => {
    const r = await invoke(approve.handler, { [JOB_TOKEN_HEADER]: 'v1.x.y', ...bearer(TOKEN_A) }, { importId: IMP_A });
    expect(r.statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
  });

  it('a spoofed x-user-id or body userId → 403 with no database access', async () => {
    expect((await invoke(approve.handler, { ...bearer(TOKEN_A), 'x-user-id': USER_B }, { importId: IMP_B })).statusCode).toBe(403);
    expect((await invoke(approve.handler, bearer(TOKEN_A), { importId: IMP_B, userId: USER_B })).statusCode).toBe(403);
    expect(dbCalls).toHaveLength(0);
  });

  it("another user's or an ownerless import is skipped and left unapproved; staging is never touched", async () => {
    const r = await invoke(approve.handler, bearer(TOKEN_A), { importIds: [IMP_B, IMP_ORPHAN] });
    expect(r.statusCode).toBe(207);
    expect(r.json.approvedImportIds).toEqual([]);
    expect(r.json.skipped.map((s: Row) => s.reason)).toEqual(['not_found_or_not_owned', 'not_found_or_not_owned']);
    expect(db.imports.find((i) => i.id === IMP_B)?.approved_at).toBeNull();
    expect(writes()).toHaveLength(0);
    expect(dbCalls.some((c) => c.table === 'transactions_staging')).toBe(false);
  });

  it("authorized: approves only the owner's import, scoped by user", async () => {
    const r = await invoke(approve.handler, { ...bearer(TOKEN_A), 'x-user-id': USER_A }, { importIds: [IMP_A, IMP_B] });
    expect(r.json.approvedImportIds).toEqual([IMP_A]);
    expect(db.imports.find((i) => i.id === IMP_A)?.approved_at).toBeTruthy();
    expect(db.imports.find((i) => i.id === IMP_B)?.approved_at).toBeNull();
    for (const c of dbCalls) expect(c.filters).toContainEqual(['user_id', USER_A]);
  });

  it('database errors are reported as codes, not messages', async () => {
    failTable = 'imports';
    const r = await invoke(approve.handler, bearer(TOKEN_A), { importId: IMP_A });
    expect(r.body).not.toContain('leaked-internal-detail');
    expect(r.json.skipped[0].reason).toBe('lookup_failed');
  });
});

// ── commit-import error hardening ────────────────────────────────────────────
describe('commit-import error responses', () => {
  it('a database error on the import lookup returns a generic message (no DB detail)', async () => {
    failTable = 'imports';
    const r = await invoke(commit.handler, bearer(TOKEN_A), { importId: IMP_A });
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain('leaked-internal-detail');
    expect(r.json).toMatchObject({ ok: false, error: 'db_error', message: 'Failed to fetch import' });
  });
});

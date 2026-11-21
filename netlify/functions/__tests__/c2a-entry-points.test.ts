/**
 * P0-C2a — remaining smart-import entry points: smart-import-init, ocr-job-status,
 * process-spreadsheet, plus the frontend callers that must send the user's JWT.
 *
 * Identity comes only from the verified Supabase JWT; client userId / x-user-id must match;
 * documents must belong to the verified user; no paid AI call or write after a denial.
 * All Supabase access, storage and AI providers are in-memory fakes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type DbCall = { table: string; op: string; filters: Array<[string, unknown]> };

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const TOKEN_A = 'user-a-jwt';
const DOC_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const DOC_A_REUSE = 'aaaaaaaa-0000-4000-8000-000000000002';
const DOC_A_TAMPERED = 'aaaaaaaa-0000-4000-8000-000000000003';
const DOC_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const DOC_ORPHAN = 'cccccccc-0000-4000-8000-000000000001';
const SECRET_OCR = 'VICTIM-OCR-RESULT-DO-NOT-LEAK';

let db: Record<string, Row[]> = {};
let dbCalls: DbCall[] = [];
let signedPaths: string[] = [];

function uploadHash(userId: string, fileName: string, size: number, mime: string, lm: number) {
  return createHash('sha256').update([userId.toLowerCase(), fileName.toLowerCase(), String(size), mime.toLowerCase(), String(lm)].join('|')).digest('hex');
}

function seed() {
  db = {
    user_documents: [
      { id: DOC_A, user_id: USER_A, status: 'ocr_processing', ocr_status: 'processing', storage_path: `${USER_A}/${DOC_A}/a.pdf`, created_at: '2026-10-01', updated_at: new Date().toISOString() },
      // Reusable CSV for A (same upload hash as the reuse test request).
      { id: DOC_A_REUSE, user_id: USER_A, status: 'uploading', storage_path: `${USER_A}/${DOC_A_REUSE}/stmt.csv`, original_name: 'stmt.csv', mime_type: 'text/csv', upload_hash: uploadHash(USER_A, 'stmt.csv', 10, 'text/csv', 1), created_at: '2026-10-02' },
      // A's row whose storage_path was tampered to point into B's folder.
      { id: DOC_A_TAMPERED, user_id: USER_A, status: 'uploading', storage_path: `${USER_B}/${DOC_B}/b.csv`, original_name: 'evil.csv', mime_type: 'text/csv', upload_hash: uploadHash(USER_A, 'evil.csv', 10, 'text/csv', 1), created_at: '2026-10-03' },
      { id: DOC_B, user_id: USER_B, status: 'ready', ocr_status: 'ready', storage_path: `${USER_B}/${DOC_B}/b.csv`, extracted_data: { secret: SECRET_OCR }, upload_hash: uploadHash(USER_A, 'victim.csv', 10, 'text/csv', 1), created_at: '2026-10-01' },
      { id: DOC_ORPHAN, user_id: null, status: 'ready', storage_path: 'orphan/x.csv', created_at: '2026-10-01' },
    ],
    ocr_jobs: [
      { id: 'job-a', user_id: USER_A, document_id: DOC_A, status: 'running', normalized_json: { debug: { progress: 40 } }, updated_at: new Date().toISOString() },
      { id: 'job-b', user_id: USER_B, document_id: DOC_B, status: 'done', normalized_json: { secret: SECRET_OCR }, updated_at: new Date().toISOString() },
    ],
    imports: [],
    transactions_staging: [],
  };
}

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | Row[] | null = null;
  let limit = Infinity;
  const matches = () =>
    (db[table] || []).filter((r) =>
      filters.every(([k, v]) => (k.startsWith('in:') ? (v as unknown[]).includes(r[k.slice(3)]) : r[k] === v))
    );
  const run = () => {
    dbCalls.push({ table, op, filters: [...filters] });
    if (op === 'insert') {
      const list = (Array.isArray(payload) ? payload : [payload]) as Row[];
      const inserted = list.map((p, i) => ({ id: p.id ?? `${table}-${(db[table] || []).length + i + 1}`, ...p }));
      (db[table] ||= []).push(...inserted);
      return { data: inserted, error: null };
    }
    if (op === 'update') { const rows = matches(); rows.forEach((r) => Object.assign(r, payload)); return { data: rows, error: null }; }
    return { data: matches().slice(0, limit), error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
  const q: any = {
    select: () => q,
    insert: (p: Row | Row[]) => { op = 'insert'; payload = p; return q; },
    update: (p: Row) => { op = 'update'; payload = p; return q; },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    in: (k: string, v: unknown[]) => { filters.push([`in:${k}`, v]); return q; },
    order: () => q,
    limit: (n: number) => { limit = n; return q; },
    single: async () => { const r = run(); const row = (r.data as Row[])[0]; return row ? { data: row, error: null } : { data: null, error: { message: 'no rows' } }; },
    maybeSingle: async () => { const r = run(); return { data: (r.data as Row[])[0] ?? null, error: null }; },
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
  storage: {
    from: () => ({
      createSignedUploadUrl: async (p: string) => { signedPaths.push(p); return { data: { signedUrl: `https://storage.test/signed/${encodeURIComponent(p)}` }, error: null }; },
      list: async () => ({ data: [], error: null }),
    }),
  },
};

const paid = {
  anthropic: vi.fn(async () => ({
    content: [{ type: 'text', text: JSON.stringify({ document_type: 'expense_report', issuer: 'Custom', currency: 'CAD', column_map: { date: 'Date', amount: 'Amount', description: 'Description' }, confidence: 90, notes: '' }) }],
  })),
};
vi.mock('../_shared/supabase', () => ({ admin: () => fakeClient }));
vi.mock('../_shared/upload', () => ({ admin: () => fakeClient }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { messages = { create: (...a: unknown[]) => paid.anthropic(...a) }; },
}));

const init = await import('../smart-import-init');
const ocrStatus = await import('../ocr-job-status');
const sheet = await import('../process-spreadsheet');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler / response shapes
async function invoke(h: any, headers: Record<string, string>, body: Row) {
  const res = await h({ httpMethod: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, {});
  let json: Row = {};
  try { json = JSON.parse(res.body || '{}'); } catch { json = {}; }
  return { statusCode: res.statusCode as number, json, body: String(res.body || '') };
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const writes = () => dbCalls.filter((c) => c.op !== 'select');
const CSV_B64 = Buffer.from('Date,Description,Amount\n2026-10-01,Coffee,4.50\n2026-10-02,Lunch,12.00\n').toString('base64');
let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeEach(() => {
  seed();
  dbCalls = []; signedPaths = [];
  paid.anthropic.mockClear();
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => logSpies.forEach((s) => s.mockRestore()));

// ── smart-import-init ────────────────────────────────────────────────────────
describe('smart-import-init', () => {
  const base = { fileName: 'statement.pdf', fileSize: 1000, mime: 'application/pdf', lastModified: 1 };

  it('the old body-userId call (no JWT) → 401 with no database or storage access', async () => {
    const r = await invoke(init.handler, {}, { ...base, userId: USER_B });
    expect(r.statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
    expect(signedPaths).toHaveLength(0);
  });

  it('an invalid JWT → 401', async () => {
    expect((await invoke(init.handler, bearer('forged'), base)).statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
  });

  it("a body userId naming another user → 403; nothing created and no upload URL for that user's folder", async () => {
    const r = await invoke(init.handler, bearer(TOKEN_A), { ...base, userId: USER_B });
    expect(r.statusCode).toBe(403);
    expect(writes()).toHaveLength(0);
    expect(signedPaths).toHaveLength(0);
  });

  it("authorized upload → new document owned by the verified user and a signed URL inside that user's folder", async () => {
    const r = await invoke(init.handler, bearer(TOKEN_A), { ...base, userId: USER_A });
    expect(r.statusCode).toBe(200);
    expect(r.json.status).toBe('created');
    const created = db.user_documents.find((d) => d.id === r.json.docId)!;
    expect(created.user_id).toBe(USER_A);
    expect(created.storage_path).toBe(`${USER_A}/${r.json.docId}/statement.pdf`);
    expect(signedPaths).toEqual([created.storage_path]);
    expect(r.json.uploadUrl).toMatch(/^https:\/\/storage\.test\/signed\//);
  });

  it.each([
    ['../../other-user/evil.pdf', 'evil.pdf'],
    ['..\\..\\evil.pdf', 'evil.pdf'],
    [`${USER_B}/${DOC_B}/b.pdf`, 'b.pdf'],
    ['.hidden.pdf', 'hidden.pdf'],
    ['a\u0000b\u001f\u007f.pdf', 'ab.pdf'],
    ['re<po>rt:"x"|?*.pdf', 're_po_rt__x____.pdf'],
  ])('file name %j is reduced to %j and stays in the user\'s folder', async (raw, expected) => {
    const r = await invoke(init.handler, bearer(TOKEN_A), { ...base, fileName: raw });
    expect(r.statusCode).toBe(200);
    expect(signedPaths).toHaveLength(1);
    expect(signedPaths[0]).toBe(`${USER_A}/${r.json.docId}/${expected}`);
    expect(signedPaths[0].split('/')).not.toContain('..');
  });

  it.each(['..', '../', '/', '  ', ''])('an unusable file name %j → 400 with nothing created', async (raw) => {
    const r = await invoke(init.handler, bearer(TOKEN_A), { ...base, fileName: raw });
    expect(r.statusCode).toBe(400);
    expect(writes()).toHaveLength(0);
  });

  it('long names are capped and keep their extension', () => {
    const out = init.sanitizeUploadFileName(`${'x'.repeat(500)}.pdf`);
    expect(out.length).toBeLessThanOrEqual(180);
    expect(out.endsWith('.pdf')).toBe(true);
  });

  it("reuse: the user's own matching CSV is reused and only that path is signed", async () => {
    const r = await invoke(init.handler, bearer(TOKEN_A), { fileName: 'stmt.csv', fileSize: 10, mime: 'text/csv', lastModified: 1 });
    expect(r.statusCode).toBe(200);
    expect(r.json).toMatchObject({ status: 'reused', docId: DOC_A_REUSE });
    expect(signedPaths).toEqual([`${USER_A}/${DOC_A_REUSE}/stmt.csv`]);
  });

  it("reuse never returns or signs a path outside the user's folder (tampered row → fresh document)", async () => {
    const r = await invoke(init.handler, bearer(TOKEN_A), { fileName: 'evil.csv', fileSize: 10, mime: 'text/csv', lastModified: 1 });
    expect(r.statusCode).toBe(200);
    expect(r.json.status).toBe('created');
    expect(r.json.docId).not.toBe(DOC_A_TAMPERED);
    expect(signedPaths.every((p) => p.startsWith(`${USER_A}/`))).toBe(true);
    expect(r.body).not.toContain(`${USER_B}/`);
  });

  it("another user's document is never reused even if its upload hash matches", async () => {
    const r = await invoke(init.handler, bearer(TOKEN_A), { fileName: 'victim.csv', fileSize: 10, mime: 'text/csv', lastModified: 1 });
    expect(r.json.status).toBe('created');
    expect(r.json.docId).not.toBe(DOC_B);
    expect(r.body).not.toContain(SECRET_OCR);
    for (const c of dbCalls.filter((d) => d.table === 'user_documents' && d.op === 'select')) {
      expect(c.filters).toContainEqual(['user_id', USER_A]);
    }
  });
});

// ── ocr-job-status ───────────────────────────────────────────────────────────
describe('ocr-job-status', () => {
  it('the old body-userId poll (no JWT) → 401, no database access, no OCR data', async () => {
    const r = await invoke(ocrStatus.handler, {}, { userId: USER_B, docIds: [DOC_B] });
    expect(r.statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
    expect(r.body).not.toContain(SECRET_OCR);
  });

  it('a spoofed body userId → 403', async () => {
    const r = await invoke(ocrStatus.handler, bearer(TOKEN_A), { userId: USER_B, docIds: [DOC_A] });
    expect(r.statusCode).toBe(403);
    expect(dbCalls).toHaveLength(0);
  });

  it.each([
    ["another user's document", [DOC_B]],
    ['a mix of own and foreign documents', [DOC_A, DOC_B]],
    ['an ownerless document', [DOC_ORPHAN]],
  ])('%s → 403; no OCR job or result is read or returned', async (_l, docIds) => {
    const r = await invoke(ocrStatus.handler, bearer(TOKEN_A), { docIds });
    expect(r.statusCode).toBe(403);
    expect(r.body).not.toContain(SECRET_OCR);
    expect(dbCalls.some((c) => c.table === 'ocr_jobs')).toBe(false);
    expect(writes()).toHaveLength(0);
  });

  it('invalid docIds → 400', async () => {
    expect((await invoke(ocrStatus.handler, bearer(TOKEN_A), { docIds: [] })).statusCode).toBe(400);
    expect((await invoke(ocrStatus.handler, bearer(TOKEN_A), { docIds: [{ id: DOC_A }] })).statusCode).toBe(400);
    expect((await invoke(ocrStatus.handler, bearer(TOKEN_A), { docIds: Array.from({ length: 51 }, () => DOC_A) })).statusCode).toBe(400);
  });

  it("legitimate polling of the user's own document returns its status; every query is scoped to the user", async () => {
    const r = await invoke(ocrStatus.handler, bearer(TOKEN_A), { userId: USER_A, docIds: [DOC_A] });
    expect(r.statusCode).toBe(200);
    expect(r.json.items).toHaveLength(1);
    expect(r.json.items[0]).toMatchObject({ docId: DOC_A, status: 'running', progress: 40 });
    expect(r.body).not.toContain(SECRET_OCR);
    for (const c of dbCalls) expect(c.filters, c.table).toContainEqual(['user_id', USER_A]);
  });
});

// ── process-spreadsheet ──────────────────────────────────────────────────────
describe('process-spreadsheet', () => {
  const body = { file_base64: CSV_B64, filename: 'expenses.csv' };
  const nothingHappened = () => {
    expect(paid.anthropic).not.toHaveBeenCalled();
    expect(writes()).toHaveLength(0);
  };

  it('the old x-user-id-only call → 401 before parsing or any paid AI call', async () => {
    const r = await invoke(sheet.handler, { 'x-user-id': USER_B }, body);
    expect(r.statusCode).toBe(401);
    nothingHappened();
  });

  it('an invalid JWT → 401, no paid AI call', async () => {
    expect((await invoke(sheet.handler, bearer('forged'), body)).statusCode).toBe(401);
    nothingHappened();
  });

  it('a spoofed x-user-id or body userId with a valid JWT → 403, no paid AI call', async () => {
    expect((await invoke(sheet.handler, { ...bearer(TOKEN_A), 'x-user-id': USER_B }, body)).statusCode).toBe(403);
    expect((await invoke(sheet.handler, bearer(TOKEN_A), { ...body, userId: USER_B })).statusCode).toBe(403);
    nothingHappened();
  });

  it.each([
    ["another user's document_id", DOC_B],
    ['an ownerless document_id', DOC_ORPHAN],
  ])('%s → 403 before any paid AI call or write', async (_l, documentId) => {
    const r = await invoke(sheet.handler, bearer(TOKEN_A), { ...body, document_id: documentId });
    expect(r.statusCode).toBe(403);
    nothingHappened();
  });

  it('authorized processing classifies once and stages records owned only by the verified user', async () => {
    const r = await invoke(sheet.handler, { ...bearer(TOKEN_A), 'x-user-id': USER_A }, { ...body, document_id: DOC_A });
    expect(r.statusCode).toBe(200);
    expect(r.json.success).toBe(true);
    expect(paid.anthropic).toHaveBeenCalledTimes(1);
    expect(db.imports).toHaveLength(1);
    expect(db.imports[0]).toMatchObject({ user_id: USER_A, document_id: DOC_A, status: 'parsed' });
    expect(db.transactions_staging.length).toBe(2);
    expect(db.transactions_staging.every((s) => s.user_id === USER_A && s.import_id === db.imports[0].id)).toBe(true);
  });

  it('errors do not echo internal details', async () => {
    paid.anthropic.mockRejectedValueOnce(new Error('anthropic 401 sk-leaked-detail'));
    const r = await invoke(sheet.handler, bearer(TOKEN_A), body);
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain('sk-leaked-detail');
  });
});

// ── frontend callers ─────────────────────────────────────────────────────────
describe('frontend callers send the user JWT', () => {
  const src = (p: string) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');

  it('pollRunningOcrJob forwards the token to ocr-job-status', async () => {
    const { pollRunningOcrJob } = await import('../../../src/lib/upload/safeToSkipUpload');
    const seen: Array<Record<string, string>> = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, i: RequestInit) => {
      seen.push(i.headers as Record<string, string>);
      return new Response(JSON.stringify({ ok: true, items: [{ status: 'done' }] }), { status: 200 });
    }));
    try {
      expect(await pollRunningOcrJob(USER_A, DOC_A, 1, 0, 'session-token')).toEqual({ status: 'done' });
      expect(seen[0].Authorization).toBe('Bearer session-token');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('the legacy pipeline sends the JWT to smart-import-init and to the OCR poll', () => {
    const s = src('src/lib/smartImport/runSmartImportPipeline.ts');
    expect(s).toMatch(/smart-import-init', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json', \.\.\.getAuthHeaders\(input\) \}/);
    expect(s).toMatch(/pollRunningOcrJob\(input\.userId, docId, 5, 1200, input\.authToken\)/);
  });

  it.each(['src/pages/PrimeChatV2/PrimeChatV2.tsx', 'src/pages/UploadV2/UploadPageV2.tsx'])('%s sends Authorization to process-spreadsheet', (file) => {
    const s = src(file);
    const call = s.slice(s.indexOf('functions/process-spreadsheet'), s.indexOf('functions/process-spreadsheet') + 400);
    expect(call).toMatch(/Authorization: `Bearer \$\{authToken\}`/);
  });
});

/**
 * Attachments B1 — document purpose ('chat_document' | 'import').
 *
 * - smart-import-init decides the purpose server-side (absent = 'import', unchanged behaviour);
 *   chat documents are gated by CHAT_DOCUMENT_MODE_ENABLED, limited to PDF/images ≤ 15 MB.
 * - smart-import-finalize validates the stored bytes of a chat document (magic bytes, type match,
 *   15 MB, 50 pages) before any OCR is dispatched.
 * - A chat document can never become an import or transactions: normalize-transactions,
 *   smart-import-sync and commit-import refuse it for direct, replayed or job-token calls, and the
 *   OCR background function never hands it to normalization.
 * - Purpose is never changed by application code (the database trigger enforces immutability; see
 *   sql/migrations/20261123_user_documents_purpose.sql).
 *
 * All Supabase access, storage, AI providers and network calls are in-memory fakes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type DbCall = { table: string; op: string; payload: unknown; filters: Array<[string, unknown]> };
type FnCall = { fn: string; body: Row | null };

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const TOKEN_A = 'user-a-jwt';
const SECRET = 'test-signing-secret-0123456789abcdef-b1';
const DEPLOY = 'https://deploy-b1--xspensesai-staging.netlify.app';
const CHAT_A = 'c0c0c0c0-0000-4000-8000-000000000001';
const IMPORT_A = 'a0a0a0a0-0000-4000-8000-000000000001';
const LEGACY_A = 'a0a0a0a0-0000-4000-8000-000000000002';
const CHAT_B = 'c0c0c0c0-0000-4000-8000-0000000000b1';
const IMP_CHAT_A = 'd0d0d0d0-0000-4000-8000-000000000001';

let db: Record<string, Row[]> = {};
let dbCalls: DbCall[] = [];
let fnCalls: FnCall[] = [];
let storageFiles: Record<string, Buffer> = {};
let removedPaths: string[] = [];
let statusMarks: Array<{ docId: string; status: string }> = [];
let noPurposeColumn = false;

function seed() {
  db = {
    user_documents: [
      { id: CHAT_A, user_id: USER_A, purpose: 'chat_document', status: 'uploading', mime_type: 'application/pdf', original_name: 'notes.pdf', storage_path: `${USER_A}/${CHAT_A}/notes.pdf`, metadata: {} },
      { id: IMPORT_A, user_id: USER_A, purpose: 'import', status: 'ready', mime_type: 'text/csv', original_name: 'a.csv', storage_path: `${USER_A}/${IMPORT_A}/a.csv`, metadata: {} },
      { id: LEGACY_A, user_id: USER_A, purpose: null, status: 'ready', mime_type: 'text/csv', original_name: 'l.csv', storage_path: `${USER_A}/${LEGACY_A}/l.csv`, metadata: {} },
      { id: CHAT_B, user_id: USER_B, purpose: 'chat_document', status: 'ready', mime_type: 'application/pdf', original_name: 'b.pdf', storage_path: `${USER_B}/${CHAT_B}/b.pdf`, metadata: {} },
    ],
    // An import row pointing at a chat document (forged / replayed): commit must refuse it.
    imports: [
      { id: IMP_CHAT_A, user_id: USER_A, document_id: CHAT_A, status: 'parsed', approved_at: '2026-11-23T00:00:00Z', file_url: 'notes.pdf', file_type: 'pdf', created_at: '2026-11-23T00:00:00Z', metadata: {} },
    ],
    transactions_staging: [
      { id: 's-1', import_id: IMP_CHAT_A, user_id: USER_A, hash: 'h1', parsed_at: '2026-11-23T00:00:00Z', data_json: { date: '2026-11-01', description: 'X', merchant: 'X', amount: -5, type: 'debit' } },
    ],
    transactions: [],
    ocr_jobs: [],
  };
}

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | Row[] | null = null;
  let limit = Infinity;
  let wantCount = false;
  let selectCols = '';
  const matches = () =>
    (db[table] || []).filter((r) =>
      filters.every(([k, v]) => (k.startsWith('in:') ? (v as unknown[]).includes(r[k.slice(3)]) : r[k] === v)),
    );
  const run = () => {
    dbCalls.push({ table, op, payload, filters: [...filters] });
    if (noPurposeColumn && table === 'user_documents') {
      const touchesPurpose =
        (op === 'select' && /\bpurpose\b/.test(selectCols)) ||
        ((op === 'insert' || op === 'update') && payload && !Array.isArray(payload) && 'purpose' in (payload as Row));
      if (touchesPurpose) {
        return { data: null, error: { code: 'PGRST204', message: "Could not find the 'purpose' column of 'user_documents' in the schema cache" } };
      }
    }
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
    select: (c?: string, opts?: { count?: string }) => { selectCols = String(c || ''); if (opts?.count) wantCount = true; return q; },
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
    single: async () => {
      const r = run();
      if (r.error) return { data: null, error: r.error };
      const row = (r.data as Row[])[0];
      return row ? { data: row, error: null } : { data: null, error: { message: 'no rows', code: 'PGRST116' } };
    },
    maybeSingle: async () => { const r = run(); return r.error ? { data: null, error: r.error } : { data: (r.data as Row[])[0] ?? null, error: null }; },
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
  rpc: async () => ({ data: null, error: null }),
  storage: {
    from: () => ({
      createSignedUploadUrl: async (p: string) => ({ data: { signedUrl: `https://storage.test/signed/${encodeURIComponent(p)}` }, error: null }),
      list: async (dir: string, opts?: { search?: string }) => {
        const names = Object.keys(storageFiles)
          .filter((p) => p.startsWith(`${dir}/`) && (!opts?.search || p.endsWith(`/${opts.search}`)))
          .map((p) => ({ name: p.split('/').pop(), metadata: { size: storageFiles[p].length } }));
        return { data: names, error: null };
      },
      download: async (p: string) =>
        storageFiles[p] ? { data: new Blob([storageFiles[p]]), error: null } : { data: null, error: { message: 'not found' } },
      remove: async (paths: string[]) => { removedPaths.push(...paths); return { data: [], error: null }; },
    }),
  },
};

const paid = { openai: vi.fn(), categorize: vi.fn(async () => ({ category: 'Other', confidence: 0.5 })) };
vi.mock('openai', () => {
  class FakeOpenAI {
    chat = { completions: { create: (...a: unknown[]) => paid.openai(...a) } };
    responses = { create: (...a: unknown[]) => paid.openai(...a) };
  }
  return { default: FakeOpenAI, OpenAI: FakeOpenAI };
});
vi.mock('../_shared/supabase', () => ({ admin: () => fakeClient }));
vi.mock('../_shared/upload', () => ({
  admin: () => fakeClient,
  markDocStatus: vi.fn(async (docId: string, status: string) => { statusMarks.push({ docId, status }); }),
}));
vi.mock('../_shared/guardrails-unified', () => ({
  runGuardrailsForText: async (text: string) => ({ ok: true, text, signals: { pii: false } }),
}));
vi.mock('../_shared/categorize', () => ({ categorizeTransactionWithLearning: (...a: unknown[]) => paid.categorize(...a) }));
vi.mock('../_shared/recurringDetection', () => ({ detectAndUpsertRecurringObligations: async () => ({ upserted: 0 }) }));
vi.mock('../_shared/chimeNotifications', () => ({ queueUpcomingPaymentNotifications: async () => undefined }));
vi.mock('../../../src/lib/ai/userActivity', () => ({ logUserEvent: async () => undefined, recalcFluency: async () => undefined }));

const fakeFetch = vi.fn(async (url: string, init: RequestInit = {}) => {
  let body: Row | null = null;
  if (typeof init.body === 'string') { try { body = JSON.parse(init.body); } catch { body = null; } }
  const fn = String(url).match(/\/\.netlify\/functions\/([^/?]+)/)?.[1] ?? `external:${url}`;
  fnCalls.push({ fn, body });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
});

const purposeLib = await import('../_shared/documentPurpose');
const pagesLib = await import('../_shared/chatDocumentPages');
const lib = await import('../_shared/internalJobAuth');
const init = await import('../smart-import-init');
const finalize = await import('../smart-import-finalize');
const normalize = await import('../normalize-transactions');
const sync = await import('../smart-import-sync');
const commit = await import('../commit-import');
const { JOB_TOKEN_HEADER, issueJobToken, verifyOwnership, authenticateUser } = lib;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler / response shapes
async function invoke(h: any, headers: Record<string, string>, body: Row) {
  const res = await h({ httpMethod: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, {});
  let json: Row = {};
  try { json = JSON.parse(res.body || '{}'); } catch { json = {}; }
  return { statusCode: res.statusCode as number, json };
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const importWrites = () =>
  dbCalls.filter((c) => c.op !== 'select' && ['imports', 'transactions', 'transactions_staging'].includes(c.table));
async function jobTokenFor(documentId: string, scope: 'normalize.run' | 'ocr.run') {
  const a = await authenticateUser({ headers: bearer(TOKEN_A) });
  if (!a.ok) throw new Error('setup');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake client
  const o = await verifyOwnership(fakeClient as any, a.principal, { documentId });
  if (!o.ok) throw new Error('setup');
  return issueJobToken(o.proof, { scope, src: 'test' });
}
async function makePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
}
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);

let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];
beforeEach(() => {
  seed();
  dbCalls = []; fnCalls = []; storageFiles = {}; removedPaths = []; statusMarks = [];
  noPurposeColumn = false;
  paid.openai.mockClear(); paid.categorize.mockClear();
  process.env.INTERNAL_JOB_SIGNING_SECRET = SECRET;
  process.env.DEPLOY_URL = DEPLOY;
  process.env.CHAT_DOCUMENT_MODE_ENABLED = 'true';
  delete process.env.CONTEXT;
  vi.stubGlobal('fetch', fakeFetch);
  fakeFetch.mockClear();
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => {
  logSpies.forEach((s) => s.mockRestore());
  vi.unstubAllGlobals();
  for (const k of ['INTERNAL_JOB_SIGNING_SECRET', 'DEPLOY_URL', 'CONTEXT', 'CHAT_DOCUMENT_MODE_ENABLED']) delete process.env[k];
});

// ── shared helpers ───────────────────────────────────────────────────────────
describe('documentPurpose helpers', () => {
  it('parses purpose: absent → import; only the two known values are accepted', () => {
    expect(purposeLib.parseRequestedPurpose(undefined)).toEqual({ ok: true, purpose: 'import' });
    expect(purposeLib.parseRequestedPurpose('')).toEqual({ ok: true, purpose: 'import' });
    expect(purposeLib.parseRequestedPurpose('import')).toEqual({ ok: true, purpose: 'import' });
    expect(purposeLib.parseRequestedPurpose('chat_document')).toEqual({ ok: true, purpose: 'chat_document' });
    for (const bad of ['CHAT_DOCUMENT', 'chat', 'statement', 1, true, {}, ['chat_document']]) {
      expect(purposeLib.parseRequestedPurpose(bad)).toEqual({ ok: false });
    }
  });

  it('legacy NULL and unknown stored values behave as import', () => {
    expect(purposeLib.effectivePurpose({ purpose: null })).toBe('import');
    expect(purposeLib.effectivePurpose({})).toBe('import');
    expect(purposeLib.effectivePurpose({ purpose: 'chat_document' })).toBe('chat_document');
  });

  it('runtime gate is off unless CHAT_DOCUMENT_MODE_ENABLED is exactly "true"', () => {
    expect(purposeLib.chatDocumentModeEnabled({})).toBe(false);
    expect(purposeLib.chatDocumentModeEnabled({ CHAT_DOCUMENT_MODE_ENABLED: '1' })).toBe(false);
    expect(purposeLib.chatDocumentModeEnabled({ CHAT_DOCUMENT_MODE_ENABLED: 'true' })).toBe(true);
  });

  it('documentImportBlock: chat → 409, import / legacy / unknown → allowed, scoped to the user', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake client
    const sb = fakeClient as any;
    expect(await purposeLib.documentImportBlock(sb, CHAT_A, USER_A)).toEqual({ status: 409, code: 'chat_document_not_importable' });
    expect(await purposeLib.documentImportBlock(sb, IMPORT_A, USER_A)).toBeNull();
    expect(await purposeLib.documentImportBlock(sb, LEGACY_A, USER_A)).toBeNull();
    expect(await purposeLib.documentImportBlock(sb, 'missing', USER_A)).toBeNull();
    const lookup = dbCalls.find((c) => c.table === 'user_documents')!;
    expect(lookup.filters).toContainEqual(['user_id', USER_A]);
  });

  it('documentImportBlock: missing column (pre-migration) → allowed; other errors fail closed (503)', async () => {
    noPurposeColumn = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake client
    expect(await purposeLib.documentImportBlock(fakeClient as any, CHAT_A, USER_A)).toBeNull();
    const broken = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { code: '57014', message: 'timeout' } }) }) }) }) }) };
    expect(await purposeLib.documentImportBlock(broken, CHAT_A, USER_A)).toEqual({ status: 503, code: 'document_purpose_unavailable' });
  });

  it('checkChatDocumentFile: real content, type match, size and page limits', async () => {
    const pdf3 = await makePdf(3);
    expect(await purposeLib.checkChatDocumentFile(pdf3, 'application/pdf')).toEqual({ ok: true, mime: 'application/pdf', pages: 3 });
    expect(await purposeLib.checkChatDocumentFile(PNG, 'image/png')).toEqual({ ok: true, mime: 'image/png', pages: 1 });
    expect(await purposeLib.checkChatDocumentFile(Buffer.from('just text, not a document'), 'application/pdf')).toMatchObject({ ok: false, status: 415, code: 'UNSUPPORTED_FILE_TYPE' });
    expect(await purposeLib.checkChatDocumentFile(PNG, 'application/pdf')).toMatchObject({ ok: false, status: 415, code: 'CONTENT_TYPE_MISMATCH' });
    expect(await purposeLib.checkChatDocumentFile(pdf3, 'image/png')).toMatchObject({ ok: false, status: 415, code: 'CONTENT_TYPE_MISMATCH' });
    const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32)]);
    expect(await purposeLib.checkChatDocumentFile(gif, 'image/gif')).toMatchObject({ ok: false, status: 415 });
    const big = Buffer.concat([PNG, Buffer.alloc(purposeLib.CHAT_DOCUMENT_MAX_BYTES)]);
    expect(await purposeLib.checkChatDocumentFile(big, 'image/png')).toMatchObject({ ok: false, status: 413, code: 'FILE_TOO_LARGE' });
    expect(await purposeLib.checkChatDocumentFile(Buffer.alloc(0), 'image/png')).toMatchObject({ ok: false, status: 400 });
    expect(await purposeLib.checkChatDocumentFile(Buffer.from('%PDF-1.4 broken'), 'application/pdf')).toMatchObject({ ok: false, status: 422, code: 'UNREADABLE_PDF' });
  });

  it('page limit: 50 pages accepted, 51 rejected (real PDFs)', async () => {
    expect(await purposeLib.checkChatDocumentFile(await makePdf(50), 'application/pdf')).toMatchObject({ ok: true, pages: 50 });
    expect(await purposeLib.checkChatDocumentFile(await makePdf(51), 'application/pdf')).toMatchObject({ ok: false, status: 413, code: 'TOO_MANY_PAGES' });
  }, 60_000);
});

describe('chat document page texts', () => {
  const mask = (t: string) => t.replace(/\d{12,19}/g, '[CARD]');
  it('keeps masked pages when the boundaries reproduce the final text', () => {
    const pages = pagesLib.buildChatDocumentPageTexts({
      rawFinalText: 'Page one 4111111111111111\nPage two',
      rawPageTexts: ['Page one 4111111111111111', 'Page two'],
      isImage: false,
      mask,
    });
    expect(pages).toEqual([{ page: 1, text: 'Page one [CARD]' }, { page: 2, text: 'Page two' }]);
  });
  it('omits pages rather than guessing when the final text came from another engine', () => {
    expect(pagesLib.buildChatDocumentPageTexts({ rawFinalText: 'different text', rawPageTexts: ['a', 'b'], isImage: false, mask })).toBeNull();
    expect(pagesLib.buildChatDocumentPageTexts({ rawFinalText: 'pdf text', rawPageTexts: null, isImage: false, mask })).toBeNull();
  });
  it('an image is one page; more than 50 pages is never stored', () => {
    expect(pagesLib.buildChatDocumentPageTexts({ rawFinalText: 'Receipt 4111111111111111', rawPageTexts: null, isImage: true, mask })).toEqual([{ page: 1, text: 'Receipt [CARD]' }]);
    const many = Array.from({ length: 51 }, (_, i) => `p${i}`);
    expect(pagesLib.buildChatDocumentPageTexts({ rawFinalText: many.join('\n'), rawPageTexts: many, isImage: false, mask })).toBeNull();
  });
});

// ── smart-import-init ────────────────────────────────────────────────────────
describe('smart-import-init — purpose is decided server-side', () => {
  const baseBody = { fileName: 'notes.pdf', mimeType: 'application/pdf', fileSize: 1000, lastModified: 1 };
  const created = () => db.user_documents[db.user_documents.length - 1];

  it('no purpose (existing callers) → import, as before', async () => {
    const r = await invoke(init.handler, bearer(TOKEN_A), { fileName: 'stmt.csv', mimeType: 'text/csv', fileSize: 10, lastModified: 1 });
    expect(r.statusCode).toBe(200);
    expect(created()).toMatchObject({ user_id: USER_A, purpose: 'import', status: 'uploading' });
    expect(r.json.purpose).toBe('import');
  });

  it('chat_document → created with that purpose in the verified user\'s folder', async () => {
    const r = await invoke(init.handler, bearer(TOKEN_A), { ...baseBody, purpose: 'chat_document', userId: USER_A });
    expect(r.statusCode).toBe(200);
    expect(r.json.purpose).toBe('chat_document');
    expect(created()).toMatchObject({ user_id: USER_A, purpose: 'chat_document' });
    expect(String(created().storage_path).startsWith(`${USER_A}/`)).toBe(true);
  });

  it('a chat document never shares an upload hash with an import of the same file', async () => {
    await invoke(init.handler, bearer(TOKEN_A), { ...baseBody });
    const importHash = created().upload_hash;
    await invoke(init.handler, bearer(TOKEN_A), { ...baseBody, purpose: 'chat_document' });
    expect(created().upload_hash).not.toBe(importHash);
  });

  it('runtime gate off → 403 and nothing created', async () => {
    delete process.env.CHAT_DOCUMENT_MODE_ENABLED;
    const before = db.user_documents.length;
    const r = await invoke(init.handler, bearer(TOKEN_A), { ...baseBody, purpose: 'chat_document' });
    expect(r.statusCode).toBe(403);
    expect(db.user_documents.length).toBe(before);
  });

  it('invalid purpose → 400; unsupported type → 415; over 15 MB → 413; missing size → 400', async () => {
    const before = db.user_documents.length;
    expect((await invoke(init.handler, bearer(TOKEN_A), { ...baseBody, purpose: 'statement' })).statusCode).toBe(400);
    expect((await invoke(init.handler, bearer(TOKEN_A), { fileName: 'x.csv', mimeType: 'text/csv', fileSize: 10, purpose: 'chat_document' })).statusCode).toBe(415);
    expect((await invoke(init.handler, bearer(TOKEN_A), { ...baseBody, fileSize: 15 * 1024 * 1024 + 1, purpose: 'chat_document' })).statusCode).toBe(413);
    expect((await invoke(init.handler, bearer(TOKEN_A), { ...baseBody, fileSize: 0, purpose: 'chat_document' })).statusCode).toBe(400);
    expect(db.user_documents.length).toBe(before);
  });

  it('cross-user: another user id in the body is refused; unauthenticated is refused', async () => {
    expect((await invoke(init.handler, bearer(TOKEN_A), { ...baseBody, purpose: 'chat_document', userId: USER_B })).statusCode).toBe(403);
    expect((await invoke(init.handler, {}, { ...baseBody, purpose: 'chat_document' })).statusCode).toBe(401);
  });

  it('before the migration: imports still work without the column; chat documents fail closed', async () => {
    noPurposeColumn = true;
    const imp = await invoke(init.handler, bearer(TOKEN_A), { fileName: 'stmt.csv', mimeType: 'text/csv', fileSize: 10, lastModified: 2 });
    expect(imp.statusCode).toBe(200);
    expect(created().purpose).toBeUndefined();
    const chat = await invoke(init.handler, bearer(TOKEN_A), { ...baseBody, lastModified: 3, purpose: 'chat_document' });
    expect(chat.statusCode).toBe(503);
  });
});

// ── smart-import-finalize ────────────────────────────────────────────────────
describe('smart-import-finalize — chat document content validation', () => {
  const chatPath = `${USER_A}/${CHAT_A}/notes.pdf`;
  const ocrDispatched = () => fnCalls.some((c) => c.fn === 'smart-import-ocr-background');

  it('valid 3-page PDF → OCR dispatched', async () => {
    storageFiles[chatPath] = await makePdf(3);
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: CHAT_A });
    expect(r.statusCode).toBe(200);
    expect(r.json).toMatchObject({ started: true, via: 'ocr' });
    expect(ocrDispatched()).toBe(true);
  });

  it('51 pages → 413, document rejected, object removed, no OCR', async () => {
    storageFiles[chatPath] = await makePdf(51);
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: CHAT_A });
    expect(r.statusCode).toBe(413);
    expect(r.json.error).toBe('TOO_MANY_PAGES');
    expect(statusMarks).toContainEqual({ docId: CHAT_A, status: 'rejected' });
    expect(removedPaths).toContain(chatPath);
    expect(ocrDispatched()).toBe(false);
  }, 60_000);

  it('non-PDF bytes named .pdf → 415, no OCR', async () => {
    storageFiles[chatPath] = Buffer.from('<html>not a pdf</html>');
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: CHAT_A });
    expect(r.statusCode).toBe(415);
    expect(ocrDispatched()).toBe(false);
  });

  it('stored object over 15 MB → 413, no OCR', async () => {
    db.user_documents[0].mime_type = 'image/png';
    db.user_documents[0].storage_path = `${USER_A}/${CHAT_A}/big.png`;
    storageFiles[`${USER_A}/${CHAT_A}/big.png`] = Buffer.concat([PNG, Buffer.alloc(15 * 1024 * 1024)]);
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: CHAT_A });
    expect(r.statusCode).toBe(413);
    expect(ocrDispatched()).toBe(false);
  });

  it('runtime gate off → 403, no OCR', async () => {
    delete process.env.CHAT_DOCUMENT_MODE_ENABLED;
    storageFiles[chatPath] = await makePdf(1);
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: CHAT_A });
    expect(r.statusCode).toBe(403);
    expect(ocrDispatched()).toBe(false);
  });

  it("another user's chat document → 403", async () => {
    storageFiles[`${USER_B}/${CHAT_B}/b.pdf`] = await makePdf(1);
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: CHAT_B });
    expect(r.statusCode).toBe(403);
    expect(ocrDispatched()).toBe(false);
  });

  it('import documents keep the existing route (no chat validation applied)', async () => {
    db.user_documents.push({ id: 'a0a0a0a0-0000-4000-8000-000000000009', user_id: USER_A, purpose: 'import', status: 'uploading', mime_type: 'application/pdf', original_name: 's.pdf', storage_path: `${USER_A}/a0a0a0a0-0000-4000-8000-000000000009/s.pdf`, metadata: {} });
    storageFiles[`${USER_A}/a0a0a0a0-0000-4000-8000-000000000009/s.pdf`] = Buffer.from('opaque bytes the import path has always accepted');
    const r = await invoke(finalize.handler, bearer(TOKEN_A), { docId: 'a0a0a0a0-0000-4000-8000-000000000009' });
    expect(r.json).toMatchObject({ started: true, via: 'ocr' });
  });
});

// ── no-import enforcement across downstream entry points ─────────────────────
describe('a chat document never becomes an import or transactions', () => {
  it('normalize-transactions: user JWT (direct call) → 409, nothing staged', async () => {
    const r = await invoke(normalize.handler, bearer(TOKEN_A), { documentId: CHAT_A });
    expect(r.json.http_status).toBe(409);
    expect(r.json.error?.code).toBe('chat_document_not_importable');
    expect(importWrites()).toHaveLength(0);
    expect(paid.openai).not.toHaveBeenCalled();
  });

  it('normalize-transactions: replayed / forged normalize.run job token → 409, nothing staged', async () => {
    const token = await jobTokenFor(CHAT_A, 'normalize.run');
    for (let i = 0; i < 2; i++) {
      const r = await invoke(normalize.handler, { [JOB_TOKEN_HEADER]: token }, { documentId: CHAT_A, ocrText: 'forged text 2026-11-01 COFFEE -5.00' });
      expect(r.json.http_status).toBe(409);
    }
    expect(importWrites()).toHaveLength(0);
  });

  it('smart-import-sync: a chat document (alone or mixed with an import) → 409 before any normalize/commit', async () => {
    for (const docIds of [[CHAT_A], [IMPORT_A, CHAT_A]]) {
      fnCalls = [];
      const r = await invoke(sync.handler, bearer(TOKEN_A), { docIds });
      expect(r.statusCode).toBe(409);
      expect(r.json.error).toBe('chat_document_not_importable');
      expect(fnCalls).toHaveLength(0);
    }
    expect(importWrites()).toHaveLength(0);
  });

  it('commit-import: an import linked to a chat document → 409, zero transactions', async () => {
    const r = await invoke(commit.handler, bearer(TOKEN_A), { importId: IMP_CHAT_A });
    expect(r.statusCode).toBe(409);
    expect(r.json.error).toBe('chat_document_not_importable');
    expect(db.transactions).toHaveLength(0);
    expect(importWrites().filter((w) => w.table === 'transactions')).toHaveLength(0);
    expect(db.imports[0].status).toBe('parsed');
    expect(paid.categorize).not.toHaveBeenCalled();
  });

  it("smart-import-sync: another user's chat document → 403 (ownership first, no purpose leak)", async () => {
    const r = await invoke(sync.handler, bearer(TOKEN_A), { docIds: [CHAT_B] });
    expect(r.statusCode).toBe(403);
    expect(fnCalls).toHaveLength(0);
  });

  it('import and legacy documents still pass the purpose guard in sync', async () => {
    for (const docId of [LEGACY_A, IMPORT_A]) {
      dbCalls = [];
      const r = await invoke(sync.handler, bearer(TOKEN_A), { docIds: [docId] });
      expect(r.statusCode).toBe(200);
      expect(r.json.error).toBeUndefined();
      expect(r.json.docIds).toEqual([docId]);
      // ownership check, purpose check, then sync's own document processing
      expect(dbCalls.filter((c) => c.table === 'user_documents').length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ── static guarantees ────────────────────────────────────────────────────────
describe('static guarantees', () => {
  const fnDir = path.resolve(__dirname, '..');
  const read = (f: string) => fs.readFileSync(path.join(fnDir, f), 'utf8');

  it('OCR background: chat documents skip normalization, OCR.space and transaction-extracting Vision', () => {
    const src = read('smart-import-ocr-background.ts');
    expect(src).toMatch(/const isChatDocument = isChatDocumentRow\(doc\);/);
    // The chat branch comes first in the handoff chain, so dispatchNormalize is unreachable for it.
    const chatBranch = src.indexOf('if (isChatDocument) {\n      // Attachments B1: a chat document never enters normalization');
    const dispatch = src.indexOf('const handoff = await dispatchNormalize(');
    expect(chatBranch).toBeGreaterThan(0);
    expect(dispatch).toBeGreaterThan(chatBranch);
    expect(src.slice(chatBranch, dispatch)).toMatch(/\} else if \(!docId \|\| !UUID_V4_RE/);
    expect(src).toMatch(/disableOcrSpace: isChatDocument/);
    expect(src).toMatch(/const hasOcrSpace = !opts\.disableOcrSpace && !!process\.env\.OCR_SPACE_API_KEY;/);
    expect(src).toMatch(/VISION_ENABLED && isPdfForVision && !isChatDocument/);
    expect(src).toMatch(/checkChatDocumentFile\(binaryBuffer, effectiveMimeType\)/);
  });

  it('purpose is never written by an update anywhere in the functions (immutable after creation)', () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === '__tests__' || e.name === 'node_modules') continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith('.ts')) files.push(p);
      }
    };
    walk(fnDir);
    const offenders = files.filter((f) => /\.(update|upsert)\(\s*\{[^}]*\bpurpose\b/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the migration enforces values, immutability and the no-import backstop', () => {
    const sql = fs.readFileSync(path.resolve(fnDir, '../../sql/migrations/20261123_user_documents_purpose.sql'), 'utf8');
    expect(sql).toMatch(/check \(purpose is null or purpose in \('chat_document', 'import'\)\)/);
    expect(sql).toMatch(/user_documents\.purpose is immutable/);
    expect(sql).toMatch(/before update of purpose on public\.user_documents/);
    expect(sql).toMatch(/array\['imports', 'transactions', 'transactions_staging'\]/);
    expect(sql).toMatch(/raise exception 'chat_document_not_importable'/);
  });

  it('client-supplied OCR text stays ignored in chat.ts (A2-3 preserved)', () => {
    const chat = read('chat.ts');
    expect(chat).not.toMatch(/FINANCIAL DOCUMENT \(OCR extracted text\)/);
    expect(chat).toMatch(/client ocrText ignored/);
  });
});

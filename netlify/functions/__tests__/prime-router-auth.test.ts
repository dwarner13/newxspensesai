/**
 * P0-B — prime-router authorization.
 *
 * "A submitted userId or a known importId is never proof of identity or ownership."
 *
 * Drives the PRODUCTION prime-router handler with the real verifyAuth helper, an in-memory
 * stand-in for the service-role Supabase client (no RLS), and a stubbed fetch standing in for
 * the downstream Netlify Functions (smart-import-init, OCR, status, sync, finalize, summary).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type DbCall = { table: string; op: string; filters: Array<[string, unknown]> };
type FnCall = { fn: string; url: string; method: string; headers: Record<string, string>; body: Row | null };

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const OWNER_TOKEN = 'owner-jwt-token-abc';
const OTHER_TOKEN = 'other-jwt-token-xyz';
const OWNER_IMPORT = 'aaaaaaaa-0000-4000-8000-000000000001';
const OWNER_IMPORT_2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const OTHER_IMPORT = 'bbbbbbbb-0000-4000-8000-000000000001';
const ORPHAN_IMPORT = 'aaaaaaaa-0000-4000-8000-0000000000ff';
const OWNER_DOC = 'dddddddd-0000-4000-8000-000000000001';
const NEW_IMPORT = 'cccccccc-0000-4000-8000-000000000001';
const NEW_DOC = 'eeeeeeee-0000-4000-8000-000000000001';
const SECRET_FILE = 'Jane-Doe-RBC-Visa-Statement.pdf';
const SIGNING_SECRET = 'test-signing-secret-0123456789abcdef-router';
const DEPLOY_ORIGIN = 'https://deploy-abc--app.test';

const tokens: Record<string, string> = { [OWNER_TOKEN]: OWNER_ID, [OTHER_TOKEN]: OTHER_ID };
let db: Record<string, Row[]> = {};
let dbCalls: DbCall[] = [];
let fnCalls: FnCall[] = [];
let ocrState: 'running' | 'done' = 'running';
let throwOnImports: Error | null = null;
let ocrStatusOverride: Row | null = null;
let syncOverride: Row | null = null;

function seed() {
  db = {
    imports: [
      { id: OWNER_IMPORT, user_id: OWNER_ID, document_id: OWNER_DOC, status: 'processing', metadata: {} },
      { id: OWNER_IMPORT_2, user_id: OWNER_ID, document_id: null, status: 'processing', metadata: {} },
      { id: OTHER_IMPORT, user_id: OTHER_ID, document_id: 'dddddddd-0000-4000-8000-0000000000bb', status: 'processing', metadata: {} },
      { id: ORPHAN_IMPORT, user_id: null, document_id: OWNER_DOC, status: 'processing', metadata: {} },
    ],
    transactions_staging: [
      { id: 'st-1', import_id: OWNER_IMPORT, tag_status: 'categorized' },
      { id: 'st-2', import_id: OTHER_IMPORT, tag_status: 'categorized' },
    ],
    user_documents: [
      { id: OWNER_DOC, user_id: OWNER_ID, original_name: SECRET_FILE, ocr_status: 'ready' },
      // Row smart-import-init (stubbed) would create for the owner's new upload.
      { id: NEW_DOC, user_id: OWNER_ID, original_name: SECRET_FILE, ocr_status: 'queued' },
    ],
  };
}

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | null = null;
  let limit = Infinity;
  const matches = () =>
    (db[table] || []).filter((r) =>
      filters.every(([k, v]) => {
        if (k.startsWith('in:')) return (v as unknown[]).includes(r[k.slice(3)]);
        if (k.startsWith('is:')) return (r[k.slice(3)] ?? null) === v;
        return r[k] === v;
      })
    );
  const run = () => {
    dbCalls.push({ table, op, filters: [...filters] });
    if (table === 'imports' && throwOnImports) throw throwOnImports;
    if (op === 'update') {
      const rows = matches();
      rows.forEach((r) => Object.assign(r, payload));
      return { data: rows, error: null };
    }
    return { data: matches().slice(0, limit), error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
  const q: any = {
    select: () => q,
    update: (p: Row) => { op = 'update'; payload = p; return q; },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    in: (k: string, v: unknown[]) => { filters.push([`in:${k}`, v]); return q; },
    is: (k: string, v: unknown) => { filters.push([`is:${k}`, v]); return q; },
    order: () => q,
    limit: (n: number) => { limit = n; return q; },
    maybeSingle: async () => {
      const res = run();
      return { data: (res.data as Row[])[0] ?? null, error: null };
    },
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      try {
        return Promise.resolve(run()).then(resolve, reject);
      } catch (e) {
        return Promise.reject(e).then(resolve, reject);
      }
    },
  };
  return q;
}

const fakeClient = {
  auth: {
    getUser: async (token: string) => {
      const id = tokens[token];
      if (!id) return { data: { user: null }, error: { message: 'invalid JWT' } };
      return { data: { user: { id } }, error: null };
    },
  },
  from: (table: string) => query(table),
};

vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient }));
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

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const fakeFetch = vi.fn(async (url: string, init: RequestInit = {}) => {
  const headers: Record<string, string> = {};
  Object.entries((init.headers as Record<string, string>) || {}).forEach(([k, v]) => { headers[k.toLowerCase()] = v; });
  const fnMatch = String(url).match(/\/\.netlify\/functions\/([^/?]+)/);
  const fn = fnMatch ? fnMatch[1] : `external:${url}`;
  let body: Row | null = null;
  if (typeof init.body === 'string') {
    try { body = JSON.parse(init.body); } catch { body = null; }
  }
  fnCalls.push({ fn, url: String(url), method: String(init.method || 'GET'), headers, body });
  switch (fn) {
    case 'smart-import-init':
      return respond({ importId: NEW_IMPORT, documentId: NEW_DOC, uploadUrl: 'https://storage.test/signed-put' });
    case 'smart-import-ocr-background':
      return respond({ ok: true, queued: true });
    case 'ocr-job-status':
      if (ocrStatusOverride) return respond(ocrStatusOverride);
      return respond(ocrState === 'done'
        ? { ok: true, status: 'done', items: [{ status: 'done' }] }
        : { ok: true, status: 'running', items: [{ status: 'running' }] });
    case 'smart-import-sync':
      if (syncOverride) return respond(syncOverride);
      return respond({ ok: true, importIds: [OWNER_IMPORT], transactionCount: 3 });
    case 'smart-import-finalize':
      return respond({ ok: true });
    case 'tag-categorize-batch':
      return respond({ ok: true });
    case 'prime-summary':
      return respond({ ok: true, summary: 'Owner summary' });
    default:
      return respond({ ok: true });
  }
});

const { handler } = await import('../prime-router');
const { verifyJobToken, JOB_TOKEN_HEADER } = await import('../_shared/internalJobAuth');
const OCR_JOB = { audience: 'smart-import-ocr-background' as const, scope: 'ocr.run' as const };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify response shape
async function call(event: Row): Promise<{ statusCode: number; body: string; json: any }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal Netlify event
  const res: any = await handler({ httpMethod: 'POST', queryStringParameters: {}, ...event } as any, {} as any);
  return { statusCode: res.statusCode, body: res.body, json: JSON.parse(res.body || '{}') };
}

function jsonEvent(body: Row, token?: string): Row {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token !== undefined) headers.authorization = `Bearer ${token}`;
  return { headers, body: JSON.stringify(body) };
}

function uploadEvent(opts: { token?: string; userId?: string; fileName?: string }): Row {
  const B = 'XBOUNDARY';
  const parts: string[] = [];
  if (opts.userId !== undefined) {
    parts.push(`--${B}\r\nContent-Disposition: form-data; name="userId"\r\n\r\n${opts.userId}\r\n`);
  }
  parts.push(`--${B}\r\nContent-Disposition: form-data; name="source"\r\n\r\nupload\r\n`);
  parts.push(
    `--${B}\r\nContent-Disposition: form-data; name="file"; filename="${opts.fileName ?? SECRET_FILE}"\r\n` +
      `Content-Type: application/pdf\r\n\r\n%PDF-1.4 fake statement bytes %%EOF\r\n`
  );
  parts.push(`--${B}--\r\n`);
  const headers: Record<string, string> = { 'content-type': `multipart/form-data; boundary=${B}` };
  if (opts.token !== undefined) headers.authorization = `Bearer ${opts.token}`;
  return { headers, body: parts.join(''), isBase64Encoded: false };
}

const fnNames = () => fnCalls.map((c) => c.fn);
const dbWrites = () => dbCalls.filter((c) => c.op !== 'select');
let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];
const loggedText = () =>
  logSpies
    .flatMap((s) => s.mock.calls)
    .map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
    .join('\n');

beforeEach(() => {
  seed();
  dbCalls = [];
  fnCalls = [];
  ocrState = 'running';
  throwOnImports = null;
  ocrStatusOverride = null;
  syncOverride = null;
  process.env.URL = 'https://app.test';
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
  process.env.INTERNAL_JOB_SIGNING_SECRET = SIGNING_SECRET;
  process.env.DEPLOY_URL = DEPLOY_ORIGIN;
  delete process.env.CONTEXT;
  fakeFetch.mockClear();
  vi.stubGlobal('fetch', fakeFetch);
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => undefined)
  );
});

afterEach(() => {
  logSpies.forEach((s) => s.mockRestore());
  vi.unstubAllGlobals();
  delete process.env.INTERNAL_JOB_SIGNING_SECRET;
  delete process.env.DEPLOY_URL;
  delete process.env.CONTEXT;
});

describe('prime-router — authentication (all modes)', () => {
  it.each([
    ['status', jsonEvent({ mode: 'status', importId: OWNER_IMPORT, autoCommit: true })],
    ['summary', jsonEvent({ mode: 'summary', importId: OWNER_IMPORT })],
    ['upload', uploadEvent({ userId: OWNER_ID })],
  ])('%s: missing token → 401 with no DB access or downstream calls', async (_mode, event) => {
    const res = await call(event);
    expect(res.statusCode).toBe(401);
    expect(res.json).toEqual({ ok: false, error: 'Unauthorized' });
    expect(dbCalls).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
  });

  it('invalid token → 401 without echoing the token or verifier detail', async () => {
    const res = await call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT }, 'forged-token-123'));
    expect(res.statusCode).toBe(401);
    expect(res.body).not.toContain('forged-token-123');
    expect(res.body).not.toContain('invalid JWT');
    expect(dbCalls).toHaveLength(0);
    expect(fnCalls).toHaveLength(0);
    expect(loggedText()).not.toContain('forged-token-123');
  });

  it('malformed Authorization header → 401', async () => {
    const ev = jsonEvent({ mode: 'status', importId: OWNER_IMPORT });
    ev.headers.authorization = `Token ${OWNER_TOKEN}`;
    const res = await call(ev);
    expect(res.statusCode).toBe(401);
    expect(fnCalls).toHaveLength(0);
  });
});

describe('prime-router — upload', () => {
  it('authorized upload: init gets the user JWT; background OCR gets a document-scoped job token at this deploy', async () => {
    const res = await call(uploadEvent({ token: OWNER_TOKEN, userId: OWNER_ID }));
    expect(res.statusCode).toBe(200);
    expect(res.json).toMatchObject({ ok: true, mode: 'upload', importId: NEW_IMPORT, documentId: NEW_DOC });
    const init = fnCalls.find((c) => c.fn === 'smart-import-init')!;
    expect(init.body?.userId).toBe(OWNER_ID);
    expect(init.headers.authorization).toBe(`Bearer ${OWNER_TOKEN}`);
    expect(init.url).toBe(`${DEPLOY_ORIGIN}/.netlify/functions/smart-import-init`);
    const ocr = fnCalls.find((c) => c.fn === 'smart-import-ocr-background')!;
    expect(ocr.url).toBe(`${DEPLOY_ORIGIN}/.netlify/functions/smart-import-ocr-background`);
    expect(ocr.headers.authorization).toBeUndefined();
    expect(ocr.body).not.toHaveProperty('userId');
    expect(ocr.body).not.toHaveProperty('isRetry');
    expect(ocr.body).not.toHaveProperty('explicitRecovery');
    const v = verifyJobToken(ocr.headers[JOB_TOKEN_HEADER], OCR_JOB);
    expect(v).toMatchObject({ ok: true, claims: { sub: OWNER_ID, doc: NEW_DOC, scope: 'ocr.run', retry: false, src: 'prime-router' } });
    expect(fnNames()).toContain('external:https://storage.test/signed-put');
  });

  it('job signing not configured → 503 retryable before any record is created', async () => {
    delete process.env.INTERNAL_JOB_SIGNING_SECRET;
    const res = await call(uploadEvent({ token: OWNER_TOKEN }));
    expect(res.statusCode).toBe(503);
    expect(res.json).toMatchObject({ ok: false, retryable: true, error: 'processing_unavailable' });
    expect(fnCalls).toHaveLength(0);
  });

  it('deploy preview without DEPLOY_URL → 503; never falls back to the published site URL', async () => {
    delete process.env.DEPLOY_URL;
    process.env.CONTEXT = 'deploy-preview';
    const res = await call(uploadEvent({ token: OWNER_TOKEN }));
    expect(res.statusCode).toBe(503);
    expect(fnCalls).toHaveLength(0);
    expect(fnCalls.some((c) => c.url.startsWith('https://app.test'))).toBe(false);
  });

  it('a multipart userId that differs from the token → 403, nothing initialised or uploaded', async () => {
    const res = await call(uploadEvent({ token: OTHER_TOKEN, userId: OWNER_ID }));
    expect(res.statusCode).toBe(403);
    expect(res.json).toEqual({ ok: false, error: 'Forbidden' });
    expect(fnCalls).toHaveLength(0);
    expect(dbWrites()).toHaveLength(0);
  });

  it('an upload without a userId field uses the token identity', async () => {
    const res = await call(uploadEvent({ token: OWNER_TOKEN }));
    expect(res.statusCode).toBe(200);
    expect(fnCalls.find((c) => c.fn === 'smart-import-init')?.body?.userId).toBe(OWNER_ID);
  });

  it('does not log the token, the file name or the user id', async () => {
    await call(uploadEvent({ token: OWNER_TOKEN, userId: OWNER_ID }));
    const logs = loggedText();
    expect(logs).not.toContain(OWNER_TOKEN);
    expect(logs).not.toContain(SECRET_FILE);
    expect(logs).not.toContain(OWNER_ID);
  });
});

describe('prime-router — hosted runtime without DEPLOY_URL/CONTEXT (BYTE-LIVE-01)', () => {
  beforeEach(() => {
    // Exactly what hosted staging Functions see: URL and the job secret, no DEPLOY_URL or CONTEXT.
    delete process.env.DEPLOY_URL;
    delete process.env.CONTEXT;
    process.env.URL = 'https://synthetic-staging.netlify.app';
    buildMeta.current = { ...HOSTED_META };
  });
  afterEach(() => {
    buildMeta.current = null;
    process.env.URL = 'https://app.test';
  });

  it('reproduces the staging failure without build metadata: 503 processing_unavailable, nothing created', async () => {
    buildMeta.current = null;
    const res = await call(uploadEvent({ token: OWNER_TOKEN, userId: OWNER_ID }));
    expect(res.statusCode).toBe(503);
    expect(res.json).toMatchObject({ ok: false, step: 'ocr-dispatch', retryable: true, error: 'processing_unavailable' });
    expect(fnCalls).toHaveLength(0);
    expect(dbWrites()).toHaveLength(0);
  });

  it('with build metadata the upload passes the pre-check; init and OCR target this exact deploy', async () => {
    const res = await call(uploadEvent({ token: OWNER_TOKEN, userId: OWNER_ID }));
    expect(res.statusCode).toBe(200);
    expect(res.json).toMatchObject({ ok: true, mode: 'upload', importId: NEW_IMPORT, documentId: NEW_DOC });
    const init = fnCalls.find((c) => c.fn === 'smart-import-init')!;
    expect(init.url).toBe(`${HOSTED_ORIGIN}/.netlify/functions/smart-import-init`);
    const ocr = fnCalls.find((c) => c.fn === 'smart-import-ocr-background')!;
    expect(ocr.url).toBe(`${HOSTED_ORIGIN}/.netlify/functions/smart-import-ocr-background`);
    expect(ocr.headers.authorization).toBeUndefined();
    expect(verifyJobToken(ocr.headers[JOB_TOKEN_HEADER], OCR_JOB)).toMatchObject({ ok: true, claims: { sub: OWNER_ID, doc: NEW_DOC, scope: 'ocr.run' } });
    // Never the site's main URL, never request data.
    expect(fnCalls.filter((c) => c.url.startsWith('http') && !c.fn.startsWith('external:')).every((c) => c.url.startsWith(`${HOSTED_ORIGIN}/`))).toBe(true);
    expect(loggedText()).not.toContain(HOSTED_ORIGIN);
  });

  it('job signing still required: metadata alone never authorizes dispatch', async () => {
    delete process.env.INTERNAL_JOB_SIGNING_SECRET;
    const res = await call(uploadEvent({ token: OWNER_TOKEN }));
    expect(res.statusCode).toBe(503);
    expect(fnCalls).toHaveLength(0);
  });

  it.each([
    ['built for another site', { ...HOSTED_META, siteName: 'other-site', deployUrl: 'https://f00dfacef00dfacef00dface--other-site.netlify.app' }],
    ['deploy URL not matching its deploy id', { ...HOSTED_META, deployUrl: 'https://0123456789abcdef01234567--synthetic-staging.netlify.app' }],
    ['arbitrary external address', { ...HOSTED_META, deployUrl: 'https://attacker.example' }],
    ['plain http', { ...HOSTED_META, deployUrl: 'http://f00dfacef00dfacef00dface--synthetic-staging.netlify.app' }],
  ])('metadata %s is rejected → 503, nothing created', async (_l, meta) => {
    buildMeta.current = meta;
    const res = await call(uploadEvent({ token: OWNER_TOKEN }));
    expect(res.statusCode).toBe(503);
    expect(fnCalls).toHaveLength(0);
  });

  it('a deploy-preview build calls its own deploy, never the published site URL', async () => {
    buildMeta.current = { ...HOSTED_META, context: 'deploy-preview' };
    const res = await call(uploadEvent({ token: OWNER_TOKEN }));
    expect(res.statusCode).toBe(200);
    expect(fnCalls.some((c) => c.url.startsWith('https://synthetic-staging.netlify.app'))).toBe(false);
    expect(fnCalls.find((c) => c.fn === 'smart-import-ocr-background')!.url.startsWith(`${HOSTED_ORIGIN}/`)).toBe(true);
  });
});

describe('prime-router — status', () => {
  it("another user's import → 403 before any OCR, sync or commit call", async () => {
    ocrState = 'done';
    const res = await call(jsonEvent({ mode: 'status', importId: OTHER_IMPORT, autoCommit: true }, OWNER_TOKEN));
    expect(res.statusCode).toBe(403);
    expect(res.json).toEqual({ ok: false, error: 'Forbidden' });
    expect(fnCalls).toHaveLength(0);
    expect(dbWrites()).toHaveLength(0);
    expect(res.body).not.toContain(OTHER_ID);
  });

  it('a body userId cannot claim someone else\'s import', async () => {
    const res = await call(
      jsonEvent({ mode: 'status', importId: OTHER_IMPORT, userId: OTHER_ID, autoCommit: true }, OWNER_TOKEN)
    );
    expect(res.statusCode).toBe(403);
    expect(fnCalls).toHaveLength(0);
  });

  it('an ownerless import fails closed (403)', async () => {
    const res = await call(jsonEvent({ mode: 'status', importId: ORPHAN_IMPORT, autoCommit: true }, OWNER_TOKEN));
    expect(res.statusCode).toBe(403);
    expect(fnCalls).toHaveLength(0);
  });

  it('an unknown import → 404', async () => {
    const res = await call(
      jsonEvent({ mode: 'status', importId: 'ffffffff-0000-4000-8000-000000000000', autoCommit: true }, OWNER_TOKEN)
    );
    expect(res.statusCode).toBe(404);
    expect(fnCalls).toHaveLength(0);
  });

  it('owner polling while OCR runs → running, with the token forwarded and no sync', async () => {
    const res = await call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT, autoCommit: true }, OWNER_TOKEN));
    expect(res.statusCode).toBe(200);
    expect(res.json).toMatchObject({ ok: true, mode: 'status', status: 'running' });
    const st = fnCalls.find((c) => c.fn === 'ocr-job-status')!;
    expect(st.body).toMatchObject({ userId: OWNER_ID, docIds: [OWNER_DOC] });
    expect(st.headers.authorization).toBe(`Bearer ${OWNER_TOKEN}`);
    expect(fnNames()).not.toContain('smart-import-sync');
  });

  it('owner import with no document yet → running, without echoing identity', async () => {
    const res = await call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT_2, autoCommit: true }, OWNER_TOKEN));
    expect(res.statusCode).toBe(200);
    expect(res.json.status).toBe('running');
    expect(res.body).not.toContain(OWNER_ID);
    expect(fnCalls).toHaveLength(0);
  });
});

describe('prime-router — commit requests', () => {
  it('OCR complete with autoCommit omitted → no sync/finalize (no commit)', async () => {
    ocrState = 'done';
    const res = await call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT }, OWNER_TOKEN));
    expect(res.statusCode).toBe(200);
    expect(res.json).toMatchObject({ status: 'ocr_complete', committed: false, reason: 'auto_commit_not_requested' });
    expect(fnNames()).not.toContain('smart-import-sync');
    expect(fnNames()).not.toContain('smart-import-finalize');
  });

  it('OCR complete with autoCommit:false → no sync/finalize (no commit)', async () => {
    ocrState = 'done';
    const res = await call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT, autoCommit: false }, OWNER_TOKEN));
    expect(res.json.committed).toBe(false);
    expect(fnNames()).not.toContain('smart-import-sync');
  });

  it('OCR complete with autoCommit:true → sync + finalize for the owner, token forwarded', async () => {
    ocrState = 'done';
    const res = await call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT, autoCommit: true }, OWNER_TOKEN));
    expect(res.statusCode).toBe(200);
    expect(res.json.status).toBe('complete');
    const sync = fnCalls.find((c) => c.fn === 'smart-import-sync')!;
    expect(sync.body).toMatchObject({ userId: OWNER_ID, docIds: [OWNER_DOC], autoCommit: true });
    expect(sync.headers.authorization).toBe(`Bearer ${OWNER_TOKEN}`);
    const fin = fnCalls.find((c) => c.fn === 'smart-import-finalize')!;
    expect(fin.body).toMatchObject({ userId: OWNER_ID, docId: OWNER_DOC });
  });

  it("autoCommit:true on another user's import commits nothing", async () => {
    ocrState = 'done';
    const res = await call(jsonEvent({ mode: 'status', importId: OTHER_IMPORT, autoCommit: true }, OWNER_TOKEN));
    expect(res.statusCode).toBe(403);
    expect(fnNames()).not.toContain('smart-import-sync');
    expect(fnNames()).not.toContain('smart-import-finalize');
  });
});

describe('prime-router — summary', () => {
  it("a mix of own and another user's imports → 403 before any lock write, Tag or summary call", async () => {
    const res = await call(jsonEvent({ mode: 'summary', importIds: [OWNER_IMPORT, OTHER_IMPORT] }, OWNER_TOKEN));
    expect(res.statusCode).toBe(403);
    expect(fnCalls).toHaveLength(0);
    expect(dbWrites()).toHaveLength(0);
    expect(db.imports.find((r) => r.id === OTHER_IMPORT)?.metadata).toEqual({});
  });

  it('an unknown import id → 404 with no side effects', async () => {
    const res = await call(
      jsonEvent({ mode: 'summary', importId: 'ffffffff-0000-4000-8000-000000000000' }, OWNER_TOKEN)
    );
    expect(res.statusCode).toBe(404);
    expect(fnCalls).toHaveLength(0);
    expect(dbWrites()).toHaveLength(0);
  });

  it('owner summary → prime-summary called with the token forwarded', async () => {
    const res = await call(jsonEvent({ mode: 'summary', importId: OWNER_IMPORT }, OWNER_TOKEN));
    expect(res.statusCode).toBe(200);
    expect(res.json).toMatchObject({ ok: true, mode: 'summary', ready: true });
    const sum = fnCalls.find((c) => c.fn === 'prime-summary')!;
    expect(sum.body?.importId).toBe(OWNER_IMPORT);
    expect(sum.headers.authorization).toBe(`Bearer ${OWNER_TOKEN}`);
  });
});

describe('prime-router — status reliability (R0 traceId scope)', () => {
  const statusCall = () =>
    call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT, autoCommit: true, importRunId: 'run-123' }, OWNER_TOKEN));
  const noReferenceErrorLogged = () => expect(loggedText()).not.toMatch(/ReferenceError|traceId is not defined/);

  it('terminal malformed-PDF OCR → 200 terminal (was a 500 ReferenceError)', async () => {
    ocrStatusOverride = { ok: true, status: 'error', items: [{ status: 'error', error_code: 'malformed_pdf', error: 'invalid pdf structure' }] };
    const res = await statusCall();
    expect(res.statusCode).toBe(200);
    expect(res.json).toMatchObject({ status: 'error', terminal: true, retryable: false, error_code: 'malformed_pdf' });
    expect(fnNames()).not.toContain('smart-import-sync');
    noReferenceErrorLogged();
  });

  it('non-terminal OCR item error → 200 status:error', async () => {
    ocrStatusOverride = { ok: true, status: 'error', items: [{ status: 'failed', error: 'provider hiccup' }] };
    const res = await statusCall();
    expect(res.statusCode).toBe(200);
    expect(res.json.status).toBe('error');
    noReferenceErrorLogged();
  });

  it('sync ocr_unusable → 200 terminal unusable_ocr_text', async () => {
    ocrState = 'done';
    syncOverride = { ok: false, state: 'ocr_unusable' };
    const res = await statusCall();
    expect(res.statusCode).toBe(200);
    expect(res.json).toMatchObject({ terminal: true, state: 'ocr_unusable', error_code: 'unusable_ocr_text' });
    expect(fnNames()).not.toContain('smart-import-finalize');
    noReferenceErrorLogged();
  });

  it('sync ocr_rejected → 200 terminal malformed_pdf', async () => {
    ocrState = 'done';
    syncOverride = { ok: false, state: 'ocr_rejected' };
    const res = await statusCall();
    expect(res.statusCode).toBe(200);
    expect(res.json).toMatchObject({ terminal: true, state: 'ocr_rejected', error_code: 'malformed_pdf' });
    noReferenceErrorLogged();
  });

  it('logs the status run id as traceId on the terminal path', async () => {
    ocrStatusOverride = { ok: true, status: 'error', items: [{ status: 'error', error_code: 'malformed_pdf' }] };
    await statusCall();
    expect(loggedText()).toContain('run-123');
  });
});

describe('prime-router — same-deploy downstream calls (C1b)', () => {
  it('status polling forwards the user JWT only to this deploy (DEPLOY_URL), not the published site URL', async () => {
    process.env.URL = 'https://published.example';
    await call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT, autoCommit: true }, OWNER_TOKEN));
    const st = fnCalls.find((c) => c.fn === 'ocr-job-status')!;
    expect(st.url).toBe(`${DEPLOY_ORIGIN}/.netlify/functions/ocr-job-status`);
    expect(fnCalls.some((c) => c.url.startsWith('https://published.example'))).toBe(false);
  });

  it('deploy preview without DEPLOY_URL → status returns 503 retryable and calls nothing', async () => {
    delete process.env.DEPLOY_URL;
    process.env.CONTEXT = 'deploy-preview';
    process.env.URL = 'https://published.example';
    const res = await call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT, autoCommit: true }, OWNER_TOKEN));
    expect(res.statusCode).toBe(503);
    expect(res.json).toEqual({ ok: false, retryable: true, error: 'processing_unavailable' });
    expect(fnCalls).toHaveLength(0);
  });

  it('summary in a deploy preview without DEPLOY_URL → 503 and its processing lock is released', async () => {
    delete process.env.DEPLOY_URL;
    process.env.CONTEXT = 'deploy-preview';
    db.transactions_staging[0].tag_status = null;
    const res = await call(jsonEvent({ mode: 'summary', importId: OWNER_IMPORT }, OWNER_TOKEN));
    expect(res.statusCode).toBe(503);
    expect(fnCalls).toHaveLength(0);
    expect(db.imports.find((r) => r.id === OWNER_IMPORT)?.metadata?.processing_lock).toBeUndefined();
  });
});

describe('prime-router — stale-lock OCR recovery (C1b)', () => {
  beforeEach(() => {
    db.user_documents.find((d) => d.id === OWNER_DOC)!.ocr_status = 'processing';
    ocrStatusOverride = { ok: true, status: 'running', items: [{ status: 'recovering_stale_lock' }] };
  });

  it("re-kicks OCR for the owner's document with a retry-signed job token, never the user JWT", async () => {
    const res = await call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT, autoCommit: true }, OWNER_TOKEN));
    expect(res.statusCode).toBe(200);
    expect(res.json.details.recoveryKickoff).toBe('triggered');
    const ocr = fnCalls.find((c) => c.fn === 'smart-import-ocr-background')!;
    expect(ocr.url).toBe(`${DEPLOY_ORIGIN}/.netlify/functions/smart-import-ocr-background`);
    expect(ocr.headers.authorization).toBeUndefined();
    expect(ocr.body).not.toHaveProperty('isRetry');
    expect(verifyJobToken(ocr.headers[JOB_TOKEN_HEADER], OCR_JOB))
      .toMatchObject({ ok: true, claims: { sub: OWNER_ID, doc: OWNER_DOC, retry: true } });
  });

  it('job signing unavailable → recovery reported as failed and nothing is sent', async () => {
    delete process.env.INTERNAL_JOB_SIGNING_SECRET;
    const res = await call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT, autoCommit: true }, OWNER_TOKEN));
    expect(res.json.details.recoveryKickoff).toBe('failed');
    expect(fnNames()).not.toContain('smart-import-ocr-background');
  });
});

describe('prime-router — error hygiene', () => {
  it('does not echo raw internal error text', async () => {
    throwOnImports = new Error('relation "imports" leaked-internal-detail');
    const res = await call(jsonEvent({ mode: 'status', importId: OWNER_IMPORT, autoCommit: true }, OWNER_TOKEN));
    expect(res.statusCode).toBe(500);
    expect(res.json).toEqual({ ok: false, error: 'prime-router failed' });
    expect(loggedText()).not.toContain('leaked-internal-detail');
  });
});

/**
 * C0 — immediate security containment.
 *
 * reset-test-uploads: dev-only (fail closed), verified JWT, own data only — no deletions otherwise.
 * vision-ocr / ocr-ingest-simple: verified JWT before any paid provider call.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type DbCall = { table: string; op: string; filters: Array<[string, unknown]> };

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const VICTIM_ID = '22222222-2222-4222-8222-222222222222';
const OWNER_TOKEN = 'owner-jwt-token-abc';
const tokens: Record<string, string> = { [OWNER_TOKEN]: OWNER_ID };

let db: Record<string, Row[]> = {};
let dbCalls: DbCall[] = [];
let storageRemoved: string[] = [];
let failDocsQuery = false;

function seed() {
  const recent = new Date().toISOString();
  db = {
    user_documents: [
      { id: 'doc-owner', user_id: OWNER_ID, storage_path: `${OWNER_ID}/doc-owner/a.pdf`, created_at: recent, status: 'ready' },
      { id: 'doc-victim', user_id: VICTIM_ID, storage_path: `${VICTIM_ID}/doc-victim/b.pdf`, created_at: recent, status: 'ready' },
    ],
    imports: [
      { id: 'imp-owner', user_id: OWNER_ID, document_id: 'doc-owner' },
      { id: 'imp-victim', user_id: VICTIM_ID, document_id: 'doc-victim' },
    ],
    transactions_staging: [
      { id: 'st-owner', user_id: OWNER_ID, import_id: 'imp-owner' },
      { id: 'st-victim', user_id: VICTIM_ID, import_id: 'imp-victim' },
    ],
    transactions: [
      { id: 'tx-owner', user_id: OWNER_ID, import_id: 'imp-owner', document_id: 'doc-owner' },
      { id: 'tx-victim', user_id: VICTIM_ID, import_id: 'imp-victim', document_id: 'doc-victim' },
    ],
  };
}

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | null = null;
  const matches = () =>
    (db[table] || []).filter((r) =>
      filters.every(([k, v]) => {
        if (k.startsWith('in:')) return (v as unknown[]).includes(r[k.slice(3)]);
        if (k.startsWith('gte:')) return String(r[k.slice(4)]) >= String(v);
        return r[k] === v;
      })
    );
  const run = () => {
    dbCalls.push({ table, op, filters: [...filters] });
    if (table === 'user_documents' && op === 'select' && failDocsQuery) {
      return { data: null, error: { message: 'relation leaked-internal-detail' } };
    }
    const rows = matches();
    if (op === 'delete') {
      db[table] = (db[table] || []).filter((r) => !rows.includes(r));
      return { data: rows, error: null };
    }
    if (op === 'update') {
      rows.forEach((r) => Object.assign(r, payload));
      return { data: rows, error: null };
    }
    return { data: rows, error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
  const q: any = {
    select: () => q,
    delete: () => { op = 'delete'; return q; },
    update: (p: Row) => { op = 'update'; payload = p; return q; },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    in: (k: string, v: unknown[]) => { filters.push([`in:${k}`, v]); return q; },
    gte: (k: string, v: unknown) => { filters.push([`gte:${k}`, v]); return q; },
    order: () => q,
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(run()).then(resolve, reject),
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
  storage: {
    from: () => ({
      remove: async (paths: string[]) => {
        storageRemoved.push(...paths);
        return { data: paths.map((name) => ({ name })), error: null };
      },
    }),
  },
};

const visionDetect = vi.fn(async () => [{ fullTextAnnotation: { text: 'vision text' } }]);
const openaiCreate = vi.fn(async () => ({
  choices: [{ message: { content: '{"merchant":"Shop","date":"2026-01-01","total":1,"currency":"CAD","tax":0,"items":[]}' } }],
}));
const openaiConstructed = vi.fn();

vi.mock('../_shared/supabase', () => ({ admin: () => fakeClient }));
vi.mock('../_shared/upload', () => ({ admin: () => fakeClient }));
vi.mock('../_shared/rate-limit-v2', () => ({
  withRateLimit: (h: unknown) => h,
  getPresetOptions: () => ({}),
}));
vi.mock('@google-cloud/vision', () => ({
  default: {
    ImageAnnotatorClient: class {
      documentTextDetection = visionDetect;
    },
  },
}));
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: openaiCreate } };
    constructor() {
      openaiConstructed();
    }
  },
}));

const reset = await import('../reset-test-uploads');
const vision = await import('../vision-ocr');
const ingest = await import('../ocr-ingest-simple');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler/response shapes
async function invoke(h: any, opts: { token?: string; headers?: Record<string, string>; body?: Row; method?: string }) {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(opts.headers || {}) };
  if (opts.token !== undefined) headers.authorization = `Bearer ${opts.token}`;
  const res = await h({ httpMethod: opts.method || 'POST', headers, body: JSON.stringify(opts.body || {}) }, {});
  return { statusCode: res.statusCode as number, body: String(res.body || ''), json: JSON.parse(res.body || '{}') };
}

const deletes = () => dbCalls.filter((c) => c.op === 'delete' || c.op === 'update');
const ENV_KEYS = ['CONTEXT', 'NODE_ENV', 'NETLIFY_DEV', 'ALLOW_TEST_RESET', 'OPENAI_API_KEY'] as const;
const savedEnv: Record<string, string | undefined> = {};
let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];
const loggedText = () =>
  logSpies.flatMap((s) => s.mock.calls).map((a) => a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')).join('\n');

function devEnv() {
  delete process.env.CONTEXT;
  process.env.NODE_ENV = 'test';
  process.env.NETLIFY_DEV = 'true';
}

beforeEach(() => {
  ENV_KEYS.forEach((k) => { savedEnv[k] = process.env[k]; delete process.env[k]; });
  process.env.NODE_ENV = 'test';
  seed();
  dbCalls = [];
  storageRemoved = [];
  failDocsQuery = false;
  visionDetect.mockClear();
  openaiCreate.mockClear();
  openaiConstructed.mockClear();
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});

afterEach(() => {
  ENV_KEYS.forEach((k) => { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k]; });
  logSpies.forEach((s) => s.mockRestore());
});

describe('reset-test-uploads — environment gate (fail closed)', () => {
  it('isResetEndpointEnabled: only Netlify Dev or explicit ALLOW_TEST_RESET, never production', () => {
    const f = reset.isResetEndpointEnabled;
    expect(f({} as NodeJS.ProcessEnv)).toBe(false);
    expect(f({ NETLIFY_DEV: 'true' } as NodeJS.ProcessEnv)).toBe(true);
    expect(f({ ALLOW_TEST_RESET: '1' } as NodeJS.ProcessEnv)).toBe(true);
    expect(f({ CONTEXT: 'production', NETLIFY_DEV: 'true' } as NodeJS.ProcessEnv)).toBe(false);
    expect(f({ CONTEXT: 'production', ALLOW_TEST_RESET: '1' } as NodeJS.ProcessEnv)).toBe(false);
    expect(f({ NODE_ENV: 'production', ALLOW_TEST_RESET: '1' } as NodeJS.ProcessEnv)).toBe(false);
    expect(f({ CONTEXT: 'deploy-preview' } as NodeJS.ProcessEnv)).toBe(false);
  });

  it.each([
    ['no dev flags (default)', {}],
    ['CONTEXT=production even with a valid token and NETLIFY_DEV', { CONTEXT: 'production', NETLIFY_DEV: 'true' }],
    ['NODE_ENV=production with ALLOW_TEST_RESET', { NODE_ENV: 'production', ALLOW_TEST_RESET: '1' }],
  ])('%s → 404, nothing read or deleted', async (_label, env) => {
    Object.assign(process.env, env);
    const res = await invoke(reset.handler, { token: OWNER_TOKEN, body: { confirm: 'RESET' } });
    expect(res.statusCode).toBe(404);
    expect(dbCalls).toHaveLength(0);
    expect(storageRemoved).toHaveLength(0);
  });
});

describe('reset-test-uploads — authentication and authorization (dev enabled)', () => {
  beforeEach(devEnv);

  it('the old attack (x-user-id header only, no token) → 401, nothing deleted', async () => {
    const res = await invoke(reset.handler, { headers: { 'x-user-id': VICTIM_ID }, body: { confirm: 'RESET', days: 3650 } });
    expect(res.statusCode).toBe(401);
    expect(dbCalls).toHaveLength(0);
    expect(storageRemoved).toHaveLength(0);
    expect(db.transactions.find((t) => t.id === 'tx-victim')).toBeDefined();
  });

  it('invalid token → 401 without echoing it', async () => {
    const res = await invoke(reset.handler, { token: 'forged-token-123', body: { confirm: 'RESET' } });
    expect(res.statusCode).toBe(401);
    expect(res.body).not.toContain('forged-token-123');
    expect(dbCalls).toHaveLength(0);
  });

  it("a valid token naming another user in x-user-id → 403, nothing deleted", async () => {
    const res = await invoke(reset.handler, {
      token: OWNER_TOKEN,
      headers: { 'x-user-id': VICTIM_ID },
      body: { confirm: 'RESET' },
    });
    expect(res.statusCode).toBe(403);
    expect(dbCalls).toHaveLength(0);
    expect(storageRemoved).toHaveLength(0);
  });

  it("owner reset deletes only the owner's data; the other user's rows and files are untouched", async () => {
    const res = await invoke(reset.handler, { token: OWNER_TOKEN, body: { confirm: 'RESET' } });
    expect(res.statusCode).toBe(200);
    expect(res.json.ok).toBe(true);
    for (const c of deletes()) expect(c.filters).toContainEqual(['user_id', OWNER_ID]);
    expect(db.transactions.map((t) => t.id)).toEqual(['tx-victim']);
    expect(db.transactions_staging.map((t) => t.id)).toEqual(['st-victim']);
    expect(db.imports.map((t) => t.id)).toEqual(['imp-victim']);
    expect(storageRemoved.every((p) => p.startsWith(`${OWNER_ID}/`))).toBe(true);
    expect(db.user_documents.find((d) => d.id === 'doc-victim')?.status).toBe('ready');
  });

  it('still requires the RESET confirmation for an authenticated owner', async () => {
    const res = await invoke(reset.handler, { token: OWNER_TOKEN, body: {} });
    expect(res.statusCode).toBe(400);
    expect(deletes()).toHaveLength(0);
  });

  it('does not echo database error text', async () => {
    failDocsQuery = true;
    const res = await invoke(reset.handler, { token: OWNER_TOKEN, body: { confirm: 'RESET' } });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('leaked-internal-detail');
  });
});

describe('vision-ocr — verified auth before any paid Google Vision call', () => {
  it('no token → 401, no Vision call', async () => {
    const res = await invoke(vision.handler, { body: { base64: 'AAAA' } });
    expect(res.statusCode).toBe(401);
    expect(visionDetect).not.toHaveBeenCalled();
  });

  it('invalid token → 401, no Vision call', async () => {
    const res = await invoke(vision.handler, { token: 'forged', body: { base64: 'AAAA' } });
    expect(res.statusCode).toBe(401);
    expect(visionDetect).not.toHaveBeenCalled();
  });

  it('valid token → Vision runs', async () => {
    const res = await invoke(vision.handler, { token: OWNER_TOKEN, body: { base64: 'AAAA' } });
    expect(res.statusCode).toBe(200);
    expect(res.json.text).toBe('vision text');
    expect(visionDetect).toHaveBeenCalledTimes(1);
  });

  it('provider errors are not echoed (no key-file path leak)', async () => {
    visionDetect.mockRejectedValueOnce(new Error('ENOENT secrets/google-vision-key.json'));
    const res = await invoke(vision.handler, { token: OWNER_TOKEN, body: { base64: 'AAAA' } });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('google-vision-key');
    expect(loggedText()).not.toContain('google-vision-key');
  });
});

describe('ocr-ingest-simple — verified auth before any paid OpenAI call', () => {
  beforeEach(() => { process.env.OPENAI_API_KEY = 'test-openai-key'; });

  it('no token → 401, OpenAI never constructed or called', async () => {
    const res = await invoke(ingest.handler, { body: { ocrText: 'RECEIPT Shop $1.00' } });
    expect(res.statusCode).toBe(401);
    expect(openaiConstructed).not.toHaveBeenCalled();
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  it('invalid token → 401, no OpenAI call', async () => {
    const res = await invoke(ingest.handler, { token: 'forged', body: { imageUrl: 'https://example.test/x.png' } });
    expect(res.statusCode).toBe(401);
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  it('missing API key is not revealed to unauthenticated callers', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await invoke(ingest.handler, { body: { ocrText: 'x' } });
    expect(res.statusCode).toBe(401);
    expect(res.body).not.toContain('OPENAI_API_KEY');
  });

  it('valid token → parses the receipt', async () => {
    const res = await invoke(ingest.handler, { token: OWNER_TOKEN, body: { ocrText: 'RECEIPT Shop $1.00' } });
    expect(res.statusCode).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(openaiCreate).toHaveBeenCalled();
  });

  it('OpenAI errors are not echoed', async () => {
    openaiCreate.mockRejectedValueOnce(new Error('401 Incorrect API key sk-leaked-detail'));
    const res = await invoke(ingest.handler, { token: OWNER_TOKEN, body: { ocrText: 'RECEIPT Shop $1.00' } });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('sk-leaked-detail');
    expect(loggedText()).not.toContain('sk-leaked-detail');
  });
});

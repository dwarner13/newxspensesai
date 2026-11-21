/**
 * P0-A — prime-summary authorization.
 *
 * "Possession of another user's importId or docId is insufficient authorization."
 *
 * Drives the PRODUCTION prime-summary handler against an in-memory stand-in for the
 * service-role Supabase client (no RLS — every scoping guarantee must come from the code).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type Call = { table: string; op: string; filters: Array<[string, unknown]> };

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const OWNER_TOKEN = 'owner-jwt-token-abc';
const OTHER_TOKEN = 'other-jwt-token-xyz';
const OWNER_IMPORT = 'aaaaaaaa-0000-4000-8000-000000000001';
const OWNER_DOC = 'dddddddd-0000-4000-8000-000000000001';
const ORPHAN_IMPORT = 'aaaaaaaa-0000-4000-8000-0000000000ff';
const SECRET_MERCHANT = 'SECRET-MERCHANT-OWNER-ONLY';
const SECRET_DOC_NAME = 'owner-private-statement.pdf';

const tokens: Record<string, string> = { [OWNER_TOKEN]: OWNER_ID, [OTHER_TOKEN]: OTHER_ID };
let db: Record<string, Row[]> = {};
let calls: Call[] = [];
let throwOnImports: Error | null = null;

function seed() {
  db = {
    imports: [
      {
        id: OWNER_IMPORT,
        user_id: OWNER_ID,
        status: 'completed',
        created_at: '2026-11-01T00:00:00Z',
        document_id: OWNER_DOC,
        file_url: `uploads/${SECRET_DOC_NAME}`,
        statement_breakdown_json: null,
        metadata: {},
      },
      {
        id: ORPHAN_IMPORT,
        user_id: null,
        status: 'completed',
        created_at: '2026-11-01T00:00:00Z',
        document_id: null,
        file_url: null,
        statement_breakdown_json: null,
        metadata: {},
      },
    ],
    import_summaries: [],
    transactions_staging: [
      {
        id: 'tx-1',
        import_id: OWNER_IMPORT,
        data_json: { description: SECRET_MERCHANT, amount: -42.5, date: '2026-10-03' },
        tag_category: 'Dining',
        tag_status: 'categorized',
      },
    ],
    transactions: [],
    user_documents: [
      { id: OWNER_DOC, user_id: OWNER_ID, original_name: SECRET_DOC_NAME, summary: null, extracted_data: {} },
    ],
    documents: [],
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
        if (k.startsWith('contains:')) {
          const col = k.slice('contains:'.length);
          const sub = v as Row;
          return Object.entries(sub).every(([sk, sv]) => r[col]?.[sk] === sv);
        }
        return r[k] === v;
      })
    );
  const run = () => {
    calls.push({ table, op, filters: [...filters] });
    if (table === 'imports' && throwOnImports) throw throwOnImports;
    if (op === 'upsert') {
      const existing = (db[table] || []).find((r) => r.import_id === payload!.import_id);
      if (existing) Object.assign(existing, payload);
      else (db[table] ||= []).push({ ...payload });
      return { data: [payload], error: null };
    }
    return { data: matches().slice(0, limit), error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
  const q: any = {
    select: () => q,
    upsert: (p: Row) => { op = 'upsert'; payload = p; return q; },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    contains: (k: string, v: unknown) => { filters.push([`contains:${k}`, v]); return q; },
    order: () => q,
    limit: (n: number) => { limit = n; return q; },
    maybeSingle: async () => {
      const res = run();
      const rows = res.data as Row[];
      return { data: rows[0] ?? null, error: null };
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

const fakeAdmin = {
  auth: {
    getUser: async (token: string) => {
      const id = tokens[token];
      if (!id) return { data: { user: null }, error: { message: 'invalid JWT' } };
      return { data: { user: { id } }, error: null };
    },
  },
  from: (table: string) => query(table),
};

vi.mock('../_shared/supabase', () => ({ admin: () => fakeAdmin }));
vi.mock('../_shared/primeSummarizer', () => ({
  runLLMAdvisorSummary: async ({ deterministicNarrative }: { deterministicNarrative: string }) => deterministicNarrative,
}));
vi.mock('../_shared/guardrails-unified', () => ({
  runGuardrailsForText: async (text: string) => ({ ok: true, text, signals: {} }),
}));

const { handler } = await import('../prime-summary');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify event/response shapes
async function invoke(body: Row, authorization?: string): Promise<{ statusCode: number; body: string; json: any }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (authorization !== undefined) headers.authorization = authorization;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal Netlify event
  const res: any = await handler({ httpMethod: 'POST', headers, body: JSON.stringify(body) } as any, {} as any);
  return { statusCode: res.statusCode, body: res.body, json: JSON.parse(res.body || '{}') };
}

const tablesTouched = () => Array.from(new Set(calls.map((c) => c.table)));
let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];
const loggedText = () =>
  logSpies
    .flatMap((s) => s.mock.calls)
    .map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
    .join('\n');

beforeEach(() => {
  seed();
  calls = [];
  throwOnImports = null;
  delete process.env.PRIME_SUMMARY_ALLOW_LLM;
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => undefined)
  );
});

afterEach(() => {
  logSpies.forEach((s) => s.mockRestore());
});

describe('prime-summary — authentication', () => {
  it('rejects a request with no Authorization header (401) before touching data', async () => {
    const res = await invoke({ importId: OWNER_IMPORT });
    expect(res.statusCode).toBe(401);
    expect(res.json).toEqual({ ok: false, error: 'Unauthorized' });
    expect(calls).toHaveLength(0);
  });

  it('rejects a malformed Authorization header (401)', async () => {
    const res = await invoke({ importId: OWNER_IMPORT }, `Token ${OWNER_TOKEN}`);
    expect(res.statusCode).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('rejects an invalid token (401) without echoing the token or verifier detail', async () => {
    const res = await invoke({ importId: OWNER_IMPORT }, 'Bearer forged-token-123');
    expect(res.statusCode).toBe(401);
    expect(res.json).toEqual({ ok: false, error: 'Unauthorized' });
    expect(res.body).not.toContain('forged-token-123');
    expect(res.body).not.toContain('invalid JWT');
    expect(calls).toHaveLength(0);
    expect(loggedText()).not.toContain('forged-token-123');
  });

  it('ignores a userId supplied in the body (identity comes only from the JWT)', async () => {
    const res = await invoke({ importId: OWNER_IMPORT, userId: OWNER_ID }, `Bearer ${OTHER_TOKEN}`);
    expect(res.statusCode).toBe(403);
  });
});

describe('prime-summary — cross-user access', () => {
  it("returns 403 for another user's importId and reads nothing beyond the import row", async () => {
    const res = await invoke({ importId: OWNER_IMPORT }, `Bearer ${OTHER_TOKEN}`);
    expect(res.statusCode).toBe(403);
    expect(res.json).toEqual({ ok: false, error: 'Forbidden' });
    expect(res.body).not.toContain(SECRET_MERCHANT);
    expect(res.body).not.toContain(SECRET_DOC_NAME);
    expect(tablesTouched()).toEqual(['imports']);
    expect(db.import_summaries).toHaveLength(0);
  });

  it("does not resolve another user's docId to their import", async () => {
    const res = await invoke({ docId: OWNER_DOC }, `Bearer ${OTHER_TOKEN}`);
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toContain(OWNER_IMPORT);
    expect(res.body).not.toContain(SECRET_MERCHANT);
    const docLookup = calls.find((c) => c.table === 'imports' && c.filters.some(([k]) => k === 'document_id'));
    expect(docLookup?.filters).toContainEqual(['user_id', OTHER_ID]);
    expect(tablesTouched()).toEqual(['imports']);
  });

  it('fails closed (403) for an import row with no owner', async () => {
    const res = await invoke({ importId: ORPHAN_IMPORT }, `Bearer ${OWNER_TOKEN}`);
    expect(res.statusCode).toBe(403);
    expect(tablesTouched()).toEqual(['imports']);
  });

  it('keeps statement contents and tokens out of logs on denial', async () => {
    await invoke({ importId: OWNER_IMPORT }, `Bearer ${OTHER_TOKEN}`);
    const logs = loggedText();
    expect(logs).not.toContain(OTHER_TOKEN);
    expect(logs).not.toContain(SECRET_MERCHANT);
    expect(logs).not.toContain(SECRET_DOC_NAME);
  });
});

describe('prime-summary — authorized access', () => {
  it("generates the summary for the owner's importId", async () => {
    const res = await invoke({ importId: OWNER_IMPORT }, `Bearer ${OWNER_TOKEN}`);
    expect(res.statusCode).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(typeof res.json.summary).toBe('string');
    expect(res.json.summary).toContain(`/dashboard/transactions?importId=${OWNER_IMPORT}`);
    expect(db.import_summaries).toHaveLength(1);
    expect(db.import_summaries[0].user_id).toBe(OWNER_ID);
    expect(res.body).not.toContain(OWNER_TOKEN);
  });

  it("resolves the owner's own docId to their import", async () => {
    const res = await invoke({ docId: OWNER_DOC }, `Bearer ${OWNER_TOKEN}`);
    expect(res.statusCode).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(res.json.summary).toContain(`importId=${OWNER_IMPORT}`);
  });

  it('scopes document lookups to the authenticated user', async () => {
    await invoke({ importId: OWNER_IMPORT }, `Bearer ${OWNER_TOKEN}`);
    const docCalls = calls.filter((c) => c.table === 'user_documents' || c.table === 'documents');
    expect(docCalls.length).toBeGreaterThan(0);
    for (const c of docCalls) {
      expect(c.filters).toContainEqual(['user_id', OWNER_ID]);
    }
  });

  it('does not echo raw internal error text to the client', async () => {
    throwOnImports = new Error('relation "imports" leaked-internal-detail');
    const res = await invoke({ importId: OWNER_IMPORT }, `Bearer ${OWNER_TOKEN}`);
    expect(res.statusCode).toBe(200);
    expect(res.json.ok).toBe(false);
    expect(res.body).not.toContain('leaked-internal-detail');
    expect(loggedText()).not.toContain('leaked-internal-detail');
  });
});

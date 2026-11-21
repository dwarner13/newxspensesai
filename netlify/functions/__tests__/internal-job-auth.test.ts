/**
 * P0-C1a — internal job authentication foundation (not wired into any live function yet).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHmac, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const DOC_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const DOC_A2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const DOC_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const DOC_ORPHAN = 'cccccccc-0000-4000-8000-000000000001';
const IMP_A = 'dddddddd-0000-4000-8000-000000000001';
const IMP_A_OTHER_DOC = 'dddddddd-0000-4000-8000-000000000002';
const IMP_B = 'eeeeeeee-0000-4000-8000-000000000001';
const TOKEN_A = 'user-a-jwt';

const SECRET = 'test-signing-secret-0123456789abcdef-current';
const PREVIOUS = 'test-signing-secret-0123456789abcdef-previous';
const SERVICE_KEY = 'test-service-role-key-0123456789abcdef-xyz';
const ENV = { INTERNAL_JOB_SIGNING_SECRET: SECRET, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY };

let db: Record<string, Row[]> = {};
let failLookups: 'error' | 'throw' | null = null;
let lookups: Array<{ table: string; filters: Array<[string, unknown]> }> = [];

function seed() {
  db = {
    user_documents: [
      { id: DOC_A, user_id: USER_A },
      { id: DOC_A2, user_id: USER_A },
      { id: DOC_B, user_id: USER_B },
      { id: DOC_ORPHAN, user_id: null },
    ],
    imports: [
      { id: IMP_A, user_id: USER_A, document_id: DOC_A },
      { id: IMP_A_OTHER_DOC, user_id: USER_A, document_id: DOC_A2 },
      { id: IMP_B, user_id: USER_B, document_id: DOC_B },
    ],
  };
}

const sb = {
  from(table: string) {
    const filters: Array<[string, unknown]> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
    const q: any = {
      select: () => q,
      eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
      maybeSingle: async () => {
        lookups.push({ table, filters: [...filters] });
        if (failLookups === 'throw') throw new Error('db down leaked-detail');
        if (failLookups === 'error') return { data: null, error: { message: 'leaked-detail' } };
        const row = (db[table] || []).find((r) => filters.every(([k, v]) => r[k] === v)) ?? null;
        return { data: row, error: null };
      },
    };
    return q;
  },
};

vi.mock('../_shared/supabase', () => ({
  admin: () => ({
    auth: {
      getUser: async (token: string) =>
        token === TOKEN_A
          ? { data: { user: { id: USER_A } }, error: null }
          : { data: { user: null }, error: { message: 'invalid JWT' } },
    },
  }),
}));

const lib = await import('../_shared/internalJobAuth');
const urls = await import('../_shared/internalBaseUrl');
const {
  JOB_TOKEN_HEADER,
  JOB_SCOPES,
  MAX_TTL_SECONDS,
  MAX_TOKEN_LENGTH,
  CLOCK_SKEW_SECONDS,
  JobAuthConfigError,
  isJobAuthConfigured,
  authenticateUser,
  verifyOwnership,
  issueJobToken,
  verifyJobToken,
  authenticateJobRequest,
  authorizeJobRequest,
  jobTokenHeaders,
  claimedUserIdMatches,
} = lib;

// ── helpers ──────────────────────────────────────────────────────────────────

const b64u = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
/** Hand-craft a token with arbitrary claims, signed with `secret` (to test claim validation). */
function craft(claims: Row, secret = SECRET): string {
  const part = b64u(Buffer.from(JSON.stringify(claims), 'utf8'));
  const sig = b64u(createHmac('sha256', secret).update(`v1.${part}`).digest());
  return `v1.${part}.${sig}`;
}
const NOW = 1_800_000_000;
function claimsFor(over: Row = {}): Row {
  return {
    v: 1, sub: USER_A, doc: DOC_A, aud: 'normalize-transactions', scope: 'normalize.run',
    retry: false, iat: NOW, exp: NOW + 300, jti: randomUUID(), src: 'test-caller', ...over,
  };
}
const NORMALIZE = { audience: 'normalize-transactions' as const, scope: 'normalize.run' as const, env: ENV, now: NOW };

async function userProof(target: { documentId: string; importId?: string } = { documentId: DOC_A }) {
  const a = await authenticateUser({ headers: { authorization: `Bearer ${TOKEN_A}` } });
  if (!a.ok) throw new Error('auth failed in test setup');
  const o = await verifyOwnership(sb, a.principal, target);
  if (!o.ok) throw new Error(`ownership failed in test setup: ${o.code}`);
  return o.proof;
}

let warnSpy: ReturnType<typeof vi.spyOn>;
let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];
const logged = () =>
  logSpies.flatMap((s) => s.mock.calls).map((a) => a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')).join('\n');

beforeEach(() => {
  seed();
  failLookups = null;
  lookups = [];
  logSpies = (['log', 'info', 'error'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  logSpies.push(warnSpy);
});
afterEach(() => logSpies.forEach((s) => s.mockRestore()));

// ── configuration ────────────────────────────────────────────────────────────

describe('configuration (fail closed)', () => {
  it('requires a current secret of at least 32 chars that is not the service-role key', () => {
    expect(isJobAuthConfigured({})).toBe(false);
    expect(isJobAuthConfigured({ INTERNAL_JOB_SIGNING_SECRET: 'short' })).toBe(false);
    expect(isJobAuthConfigured({ INTERNAL_JOB_SIGNING_SECRET: SERVICE_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY })).toBe(false);
    expect(isJobAuthConfigured(ENV)).toBe(true);
  });

  it('issuing throws JobAuthConfigError and verifying returns 500 when unconfigured', async () => {
    const proof = await userProof();
    expect(() => issueJobToken(proof, { scope: 'normalize.run', src: 'x', env: {} })).toThrow(JobAuthConfigError);
    const token = issueJobToken(proof, { scope: 'normalize.run', src: 'x', env: ENV, now: NOW });
    expect(verifyJobToken(token, { ...NORMALIZE, env: {} })).toMatchObject({ ok: false, status: 500, code: 'not_configured' });
  });

  it('config error text never contains the secret', () => {
    expect(new JobAuthConfigError().message).not.toContain(SECRET);
  });
});

// ── no commit scope ──────────────────────────────────────────────────────────

describe('no scope authorizes commits', () => {
  it('scopes are exactly ocr.run, csv.parse, normalize.run — none targets commit/approve', () => {
    expect([...JOB_SCOPES].sort()).toEqual(['csv.parse', 'normalize.run', 'ocr.run']);
    for (const s of JOB_SCOPES) expect(s).not.toMatch(/commit|approve/i);
  });

  it('issuing a commit scope throws', async () => {
    const proof = await userProof();
    for (const scope of ['commit.run', 'transactions.commit', 'approve.run']) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately invalid scope
      expect(() => issueJobToken(proof, { scope: scope as any, src: 'x', env: ENV })).toThrow();
    }
  });

  it('a correctly signed token claiming a commit scope / commit-import audience is rejected', () => {
    const t = craft(claimsFor({ scope: 'commit.run', aud: 'commit-import' }));
    expect(verifyJobToken(t, NORMALIZE)).toMatchObject({ ok: false, code: 'malformed' });
  });
});

// ── issuance gating ──────────────────────────────────────────────────────────

describe('issuance requires an authenticated, ownership-verified operation', () => {
  it('a hand-built proof object is rejected', () => {
    const forged = { userId: USER_B, documentId: DOC_B, retryAllowed: true, via: 'user_jwt' as const };
    expect(() => issueJobToken(forged, { scope: 'normalize.run', src: 'x', env: ENV })).toThrow(/verified ownership proof/);
  });

  it('a hand-built principal cannot obtain an ownership proof', async () => {
    const forged = { userId: USER_B, via: 'user_jwt' as const };
    expect(await verifyOwnership(sb, forged, { documentId: DOC_B })).toMatchObject({ ok: false, status: 401 });
    expect(lookups).toHaveLength(0);
  });

  it('authenticateUser: no token / invalid token → 401; valid → principal from the JWT only', async () => {
    expect(await authenticateUser({ headers: {} })).toMatchObject({ ok: false, status: 401 });
    expect(await authenticateUser({ headers: { authorization: 'Bearer forged' } })).toMatchObject({ ok: false, status: 401 });
    const ok = await authenticateUser({ headers: { authorization: `Bearer ${TOKEN_A}`, 'x-user-id': USER_B } });
    expect(ok.ok && ok.principal.userId).toBe(USER_A);
  });

  it('proof objects are frozen (cannot be retargeted after the ownership check)', async () => {
    const proof = await userProof();
    expect(Object.isFrozen(proof)).toBe(true);
    expect(() => { (proof as { userId: string }).userId = USER_B; }).toThrow();
  });

  it('src and ttl are validated; ttl is capped at the scope maximum', async () => {
    const proof = await userProof();
    expect(() => issueJobToken(proof, { scope: 'ocr.run', src: 'Bad Src!', env: ENV })).toThrow();
    expect(() => issueJobToken(proof, { scope: 'ocr.run', src: 'x', ttlSeconds: 0, env: ENV })).toThrow();
    const t = issueJobToken(proof, { scope: 'ocr.run', src: 'x', ttlSeconds: 99_999, env: ENV, now: NOW });
    const v = verifyJobToken(t, { audience: 'smart-import-ocr-background', scope: 'ocr.run', env: ENV, now: NOW });
    expect(v.ok && v.claims.exp - v.claims.iat).toBe(MAX_TTL_SECONDS['ocr.run']);
  });
});

// ── ownership checks ─────────────────────────────────────────────────────────

describe('verifyOwnership (database)', () => {
  const principalA = async () => {
    const a = await authenticateUser({ headers: { authorization: `Bearer ${TOKEN_A}` } });
    if (!a.ok) throw new Error('setup');
    return a.principal;
  };

  it('own document (and own import for that document) → proof; queries are scoped by user_id', async () => {
    const r = await verifyOwnership(sb, await principalA(), { documentId: DOC_A, importId: IMP_A });
    expect(r).toMatchObject({ ok: true, proof: { userId: USER_A, documentId: DOC_A, importId: IMP_A, retryAllowed: false } });
    for (const l of lookups) expect(l.filters).toContainEqual(['user_id', USER_A]);
  });

  it.each([
    ['another user\'s document', { documentId: DOC_B }],
    ['an ownerless document', { documentId: DOC_ORPHAN }],
    ['a missing document', { documentId: 'ffffffff-0000-4000-8000-000000000000' }],
    ['another user\'s import', { documentId: DOC_A, importId: IMP_B }],
    ['own import that belongs to a different document', { documentId: DOC_A, importId: IMP_A_OTHER_DOC }],
    ['a non-uuid id', { documentId: '../etc' }],
  ])('%s → 403', async (_l, target) => {
    expect(await verifyOwnership(sb, await principalA(), target)).toMatchObject({ ok: false, status: 403 });
  });

  it('defence in depth: a row owned by someone else is rejected even if the query ignored user_id', async () => {
    // Simulates a query-builder/RLS mistake that returns the row by id alone.
    const sloppy = {
      from(table: string) {
        let id: unknown;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable stand-in
        const q: any = {
          select: () => q,
          eq: (k: string, v: unknown) => { if (k === 'id') id = v; return q; },
          maybeSingle: async () => ({ data: (db[table] || []).find((r) => r.id === id) ?? null, error: null }),
        };
        return q;
      },
    };
    const p = await principalA();
    expect(await verifyOwnership(sloppy, p, { documentId: DOC_B })).toMatchObject({ ok: false, status: 403 });
    expect(await verifyOwnership(sloppy, p, { documentId: DOC_ORPHAN })).toMatchObject({ ok: false, status: 403 });
    expect(await verifyOwnership(sloppy, p, { documentId: DOC_A, importId: IMP_B })).toMatchObject({ ok: false, status: 403 });
  });

  it('database error or exception → 500 lookup_failed (fail closed), no error text leaked', async () => {
    const p = await principalA();
    failLookups = 'error';
    expect(await verifyOwnership(sb, p, { documentId: DOC_A })).toMatchObject({ ok: false, status: 500, code: 'lookup_failed' });
    failLookups = 'throw';
    expect(await verifyOwnership(sb, p, { documentId: DOC_A })).toMatchObject({ ok: false, status: 500, code: 'lookup_failed' });
    expect(logged()).not.toContain('leaked-detail');
  });
});

// ── round trip and receiver authorization ────────────────────────────────────

describe('issue → authorizeJobRequest', () => {
  it('round trip yields a proof bound to the token, ignoring any body/header identity', async () => {
    const token = issueJobToken(await userProof(), { scope: 'normalize.run', src: 'smart-import-sync', env: ENV, now: NOW });
    const r = await authorizeJobRequest(
      { headers: { [JOB_TOKEN_HEADER]: token, 'x-user-id': USER_B } },
      sb,
      NORMALIZE
    );
    expect(r).toMatchObject({ ok: true, proof: { userId: USER_A, documentId: DOC_A, via: 'job_token' } });
    expect(claimedUserIdMatches(USER_B, USER_A)).toBe(false);
    expect(claimedUserIdMatches(undefined, USER_A)).toBe(true);
    expect(claimedUserIdMatches(USER_A, USER_A)).toBe(true);
  });

  it('header lookup is case-insensitive; jobTokenHeaders uses the single header name', async () => {
    const token = issueJobToken(await userProof(), { scope: 'normalize.run', src: 'x', env: ENV, now: NOW });
    expect(jobTokenHeaders(token)).toEqual({ [JOB_TOKEN_HEADER]: token });
    const r = authenticateJobRequest({ headers: { 'X-XAI-Job-Token': token } }, NORMALIZE);
    expect(r.ok).toBe(true);
  });

  it('a valid token is re-checked against the database: ownership change → 403', async () => {
    const token = issueJobToken(await userProof(), { scope: 'normalize.run', src: 'x', env: ENV, now: NOW });
    db.user_documents.find((d) => d.id === DOC_A)!.user_id = USER_B;
    expect(await authorizeJobRequest({ headers: { [JOB_TOKEN_HEADER]: token } }, sb, NORMALIZE))
      .toMatchObject({ ok: false, status: 403, code: 'not_owned' });
  });

  it('a correctly signed token naming user A but user B\'s document → 403 not_owned', async () => {
    const t = craft(claimsFor({ doc: DOC_B }));
    expect(await authorizeJobRequest({ headers: { [JOB_TOKEN_HEADER]: t } }, sb, NORMALIZE))
      .toMatchObject({ ok: false, status: 403, code: 'not_owned' });
  });
});

// ── token rejection cases ────────────────────────────────────────────────────

describe('verifyJobToken rejects', () => {
  const v = (t: unknown, over: Partial<typeof NORMALIZE> = {}) => verifyJobToken(t, { ...NORMALIZE, ...over });

  it('missing / empty / non-string', () => {
    for (const t of [undefined, '', 42, null]) expect(v(t)).toMatchObject({ ok: false, status: 401, code: 'missing' });
  });

  it('oversized', () => {
    expect(v('v1.' + 'a'.repeat(MAX_TOKEN_LENGTH))).toMatchObject({ ok: false, code: 'oversized' });
  });

  it.each([
    ['two parts', 'v1.abc'],
    ['four parts', 'v1.a.b.c'],
    ['wrong version prefix', 'v2.abc.def'],
    ['non-base64url characters', 'v1.ab+c.de/f'],
  ])('malformed: %s', (_l, t) => {
    expect(v(t)).toMatchObject({ ok: false, code: 'malformed' });
  });

  it('signature of the wrong length / wrong secret / tampered claims', () => {
    const good = craft(claimsFor());
    const [p, c] = good.split('.');
    expect(v(`${p}.${c}.${b64u(Buffer.alloc(16))}`)).toMatchObject({ code: 'bad_signature' });
    expect(v(craft(claimsFor(), 'some-other-secret-0123456789abcdefghij'))).toMatchObject({ code: 'bad_signature' });
    const tampered = b64u(Buffer.from(JSON.stringify(claimsFor({ sub: USER_B })), 'utf8'));
    expect(v(`v1.${tampered}.${good.split('.')[2]}`)).toMatchObject({ code: 'bad_signature' });
  });

  it.each([
    ['extra claim', { admin: true }],
    ['wrong claims version', { v: 2 }],
    ['non-uuid sub', { sub: 'not-a-uuid' }],
    ['non-uuid doc', { doc: '../x' }],
    ['non-boolean retry', { retry: 'yes' }],
    ['non-integer exp', { exp: 'later' }],
    ['scope/audience mismatch', { scope: 'ocr.run', aud: 'normalize-transactions' }],
  ])('signed but invalid claims: %s', (_l, over) => {
    expect(v(craft(claimsFor(over)))).toMatchObject({ ok: false, code: 'malformed' });
  });

  it('missing claim', () => {
    const c = claimsFor();
    delete c.jti;
    expect(v(craft(c))).toMatchObject({ ok: false, code: 'malformed' });
  });

  it('non-JSON payload with a valid signature', () => {
    const part = b64u(Buffer.from('not json', 'utf8'));
    const sig = b64u(createHmac('sha256', SECRET).update(`v1.${part}`).digest());
    expect(v(`v1.${part}.${sig}`)).toMatchObject({ code: 'malformed' });
  });

  it('wrong audience / wrong scope for this receiver', async () => {
    const ocr = issueJobToken(await userProof(), { scope: 'ocr.run', src: 'x', env: ENV, now: NOW });
    expect(v(ocr)).toMatchObject({ ok: false, code: 'audience' });
    expect(verifyJobToken(ocr, { audience: 'smart-import-ocr-background', scope: 'csv.parse' as never, env: ENV, now: NOW }))
      .toMatchObject({ ok: false });
  });

  it('expired (beyond skew), still valid within skew, and not-yet-valid', () => {
    const t = craft(claimsFor());
    expect(v(t, { now: NOW + 300 + CLOCK_SKEW_SECONDS + 1 })).toMatchObject({ ok: false, code: 'expired' });
    expect(v(t, { now: NOW + 300 + CLOCK_SKEW_SECONDS })).toMatchObject({ ok: true });
    expect(v(t, { now: NOW - CLOCK_SKEW_SECONDS - 1 })).toMatchObject({ ok: false, code: 'not_yet_valid' });
  });

  it('lifetime longer than the scope maximum, or exp <= iat', () => {
    expect(v(craft(claimsFor({ exp: NOW + MAX_TTL_SECONDS['normalize.run'] + 1 })))).toMatchObject({ code: 'ttl' });
    expect(v(craft(claimsFor({ exp: NOW })))).toMatchObject({ code: 'ttl' });
  });
});

// ── rotation ─────────────────────────────────────────────────────────────────

describe('secret rotation', () => {
  it('tokens signed with the previous secret verify only while PREVIOUS is configured', () => {
    const old = craft(claimsFor(), PREVIOUS);
    const rotating = { ...ENV, INTERNAL_JOB_SIGNING_SECRET_PREVIOUS: PREVIOUS };
    expect(verifyJobToken(old, { ...NORMALIZE, env: rotating })).toMatchObject({ ok: true });
    expect(verifyJobToken(old, NORMALIZE)).toMatchObject({ ok: false, code: 'bad_signature' });
  });

  it('new tokens are signed with the current secret only', async () => {
    const rotating = { ...ENV, INTERNAL_JOB_SIGNING_SECRET_PREVIOUS: PREVIOUS };
    const t = issueJobToken(await userProof(), { scope: 'normalize.run', src: 'x', env: rotating, now: NOW });
    expect(verifyJobToken(t, NORMALIZE)).toMatchObject({ ok: true });
    expect(verifyJobToken(t, { ...NORMALIZE, env: { INTERNAL_JOB_SIGNING_SECRET: PREVIOUS } })).toMatchObject({ ok: false });
  });

  it('a PREVIOUS value equal to the service-role key is ignored', () => {
    const t = craft(claimsFor(), SERVICE_KEY);
    expect(verifyJobToken(t, { ...NORMALIZE, env: { ...ENV, INTERNAL_JOB_SIGNING_SECRET_PREVIOUS: SERVICE_KEY } }))
      .toMatchObject({ ok: false, code: 'bad_signature' });
  });
});

// ── delegation (job-token principals) ────────────────────────────────────────

describe('delegation from a job token cannot widen access', () => {
  async function jobPrincipal(retry: boolean, withImport = false) {
    const proof = await userProof(withImport ? { documentId: DOC_A, importId: IMP_A } : { documentId: DOC_A });
    const t = issueJobToken(proof, { scope: 'ocr.run', src: 'smart-import-finalize', retry, env: ENV, now: NOW });
    const a = authenticateJobRequest({ headers: { [JOB_TOKEN_HEADER]: t } },
      { audience: 'smart-import-ocr-background', scope: 'ocr.run', env: ENV, now: NOW });
    if (!a.ok) throw new Error('setup');
    return a.principal;
  }

  it('can prove ownership of its bound document and issue a child token for it', async () => {
    const p = await jobPrincipal(false);
    const o = await verifyOwnership(sb, p, { documentId: DOC_A });
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    const child = issueJobToken(o.proof, { scope: 'normalize.run', src: 'smart-import-ocr-background', env: ENV, now: NOW });
    const v = verifyJobToken(child, NORMALIZE);
    expect(v.ok && v.claims.sub).toBe(USER_A);
    expect(v.ok && v.claims.doc).toBe(DOC_A);
  });

  it('cannot prove ownership of a different document of the same user (binding)', async () => {
    expect(await verifyOwnership(sb, await jobPrincipal(false), { documentId: DOC_A2 }))
      .toMatchObject({ ok: false, status: 403, code: 'binding' });
  });

  it('cannot add or change an import it was not bound to', async () => {
    expect(await verifyOwnership(sb, await jobPrincipal(false), { documentId: DOC_A, importId: IMP_A }))
      .toMatchObject({ ok: false, code: 'binding' });
    expect(await verifyOwnership(sb, await jobPrincipal(false, true), { documentId: DOC_A, importId: IMP_A_OTHER_DOC }))
      .toMatchObject({ ok: false, code: 'binding' });
  });

  it('retry propagates only if the parent token carried it', async () => {
    const noRetry = await verifyOwnership(sb, await jobPrincipal(false), { documentId: DOC_A });
    const withRetry = await verifyOwnership(sb, await jobPrincipal(true), { documentId: DOC_A });
    if (!noRetry.ok || !withRetry.ok) throw new Error('setup');
    const c1 = verifyJobToken(issueJobToken(noRetry.proof, { scope: 'normalize.run', src: 'x', retry: true, env: ENV, now: NOW }), NORMALIZE);
    const c2 = verifyJobToken(issueJobToken(withRetry.proof, { scope: 'normalize.run', src: 'x', retry: true, env: ENV, now: NOW }), NORMALIZE);
    expect(c1.ok && c1.claims.retry).toBe(false);
    expect(c2.ok && c2.claims.retry).toBe(true);
  });
});

// ── user-JWT or job-token receivers (normalize-transactions) ─────────────────

describe('authorizeUserOrJobRequest', () => {
  const { authorizeUserOrJobRequest } = lib;
  const exp = (requestedDocumentId?: unknown) => ({ ...NORMALIZE, requestedDocumentId });

  it('valid job token → proof from the token; a different requested document → 403 binding', async () => {
    const token = issueJobToken(await userProof(), { scope: 'normalize.run', src: 'x', env: ENV, now: NOW });
    expect(await authorizeUserOrJobRequest({ headers: { [JOB_TOKEN_HEADER]: token } }, sb, exp(undefined)))
      .toMatchObject({ ok: true, via: 'job_token', proof: { userId: USER_A, documentId: DOC_A } });
    expect(await authorizeUserOrJobRequest({ headers: { [JOB_TOKEN_HEADER]: token } }, sb, exp(DOC_A2)))
      .toMatchObject({ ok: false, status: 403, code: 'binding' });
  });

  it('an invalid job token is rejected even when a valid JWT is also present (no silent fallback)', async () => {
    const r = await authorizeUserOrJobRequest(
      { headers: { [JOB_TOKEN_HEADER]: 'v1.bad.token', authorization: `Bearer ${TOKEN_A}` } },
      sb,
      exp(DOC_A)
    );
    expect(r).toMatchObject({ ok: false, status: 401 });
  });

  it('user JWT + owned document → proof; + another user\'s document → 403; no document → 401', async () => {
    const h = { headers: { authorization: `Bearer ${TOKEN_A}` } };
    expect(await authorizeUserOrJobRequest(h, sb, exp(DOC_A))).toMatchObject({ ok: true, via: 'user_jwt', proof: { userId: USER_A } });
    expect(await authorizeUserOrJobRequest(h, sb, exp(DOC_B))).toMatchObject({ ok: false, status: 403 });
    expect(await authorizeUserOrJobRequest(h, sb, exp(undefined))).toMatchObject({ ok: false, status: 401 });
  });

  it('no credentials → 401 with no database lookups', async () => {
    expect(await authorizeUserOrJobRequest({ headers: {} }, sb, exp(DOC_A))).toMatchObject({ ok: false, status: 401 });
    expect(lookups).toHaveLength(0);
  });
});

// ── logging hygiene ──────────────────────────────────────────────────────────

describe('logging', () => {
  it('never logs tokens, secrets or user/document ids — only reason codes', async () => {
    const token = issueJobToken(await userProof(), { scope: 'normalize.run', src: 'x', env: ENV, now: NOW });
    await authorizeJobRequest({ headers: { [JOB_TOKEN_HEADER]: token } }, sb, NORMALIZE);
    verifyJobToken(token, { ...NORMALIZE, audience: 'smart-import-parse-csv' as never });
    verifyJobToken(token.slice(0, -2) + 'AA', NORMALIZE);
    verifyJobToken(craft(claimsFor({ doc: DOC_B })), NORMALIZE);
    const text = logged();
    expect(text).not.toContain(token);
    expect(text).not.toContain(token.split('.')[1]);
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain(USER_A);
    expect(text).not.toContain(DOC_A);
    expect(warnSpy).toHaveBeenCalled();
  });
});

// ── internal base URL ────────────────────────────────────────────────────────

describe('getInternalBaseUrl / buildInternalFunctionUrl', () => {
  const { getInternalBaseUrl, buildInternalFunctionUrl, InternalBaseUrlError } = urls;

  it('prefers DEPLOY_URL; falls back to URL only in the production context; normalises to an origin', () => {
    expect(getInternalBaseUrl({ DEPLOY_URL: 'https://abc--site.netlify.app/', URL: 'https://site.example' }))
      .toBe('https://abc--site.netlify.app');
    expect(getInternalBaseUrl({ CONTEXT: 'production', URL: 'https://site.example' })).toBe('https://site.example');
  });

  it.each([
    ['deploy-preview', { CONTEXT: 'deploy-preview', URL: 'https://site.example' }],
    ['branch-deploy', { CONTEXT: 'branch-deploy', URL: 'https://site.example' }],
    ['unknown / missing context', { URL: 'https://site.example' }],
  ])('%s without DEPLOY_URL never falls back to the main URL (fails closed)', (_l, env) => {
    expect(() => getInternalBaseUrl(env)).toThrow(InternalBaseUrlError);
  });

  it('a deploy preview with DEPLOY_URL targets that deploy, not the published site', () => {
    expect(getInternalBaseUrl({
      CONTEXT: 'deploy-preview',
      DEPLOY_URL: 'https://deploy-preview-7--xspensesai-staging.netlify.app',
      URL: 'https://xspensesai-staging.netlify.app',
      NETLIFY_URL: 'https://xspensesai-staging.netlify.app',
    })).toBe('https://deploy-preview-7--xspensesai-staging.netlify.app');
  });

  it('ignores NETLIFY_URL and never reads request data', () => {
    expect(() => getInternalBaseUrl({ NETLIFY_URL: 'https://attacker.example' })).toThrow(InternalBaseUrlError);
    // Passing an event-shaped object does not help: it has no DEPLOY_URL/URL keys.
    expect(() => getInternalBaseUrl({ headers: 'host: attacker.example' } as never)).toThrow(InternalBaseUrlError);
    expect(getInternalBaseUrl.length).toBeLessThanOrEqual(1);
  });

  it('Netlify Dev falls back to localhost; production without configuration fails closed', () => {
    expect(getInternalBaseUrl({ NETLIFY_DEV: 'true' })).toBe('http://localhost:8888');
    expect(getInternalBaseUrl({ NETLIFY_DEV: 'true', NETLIFY_LOCAL_PORT: '9999' })).toBe('http://localhost:9999');
    expect(() => getInternalBaseUrl({})).toThrow(InternalBaseUrlError);
  });

  it.each([
    ['plain http outside dev', { CONTEXT: 'production', URL: 'http://site.example' }],
    ['http localhost outside dev', { CONTEXT: 'production', URL: 'http://localhost:8888' }],
    ['credentials in URL', { CONTEXT: 'production', URL: 'https://user:pass@site.example' }],
    ['path', { CONTEXT: 'production', URL: 'https://site.example/evil' }],
    ['query', { CONTEXT: 'production', URL: 'https://site.example?x=1' }],
    ['not a URL', { CONTEXT: 'production', URL: 'site.example' }],
    ['javascript scheme', { CONTEXT: 'production', URL: 'javascript:alert(1)' }],
    ['bad DEPLOY_URL', { DEPLOY_URL: 'http://deploy.example' }],
  ])('rejects %s', (_l, env) => {
    expect(() => getInternalBaseUrl(env)).toThrow(InternalBaseUrlError);
  });

  it('builds function URLs only for valid function names', () => {
    const env = { DEPLOY_URL: 'https://site.example' };
    expect(buildInternalFunctionUrl('normalize-transactions', env))
      .toBe('https://site.example/.netlify/functions/normalize-transactions');
    for (const bad of ['../chat', 'Normalize', 'a/b', '', 'x?y=1']) {
      expect(() => buildInternalFunctionUrl(bad, env)).toThrow();
    }
  });
});

// ── browser exposure guards (static) ─────────────────────────────────────────

describe('server-only guarantees (static source checks)', () => {
  const root = path.resolve(__dirname, '../../..');
  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p, out);
      else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) out.push(p);
    }
    return out;
  }

  it('no frontend file references the signing secret or imports the server-only modules', () => {
    const offenders = walk(path.join(root, 'src')).filter((f) => {
      const s = fs.readFileSync(f, 'utf8');
      return /INTERNAL_JOB_SIGNING|VITE_INTERNAL_JOB|internalJobAuth|internalBaseUrl/.test(s);
    });
    expect(offenders).toEqual([]);
  });

  it('signatures are compared with timingSafeEqual, and the module only logs via logDeny', () => {
    const src = fs.readFileSync(path.join(root, 'netlify/functions/_shared/internalJobAuth.ts'), 'utf8');
    expect(src).toMatch(/timingSafeEqual\(provided, sign\(secret, claimsPart\)\)/);
    expect((src.match(/console\./g) || []).length).toBe(1);
  });
});

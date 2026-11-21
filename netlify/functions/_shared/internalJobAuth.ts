/**
 * Internal job authentication (P0-C1a) — SERVER-ONLY.
 *
 * Short-lived, HMAC-SHA256-signed job tokens that let one Netlify Function ask another to do
 * work for a specific, already-verified user and document/import — including after the user's
 * Supabase session has expired (long-running OCR).
 *
 * Token:   v1.<base64url(JSON claims)>.<base64url(HMAC-SHA256(secret, "v1." + claimsPart))>
 * Header:  x-xai-job-token   (never in a body, URL or log)
 * Claims:  { v, sub, doc, imp?, aud, scope, retry, iat, exp, jti, src }
 *
 * Guarantees
 * - No scope authorises committing transactions. Commits only happen under a real user JWT.
 * - Each scope is valid for exactly one receiving function (audience) and has a maximum TTL.
 * - Tokens can only be issued from an OwnershipProof. Proofs can only be created by
 *   `verifyOwnership`, which needs a JobPrincipal, which can only be created by
 *   `authenticateUser` (Supabase JWT) or `authenticateJobRequest` (verified job token).
 *   Proofs and principals are tracked in module-private WeakSets, so a hand-built object is
 *   rejected at runtime: there is no path from a client-supplied userId to a token.
 * - A principal that came from a job token can only prove ownership of the same document /
 *   import its token was bound to, and can only pass on `retry` if its own token carried it.
 * - Secrets: INTERNAL_JOB_SIGNING_SECRET (required) and INTERNAL_JOB_SIGNING_SECRET_PREVIOUS
 *   (optional, rotation). Both must be >= 32 chars and must not equal the Supabase service-role
 *   key. Missing/invalid current secret => issuing throws and verification rejects (fail closed).
 *   These must be configured with Netlify "Functions" scope only and never with a VITE_ prefix.
 * - Logs carry reason codes only — never tokens, secrets, user text or financial data.
 *
 * RECEIVING FUNCTIONS MUST (documented contract; enforced by `authorizeJobRequest`):
 *   1. Call `authorizeJobRequest(event, sb, { audience: '<this function>', scope: '<scope>' })`
 *      before reading the body for identity or doing any work.
 *   2. On `ok: false`, return `status` with a generic body; do no work and no paid calls.
 *   3. Use ONLY `proof.userId`, `proof.documentId`, `proof.importId` for identity and selection.
 *      Ignore body `userId` / `x-user-id`; if one is present and differs, reject with 403.
 *   4. Scope every read/write by `user_id = proof.userId` as well as by id.
 *   5. Honour retry / forced reprocessing only when `proof.retryAllowed` is true — never from
 *      body flags such as `isRetry` / `explicitRecovery`.
 *   6. Send onward work only via `issueJobToken` from a fresh `verifyOwnership` proof, and only
 *      to `buildInternalFunctionUrl()` (see internalBaseUrl.ts).
 */

import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { verifyAuth } from './verifyAuth.js';

export const JOB_TOKEN_HEADER = 'x-xai-job-token';
const TOKEN_PREFIX = 'v1';
const CLAIMS_VERSION = 1;

/** Every scope maps to exactly one receiving function. There is deliberately no commit scope. */
const SCOPE_AUDIENCE = {
  'ocr.run': 'smart-import-ocr-background',
  'csv.parse': 'smart-import-parse-csv',
  'normalize.run': 'normalize-transactions',
} as const;

export type JobScope = keyof typeof SCOPE_AUDIENCE;
export type JobAudience = (typeof SCOPE_AUDIENCE)[JobScope];
export const JOB_SCOPES = Object.freeze(Object.keys(SCOPE_AUDIENCE) as JobScope[]);

/** Maximum lifetime per scope (seconds). OCR covers a 15-minute background function. */
export const MAX_TTL_SECONDS: Readonly<Record<JobScope, number>> = Object.freeze({
  'ocr.run': 20 * 60,
  'csv.parse': 5 * 60,
  'normalize.run': 5 * 60,
});

export const MAX_TOKEN_LENGTH = 2048;
export const CLOCK_SKEW_SECONDS = 30;
export const MIN_SECRET_LENGTH = 32;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const B64URL_RE = /^[A-Za-z0-9_-]+$/;
const SRC_RE = /^[a-z0-9][a-z0-9:_-]{0,63}$/;
const CLAIM_KEYS = new Set(['v', 'sub', 'doc', 'imp', 'aud', 'scope', 'retry', 'iat', 'exp', 'jti', 'src']);

export interface JobClaims {
  v: 1;
  sub: string;
  doc: string;
  imp?: string;
  aud: JobAudience;
  scope: JobScope;
  retry: boolean;
  iat: number;
  exp: number;
  jti: string;
  src: string;
}

export type DenyCode =
  | 'missing'
  | 'malformed'
  | 'oversized'
  | 'bad_signature'
  | 'audience'
  | 'scope'
  | 'expired'
  | 'not_yet_valid'
  | 'ttl'
  | 'not_configured'
  | 'unauthenticated'
  | 'not_owned'
  | 'binding'
  | 'lookup_failed';

export type JobAuthFailure = { ok: false; status: 401 | 403 | 500; code: DenyCode };

// ── Configuration ────────────────────────────────────────────────────────────

type Env = Record<string, string | undefined>;

export class JobAuthConfigError extends Error {
  constructor() {
    super('Internal job authentication is not configured');
    this.name = 'JobAuthConfigError';
  }
}

function isUsableSecret(value: string | undefined, env: Env): value is string {
  if (typeof value !== 'string' || value.length < MIN_SECRET_LENGTH) return false;
  // Never let the Supabase service-role key double as a signing secret.
  if (env.SUPABASE_SERVICE_ROLE_KEY && value === env.SUPABASE_SERVICE_ROLE_KEY) return false;
  return true;
}

/** Signing uses the current key only; verification accepts current then previous. */
function getKeys(env: Env): { current: string; verify: string[] } | null {
  const current = env.INTERNAL_JOB_SIGNING_SECRET;
  if (!isUsableSecret(current, env)) return null;
  const previous = env.INTERNAL_JOB_SIGNING_SECRET_PREVIOUS;
  const verify = [current];
  if (isUsableSecret(previous, env) && previous !== current) verify.push(previous);
  return { current, verify };
}

export function isJobAuthConfigured(env: Env = process.env): boolean {
  return getKeys(env) !== null;
}

// ── Encoding / signing ───────────────────────────────────────────────────────

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(secret: string, claimsPart: string): Buffer {
  return createHmac('sha256', secret).update(`${TOKEN_PREFIX}.${claimsPart}`).digest();
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function logDeny(code: DenyCode, audience?: string): void {
  // Reason code and audience only. Never the token, secret, ids or request content.
  console.warn('[internal-job-auth] denied', { code, ...(audience ? { aud: audience } : {}) });
}

function deny(status: 401 | 403 | 500, code: DenyCode, audience?: string): JobAuthFailure {
  logDeny(code, audience);
  return { ok: false, status, code };
}

// ── Principals and ownership proofs (unforgeable at runtime) ─────────────────

export interface JobPrincipal {
  readonly userId: string;
  readonly via: 'user_jwt' | 'job_token';
  /** Present when via === 'job_token': the resources this principal may act on. */
  readonly bound?: { readonly doc: string; readonly imp?: string; readonly retry: boolean };
}

export interface OwnershipProof {
  readonly userId: string;
  readonly documentId: string;
  readonly importId?: string;
  /** True only when a verified job token explicitly carried retry. Entry functions decide for user JWTs. */
  readonly retryAllowed: boolean;
  readonly via: 'user_jwt' | 'job_token';
}

const principals = new WeakSet<object>();
const proofs = new WeakSet<object>();

function makePrincipal(p: JobPrincipal): JobPrincipal {
  const frozen = Object.freeze({ ...p, ...(p.bound ? { bound: Object.freeze({ ...p.bound }) } : {}) });
  principals.add(frozen);
  return frozen;
}

/**
 * Authenticate a user-facing request by its Supabase JWT (via the shared verifyAuth helper).
 * The userId comes only from the verified token.
 */
export async function authenticateUser(
  event: { headers?: Record<string, string | undefined> }
): Promise<{ ok: true; principal: JobPrincipal } | JobAuthFailure> {
  const auth = await verifyAuth(event);
  if (!auth.userId || !UUID_RE.test(auth.userId)) return deny(401, 'unauthenticated');
  return { ok: true, principal: makePrincipal({ userId: auth.userId, via: 'user_jwt' }) };
}

/** Minimal shape of the Supabase query builder used for ownership checks. */
export interface OwnershipQuery {
  select(columns: string): OwnershipQuery;
  eq(column: string, value: unknown): OwnershipQuery;
  maybeSingle(): PromiseLike<{ data: Record<string, unknown> | null; error: unknown }>;
}
export interface OwnershipClient {
  from(table: string): OwnershipQuery;
}

/**
 * Database ownership check. The document (and import, if given) must exist and belong to the
 * principal; ownerless rows fail closed. A job-token principal may only prove ownership of the
 * exact document/import its token was bound to.
 */
export async function verifyOwnership(
  sb: OwnershipClient,
  principal: JobPrincipal,
  target: { documentId: string; importId?: string }
): Promise<{ ok: true; proof: OwnershipProof } | JobAuthFailure> {
  if (!principal || !principals.has(principal)) return deny(401, 'unauthenticated');
  const { documentId, importId } = target;
  if (!UUID_RE.test(String(documentId || '')) || (importId !== undefined && !UUID_RE.test(String(importId)))) {
    return deny(403, 'not_owned');
  }
  if (principal.via === 'job_token') {
    const b = principal.bound;
    if (!b || b.doc !== documentId) return deny(403, 'binding');
    if (importId !== undefined && b.imp !== undefined && b.imp !== importId) return deny(403, 'binding');
    if (importId !== undefined && b.imp === undefined) return deny(403, 'binding');
  }

  try {
    const { data: doc, error: docErr } = await sb
      .from('user_documents')
      .select('id, user_id')
      .eq('id', documentId)
      .eq('user_id', principal.userId)
      .maybeSingle();
    if (docErr) return deny(500, 'lookup_failed');
    if (!doc || String(doc.user_id || '') !== principal.userId) return deny(403, 'not_owned');

    if (importId !== undefined) {
      const { data: imp, error: impErr } = await sb
        .from('imports')
        .select('id, user_id, document_id')
        .eq('id', importId)
        .eq('user_id', principal.userId)
        .maybeSingle();
      if (impErr) return deny(500, 'lookup_failed');
      if (!imp || String(imp.user_id || '') !== principal.userId) return deny(403, 'not_owned');
      if (imp.document_id && String(imp.document_id) !== documentId) return deny(403, 'not_owned');
    }
  } catch {
    return deny(500, 'lookup_failed');
  }

  const proof: OwnershipProof = Object.freeze({
    userId: principal.userId,
    documentId,
    ...(importId !== undefined ? { importId } : {}),
    retryAllowed: principal.via === 'job_token' ? Boolean(principal.bound?.retry) : false,
    via: principal.via,
  });
  proofs.add(proof);
  return { ok: true, proof };
}

// ── Issuing ──────────────────────────────────────────────────────────────────

export interface IssueOptions {
  scope: JobScope;
  /** Calling function, for audit (e.g. 'smart-import-finalize'). */
  src: string;
  /**
   * Request forced reprocessing. For user-JWT proofs, set this ONLY from an explicit user action.
   * For job-token proofs it is honoured only if the parent token carried retry.
   */
  retry?: boolean;
  /** Defaults to, and is capped at, MAX_TTL_SECONDS[scope]. */
  ttlSeconds?: number;
  env?: Env;
  now?: number;
}

/**
 * Issue a job token. Requires an OwnershipProof from `verifyOwnership`; throws on any misuse
 * (forged proof, unknown scope, bad src, missing configuration). Callers must not catch and
 * continue with a fallback identity.
 */
export function issueJobToken(proof: OwnershipProof, opts: IssueOptions): string {
  if (!proof || !proofs.has(proof)) throw new Error('issueJobToken requires a verified ownership proof');
  if (!Object.prototype.hasOwnProperty.call(SCOPE_AUDIENCE, opts.scope)) {
    throw new Error('issueJobToken: unsupported scope');
  }
  if (!SRC_RE.test(String(opts.src || ''))) throw new Error('issueJobToken: invalid src');
  const keys = getKeys(opts.env ?? process.env);
  if (!keys) throw new JobAuthConfigError();

  const max = MAX_TTL_SECONDS[opts.scope];
  const requested = opts.ttlSeconds === undefined ? max : Math.floor(Number(opts.ttlSeconds));
  if (!Number.isFinite(requested) || requested <= 0) throw new Error('issueJobToken: invalid ttl');
  const ttl = Math.min(requested, max);
  const iat = opts.now ?? nowSeconds();

  const retry =
    proof.via === 'job_token' ? Boolean(opts.retry) && proof.retryAllowed : Boolean(opts.retry);

  const claims: JobClaims = {
    v: CLAIMS_VERSION,
    sub: proof.userId,
    doc: proof.documentId,
    ...(proof.importId !== undefined ? { imp: proof.importId } : {}),
    aud: SCOPE_AUDIENCE[opts.scope],
    scope: opts.scope,
    retry,
    iat,
    exp: iat + ttl,
    jti: randomUUID(),
    src: opts.src,
  };
  const claimsPart = b64urlEncode(Buffer.from(JSON.stringify(claims), 'utf8'));
  return `${TOKEN_PREFIX}.${claimsPart}.${b64urlEncode(sign(keys.current, claimsPart))}`;
}

/** Headers for an internal request. The token travels only in this header. */
export function jobTokenHeaders(token: string): Record<string, string> {
  return { [JOB_TOKEN_HEADER]: token };
}

// ── Verifying ────────────────────────────────────────────────────────────────

function parseClaims(json: unknown): JobClaims | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const c = json as Record<string, unknown>;
  for (const k of Object.keys(c)) if (!CLAIM_KEYS.has(k)) return null;
  if (c.v !== CLAIMS_VERSION) return null;
  if (typeof c.sub !== 'string' || !UUID_RE.test(c.sub)) return null;
  if (typeof c.doc !== 'string' || !UUID_RE.test(c.doc)) return null;
  if (c.imp !== undefined && (typeof c.imp !== 'string' || !UUID_RE.test(c.imp))) return null;
  if (typeof c.scope !== 'string' || !Object.prototype.hasOwnProperty.call(SCOPE_AUDIENCE, c.scope)) return null;
  if (typeof c.aud !== 'string') return null;
  if (typeof c.retry !== 'boolean') return null;
  if (!Number.isSafeInteger(c.iat) || !Number.isSafeInteger(c.exp)) return null;
  if (typeof c.jti !== 'string' || !UUID_RE.test(c.jti)) return null;
  if (typeof c.src !== 'string' || !SRC_RE.test(c.src)) return null;
  return c as unknown as JobClaims;
}

/**
 * Pure token check (signature, structure, audience, scope, lifetime). Does NOT check
 * ownership — receivers must use `authorizeJobRequest`, which also does the database check.
 */
export function verifyJobToken(
  token: unknown,
  expected: { audience: JobAudience; scope: JobScope; env?: Env; now?: number }
): { ok: true; claims: JobClaims } | JobAuthFailure {
  const aud = expected.audience;
  const keys = getKeys(expected.env ?? process.env);
  if (!keys) return deny(500, 'not_configured', aud);
  if (typeof token !== 'string' || token.length === 0) return deny(401, 'missing', aud);
  if (token.length > MAX_TOKEN_LENGTH) return deny(401, 'oversized', aud);

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return deny(401, 'malformed', aud);
  const [, claimsPart, sigPart] = parts;
  if (!B64URL_RE.test(claimsPart) || !B64URL_RE.test(sigPart)) return deny(401, 'malformed', aud);

  const provided = b64urlDecode(sigPart);
  if (provided.length !== 32) return deny(401, 'bad_signature', aud);
  let signatureOk = false;
  for (const secret of keys.verify) {
    // Constant-time compare against every configured key (no early exit on a match).
    if (timingSafeEqual(provided, sign(secret, claimsPart))) signatureOk = true;
  }
  if (!signatureOk) return deny(401, 'bad_signature', aud);

  let parsed: unknown;
  try {
    parsed = JSON.parse(b64urlDecode(claimsPart).toString('utf8'));
  } catch {
    return deny(401, 'malformed', aud);
  }
  const claims = parseClaims(parsed);
  if (!claims) return deny(401, 'malformed', aud);
  if (SCOPE_AUDIENCE[claims.scope] !== claims.aud) return deny(401, 'malformed', aud);
  if (claims.aud !== expected.audience) return deny(401, 'audience', aud);
  if (claims.scope !== expected.scope) return deny(401, 'scope', aud);
  if (claims.exp <= claims.iat || claims.exp - claims.iat > MAX_TTL_SECONDS[claims.scope]) {
    return deny(401, 'ttl', aud);
  }
  const now = expected.now ?? nowSeconds();
  if (claims.iat > now + CLOCK_SKEW_SECONDS) return deny(401, 'not_yet_valid', aud);
  if (now > claims.exp + CLOCK_SKEW_SECONDS) return deny(401, 'expired', aud);
  return { ok: true, claims };
}

function readJobTokenHeader(event: { headers?: Record<string, string | undefined> }): string | undefined {
  const headers = event.headers || {};
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === JOB_TOKEN_HEADER) return v;
  }
  return undefined;
}

/** Verify the job token on an incoming request and return a job-token principal. */
export function authenticateJobRequest(
  event: { headers?: Record<string, string | undefined> },
  expected: { audience: JobAudience; scope: JobScope; env?: Env; now?: number }
): { ok: true; principal: JobPrincipal; claims: JobClaims } | JobAuthFailure {
  const verified = verifyJobToken(readJobTokenHeader(event), expected);
  if (!verified.ok) return verified;
  const { claims } = verified;
  const principal = makePrincipal({
    userId: claims.sub,
    via: 'job_token',
    bound: { doc: claims.doc, ...(claims.imp ? { imp: claims.imp } : {}), retry: claims.retry },
  });
  return { ok: true, principal, claims };
}

/**
 * Full receiver check: valid job token for this function and scope, then a fresh database
 * ownership check of the bound document/import. Use only `proof` fields afterwards.
 */
export async function authorizeJobRequest(
  event: { headers?: Record<string, string | undefined> },
  sb: OwnershipClient,
  expected: { audience: JobAudience; scope: JobScope; env?: Env; now?: number }
): Promise<{ ok: true; principal: JobPrincipal; claims: JobClaims; proof: OwnershipProof } | JobAuthFailure> {
  const authn = authenticateJobRequest(event, expected);
  if (!authn.ok) return authn;
  const owned = await verifyOwnership(sb, authn.principal, {
    documentId: authn.claims.doc,
    ...(authn.claims.imp ? { importId: authn.claims.imp } : {}),
  });
  if (!owned.ok) return owned;
  return { ok: true, principal: authn.principal, claims: authn.claims, proof: owned.proof };
}

function hasHeader(event: { headers?: Record<string, string | undefined> }, name: string): boolean {
  return Object.entries(event.headers || {}).some(([k, v]) => k.toLowerCase() === name && Boolean(v));
}

/**
 * For receivers reachable both from internal jobs and from a synchronous user-authenticated
 * caller that forwards the user's JWT (normalize-transactions ← smart-import-sync).
 *
 * - If a job token is present it MUST be valid (no silent fallback to the JWT); the request's
 *   documentId, if given, must equal the token's bound document.
 * - Otherwise the Supabase JWT must be valid and the user must own `requestedDocumentId`.
 * - Neither → 401. A conflicting body userId is the caller's job to reject via
 *   `claimedUserIdMatches(body.userId, proof.userId)`.
 */
export async function authorizeUserOrJobRequest(
  event: { headers?: Record<string, string | undefined> },
  sb: OwnershipClient,
  expected: { audience: JobAudience; scope: JobScope; requestedDocumentId?: unknown; env?: Env; now?: number }
): Promise<{ ok: true; proof: OwnershipProof; via: 'job_token' | 'user_jwt' } | JobAuthFailure> {
  const requested =
    expected.requestedDocumentId === undefined || expected.requestedDocumentId === null || expected.requestedDocumentId === ''
      ? undefined
      : String(expected.requestedDocumentId);

  if (hasHeader(event, JOB_TOKEN_HEADER)) {
    const job = await authorizeJobRequest(event, sb, expected);
    if (!job.ok) return job;
    if (requested !== undefined && requested !== job.proof.documentId) return deny(403, 'binding', expected.audience);
    return { ok: true, proof: job.proof, via: 'job_token' };
  }

  if (requested === undefined) return deny(401, 'unauthenticated', expected.audience);
  const user = await authenticateUser(event);
  if (!user.ok) return user;
  const owned = await verifyOwnership(sb, user.principal, { documentId: requested });
  if (!owned.ok) return owned;
  return { ok: true, proof: owned.proof, via: 'user_jwt' };
}

/**
 * Reject a client-supplied identity that disagrees with the verified one. Returns true when the
 * claimed value is absent or matches. Never use the claimed value as identity.
 */
export function claimedUserIdMatches(claimed: unknown, verifiedUserId: string): boolean {
  if (claimed === undefined || claimed === null || claimed === '') return true;
  return String(claimed).trim() === verifiedUserId;
}

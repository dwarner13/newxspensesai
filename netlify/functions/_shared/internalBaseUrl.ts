/**
 * Internal base URL for server-to-server Netlify Function calls (P0-C1a) — SERVER-ONLY.
 *
 * Job tokens and forwarded user JWTs are sent to this origin, so it must come only from
 * deployment configuration — NEVER from request data (Host, X-Forwarded-Host, Origin, body).
 * Neither function takes the incoming event.
 *
 * BYTE-LIVE-01 (2026-11-25): DEPLOY_URL and CONTEXT are Netlify BUILD-time variables; they are
 * not present in the hosted Functions runtime (verified on staging: URL present and the job
 * secret usable, yet this helper threw). The build therefore records this deploy's own identity
 * in deployMetadata.generated.ts (scripts/write-deploy-metadata.mjs, run from the netlify.toml
 * build command), which esbuild inlines into each function bundle. Each deploy carries only its
 * own values, so a re-published older deploy still calls itself.
 *
 * Precedence:
 *   1. env DEPLOY_URL — this exact deploy (local tests, or if Netlify ever provides it at runtime).
 *   2. build metadata deployUrl — this exact deploy, re-validated here: an https origin equal to
 *      https://<deployId>--<siteName>.netlify.app, and consistent with any runtime URL/SITE_NAME.
 *      Metadata that is malformed or inconsistent is ignored entirely (including its context).
 *   3. URL — the site's main URL, ONLY when the runtime CONTEXT is 'production'. In
 *      deploy-preview, branch-deploy, or an unknown/missing context there is no fallback.
 *   4. Netlify Dev only (NETLIFY_DEV=true): http://localhost:<NETLIFY_LOCAL_PORT|PORT|8888>.
 * Anything else fails closed (throws InternalBaseUrlError). NETLIFY_URL is intentionally not
 * consulted: it is not a Netlify-provided variable (on xspensesai-staging it is a manual value
 * pointing at the published deploy, which is wrong for deploy previews).
 *
 * Accepted values: https origins with no credentials, path, query or fragment; plain http only
 * for localhost / 127.0.0.1 under Netlify Dev.
 *
 * Logs the resolution SOURCE once per process (never the URL) so hosted logs show which path
 * was used.
 */
import { BUILD_DEPLOY_METADATA, type BuildDeployMetadata } from './deployMetadata.generated.js';

type Env = Record<string, string | undefined>;

export class InternalBaseUrlError extends Error {
  constructor() {
    super('Internal base URL is not configured');
    this.name = 'InternalBaseUrlError';
  }
}

export type InternalBaseUrlSource = 'env_deploy_url' | 'build_deploy_url' | 'production_url' | 'netlify_dev' | 'none';

const FUNCTION_NAME_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const DEPLOY_ID_RE = /^[0-9a-f]{24}$/;
const SITE_NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const BUILD_CONTEXTS = new Set(['production', 'deploy-preview', 'branch-deploy']);

function normalizeOrigin(raw: string | undefined | null, allowLocalHttp: boolean): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (u.username || u.password) return null;
  if (u.search || u.hash) return null;
  if (u.pathname && u.pathname !== '/') return null;
  if (u.protocol === 'https:') return u.origin;
  if (u.protocol === 'http:' && allowLocalHttp && LOCAL_HOSTS.has(u.hostname)) return u.origin;
  return null;
}

/**
 * Re-validate build metadata before trusting any of it. Returns null when it is absent,
 * malformed, or inconsistent with itself or with the runtime environment (fail closed).
 */
export function validateBuildDeployMetadata(meta: unknown, env: Env): BuildDeployMetadata | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const m = meta as Record<string, unknown>;
  const context = typeof m.context === 'string' ? m.context : '';
  const deployId = typeof m.deployId === 'string' ? m.deployId : '';
  const siteName = typeof m.siteName === 'string' ? m.siteName : '';
  if (!BUILD_CONTEXTS.has(context) || !DEPLOY_ID_RE.test(deployId) || !SITE_NAME_RE.test(siteName)) return null;
  const deployUrl = normalizeOrigin(typeof m.deployUrl === 'string' ? m.deployUrl : '', false);
  if (!deployUrl || new URL(deployUrl).hostname !== `${deployId}--${siteName}.netlify.app`) return null;
  let siteUrl: string | null = null;
  if (m.siteUrl !== null && m.siteUrl !== undefined) {
    siteUrl = normalizeOrigin(typeof m.siteUrl === 'string' ? m.siteUrl : '', false);
    if (!siteUrl) return null;
  }
  // Consistency with the runtime: a bundle built for one site must never serve another.
  const runtimeSite = String(env.SITE_NAME || '').trim();
  if (runtimeSite && runtimeSite !== siteName) return null;
  const runtimeUrl = normalizeOrigin(env.URL, false);
  if (runtimeUrl && siteUrl && runtimeUrl !== siteUrl) return null;
  if (runtimeUrl && new URL(runtimeUrl).hostname.endsWith('.netlify.app') && runtimeUrl !== `https://${siteName}.netlify.app`) {
    return null;
  }
  return { context, deployId, siteName, deployUrl, siteUrl };
}

function resolve(env: Env, buildMeta: unknown): { origin: string; source: InternalBaseUrlSource } | null {
  const isNetlifyDev = env.NETLIFY_DEV === 'true';
  const deployOrigin = normalizeOrigin(env.DEPLOY_URL, isNetlifyDev);
  if (deployOrigin) return { origin: deployOrigin, source: 'env_deploy_url' };

  const meta = validateBuildDeployMetadata(buildMeta, env);
  if (meta) return { origin: meta.deployUrl, source: 'build_deploy_url' };

  if (String(env.CONTEXT || '').toLowerCase() === 'production') {
    const siteOrigin = normalizeOrigin(env.URL, isNetlifyDev);
    if (siteOrigin) return { origin: siteOrigin, source: 'production_url' };
  }
  if (isNetlifyDev) {
    const port = String(env.NETLIFY_LOCAL_PORT || env.PORT || '8888').trim();
    if (/^\d{2,5}$/.test(port)) return { origin: `http://localhost:${port}`, source: 'netlify_dev' };
  }
  return null;
}

const loggedSources = new Set<InternalBaseUrlSource>();
function logSourceOnce(source: InternalBaseUrlSource): void {
  if (loggedSources.has(source)) return;
  loggedSources.add(source);
  // Source only. Never the URL, ids or any request data.
  console.log(`[internal-base-url] source=${source}`);
}

/** Which source would resolve (no logging, never the URL). For tests and diagnostics. */
export function getInternalBaseUrlSource(env: Env = process.env, buildMeta: unknown = BUILD_DEPLOY_METADATA): InternalBaseUrlSource {
  return resolve(env, buildMeta)?.source ?? 'none';
}

export function getInternalBaseUrl(env: Env = process.env, buildMeta: unknown = BUILD_DEPLOY_METADATA): string {
  const r = resolve(env, buildMeta);
  logSourceOnce(r?.source ?? 'none');
  if (r) return r.origin;
  throw new InternalBaseUrlError();
}

/** `${origin}/.netlify/functions/<name>` for a validated function name. */
export function buildInternalFunctionUrl(
  functionName: string,
  env: Env = process.env,
  buildMeta: unknown = BUILD_DEPLOY_METADATA
): string {
  if (!FUNCTION_NAME_RE.test(String(functionName || ''))) {
    throw new Error('buildInternalFunctionUrl: invalid function name');
  }
  return `${getInternalBaseUrl(env, buildMeta)}/.netlify/functions/${functionName}`;
}

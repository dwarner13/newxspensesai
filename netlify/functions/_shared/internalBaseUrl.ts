/**
 * Internal base URL for server-to-server Netlify Function calls (P0-C1a) — SERVER-ONLY.
 *
 * Job tokens and forwarded user JWTs are sent to this origin, so it must come only from
 * deployment configuration — NEVER from request data (Host, X-Forwarded-Host, Origin, body).
 * Neither function takes the incoming event.
 *
 * Precedence:
 *   1. DEPLOY_URL — this exact deploy, so callers and receivers run the same code version and
 *      deploy previews do not call the published deploy.
 *   2. URL        — the site's main URL, ONLY when CONTEXT === 'production'. In deploy-preview,
 *      branch-deploy, or an unknown/missing context there is no fallback: a missing DEPLOY_URL
 *      fails closed rather than sending work (and credentials) to a different deploy.
 *   3. Netlify Dev only (NETLIFY_DEV=true): http://localhost:<NETLIFY_LOCAL_PORT|PORT|8888>.
 * Anything else fails closed (throws). NETLIFY_URL is intentionally not consulted: it is not a
 * Netlify-provided variable (on xspensesai-staging it is a manual value pointing at the
 * published deploy, which is wrong for deploy previews).
 *
 * Accepted values: https origins with no credentials, path, query or fragment; plain http only
 * for localhost / 127.0.0.1 under Netlify Dev.
 *
 * ASSUMPTION to verify in a deploy preview before live use (P0-C1b): DEPLOY_URL and URL are
 * present in the Functions runtime environment.
 */

type Env = Record<string, string | undefined>;

export class InternalBaseUrlError extends Error {
  constructor() {
    super('Internal base URL is not configured');
    this.name = 'InternalBaseUrlError';
  }
}

const FUNCTION_NAME_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function normalizeOrigin(raw: string | undefined, allowLocalHttp: boolean): string | null {
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

export function getInternalBaseUrl(env: Env = process.env): string {
  const isNetlifyDev = env.NETLIFY_DEV === 'true';
  const deployOrigin = normalizeOrigin(env.DEPLOY_URL, isNetlifyDev);
  if (deployOrigin) return deployOrigin;
  if (String(env.CONTEXT || '').toLowerCase() === 'production') {
    const siteOrigin = normalizeOrigin(env.URL, isNetlifyDev);
    if (siteOrigin) return siteOrigin;
  }
  if (isNetlifyDev) {
    const port = String(env.NETLIFY_LOCAL_PORT || env.PORT || '8888').trim();
    if (/^\d{2,5}$/.test(port)) return `http://localhost:${port}`;
  }
  throw new InternalBaseUrlError();
}

/** `${origin}/.netlify/functions/<name>` for a validated function name. */
export function buildInternalFunctionUrl(functionName: string, env: Env = process.env): string {
  if (!FUNCTION_NAME_RE.test(String(functionName || ''))) {
    throw new Error('buildInternalFunctionUrl: invalid function name');
  }
  return `${getInternalBaseUrl(env)}/.netlify/functions/${functionName}`;
}

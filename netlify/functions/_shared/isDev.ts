/**
 * Server-side environment classification for Netlify Functions (security hardening, 2026-11-25).
 *
 * NODE_ENV is NOT set on the hosted Netlify sites, so any `NODE_ENV !== 'production'` check is TRUE
 * there (fails open). This module never relies on NODE_ENV:
 *
 * - isLocalDev(): true only under the local `netlify dev` CLI (NETLIFY_DEV === 'true') AND not inside
 *   a hosted AWS Lambda runtime. A hosted function is never classified as local development, even if
 *   someone sets NETLIFY_DEV on a site.
 * - localDebugEnabled(flag): debug features require local development AND an explicit opt-in env
 *   flag set to '1'. Request data (body, query, headers) can never enable debug output.
 */

export function isLocalDev(): boolean {
  if (process.env.NETLIFY_DEV !== 'true') return false;
  // Positive "not hosted" check: Netlify/AWS Lambda runtimes set these; a copied dev env can't override.
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT || process.env.AWS_EXECUTION_ENV) return false;
  return true;
}

/** Kept for existing call sites: now an alias of isLocalDev() (never true on a hosted site). */
export function isDev(): boolean {
  return isLocalDev();
}

/** Debug output only in local development with an explicit env flag ('1'). */
export function localDebugEnabled(flagName: string): boolean {
  return isLocalDev() && process.env[flagName] === '1';
}

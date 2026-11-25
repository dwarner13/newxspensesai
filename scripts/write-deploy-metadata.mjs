#!/usr/bin/env node
/**
 * BYTE-LIVE-01 — write this deploy's own address into the functions bundle at BUILD time.
 *
 * Netlify exposes DEPLOY_URL, CONTEXT, DEPLOY_ID and SITE_NAME to the build, but NOT to the
 * Functions runtime. Server-to-server calls (internalBaseUrl.ts) must target this exact deploy,
 * so the build records those values in netlify/functions/_shared/deployMetadata.generated.ts,
 * which esbuild inlines into every function that imports it.
 *
 * Run ONLY from the netlify.toml build command (never from `pnpm build`), before the app build.
 *
 * Security:
 *   - Reads only Netlify-provided build variables. No request data, no secrets.
 *   - The file holds only public deploy identifiers (permalink, site URL, context, ids).
 *   - Every value is validated; DEPLOY_URL must be exactly https://<DEPLOY_ID>--<SITE_NAME>.netlify.app.
 *   - Anything missing, invalid or inconsistent writes the null placeholder (functions then fail
 *     closed exactly as before). A stale value from an earlier build is therefore always
 *     overwritten. The committed file must stay null (test-enforced).
 *   - Logs reason codes only.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const GENERATED_RELATIVE_PATH = 'netlify/functions/_shared/deployMetadata.generated.ts';

const CONTEXTS = new Set(['production', 'deploy-preview', 'branch-deploy']);
const DEPLOY_ID_RE = /^[0-9a-f]{24}$/;
const SITE_NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** https origin with no credentials, path, query or fragment; otherwise null. */
export function httpsOrigin(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  let u;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  if (u.username || u.password || u.search || u.hash) return null;
  if (u.pathname && u.pathname !== '/') return null;
  return u.origin;
}

/**
 * Validate the build environment. Returns { metadata, reason }: metadata is null unless every
 * required value is present, well-formed and consistent.
 */
export function buildDeployMetadata(env) {
  if (env.NETLIFY !== 'true') return { metadata: null, reason: 'not_netlify_build' };
  const context = String(env.CONTEXT ?? '').trim();
  if (!CONTEXTS.has(context)) return { metadata: null, reason: 'context_invalid' };
  const deployId = String(env.DEPLOY_ID ?? '').trim();
  if (!DEPLOY_ID_RE.test(deployId)) return { metadata: null, reason: 'deploy_id_invalid' };
  const siteName = String(env.SITE_NAME ?? '').trim();
  if (!SITE_NAME_RE.test(siteName)) return { metadata: null, reason: 'site_name_invalid' };
  const deployUrl = httpsOrigin(env.DEPLOY_URL);
  if (!deployUrl) return { metadata: null, reason: 'deploy_url_invalid' };
  if (new URL(deployUrl).hostname !== `${deployId}--${siteName}.netlify.app`) {
    return { metadata: null, reason: 'deploy_url_inconsistent' };
  }
  // The site's main URL is only ever used for the production context (custom domains allowed).
  const siteUrl = httpsOrigin(env.URL);
  return { metadata: { context, deployId, siteName, deployUrl, siteUrl }, reason: 'ok' };
}

/** Render the generated module. Only the allowlisted fields are ever written. */
export function renderModule(metadata) {
  const value = metadata
    ? `{\n  context: ${JSON.stringify(metadata.context)},\n  deployId: ${JSON.stringify(metadata.deployId)},\n  siteName: ${JSON.stringify(metadata.siteName)},\n  deployUrl: ${JSON.stringify(metadata.deployUrl)},\n  siteUrl: ${JSON.stringify(metadata.siteUrl)},\n}`
    : 'null';
  return `/**
 * GENERATED at Netlify build time by scripts/write-deploy-metadata.mjs — DO NOT EDIT.
 * The committed value MUST be null (test-enforced). Holds only public deploy identifiers for
 * THIS deploy; internalBaseUrl.ts re-validates it before use.
 */
export type BuildDeployMetadata = {
  context: string;
  deployId: string;
  siteName: string;
  deployUrl: string;
  siteUrl: string | null;
};

export const BUILD_DEPLOY_METADATA: BuildDeployMetadata | null = ${value};
`;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { metadata, reason } = buildDeployMetadata(process.env);
  writeFileSync(path.join(root, GENERATED_RELATIVE_PATH), renderModule(metadata), 'utf8');
  console.log(`[write-deploy-metadata] ${metadata ? `written context=${metadata.context}` : `placeholder reason=${reason}`}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

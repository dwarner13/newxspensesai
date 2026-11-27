/**
 * BYTE-LIVE-01 — build-time deploy metadata (scripts/write-deploy-metadata.mjs).
 *
 * Hosted Netlify Functions do not receive DEPLOY_URL/CONTEXT, so the build records this deploy's
 * own identity for internalBaseUrl.ts. These tests cover validation, the exact generated output,
 * secret exclusion, stale-value overwrite and the build wiring. Synthetic values only; the script
 * is executed against a temporary copy, never the repository file.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

const root = path.resolve(__dirname, '../../..');
const scriptPath = path.join(root, 'scripts/write-deploy-metadata.mjs');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plain .mjs module
const script: any = await import(/* @vite-ignore */ path.join(root, 'scripts/write-deploy-metadata.mjs'));

const ID = 'f00dfacef00dfacef00dface';
const BUILD_ENV = {
  NETLIFY: 'true',
  CONTEXT: 'production',
  DEPLOY_ID: ID,
  SITE_NAME: 'synthetic-staging',
  DEPLOY_URL: `https://${ID}--synthetic-staging.netlify.app`,
  URL: 'https://synthetic-staging.netlify.app',
};
const SECRETS = {
  INTERNAL_JOB_SIGNING_SECRET: 'synthetic-signing-secret-0123456789abcdef',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-role-key',
  OPENAI_API_KEY: 'sk-synthetic',
  CONVERSATION_SIGNING_SECRET: 'synthetic-conversation-secret',
};
const norm = (s: string) => s.replace(/\r\n/g, '\n');

function runInTempCopy(env: Record<string, string>, initial?: string): { file: string; stdout: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'byte-live-01-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.mkdirSync(path.join(dir, 'netlify/functions/_shared'), { recursive: true });
  fs.copyFileSync(scriptPath, path.join(dir, 'scripts/write-deploy-metadata.mjs'));
  const target = path.join(dir, script.GENERATED_RELATIVE_PATH);
  if (initial !== undefined) fs.writeFileSync(target, initial);
  try {
    const stdout = execFileSync(process.execPath, [path.join(dir, 'scripts/write-deploy-metadata.mjs')], {
      env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '', ...env },
      encoding: 'utf8',
    });
    return { file: fs.readFileSync(target, 'utf8'), stdout };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('buildDeployMetadata (validation)', () => {
  it('a complete Netlify build environment yields only the allowlisted public fields', () => {
    const { metadata, reason } = script.buildDeployMetadata({ ...BUILD_ENV, ...SECRETS });
    expect(reason).toBe('ok');
    expect(metadata).toEqual({
      context: 'production',
      deployId: ID,
      siteName: 'synthetic-staging',
      deployUrl: `https://${ID}--synthetic-staging.netlify.app`,
      siteUrl: 'https://synthetic-staging.netlify.app',
    });
  });

  it.each([
    ['not a Netlify build (local pnpm build / CLI)', { NETLIFY: undefined }, 'not_netlify_build'],
    ['missing context', { CONTEXT: undefined }, 'context_invalid'],
    ['dev context (netlify dev / local netlify build)', { CONTEXT: 'dev' }, 'context_invalid'],
    ['missing deploy id', { DEPLOY_ID: undefined }, 'deploy_id_invalid'],
    ['local placeholder deploy id', { DEPLOY_ID: '0', DEPLOY_URL: 'https://0--synthetic-staging.netlify.app' }, 'deploy_id_invalid'],
    ['missing site name', { SITE_NAME: undefined }, 'site_name_invalid'],
    ['missing DEPLOY_URL', { DEPLOY_URL: undefined }, 'deploy_url_invalid'],
    ['http DEPLOY_URL', { DEPLOY_URL: `http://${ID}--synthetic-staging.netlify.app` }, 'deploy_url_invalid'],
    ['DEPLOY_URL with a path', { DEPLOY_URL: `https://${ID}--synthetic-staging.netlify.app/x` }, 'deploy_url_invalid'],
    ['DEPLOY_URL of another deploy', { DEPLOY_URL: 'https://0123456789abcdef01234567--synthetic-staging.netlify.app' }, 'deploy_url_inconsistent'],
    ['DEPLOY_URL of another site', { DEPLOY_URL: `https://${ID}--other-site.netlify.app` }, 'deploy_url_inconsistent'],
    ['DEPLOY_URL on an arbitrary host', { DEPLOY_URL: 'https://attacker.example' }, 'deploy_url_inconsistent'],
  ])('%s → null placeholder', (_l, override, reason) => {
    const env: Record<string, string | undefined> = { ...BUILD_ENV, ...override };
    expect(script.buildDeployMetadata(env)).toEqual({ metadata: null, reason });
  });

  it('an invalid main URL is dropped (only ever used for production), the deploy URL still stands', () => {
    expect(script.buildDeployMetadata({ ...BUILD_ENV, URL: 'javascript:alert(1)' }).metadata).toMatchObject({ siteUrl: null });
  });
});

describe('generated module', () => {
  it('the committed file is exactly the null placeholder', () => {
    const committed = fs.readFileSync(path.join(root, script.GENERATED_RELATIVE_PATH), 'utf8');
    expect(norm(committed)).toBe(script.renderModule(null));
  });

  it('a Netlify build writes this deploy\'s metadata and nothing else — no secrets, no other env', () => {
    const { file, stdout } = runInTempCopy({ ...BUILD_ENV, ...SECRETS, COMMIT_REF: 'deadbeef' });
    expect(file).toContain(`deployUrl: "https://${ID}--synthetic-staging.netlify.app"`);
    for (const secret of Object.values(SECRETS)) expect(file).not.toContain(secret);
    expect(file).not.toContain('deadbeef');
    expect(file).not.toMatch(/SECRET|SERVICE_ROLE|API_KEY|process\.env/);
    expect(stdout.trim()).toBe('[write-deploy-metadata] written context=production');
    expect(stdout).not.toContain(ID);
  });

  it('a stale value from an earlier deploy is always overwritten (valid build → new deploy; invalid → null)', () => {
    const stale = script.renderModule({ ...script.buildDeployMetadata(BUILD_ENV).metadata, deployId: '0123456789abcdef01234567', deployUrl: 'https://0123456789abcdef01234567--synthetic-staging.netlify.app' });
    const fresh = runInTempCopy(BUILD_ENV, stale).file;
    expect(fresh).not.toContain('0123456789abcdef01234567');
    expect(fresh).toContain(ID);
    const reset = runInTempCopy({ NETLIFY: 'true', CONTEXT: 'deploy-preview' }, stale);
    expect(norm(reset.file)).toBe(script.renderModule(null));
    expect(reset.stdout.trim()).toBe('[write-deploy-metadata] placeholder reason=deploy_id_invalid');
  });

  it('the rendered module round-trips through the runtime validator', async () => {
    const { validateBuildDeployMetadata } = await import('../_shared/internalBaseUrl');
    const { metadata } = script.buildDeployMetadata(BUILD_ENV);
    expect(validateBuildDeployMetadata(metadata, { URL: BUILD_ENV.URL })).toEqual(metadata);
  });
});

describe('build wiring', () => {
  it('runs only from the netlify.toml build command, before the app build', () => {
    const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
    expect(toml).toMatch(/command = "pnpm install --frozen-lockfile && node scripts\/write-deploy-metadata\.mjs && pnpm build"/);
  });

  it('is not part of `pnpm build`, so local builds never produce deploy metadata', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(JSON.stringify(pkg.scripts)).not.toContain('write-deploy-metadata');
  });

  it('every function bundle can include it: the module lives under _shared and is imported only by internalBaseUrl', () => {
    const shared = path.join(root, 'netlify/functions/_shared');
    const importers = fs
      .readdirSync(shared)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => fs.readFileSync(path.join(shared, f), 'utf8').includes('deployMetadata.generated'));
    expect(importers).toEqual(['internalBaseUrl.ts']);
  });
});

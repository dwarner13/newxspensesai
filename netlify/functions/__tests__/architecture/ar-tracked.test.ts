/**
 * Architecture suites must be tracked by git (AI Architecture HQ, 2026-11-25; E-3 risk):
 * __tests__ is gitignored, so an AR suite that is not force-added silently stops protecting anything.
 * Skipped only where git is unavailable (e.g. a packaged build).
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../../..');
let tracked: Set<string> | null = null;
try {
  tracked = new Set(execFileSync('git', ['ls-files', 'netlify/functions/__tests__/architecture', 'netlify/functions/__tests__/fixtures/architecture-allowlist.ts'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean));
} catch { tracked = null; }

describe.skipIf(tracked === null)('architecture suites are tracked', () => {
  it('every file in __tests__/architecture and the allowlist is in git', () => {
    const files = readdirSync(resolve(__dirname)).map(f => `netlify/functions/__tests__/architecture/${f}`);
    const missing = [...files, 'netlify/functions/__tests__/fixtures/architecture-allowlist.ts'].filter(f => !tracked!.has(f));
    expect(missing, 'git add -f these (tests dirs are gitignored)').toEqual([]);
  });
});

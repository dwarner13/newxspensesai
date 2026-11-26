/**
 * AR-17 (P3/§2) — Tag HQ's files. NEW_CODE_PROTECTION_POLICY.md §4.
 * Fire-and-forget: no unawaited call (`fetch(…)`, `x(…).catch(…)`) in Tag handlers for work an
 * employee or a status depends on, unless it is listed in ../fixtures/architecture-allowlist.ts (plan item 7 interim).
 * The allowlist must shrink to zero; a NEW unawaited call fails this test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { exceptionsFor } from '../fixtures/architecture-allowlist';

const ROOT = resolve(__dirname, '../../../..');
const FN = 'netlify/functions';
const TAG_FILES = [
  ...readdirSync(join(ROOT, FN)).filter(f => /^(tag-|tx-update-category)[\w-]*\.ts$/.test(f)).map(f => `${FN}/${f}`),
  ...readdirSync(join(ROOT, FN, '_shared')).filter(f => /^(tag|categorySource|focusedTransaction)[\w-]*\.ts$/.test(f)).map(f => `${FN}/_shared/${f}`),
];

function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** Statements that START with a bare call (not awaited / returned / assigned) and end in .catch(…) or are fetch(…). */
export function unawaitedCalls(src: string): string[] {
  const lines = code(src).split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*([A-Za-z_$][\w$]*)(?:\.[\w$]+)*\(/);
    if (!m || /^(if|for|while|switch|return|await|catch|function|super|void)$/.test(m[1])) continue;
    let stmt = '';
    for (let j = i; j < Math.min(lines.length, i + 40); j++) { stmt += lines[j] + '\n'; if (/;\s*$/.test(lines[j])) break; }
    if (m[1] === 'fetch' || /\)\s*\.catch\(/.test(stmt)) out.push(m[1]);
  }
  return out;
}

describe('AR-17 — Tag files have no unallowlisted fire-and-forget work', () => {
  it('the detector catches the shapes it must catch (sanity)', () => {
    expect(unawaitedCalls("  fetch('/x', {}).catch(() => {});\n")).toEqual(['fetch']);
    expect(unawaitedCalls('  doWork(a, b).catch(() => {});\n')).toEqual(['doWork']);
    expect(unawaitedCalls('  await doWork(a).catch(() => {});\n  const x = fetch("/y");\n')).toEqual([]);
  });
  it('scans the Tag files', () => {
    expect(TAG_FILES).toEqual(expect.arrayContaining([`${FN}/tag-action.ts`, `${FN}/tag-background-sweep.ts`, `${FN}/_shared/tag-learning.ts`]));
  });
  it.each(TAG_FILES)('%s', (file) => {
    const allowed = new Set(exceptionsFor('AR-17').filter(e => e.file === file).map(e => e.rule));
    const bad = unawaitedCalls(readFileSync(join(ROOT, file), 'utf8')).filter(c => !allowed.has(`callee:${c}`));
    expect(bad, `unawaited call(s) in ${file}: await them (record failure honestly) or add a §5A allowlist entry`).toEqual([]);
  });
  it('every AR-17 exception still matches real code (stale entries must be removed)', () => {
    for (const e of exceptionsFor('AR-17')) {
      const calls = unawaitedCalls(readFileSync(join(ROOT, e.file), 'utf8'));
      expect(calls, e.id).toContain(e.rule.replace(/^callee:/, ''));
    }
  });
});

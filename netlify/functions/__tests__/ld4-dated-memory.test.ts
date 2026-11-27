/**
 * L-D4 — remembered financial information is dated and never a verified current balance
 * (owner live finding LIVE-06 on ba4bc3a, GO 2026-11-24).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { formatSnippetDate } from '../../../src/shared/memory-dating';
import { buildPrimeSourceTransparency } from '../../../src/shared/prime-source-transparency';
import { buildPrimeAuthoritySystemMessage } from '../_shared/primePolicy';
import { REMEMBERED_FACTS_SUMMARY_LABEL } from '../../../src/shared/remembered-context-labels';

describe('L-D4 past-conversation snippets', () => {
  it('use the actual recorded date', () => {
    expect(formatSnippetDate('2026-08-01T14:22:00Z')).toBe('said on 2026-08-01');
  });
  it('say "date unknown" instead of inventing one', () => {
    for (const v of [undefined, null, '', 'yesterday', 12345]) expect(formatSnippetDate(v)).toBe('date unknown');
  });
  it('the snippet block is labelled historical and each line carries its date', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../_shared/memory.ts'), 'utf8');
    expect(src).toMatch(/## Relevant Past Conversations \(historical — customer statements, not verified current balances\)/);
    expect(src).toMatch(/formatSnippetDate\(\(m as \{ created_at\?: unknown \}\)\.created_at\)/);
  });
  it('the retrieval layer returns created_at with each snippet (so dates are real, not unknown)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../_shared/context-retrieval.ts'), 'utf8');
    expect(src).toMatch(/created_at: r\.created_at/);
    expect(src).toMatch(/memories: topMemory/);
  });
});

describe('L-D4 client-supplied facts and Prime rule', () => {
  // C-3 (owner GO 2026-11-27) unified the wording: same protection ("customer-provided earlier",
  // never verified), now "not verified financial facts" (covers balances AND every other figure).
  it('client recentFacts are labelled customer-provided and not verified financial facts', () => {
    const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
    expect(chat).toMatch(/\$\{REMEMBERED_FACTS_SUMMARY_LABEL\} \$\{ms\.recentFacts/);
    expect(REMEMBERED_FACTS_SUMMARY_LABEL).toBe('- remembered facts (customer-provided earlier; not verified financial facts):');
    expect(chat).not.toMatch(/Relevant user context:/);
  });
  it('Prime distinguishes verified imported, historical customer-provided and undated information', () => {
    const rule = buildPrimeSourceTransparency();
    expect(rule).toMatch(/Customer-provided amounts .* are HISTORICAL/);
    expect(rule).toMatch(/if the date is unknown, say "date unknown"/);
    expect(rule).toMatch(/Never present them as a current or verified balance, and keep them separate from imported \(verified\) figures/);
    expect(buildPrimeAuthoritySystemMessage({ lane: 'deep', intent: 'general', hasDocs: false, hasSnapshot: false })).toContain(rule);
  });
});

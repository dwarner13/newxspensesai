/**
 * Tax and confidence claims (owner product direction, 2026-11-23):
 *  - no definitive deductibility claims from server prompts; tax-organizing, not tax advice;
 *  - uncalibrated confidence is never a measured probability: tag-explain reports its source
 *    (stored / estimated) and a qualitative level;
 *  - approximate merchant counts are labelled approximate; merchant learning is never promised
 *    automatically (C4: explicit consent, default off).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildPrimeTaxAndConfidenceGuidance } from '../../../src/shared/prime-tax-guidance';
import { buildPrimeAuthoritySystemMessage } from '../_shared/primePolicy';
import { explainTransactionCategory } from '../_shared/tag_explain';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');

describe('Prime tax and confidence guidance', () => {
  const g = buildPrimeTaxAndConfidenceGuidance();
  it('frames XspensesAI as tax-organizing, never definitive tax advice', () => {
    expect(g).toMatch(/you do not give tax advice/);
    expect(g).toMatch(/Never state that an expense IS deductible/);
    expect(g).toMatch(/potentially deductible — confirm with a tax professional/);
  });
  it('forbids confidence percentages as probabilities', () => {
    expect(g).toMatch(/Do not present categorization confidence as a percentage or probability/);
  });
  it.each(['fast', 'deep'] as const)('is in every Prime authority message (lane=%s)', (lane) => {
    expect(buildPrimeAuthoritySystemMessage({ lane, intent: 'general', hasDocs: false, hasSnapshot: false })).toContain(g);
  });
  it('server prompt strings no longer assert deductibility', () => {
    const chat = read('netlify/functions/chat.ts');
    expect(chat).not.toMatch(/'- Likely deductible \(rule-based\): <list>'/);
    expect(chat).not.toMatch(/Likely deductible count:/);
    expect(chat).toMatch(/Potential business expenses \(rule-based; deductibility not determined\)/);
    const custodian = read('netlify/functions/custodian-chat.ts');
    expect(custodian).not.toMatch(/business meals are partially deductible for self-employed Canadians\./);
    expect(custodian).toMatch(/may be partially deductible .* is not tax advice/);
  });
});

// ── tag-explain with an in-memory client ───────────────────────────────────
type Row = Record<string, unknown>;
function client(tx: Row, merchantRows: Row[], feedback: Row[] = []) {
  return {
    from(table: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal chain
      const chain: any = {
        select: () => chain, eq: () => chain, ilike: () => chain, neq: () => chain, order: () => chain,
        limit: () => Promise.resolve({ data: table === 'transactions' ? merchantRows : feedback, error: null }),
        maybeSingle: () => Promise.resolve({ data: tx, error: null }),
        single: () => Promise.resolve({ data: tx, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'tag_category_feedback' ? feedback : merchantRows, error: null }).then(res),
      };
      return chain;
    },
  };
}
const baseTx = { id: 't1', category: 'Groceries', category_source: 'ai', confidence: null, merchant_name: 'SOBEYS', merchant: 'SOBEYS', description: 'SOBEYS', amount: -50, posted_at: '2026-11-01', user_id: 'u1' };
const history = (n: number, category = 'Groceries') => Array.from({ length: n }, () => ({ amount: -50, category, posted_at: '2026-10-01' }));

describe('tag-explain confidence source and wording', () => {
  it('no stored confidence → estimated, qualitative level, no exact-count claim', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client(baseTx, history(12)) as any, 'u1', 't1');
    expect(r.confidenceSource).toBe('estimated');
    expect(r.confidenceLevel).toBe('high');
    expect(r.message).toMatch(/about 12 times/);
    expect(r.message).not.toMatch(/High confidence/);
  });
  it('stored confidence → stored source', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client({ ...baseTx, confidence: 0.62 }, history(1)) as any, 'u1', 't1');
    expect(r.confidenceSource).toBe('stored');
    expect(r.confidenceLevel).toBe('medium');
  });
  it('capped history is labelled 100+', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client(baseTx, history(100)) as any, 'u1', 't1');
    expect(r.merchantSeenCapped).toBe(true);
    expect(r.message).toMatch(/100\+ times/);
    expect(r.proactiveInsights.join(' ')).toMatch(/only the most recent 100 are counted/);
  });
  it('never promises automatic merchant learning (C4: explicit consent, default off)', () => {
    const src = read('netlify/functions/_shared/tag_explain.ts');
    expect(src).not.toMatch(/I will apply it to all future .* transactions automatically/);
    expect(src).toMatch(/only when you ask me to/);
  });
});

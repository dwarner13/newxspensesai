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
    // Owner 2026-11-27: the ONE approved wording for a possible business cost.
    expect(chat).toMatch(/Possible business expense — requires review by your accountant\./);
    expect(chat).not.toMatch(/highlight likely deductible patterns|before filing\. I can generate a pre-filing checklist/);
    expect(chat).not.toMatch(/Whether they are deductible depends on business use/);
    const custodian = read('netlify/functions/custodian-chat.ts');
    expect(custodian).not.toMatch(/business meals are partially deductible for self-employed Canadians\./);
    expect(custodian).not.toMatch(/may be partially deductible/);
    expect(custodian).not.toMatch(/shows deductible categories/);
    expect(custodian).toMatch(/Possible business expense — requires review by your accountant\..*does not decide what is deductible and is not tax advice/);
  });
  it('O-7 (owner GO 2026-11-27): the unreachable canned insight lane stays retired; the live metrics hint uses the approved wording', () => {
    const chat = read('netlify/functions/chat.ts');
    expect(chat).not.toMatch(/^function buildInsightResponse\(/m);
    expect(chat).not.toMatch(/^function buildTxDeterministicFormatHint\(/m);
    expect(chat).not.toMatch(/const isPrimeEmployeeForInsights =/);
    expect(chat).not.toMatch(/deductibility not determined/);
    expect(chat).toMatch(/`- Possible business expense — requires review by your accountant\. Rule-based matches: \$\{likely\.length\}`/);
    expect(chat).toMatch(/Never say whether it is deductible\./);
  });
});

// ── tag-explain with an in-memory client ───────────────────────────────────
type Row = Record<string, unknown>;
function client(tx: Row, merchantRows: Row[], feedback: Row[] = [], opts: { failRange?: boolean } = {}) {
  return {
    from(table: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal chain
      const chain: any = {
        select: () => chain, eq: () => chain, ilike: () => chain, neq: () => chain, order: () => chain, or: () => chain, gte: () => chain, lte: () => chain,
        // Engine merchant path (fetchMerchantScopeRows → pagedSelectAll) pages with range().
        range: (from: number, to: number) => Promise.resolve(opts.failRange
          ? { data: null, error: { message: 'down' } }
          : { data: (table === 'transactions' ? merchantRows : feedback).slice(from, to + 1), error: null }),
        limit: () => Promise.resolve({ data: table === 'transactions' ? merchantRows : feedback, error: null }),
        maybeSingle: () => Promise.resolve({ data: tx, error: null }),
        single: () => Promise.resolve({ data: tx, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'tag_category_feedback' ? feedback : merchantRows, error: null }).then(res),
      };
      return chain;
    },
  };
}
const baseTx = { id: 't1', category: 'Groceries', category_source: 'ai', confidence: null, merchant_name: 'SOBEYS', merchant: 'SOBEYS', description: 'SOBEYS', amount: -50, type: 'expense', posted_at: '2026-11-01', user_id: 'u1' };
const history = (n: number, category = 'Groceries', extra: Row = {}) => Array.from({ length: n }, (_, i) => ({
  id: `h${i}`, merchant_name: 'SOBEYS', merchant: 'SOBEYS', amount: -50, type: 'expense', category, date: '2026-10-01', ...extra,
}));

describe('tag-explain confidence source and wording', () => {
  it('no stored confidence → estimated, qualitative level, no exact-count claim', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client(baseTx, history(12)) as any, 'u1', 't1');
    expect(r.confidenceSource).toBe('estimated');
    expect(r.confidenceLevel).toBe('high');
    expect(r.message).toMatch(/SOBEYS 12 times/);
    expect(r.message).not.toMatch(/High confidence/);
  });
  it('stored confidence → stored source', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client({ ...baseTx, confidence: 0.62 }, history(1)) as any, 'u1', 't1');
    expect(r.confidenceSource).toBe('stored');
    expect(r.confidenceLevel).toBe('medium');
  });
  it('more than 100 (and more than 1,000) past transactions are all read — no 100-row cap', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client(baseTx, history(1300)) as any, 'u1', 't1');
    expect(r.merchantSeenCapped).toBe(false);
    expect(r.merchantSeenCount).toBe(1300);
    expect(r.proactiveInsights.join(' ')).toMatch(/you've spent \$65000\.00 at SOBEYS in 1300 purchases/);
  });
  it('an incomplete history read gives NO money figure — not even "at least $X" (Financial Evidence Trust)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client({ ...baseTx, amount: -900 }, history(12), [], { failRange: true }) as any, 'u1', 't1');
    expect(r.merchantSeenCapped).toBe(true);
    const text = r.proactiveInsights.join(' ');
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toMatch(/at least \$/);
    expect(text).toMatch(/I couldn't read all of your transactions at SOBEYS, so I can't give a spending figure/);
    expect([r.merchantTotalSpent, r.merchantAvgAmount, r.merchantRefundTotal]).toEqual([0, 0, 0]);
    // No "Nx your usual spend" from a partial history.
    expect(r.isAmountAnomaly).toBe(false);
  });
  it('never promises automatic merchant learning (C4: explicit consent, default off)', () => {
    const src = read('netlify/functions/_shared/tag_explain.ts');
    expect(src).not.toMatch(/I will apply it to all future .* transactions automatically/);
    expect(src).toMatch(/only when you ask me to/);
  });
});

describe('tag-explain merchant figures come from the unified engine (owner GO 2026-11-26; Arch verdict REFACTOR)', () => {
  it('exact merchant only: another merchant containing the name is not counted', async () => {
    const rows = [...history(6), ...history(4, 'Groceries', { merchant_name: 'SOBEYS LIQUOR', merchant: 'SOBEYS LIQUOR' }).map((r, i) => ({ ...r, id: `l${i}` }))];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client(baseTx, rows) as any, 'u1', 't1');
    expect(r.merchantSeenCount).toBe(6);
    expect(r.merchantTotalSpent).toBe(300);
  });
  it('refunds are reported separately and never counted as spending', async () => {
    const rows = [...history(5), { id: 'r1', merchant_name: 'SOBEYS', merchant: 'SOBEYS', amount: 20, type: 'income', category: 'Groceries', date: '2026-10-02' }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client(baseTx, rows) as any, 'u1', 't1');
    expect(r.merchantTotalSpent).toBe(250);
    expect(r.merchantRefundTotal).toBe(20);
    expect(r.proactiveInsights.join(' ')).toMatch(/\$20\.00 back in refunds there \(not counted as spending\)/);
  });
  it('the anomaly hint needs >= 3 prior spending transactions and compares spending only', async () => {
    const big = { ...baseTx, amount: -500 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const two = await explainTransactionCategory(client(big, history(2)) as any, 'u1', 't1');
    expect(two.isAmountAnomaly).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const three = await explainTransactionCategory(client(big, history(3)) as any, 'u1', 't1');
    expect(three.isAmountAnomaly).toBe(true);
    // A refund is never flagged as "Nx your usual spend".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const refund = await explainTransactionCategory(client({ ...baseTx, amount: 500, type: 'income' }, history(5)) as any, 'u1', 't1');
    expect(refund.isAmountAnomaly).toBe(false);
  });
  it('the source no longer uses a %name% match or a 100-row cap for merchant history', () => {
    const src = read('netlify/functions/_shared/tag_explain.ts');
    const hist = src.slice(src.indexOf('// 2. Merchant history'), src.indexOf('// Most common past category'));
    expect(hist).not.toMatch(/\.ilike\(|\.limit\(100\)|Math\.abs\(Number/);
    expect(hist).toMatch(/fetchMerchantScopeRows/);
    expect(hist).toMatch(/classifyCashFlow/);
  });
});

describe('tag-explain provenance wording (round-2 item 4)', () => {
  it('only a verified customer source is described as "you set this yourself"', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const verified = await explainTransactionCategory(client({ ...baseTx, category_source: 'user_edit' }, history(1)) as any, 'u1', 't1');
    expect(verified.message).toMatch(/You set this category yourself/);
    for (const src of ['manual', 'user_chat', 'tag_chat', 'user_correction']) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
      const r = await explainTransactionCategory(client({ ...baseTx, category_source: src }, history(1)) as any, 'u1', 't1');
      expect(r.message, src).not.toMatch(/You set this category yourself/);
      expect(r.message, src).toMatch(/protected/);
    }
  });
});

describe('tag-explain "learned" claims count only corrections for the exact merchant (Arch follow-up 2026-11-26)', () => {
  const fb = (merchant: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${merchant}-${i}`, merchant, new_category: 'Groceries', created_at: `2026-10-0${1 + i}` }));
  it('corrections for a similar-named merchant never make Tag say it learned this one', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client(baseTx, history(1), fb('SOBEYS LIQUOR', 3)) as any, 'u1', 't1');
    expect(r.learnedCount).toBe(0);
    expect(r.categorySource).not.toBe('learned');
    expect(r.message).not.toMatch(/I learned from your/);
  });
  it('two corrections for the exact merchant do', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client(baseTx, history(1), [...fb('SOBEYS', 2), ...fb('SOBEYS LIQUOR', 3)]) as any, 'u1', 't1');
    expect(r.learnedCount).toBe(2);
    expect(r.message).toMatch(/I learned from your 2 past corrections/);
  });
});

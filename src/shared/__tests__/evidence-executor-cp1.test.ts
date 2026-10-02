/**
 * Prime V1-A CP1 — evidence contract honesty.
 *
 * Exercises PRODUCTION executeEvidencePlan / buildEvidenceContextMessage with an
 * injected tool executor. "Real shape" fixtures are validated against the tools'
 * own outputSchema so they cannot drift into an invented shape again.
 */

import { describe, it, expect } from 'vitest';
import {
  executeEvidencePlan,
  buildEvidenceContextMessage,
  normalizeCategoryTotals,
  toCents,
  detectToolFailure,
  type DedupCache,
} from '../prime-evidence-executor';
import type { PrimeEvidencePlan, PrimeEvidencePlanStep } from '../prime-evidence-resolver';
import { outputSchema as categoryTotalsOutput } from '../../agent/tools/impl/transaction_category_totals';
import { outputSchema as cashFlowOutput } from '../../agent/tools/impl/cash_flow_summary';

/** Real transaction_category_totals output (schema-validated in the first test). */
const REAL_CATEGORY_TOTALS = {
  categoryTotals: [
    { category: 'Groceries', totalAmount: 190.27, transactionCount: 3, avgAmount: 63.42333333333333 },
    { category: 'Dining', totalAmount: 10.1, transactionCount: 2, avgAmount: 5.05 },
    { category: null, totalAmount: 0.29, transactionCount: 1, avgAmount: 0.29 },
  ],
  grandTotal: 200.66000000000003,
  dateRange: { start: '2026-09-01', end: '2026-09-30' },
};

const categoryStep: PrimeEvidencePlanStep = {
  evidenceKind: 'category_aggregation',
  source: 'Category spend totals aggregated from transactions',
  tool: 'transaction_category_totals',
  mode: 'tool',
  params: { startDate: '2026-09-01', endDate: '2026-09-30' },
  authoritative: true,
};
const cashFlowStep: PrimeEvidencePlanStep = {
  evidenceKind: 'cash_flow',
  source: 'Income vs expense aggregation from transactions',
  tool: 'cash_flow_summary',
  mode: 'tool',
  params: { startDate: '2026-09-01', endDate: '2026-09-30' },
  authoritative: true,
};
const plan = (...steps: PrimeEvidencePlanStep[]): PrimeEvidencePlan =>
  ({ intent: 'financial_data_lookup', steps, unresolved: [] } as unknown as PrimeEvidencePlan);
const run = (p: PrimeEvidencePlan, output: unknown, cache: DedupCache = new Map()) =>
  executeEvidencePlan(p, async () => output, cache);

describe('A. real transaction_category_totals shape', () => {
  it('fixture matches the real tool outputSchema', () => {
    expect(categoryTotalsOutput.safeParse(REAL_CATEGORY_TOTALS).success).toBe(true);
  });

  it('normalizes categoryTotals into integer cents + counts', async () => {
    const r = await run(plan(categoryStep), REAL_CATEGORY_TOTALS);
    const res = r.results[0];
    expect(res.status).toBe('resolved');
    expect(res.rowCount).toBe(3);
    const data = res.data as Record<string, unknown>;
    expect(data.totals).toEqual([
      { category: 'Groceries', totalCents: 19027, count: 3 },
      { category: 'Dining', totalCents: 1010, count: 2 },
      { category: 'Uncategorized', totalCents: 29, count: 1 },
    ]);
    expect(data.grandTotalCents).toBe(20066);
    expect(r.overallSufficiency).toBe('sufficient');
  });
});

describe('B. legacy shape still supported', () => {
  it('{ totals: [{ category, total, count }] } normalizes the same way', async () => {
    const r = await run(plan(categoryStep), { totals: [{ category: 'Food', total: 500, count: 20 }], grandTotal: 500 });
    expect((r.results[0].data as Record<string, unknown>).totals).toEqual([{ category: 'Food', totalCents: 50000, count: 20 }]);
  });
});

describe('C. formatter', () => {
  it('real shape renders dollars + counts with no undefined/NaN/?', async () => {
    const msg = buildEvidenceContextMessage(await run(plan(categoryStep), REAL_CATEGORY_TOTALS))!;
    expect(msg).toContain('Groceries: $190.27 (3 txns)');
    expect(msg).toContain('Dining: $10.10 (2 txns)');
    expect(msg).toContain('Uncategorized: $0.29 (1 txns)');
    expect(msg).not.toMatch(/undefined|NaN|\? txns/);
  });

  it('comparison formatter consumes the normalized data too', async () => {
    const step: PrimeEvidencePlanStep = {
      ...categoryStep,
      evidenceKind: 'period_comparison',
      mode: 'multi_source',
      params: { periodA_startDate: '2026-08-01', periodA_endDate: '2026-08-31', periodB_startDate: '2026-09-01', periodB_endDate: '2026-09-30' },
    };
    const msg = buildEvidenceContextMessage(await run(plan(step), REAL_CATEGORY_TOTALS))!;
    expect(msg).toContain('2026-08-01 to 2026-08-31:');
    expect(msg).toContain('Groceries: $190.27 (3 txns)');
    expect(msg).not.toMatch(/undefined|NaN|\? txns/);
  });

  it('malformed entries never become facts', () => {
    const { totals, malformedCount } = normalizeCategoryTotals([
      { category: 'Ok', totalAmount: 1.5, transactionCount: 1 },
      { category: 'Bad', totalAmount: 'abc' },
      { category: 'Missing' },
      null,
      { category: 'NoCount', totalAmount: 2 },
    ]);
    expect(totals).toEqual([
      { category: 'Ok', totalCents: 150, count: 1 },
      { category: 'NoCount', totalCents: 200, count: null },
    ]);
    expect(malformedCount).toBe(3);
  });
});

describe('grandTotal honesty (until CP3)', () => {
  it('is labelled an all-category raw total, never "Grand total" / spending', async () => {
    const msg = buildEvidenceContextMessage(await run(plan(categoryStep), REAL_CATEGORY_TOTALS))!;
    expect(msg).toContain('All-category raw total (may include income, transfers and other non-spend categories — NOT a spending total): $200.66');
    expect(msg).not.toContain('Grand total:');
  });
});

describe('D–F. empty vs failure', () => {
  it('D. valid empty categoryTotals → successful_empty', async () => {
    const empty = { categoryTotals: [], grandTotal: 0, dateRange: { start: null, end: null } };
    expect(categoryTotalsOutput.safeParse(empty).success).toBe(true);
    const r = await run(plan(categoryStep), empty);
    expect(r.results[0].status).toBe('successful_empty');
  });

  it('E. explicit tool error ({ error } from executeTool) → failed, not empty/sufficient', async () => {
    const r = await run(plan(categoryStep), { error: 'Tool execution failed', details: {} });
    expect(r.results[0]).toMatchObject({ status: 'failed', error: 'Tool execution failed' });
    expect(r.overallSufficiency).not.toBe('sufficient');
    expect(buildEvidenceContextMessage(r)).toContain('Data retrieval failed');
  });

  it('F. cash_flow_summary queryStatus: query_error → failed, never $0', async () => {
    const qerr = {
      startDate: '2026-09-01', endDate: '2026-09-30', income: 0, spending: 0, nonSpend: 0, netCashFlow: 0,
      transactionCount: 0, incomeTransactionCount: 0, spendingTransactionCount: 0, nonSpendTransactionCount: 0,
      queryStatus: 'query_error',
    };
    expect(cashFlowOutput.safeParse(qerr).success).toBe(true);
    const r = await run(plan(cashFlowStep), qerr);
    expect(r.results[0]).toMatchObject({ status: 'failed', error: 'query_error' });
    const msg = buildEvidenceContextMessage(r)!;
    expect(msg).not.toContain('Income: $0');
    expect(msg).toContain('Data retrieval failed');
  });

  it('failures are not cached as evidence', async () => {
    const cache: DedupCache = new Map();
    await run(plan(categoryStep), { error: 'boom' }, cache);
    expect(cache.size).toBe(0);
  });

  it('comparison period failure → failed, not empty', async () => {
    const step: PrimeEvidencePlanStep = {
      ...categoryStep, evidenceKind: 'period_comparison', mode: 'multi_source',
      params: { periodA_year: 2025, periodB_year: 2026 },
    };
    const r = await run(plan(step), { queryStatus: 'query_error' });
    expect(r.results.map(x => x.status)).toEqual(['failed', 'failed']);
  });

  it('detectToolFailure leaves valid results alone', () => {
    expect(detectToolFailure(REAL_CATEGORY_TOTALS)).toBeNull();
    expect(detectToolFailure({ queryStatus: 'verified_zero' })).toBeNull();
    expect(detectToolFailure({ queryStatus: 'partial' })).toBeNull();
    expect(detectToolFailure({ error: null })).toBeNull();
  });
});

describe('G. partial preserved', () => {
  it('single step: queryStatus partial → not authoritative, labelled partial', async () => {
    const r = await run(plan(categoryStep), { ...REAL_CATEGORY_TOTALS, queryStatus: 'partial' });
    expect(r.results[0]).toMatchObject({ status: 'resolved', authoritative: false });
    expect(r.results[0].source).toContain('partial');
    expect(buildEvidenceContextMessage(r)).toContain('PARTIAL — query truncated');
  });

  it('comparison: a partial period makes the merged comparison non-authoritative', async () => {
    const step: PrimeEvidencePlanStep = {
      ...categoryStep, evidenceKind: 'period_comparison', mode: 'multi_source',
      params: { periodA_year: 2025, periodB_year: 2026 },
    };
    const r = await run(plan(step), { ...REAL_CATEGORY_TOTALS, queryStatus: 'partial' });
    expect(r.results[0]).toMatchObject({ status: 'resolved', authoritative: false });
  });
});

describe('H. money normalization is deterministic', () => {
  it.each([
    [10.10, 1010], [0.29, 29], [190.27, 19027], [0.1 + 0.2, 30], [2614.74, 261474], ['12.5', 1250],
  ])('%s → %s cents', (input, cents) => {
    expect(toCents(input)).toBe(cents);
  });
  it.each([[NaN], [Infinity], [undefined], [null], ['abc'], ['']])('%s → null', (input) => {
    expect(toCents(input)).toBeNull();
  });
});

/**
 * FST-2 client layer (owner GO 2026-11-26). Synthetic data only.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { readSummaryResponse, allTimeRange, yearRange } from '../financialSummary';
import { insightText, categoryTrend, spendingClaim } from '../insightWording';
import { FINANCIAL_LABELS } from '../financialLabels';
import { needsCategory, NEEDS_CATEGORY_OR_FILTER } from '../needsCategory';
import type { Insight } from '../financialSummary';

const verified = { status: 'verified', labels: { deposits: { amount: 1, cents: 100 } } };
const cov = (complete: boolean, a = 2, r = 2) => ({ complete, periodsAvailable: a, periodsRequired: r });

describe('readSummaryResponse — every status', () => {
  it('verified / verified_zero carry the summary', () => {
    expect(readSummaryResponse(200, verified).status).toBe('verified');
    expect(readSummaryResponse(200, { ...verified, status: 'verified_zero' }).status).toBe('verified_zero');
  });
  it('partial never carries figures', () => {
    const r = readSummaryResponse(200, { status: 'partial', labels: { deposits: { amount: 9, cents: 900 } } });
    expect(r).toStrictEqual({ status: 'partial' });
  });
  it('no_data, unavailable (503 / malformed / network), signed_out (401)', () => {
    expect(readSummaryResponse(200, { status: 'no_data' })).toStrictEqual({ status: 'no_data' });
    expect(readSummaryResponse(503, { status: 'unavailable' })).toStrictEqual({ status: 'unavailable' });
    expect(readSummaryResponse(200, { status: 'verified' })).toStrictEqual({ status: 'unavailable' }); // no labels
    expect(readSummaryResponse(500, null)).toStrictEqual({ status: 'unavailable' });
    expect(readSummaryResponse(401, { error: 'Unauthorized' })).toStrictEqual({ status: 'signed_out' });
  });
  it('scopes', () => {
    expect(yearRange(2026)).toStrictEqual({ startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(allTimeRange(new Date('2026-11-26T12:00:00Z'))).toStrictEqual({ startDate: '2000-01-01', endDate: '2026-11-26' });
  });
});

describe('insight wording — fixed table, server decides', () => {
  it('trend only with server coverage', () => {
    const t: Insight = { kind: 'trend', subject: 'actual_spending', direction: 'up', percent: 12, coverage: cov(true) };
    expect(insightText(t)).toBe('Actual spending is up 12% compared with the previous statement period.');
    expect(insightText({ ...t, coverage: cov(false) })).toBeNull();
  });
  it('category trend and stable', () => {
    const c: Insight = { kind: 'trend', subject: 'category', category: 'Dining', direction: 'down', percent: 15, coverage: cov(true) };
    expect(insightText(c)).toBe('Dining spending is down 15% compared with the previous statement period.');
    expect(categoryTrend([c], 'Dining')).toBe(c);
    expect(categoryTrend([{ ...c, coverage: cov(false) }], 'Dining')).toBeNull();
    expect(insightText({ kind: 'stable', subject: 'actual_spending', coverage: cov(true, 3, 3) })).toBe('Actual spending has stayed within 10% across your last 3 statement periods.');
  });
  it('not enough history, top category, needs review', () => {
    expect(insightText({ kind: 'not_enough_history', subject: 'actual_spending', coverage: cov(false, 1, 2) })).toBe('Not enough statement history to compare yet (1 of 2 complete statement periods).');
    expect(insightText({ kind: 'top_category', subject: 'category', category: 'Housing', percent: 39, count: 2, coverage: cov(true) })).toBe('Housing is 39% of actual spending (2 transactions).');
    expect(insightText({ kind: 'needs_review', subject: 'transactions', count: 2, coverage: cov(true) })).toBe('2 transactions need your review.');
  });
  it('spending claim prefers trend, then stable, then not enough history', () => {
    const n: Insight = { kind: 'not_enough_history', subject: 'actual_spending', coverage: cov(false, 0, 2) };
    const s: Insight = { kind: 'stable', subject: 'actual_spending', coverage: cov(true, 3, 3) };
    expect(spendingClaim([n, s])).toBe(s);
    expect(spendingClaim([n])).toBe(n);
    expect(spendingClaim([])).toBeNull();
  });
});

describe('shared label map and review rule', () => {
  it('owner labels', () => {
    expect(FINANCIAL_LABELS.netCashFlow).toBe('Net Cash Flow');
    expect(Object.values(FINANCIAL_LABELS)).not.toContain('Net Flow');
    expect(JSON.stringify(FINANCIAL_LABELS)).not.toMatch(/Deductions/i);
  });
  it('the client review rule is the shared server rule', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../needsCategory.ts'), 'utf8');
    expect(src).toMatch(/from '@\/shared\/needs-category-rule'/);
    expect(needsCategory('Needs Review')).toBe(true);
    expect(needsCategory('Other')).toBe(false);
    expect(NEEDS_CATEGORY_OR_FILTER).toContain('needs review');
  });
});

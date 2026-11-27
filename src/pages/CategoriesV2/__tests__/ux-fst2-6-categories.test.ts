/**
 * UX-FST2-6 Categories on the shared engine (owner FST-2 GO; AR-1b FR-002; owner: hide unsupported
 * figures, keep no inaccurate calculations).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { categoriesDates } from '../useCategoriesData';

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('UX-FST2-6 Categories', () => {
  it('scope dates: custom range, month, year, all time', () => {
    expect(categoriesDates('2026-02', 2026, null)).toStrictEqual({ startDate: '2026-02-01', endDate: '2026-02-28' });
    expect(categoriesDates(undefined, 2025, null)).toStrictEqual({ startDate: '2025-01-01', endDate: '2025-12-31' });
    expect(categoriesDates('2026-02', 2026, { from: '2026-03-01', to: '2026-03-15' })).toStrictEqual({ startDate: '2026-03-01', endDate: '2026-03-15' });
    expect(categoriesDates(undefined, 'all', null).startDate).toBe('2000-01-01');
  });
  it('hook: server figures only; no income rule, sums, budget, month trend or guessed subcategories', () => {
    const hook = code(read('useCategoriesData.ts'));
    expect(hook).toMatch(/useFinancialSummary\(summaryReq\)/);
    expect(hook).toMatch(/summary\.spendingByCategory\.map/);
    expect(hook).toMatch(/categoryTrend\(summary\.insights, c\.category\)/);
    expect(hook).not.toMatch(/INCOME_PATTERNS|NON_SPEND|isIncome|isNonSpend|monthBuckets|SUBCATEGORY_PATTERNS|\.reduce\(/);
    expect(hook).toMatch(/subcategorySuggestions: \[\]/);
  });
  it('page and parts: owner labels, server net, server shares and wording, honest state', () => {
    const page = code(read('CategoriesPageV2.tsx'));
    expect(page).toMatch(/const net = data\.netCashFlow;/);
    for (const k of ['actualIncome', 'actualSpending', 'netCashFlow']) expect(page).toMatch(new RegExp(`FINANCIAL_LABELS\\.${k}\\b`));
    expect(page).toMatch(/<FinancialStateNotice state=\{data\.financial\}/);
    expect(page).not.toMatch(/Spent,Budget|MoM Trend|Top Merchant/);
    expect(code(read('CategoryListRow.tsx'))).toMatch(/category\.share \?\? 0/);
    expect(code(read('AgentInsightStrip.tsx'))).toMatch(/data\.topCategoryText, data\.spendingClaimText/);
    const drawer = code(read('CategoryDetailDrawer.tsx'));
    expect(drawer).not.toMatch(/allCatTransactions\.reduce|vs last month/);
    expect(drawer).toMatch(/Amounts by subcategory aren't available yet/);
  });
});

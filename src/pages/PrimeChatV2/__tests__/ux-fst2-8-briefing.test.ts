/**
 * UX-FST2-8 Prime briefing panel on the shared engine (owner FST-2 GO: employee reporting cards;
 * AR-1b FR-007, with Prime HQ).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('UX-FST2-8 Prime briefing', () => {
  it('hook: server figures, wording and review line; no legacy rules, trends, deductions or tax mirror', () => {
    const hook = code(read('usePrimeBriefingData.ts'));
    expect(hook).toMatch(/useFinancialSummary\(scope\)/);
    expect(hook).toMatch(/summary\.labels\.actualSpending\.amount/);
    expect(hook).toMatch(/needsReviewText\(summary\.needsReview/);
    expect(hook).toMatch(/POSSIBLE_BUSINESS_EXPENSES_TEXT\(/);
    expect(hook).not.toMatch(/INCOME_PATTERNS|NON_SPEND|isNonSpend|monthBuckets|monthOverMonthPct|trendAlert|deductibleLabels|TAX_SECTIONS|taxSummary|\.reduce\(/);
  });
  it('panel: no browser money to Prime, openers from the summary, no deductions card', () => {
    const panel = code(read('PrimeChatV2.tsx'));
    expect(panel).not.toMatch(/monthlySpend|topCategories:|taxSummary:|totalIncome: data\.totalIncome|totalSpent: data\.totalSpent/);
    expect(panel).not.toMatch(/data\.trendAlert|data\.deductions|monthOverMonthPct|TaxDeductionsCard|some look like duplicates/);
    expect(panel).not.toMatch(/data\.totalIncome - data\.totalSpent/);
    expect(panel).toMatch(/FINANCIAL_LABELS\.netCashFlow/);
    expect(panel).toMatch(/data-testid="briefing-pbe"/);
  });
});

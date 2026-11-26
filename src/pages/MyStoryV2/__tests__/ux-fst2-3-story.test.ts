/**
 * UX-FST2-3 My Story on the shared engine (owner 2026-11-26; AR-1b FR-003). Synthetic data.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { storyTrends } from '../useStoryData';
import type { Insight } from '@/lib/financialSummary';

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const cov = (complete: boolean) => ({ complete, periodsAvailable: 2, periodsRequired: 2 });

describe('UX-FST2-3 My Story', () => {
  it('trends are the server category insights only, never without coverage', () => {
    const ins: Insight[] = [
      { kind: 'trend', subject: 'category', category: 'Dining', direction: 'up', percent: 18, coverage: cov(true) },
      { kind: 'trend', subject: 'category', category: 'Fuel', direction: 'down', percent: 12, coverage: cov(false) },
      { kind: 'trend', subject: 'actual_spending', direction: 'up', percent: 5, coverage: cov(true) },
      { kind: 'top_category', subject: 'category', category: 'Housing', percent: 40, count: 2, coverage: cov(true) },
    ];
    const t = storyTrends(ins);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ label: 'Dining', kind: 'trend', direction: 'up', percent: 18, text: 'Dining spending is up 18% compared with the previous statement period.' });
  });
  it('no browser money, grade, deductions or month comparison in the hook', () => {
    const hook = code(read('useStoryData.ts'));
    expect(hook).toMatch(/useFinancialSummary\(/);
    expect(hook).not.toMatch(/useTransactions|PAYMENT\|CREDIT|\.reduce\(|healthGrade|deduct|monthBuckets|vs previous/i);
  });
  it('page: owner labels, no grade, one possible-business-expenses line, honest state', () => {
    const page = code(read('MyFinancialStoryV2.tsx'));
    expect(page).not.toMatch(/HealthRing|healthGrade|Financial Health|Possibly deductible|tax-deductible|deductionBreakdown|categoryHealth/);
    for (const k of ['deposits', 'withdrawals', 'netCashFlow', 'actualIncome', 'actualSpending', 'possibleBusinessExpenses']) {
      expect(page).toMatch(new RegExp(`FINANCIAL_LABELS\\.${k}\\b`));
    }
    expect(page).toMatch(/POSSIBLE_BUSINESS_EXPENSES_TEXT\(/);
    expect(page).toMatch(/<FinancialStateNotice state=\{data\.financial\}/);
    expect(page).toMatch(/statementCoverage !== "complete"[\s\S]{0,300}totalsLabel/);
  });
  it('Crystal panel sends no browser money to the AI; sidebar uses server figures', () => {
    const panel = code(read('CrystalCopilotPanel.tsx'));
    expect(panel).not.toMatch(/totalIncome|totalSpent|netPosition|categorySummary/);
    const side = code(read('ReportPreviewSidebar.tsx'));
    expect(side).not.toMatch(/data\.income|data\.expenses|netPosition|Tax deduction/);
    expect(side).toMatch(/data\.summary\.labels\.netCashFlow/);
  });
});

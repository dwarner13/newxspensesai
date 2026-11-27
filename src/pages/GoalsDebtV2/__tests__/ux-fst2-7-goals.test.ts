/**
 * UX-FST2-7 Goals on the shared engine (owner FST-2 GO; AR-1b FR-005; owner: hide unsupported
 * figures, keep no inaccurate calculations).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('UX-FST2-7 Goals', () => {
  it('hook: server average net cash flow per period; no income rule or month buckets', () => {
    const hook = code(read('useGoalsData.ts'));
    expect(hook).toMatch(/useFinancialSummary\(scope\)/);
    expect(hook).toMatch(/summary\.goals\.averageNetCashFlowPerPeriod/);
    expect(hook).not.toMatch(/INCOME_PATTERNS|isIncome|monthBuckets|useTransactions|monthlySavings/);
    expect(hook).toMatch(/const debtFreeMonths = 0;/);
  });
  it('page and Goalie: no monthly-savings or debt-free projection figures', () => {
    const page = code(read('GoalsDebtPageV2.tsx'));
    expect(page).not.toMatch(/Monthly Savings|At current pace|data\.monthlySavings/);
    expect(page).toMatch(/Avg Net Cash Flow/);
    expect(page).toMatch(/Debt-Free Date", value: "Not available yet"/);
    expect(code(read('GoalieCopilotPanel.tsx'))).not.toMatch(/monthlySavings|Savings\/mo/);
    const tracker = read('DebtTracker.tsx');
    expect(tracker).not.toMatch(/latest month&apos;s savings|latest month's savings/);
    expect(tracker).toMatch(/A debt-free date isn&apos;t calculated yet\./);
  });
});

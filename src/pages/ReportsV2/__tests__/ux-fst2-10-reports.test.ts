/**
 * UX-FST2-10 Reports on the shared engine (owner FST-2 GO; AR-1b FR-010; G5: transaction dates,
 * not statement periods).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../../..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('UX-FST2-10 Reports', () => {
  it('hook: server totals, perStatement, comparable periods and categories; no browser rule or sums', () => {
    const hook = code(read('src/hooks/useReportsData.ts'));
    expect(hook).toMatch(/useFinancialSummary\(scope\)/);
    expect(hook).toMatch(/summary\?\.perStatement/);
    expect(hook).toMatch(/summary\?\.periods \?\? \[\]/);
    expect(hook).toMatch(/summary\?\.spendingByCategory/);
    expect(hook).not.toMatch(/from\('transactions'\)|isIncome|totalSpent \+=|monthMap|catMap/);
  });
  it('page: owner labels, transaction-date wording (G5), server export, honest state, no browser chart claims', () => {
    const page = code(read('src/pages/ReportsV2/ReportsPageV2.tsx'));
    expect(page).toMatch(/"Transactions from "/);
    expect(page).not.toMatch(/Statement Period|months covered|chartInsights|group\.totalSpent/);
    expect(page).toMatch(/await fetchRowsExport\(\{\}\)/);
    expect(page).not.toMatch(/from\("transactions"\)/);
    expect(page).toMatch(/<FinancialStateNotice state=\{data\.financial\}/);
    for (const k of ['actualSpending', 'actualIncome', 'netCashFlow']) expect(page).toMatch(new RegExp(`FINANCIAL_LABELS\\.${k}\\b`));
    expect(page).not.toMatch(/monthlySpend|recentImportSummaries/);
  });
});

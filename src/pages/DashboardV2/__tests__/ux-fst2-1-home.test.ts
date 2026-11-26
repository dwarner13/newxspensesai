/**
 * UX-FST2-1 Home on the shared engine (owner GO 2026-11-26; AR-1b FR-001). Source-level guards.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildRecapText, type DashboardData } from '../useDashboardData';

const hook = fs.readFileSync(path.resolve(__dirname, '../useDashboardData.ts'), 'utf8');
const page = fs.readFileSync(path.resolve(__dirname, '../DashboardHomeV2.tsx'), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('UX-FST2-1 Home', () => {
  it('reads money only from useFinancialSummary (no transactions, no local aggregation)', () => {
    expect(hook).toMatch(/useFinancialSummary\(/);
    expect(code(hook)).not.toMatch(/useTransactions/);
    expect(code(hook)).not.toMatch(/PAYMENT\|CREDIT\|REFUND/);
    expect(code(hook)).not.toMatch(/\.reduce\(/);
    expect(code(hook)).not.toMatch(/monthBuckets|trendAlert|deductLabels/);
  });
  it('uses the owner labels; no Net Flow, Income/Expenses KPIs or deduction claims', () => {
    const c = code(page);
    expect(c).toMatch(/FINANCIAL_LABELS\.deposits/);
    expect(c).toMatch(/FINANCIAL_LABELS\.withdrawals/);
    expect(c).toMatch(/FINANCIAL_LABELS\.netCashFlow/);
    expect(c).toMatch(/FINANCIAL_LABELS\.possibleBusinessExpenses/);
    expect(c).not.toMatch(/"Net Flow"|Deductions Found|tax deductions|from last month|accelerating/);
    expect(c).not.toMatch(/label: "Income"|label: "Expenses"/);
  });
  it('trend wording only through the server insights; honest state when no figures', () => {
    const c = code(page);
    expect(c).toMatch(/spendingClaim\(sum\.insights\)/);
    expect(c).toMatch(/<FinancialStateNotice state=\{data\.financial\}/);
    // Final contract: recorded totals carry the server's totalsLabel unless coverage is complete.
    expect(c).toMatch(/statementCoverage !== "complete"[\s\S]{0,200}sum\.dataQuality\.totalsLabel/);
  });
  it('recap line carries no money and no trend claims', () => {
    const d = { statementCount: 2, transactionCount: 119, needsReviewCount: 2 } as DashboardData;
    expect(buildRecapText(d)).toBe('So far: Byte imported 2 statements (119 transactions), Tag flagged 2 transactions for review.');
    const none = { statementCount: 0, transactionCount: null, needsReviewCount: null } as DashboardData;
    expect(buildRecapText(none)).toBe('Your AI team is standing by. Upload a statement to get started.');
  });
});

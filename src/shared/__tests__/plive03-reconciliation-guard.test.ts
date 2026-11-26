/**
 * P-LIVE-03: Prime's breakdown answers must reconcile (synthetic figures only). The failing reply
 * shapes are reproduced from the incident's STRUCTURE (income shown as total deposits; needs-review
 * added on top of spending; invented "unexplained difference" explained as an overdraft).
 */
import { describe, it, expect } from 'vitest';
import { guardReconciledAnswer, renderReconciledAnswer, moneyFigures } from '../statement-reconciliation-guard';
import { toBreakdownOutput } from '../../agent/tools/impl/cash_flow_summary';
import { buildStatementBreakdown } from '../statement-breakdown';
import { buildPeriodAggregate } from '../period-aggregate';
import { toCashFlowOutput } from '../../agent/tools/impl/cash_flow_summary';

let n = 0;
const tx = (amount: number, type: 'income' | 'expense', category: string, subcategory: string | null = null) =>
  ({ id: `g${++n}`, date: '2026-03-10', amount: type === 'income' ? amount : -amount, type, category, subcategory });
const ROWS = [
  tx(2000, 'income', 'Income', 'Employment'), tx(150, 'income', 'Transfers', 'e-Transfer'), tx(15, 'income', 'Subscriptions'),
  tx(80, 'expense', 'Groceries'), tx(1100, 'expense', 'Housing', 'Mortgage'), tx(250, 'expense', 'Transfers', 'e-Transfer'),
  tx(100, 'expense', 'Transfers', 'ATM Withdrawal'), tx(35, 'expense', 'Needs Review'),
];
// deposits 2165, withdrawals 1565, net 600; income 2000, spending 115 (80 + 35 needs review)
const agg = buildPeriodAggregate(ROWS, { fetch: { complete: true, truncated: false, rowsFetched: ROWS.length } });
const cf = toCashFlowOutput({ startDate: '2026-03-01', endDate: '2026-03-31' }, agg, buildStatementBreakdown(ROWS));

describe('statement reconciliation guard', () => {
  it('the tool output carries a reconciled breakdown', () => {
    expect(cf.statementBreakdown).toMatchObject({ totalDeposits: 2165, totalWithdrawals: 1565, net: 600, reconciled: true });
    expect(toBreakdownOutput(buildStatementBreakdown(ROWS)).lines.map(l => l.key)).toEqual(expect.arrayContaining(['refunds', 'mortgage_payments', 'cash_withdrawals', 'unresolved']));
  });

  it('accepts a reply that uses only returned figures', () => {
    const ok = 'Total deposits were $2,165.00 and total withdrawals $1,565.00, a net of $600.00. Employment income was $2,000.00; refunds $15.00.';
    expect(guardReconciledAnswer(ok, cf).ok).toBe(true);
  });

  it('rejects income presented as total deposits (the reported defect), even though the figure is real', () => {
    const g = guardReconciledAnswer('Total deposits (all inflows): $2,000.00 (Income + Incoming transfers)', cf);
    expect(g).toMatchObject({ ok: false, unsupportedFigures: 0, mislabelledTotals: 1 });
  });

  it('rejects a wrong net and accepts the correct labelled totals', () => {
    expect(guardReconciledAnswer('Net cash flow: $435.00', cf).ok).toBe(false);
    expect(guardReconciledAnswer('Total deposits $2,165.00; total withdrawals $1,565.00; net $600.00.', cf).ok).toBe(true);
  });

  it('rejects a double count (spending + needs review added again)', () => {
    const bad = 'Total withdrawals: $1,600.00 (spending + transfers + debt + needs review).';
    const g = guardReconciledAnswer(bad, cf);
    expect(g).toMatchObject({ ok: false, applies: true, unsupportedFigures: 1 });
  });

  it('rejects an invented difference explained as an overdraft when the breakdown reconciles', () => {
    const bad = 'Deposits $2,165.00, withdrawals $1,565.00. This could reflect an overdraft or missing deposits.';
    expect(guardReconciledAnswer(bad, cf)).toMatchObject({ ok: false, speculation: true });
  });

  it('does not apply to replies without money figures or off-topic', () => {
    expect(guardReconciledAnswer('You have 8 transactions this month.', cf).applies).toBe(false);
    expect(guardReconciledAnswer('Your coffee habit cost $3.99 today.', cf, 'what did I buy').applies).toBe(false);
    expect(guardReconciledAnswer('Deposits were $1.00', null).applies).toBe(false);
  });

  it('the code-owned answer states only returned figures and passes its own guard', () => {
    const text = renderReconciledAnswer(cf);
    expect(text).toContain('no unexplained difference');
    expect(text).not.toMatch(/overdraft|missing deposit/i);
    expect(guardReconciledAnswer(text, cf).ok).toBe(true);
    expect(moneyFigures(text).length).toBeGreaterThan(5);
  });

  it('an unreconciled breakdown is stated as a number, never explained', () => {
    const rows2 = [...ROWS, { id: 'u', date: '2026-03-11', amount: 50, type: 'Credit', category: 'Other', subcategory: null }];
    const cf2 = toCashFlowOutput({ startDate: '2026-03-01', endDate: '2026-03-31' }, buildPeriodAggregate(rows2, { fetch: { complete: true, truncated: false, rowsFetched: rows2.length } }), buildStatementBreakdown(rows2));
    const text = renderReconciledAnswer(cf2);
    expect(cf2.statementBreakdown!.reconciled).toBe(false);
    expect(text).toContain('could not be placed');
    expect(text).toContain("won't guess");
  });
});

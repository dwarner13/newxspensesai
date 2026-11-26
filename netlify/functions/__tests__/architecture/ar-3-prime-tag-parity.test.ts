/**
 * AR-3 (Prime × Tag parity). Owner: Prime HQ (fixture), Tag HQ (Tag side).
 * Integration of staging candidate 1 (owner 2026-11-26): the SAME period through Prime's
 * cash_flow_summary / transaction_category_totals path and Tag's tagFinancialContext must give the
 * same spending (cents and count), including after P-LIVE-03 (refunds out of income, mortgage as debt).
 * Synthetic data only: FST-2 multi-account ledger + a P-LIVE-03-shaped statement.
 */
import { describe, it, expect } from 'vitest';
import { generateLedger } from '../../../../src/shared/__tests__/fixtures/ledger-generator';
import { buildPeriodAggregate } from '../../../../src/shared/period-aggregate';
import { buildStatementBreakdown } from '../../../../src/shared/statement-breakdown';
import { toCashFlowOutput } from '../../../../src/agent/tools/impl/cash_flow_summary';
import { summarizeTagSpending } from '../../_shared/tagFinancialContext';

const fetch = (n: number) => ({ complete: true, truncated: false, rowsFetched: n });
const scope = (start: string, end: string) => ({ period: { start, end }, periodSource: 'requested' as const, currency: 'CAD', accounts: [], undatedRows: 0 });

let k = 0;
const tx = (amount: number, type: 'income' | 'expense', category: string, subcategory: string | null = null, merchant = 'Synthetic Merchant') =>
  ({ id: `p${++k}`, date: `2026-03-${String((k % 27) + 1).padStart(2, '0')}`, amount: type === 'income' ? amount : -amount, type, category, subcategory, merchant_name: merchant, import_id: 'imp-p' });
const PLIVE03 = [
  tx(2000, 'income', 'Income', 'Employment'), tx(15, 'income', 'Subscriptions'), tx(40, 'income', 'Transportation', 'Gas & Fuel'),
  tx(80, 'expense', 'Groceries'), tx(25, 'expense', 'Food & Dining', 'Coffee & Drinks'), tx(1100, 'expense', 'Housing', 'Mortgage'),
  tx(300, 'expense', 'Debt Payments', 'Loan Payment'), tx(100, 'expense', 'Transfers', 'ATM Withdrawal'), tx(35, 'expense', 'Needs Review'),
];

describe('AR-3: Prime and Tag report the same spending', () => {
  it.each([[1000], [3000]])('FST-2 ledger of %i rows over a year: identical spending cents and counts', (n) => {
    const { rows } = generateLedger(n, 'u-parity');
    const start = '2024-01-01'; const end = '2024-12-31';
    const prime = toCashFlowOutput({ startDate: start, endDate: end }, buildPeriodAggregate(rows, { fetch: fetch(rows.length), period: { start, end } }));
    const tag = summarizeTagSpending(rows, { fetch: fetch(rows.length), scope: scope(start, end) });
    expect(tag.spending.cents).toBe(prime.cents!.spending);
    expect(tag.spending.count).toBe(prime.spendingTransactionCount);
    expect(tag.spending.count).toBeGreaterThan(100); // the period really contains spending
    expect(tag.reconciled).toBe(true);
  });

  it('P-LIVE-03 statement: mortgage, loans, ATM and refunds are outside spending for BOTH, and it reconciles', () => {
    const start = '2026-03-01'; const end = '2026-03-31';
    const agg = buildPeriodAggregate(PLIVE03, { fetch: fetch(PLIVE03.length), period: { start, end } });
    const prime = toCashFlowOutput({ startDate: start, endDate: end }, agg, buildStatementBreakdown(PLIVE03));
    const tag = summarizeTagSpending(PLIVE03, { fetch: fetch(PLIVE03.length), scope: scope(start, end) });
    expect(prime.cents!.spending).toBe((80 + 25 + 35) * 100);
    expect(tag.spending.cents).toBe(prime.cents!.spending);
    expect(tag.spending.count).toBe(3);
    expect(prime.refunds).toBe(55);
    expect(prime.statementBreakdown!.reconciled).toBe(true);
  });
});

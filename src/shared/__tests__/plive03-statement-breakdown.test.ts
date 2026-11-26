/**
 * P-LIVE-03 (owner 2026-11-26): Prime's statement breakdown failed on a clean account.
 * Synthetic chequing statement with the SAME label shapes as the failing import (all amounts
 * invented). Expected values are hand-written (independent oracle), never computed by the code
 * under test. Every breakdown must reconcile to raw deposits and withdrawals.
 */
import { describe, it, expect } from 'vitest';
import { buildStatementBreakdown, type BreakdownLineKey } from '../statement-breakdown';
import { buildPeriodAggregate } from '../period-aggregate';
import { classifyCashFlow } from '../financial-taxonomy';

let n = 0;
const tx = (amount: number, type: 'income' | 'expense', category: string, subcategory: string | null = null) =>
  ({ id: `s${++n}`, date: `2026-03-${String((n % 27) + 1).padStart(2, '0')}`, amount: type === 'income' ? amount : -amount, type, category, subcategory });

const STATEMENT = [
  // deposits (type income)
  tx(2000, 'income', 'Income', 'Employment'), tx(2000, 'income', 'Income', 'Employment'),   // employment 4000
  tx(300, 'income', 'Income', 'Cheque Deposit'), tx(120, 'income', 'Income', 'Insurance'),  // other deposits 420
  tx(150, 'income', 'Transfers', 'e-Transfer'),                                               // incoming transfer 150
  tx(60, 'income', 'Transfers', 'ATM Withdrawal'),                                            // cash deposit 60
  tx(15, 'income', 'Subscriptions', null), tx(40, 'income', 'Transportation', 'Gas & Fuel'),  // refunds 55
  // withdrawals (type expense)
  tx(80, 'expense', 'Groceries'), tx(25, 'expense', 'Food & Dining', 'Coffee & Drinks'), tx(45, 'expense', 'Personal Care'), // everyday 150
  tx(1100, 'expense', 'Housing', 'Mortgage'), tx(1100, 'expense', 'Housing', 'Mortgage'),     // mortgage 2200
  tx(300, 'expense', 'Debt Payments', 'Loan Payment'), tx(200, 'expense', 'Debt Payments', null), // loans 500
  tx(400, 'expense', 'Debt Payments', 'Credit Card'),                                         // credit card 400
  tx(250, 'expense', 'Transfers', 'e-Transfer'),                                              // outgoing transfer 250
  tx(100, 'expense', 'Transfers', 'ATM Withdrawal'), tx(60, 'expense', 'Transfers', 'ATM Withdrawal'), // cash 160
  tx(35, 'expense', 'Needs Review'), tx(12, 'expense', 'Needs Review'),                       // unresolved 47
];
// Hand-written oracle (cents)
const RAW_DEPOSITS = (4000 + 420 + 150 + 60 + 55) * 100;            // 468500
const RAW_WITHDRAWALS = (150 + 2200 + 500 + 400 + 250 + 160 + 47) * 100; // 370700
const EXPECTED: Partial<Record<BreakdownLineKey, [number, number]>> = {
  employment_income: [400000, 2], other_deposits: [42000, 2], incoming_transfers: [15000, 1], cash_deposits: [6000, 1],
  refunds: [5500, 2], everyday_spending: [15000, 3], mortgage_payments: [220000, 2], loan_repayments: [50000, 2],
  credit_card_payments: [40000, 1], outgoing_transfers: [25000, 1], cash_withdrawals: [16000, 2], unresolved: [4700, 2],
};

describe('P-LIVE-03 reconciled statement breakdown', () => {
  const b = buildStatementBreakdown(STATEMENT);
  const line = (k: BreakdownLineKey) => b.lines.find(l => l.key === k)!;

  it('reconciles exactly to raw deposits and withdrawals, agrees with the shared engine, nothing unplaced', () => {
    expect(b.raw.depositsCents).toBe(RAW_DEPOSITS);
    expect(b.raw.withdrawalsCents).toBe(RAW_WITHDRAWALS);
    expect(b.lines_total.depositsCents).toBe(RAW_DEPOSITS);
    expect(b.lines_total.withdrawalsCents).toBe(RAW_WITHDRAWALS);
    expect(b.lines_total.netCents).toBe(RAW_DEPOSITS - RAW_WITHDRAWALS);
    expect(b.unexplainedDifferenceCents).toEqual({ deposits: 0, withdrawals: 0 });
    expect(b.unplaced.count).toBe(0);
    expect(b.engineAgrees).toBe(true);
    expect(b.reconciled).toBe(true);
  });

  it.each(Object.entries(EXPECTED))('%s line matches the hand-written oracle', (k, [cents, count]) => {
    expect(line(k as BreakdownLineKey)).toMatchObject({ cents, count });
  });

  it('defect: total deposits include incoming transfers, cash deposits and refunds (not income alone)', () => {
    const agg = buildPeriodAggregate(STATEMENT, { fetch: { complete: true, truncated: false, rowsFetched: STATEMENT.length } });
    expect(agg.cents.totalInflow).toBe(RAW_DEPOSITS);
    expect(agg.cents.income).toBe(442000);            // employment + other deposits only
    expect(agg.cents.income).not.toBe(RAW_DEPOSITS);   // "deposits = income" is the reported defect
  });

  it('defect: unresolved items are inside withdrawals once — adding them again breaks reconciliation', () => {
    const doubleCounted = b.lines_total.withdrawalsCents + line('unresolved').cents;
    expect(doubleCounted).not.toBe(b.raw.withdrawalsCents);
    expect(line('everyday_spending').cents + line('unresolved').cents).toBe(19700);
  });

  it('defect: mortgage payments are debt repayment, never spending', () => {
    expect(classifyCashFlow({ type: 'expense', amount: -1100, category: 'Housing', subcategory: 'Mortgage' }).purpose).toBe('debt_payment');
    const agg = buildPeriodAggregate(STATEMENT, { fetch: { complete: true, truncated: false, rowsFetched: STATEMENT.length } });
    expect(agg.cents.spending).toBe(15000 + 4700);    // everyday + unresolved; no mortgage
    expect(agg.cents.debtPayments).toBe(220000 + 50000 + 40000);
  });

  it('defect: ATM withdrawals are identified as cash withdrawals (not hidden in transfers)', () => {
    expect(line('cash_withdrawals').count).toBe(2);
    expect(line('outgoing_transfers').count).toBe(1);
  });

  it('defect: money back on a spending category is a refund, not income', () => {
    expect(classifyCashFlow({ type: 'income', amount: 15, category: 'Subscriptions' }).purpose).toBe('refund');
    expect(classifyCashFlow({ type: 'income', amount: 40, category: 'Transportation', subcategory: 'Gas & Fuel' }).purpose).toBe('refund');
    expect(classifyCashFlow({ type: 'income', amount: 120, category: 'Income', subcategory: 'Insurance' }).purpose).toBe('income');
  });

  it('defect: employment income is separated from other deposits', () => {
    expect(line('employment_income').cents).toBe(400000);
    expect(line('other_deposits').cents).toBe(42000);
  });

  it('an unplaceable row is reported, never guessed, and the breakdown is then NOT reconciled', () => {
    const withCreditTyped = [...STATEMENT, { id: 'x', date: '2026-03-10', amount: 99, type: 'Credit', category: 'Other', subcategory: null }];
    const r = buildStatementBreakdown(withCreditTyped);
    expect(r.unplaced.reasons.unclassified_type).toBe(1);
    expect(r.reconciled).toBe(false);
  });
});

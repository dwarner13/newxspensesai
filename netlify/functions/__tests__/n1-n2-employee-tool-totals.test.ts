/* eslint-disable @typescript-eslint/no-explicit-any -- fake database rows and tool results */
/**
 * N1 (transactions_query, AR-1b FR-037) and N2 (goalie_suggest_actions, FR-040) — owner GO 2026-11-27
 * "FINAL EMPLOYEE TOOL AUDIT". Fake database capped at 1,000 rows per request (hosted API behaviour);
 * synthetic rows only. Display rows are separate from complete totals; partial reads never produce a
 * total; spending excludes transfers, debt payments, savings and refunds (shared engine).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCappedClient } from '../../../src/shared/__tests__/fixtures/capped-supabase';

const state: { client: any } = { client: null };
vi.mock('../../../src/server/db', () => ({ getSupabaseServerClient: () => state.client }));

const { execute: txQuery } = await import('../../../src/agent/tools/impl/transactions_query');
const { execute: goalieSuggest } = await import('../../../src/agent/tools/impl/goalie_suggest_actions');

const U = 'synthetic-user';
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

/** 1,500 rows: 1,000 groceries −10, 200 transfers out −50, 100 debt payments −100, 100 refunds +5, 100 salary +1000. */
function ledger(userId = U) {
  const rows: any[] = [];
  let i = 0;
  const add = (n: number, type: string, category: string, amount: number) => {
    for (let k = 0; k < n; k++) rows.push({ id: `${userId}-${String(i++).padStart(5, '0')}`, user_id: userId, date: daysAgo(1 + (k % 20)), description: category, merchant: category, amount, category, subcategory: null, type });
  };
  add(1000, 'expense', 'Groceries', -10);
  add(200, 'expense', 'Transfers', -50);
  add(100, 'expense', 'Debt Payments', -100);
  add(100, 'income', 'Groceries', 5);   // refund (money back on a spending category)
  add(100, 'income', 'Income', 1000);
  return rows;
}

beforeEach(() => { state.client = null; });

describe('N1 transactions_query: display page separate from complete engine totals', () => {
  it('returns a ≤100-row page, an exact match count, and complete totals over all 1,500 rows', async () => {
    state.client = makeCappedClient({ transactions: ledger() });
    const r: any = await txQuery({ type: 'all', limit: 100, offset: 0 } as any, { userId: U });
    expect(r.ok).toBe(true);
    const v = r.value;
    expect(v.transactions.length).toBe(100);
    expect(v.page).toMatchObject({ returned: 100, totalMatching: 1500, hasMore: true });
    expect(v.totals.complete).toBe(true);
    expect(v.totals.transactionCount).toBe(1500);
    expect(v.totals.actualSpending).toBe(10000);       // groceries only: transfers / debt / refunds excluded
    expect(v.totals.refunds).toBe(500);
    expect(v.totals.actualIncome).toBe(100000);
    expect(v.totals.deposits).toBe(100500);
    expect(v.totals.withdrawals).toBe(30000);          // 10,000 + 10,000 + 10,000
    expect(v.totals.netCashFlow).toBe(70500);
    expect(v.totals.excludedFromSpending).toEqual({ transfersOut: 10000, debtPayments: 10000, savingsInvestment: 0 });
    expect(v.page.note).toMatch(/do not add these rows up/);
  });

  it('a partial / failed complete read never produces a total (all figures null, complete=false)', async () => {
    state.client = makeCappedClient({ transactions: ledger() }, { failOnRequest: 4, failTable: 'transactions' });
    const r: any = await txQuery({ type: 'all' } as any, { userId: U });
    expect(r.ok).toBe(true);
    const t = r.value.totals;
    expect(t.complete).toBe(false);
    for (const k of ['deposits', 'withdrawals', 'netCashFlow', 'actualIncome', 'actualSpending', 'refunds', 'transactionCount']) expect(t[k], k).toBeNull();
    expect(t.note).toMatch(/Do not state a total/);
  });

  it('customer isolation: another customer\'s rows never enter the page or the totals', async () => {
    state.client = makeCappedClient({ transactions: [...ledger(U), ...ledger('someone-else')] });
    const r: any = await txQuery({ type: 'all' } as any, { userId: U });
    expect(r.value.totals.transactionCount).toBe(1500);
    expect(r.value.transactions.every((t: any) => t.id.startsWith(U))).toBe(true);
  });
});

describe('N2 goalie_suggest_actions: spending from the shared engine, or no spending suggestion', () => {
  const goals = [{ id: 'g1', user_id: U, status: 'active', name: 'Pay off card', goal_type: 'debt_payoff', target_amount: 5000, current_amount: 1000, created_at: '2026-10-01' }];

  it('quotes actual spending excluding transfers, debt payments and refunds', async () => {
    state.client = makeCappedClient({ transactions: ledger(), goals });
    const r: any = await goalieSuggest({ horizon: 'short_term' } as any, { userId: U });
    expect(r.ok).toBe(true);
    const note = r.value.notes.join(' ');
    expect(note).toContain('$10000.00');                 // not 30,000 (old: every expense row, abs-summed)
    expect(note).toMatch(/excluding transfers, debt payments, savings and refunds/);
    expect(note).not.toContain('30000');
  });

  it('when spending cannot be read completely, no spending figure or spending-based suggestion appears', async () => {
    state.client = makeCappedClient({ transactions: ledger(), goals }, { failOnRequest: 1, failTable: 'transactions' });
    const r: any = await goalieSuggest({ horizon: 'short_term' } as any, { userId: U });
    expect(r.ok).toBe(true);
    expect(r.value.notes.join(' ')).toMatch(/couldn't be verified/);
    expect(JSON.stringify(r.value)).not.toMatch(/\$\d[\d,]*\.\d\d in the last 30 days/);
    expect(r.value.nextActions.some((a: any) => /extra \$/.test(a.suggestedChange))).toBe(false);
  });
});

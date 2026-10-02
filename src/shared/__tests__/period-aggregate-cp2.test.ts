/**
 * Prime V1-A CP2 — shared cash-flow classification, pure period aggregate,
 * and complete paged range fetch. Exercises PRODUCTION code only; the
 * Supabase stand-in implements eq/gte/lte/order/range plus an optional
 * server row cap (PostgREST max_rows) smaller than the requested page.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyCashFlow,
  cashFlowDirectionForType,
  amountToCents,
  NON_SPEND_CATEGORIES,
  NON_SPEND_CATEGORY_PURPOSE,
  NON_SPEND_SUBCATEGORIES,
  NON_SPEND_SUBCATEGORY_PURPOSE,
  INCOME_CATEGORIES,
  CANONICAL_CATEGORIES,
} from '../financial-taxonomy';
import { buildPeriodAggregate, type AggregateRow } from '../period-aggregate';
import {
  fetchTransactionsInRange,
  TRANSACTION_RANGE_PAGE_SIZE,
  type RangeFetchClient,
  type RangeFetchQuery,
  type TransactionRangeRow,
} from '../transaction-range-fetch';

// ─────────────────────────────────────────────────────────────────────────────
// Classifier
// ─────────────────────────────────────────────────────────────────────────────
describe('classifyCashFlow — type decides direction, category/subcategory decide purpose', () => {
  it.each([
    ['Purchase', 100, 'Groceries', '', 'outflow', 'spending', 10000, []],
    ['expense', 100, 'Groceries', '', 'outflow', 'spending', 10000, []],
    ['expense', -100, 'Groceries', '', 'outflow', 'spending', 10000, []],
    ['income', 100, 'Income', '', 'inflow', 'income', 10000, []],
    ['income', -100, 'Income', '', 'inflow', 'income', 10000, ['negative_inflow']],
    ['income', 100, 'Transfers', '', 'inflow', 'transfer_in', 10000, []],
    ['expense', 100, 'Transfers', '', 'outflow', 'transfer_out', 10000, []],
    ['expense', 100, 'Debt Payments', '', 'outflow', 'debt_payment', 10000, []],
    ['Purchase', 100, 'Debt Payments', '', 'outflow', 'debt_payment', 10000, []],
    ['expense', 100, 'Credit Card Payments', '', 'outflow', 'debt_payment', 10000, []],
    ['expense', 100, 'Savings', '', 'outflow', 'savings_investment', 10000, []],
    ['expense', 100, 'Investments', '', 'outflow', 'savings_investment', 10000, []],
    // income-category outflows: consistent conflicted non-spend, never income, never spending
    ['expense', 100, 'Income', '', 'outflow', 'classification_conflict', 10000, ['income_category_on_outflow']],
    ['expense', 100, 'Business Income', '', 'outflow', 'classification_conflict', 10000, ['income_category_on_outflow']],
    ['expense', 100, 'Employment Income', '', 'outflow', 'classification_conflict', 10000, ['income_category_on_outflow']],
    ['Purchase', 100, 'Employment Income', '', 'outflow', 'classification_conflict', 10000, ['income_category_on_outflow']],
    ['income', 100, 'Shopping', '', 'inflow', 'income', 10000, []],
    ['income', 100, 'Employment Income', '', 'inflow', 'income', 10000, []],
    ['income', 100, 'Debt Payments', '', 'inflow', 'income', 10000, ['non_spend_category_on_inflow']],
    ['expense', 0, 'Groceries', '', 'outflow', 'spending', 0, []],
    // subcategory decides purpose within the type-decided direction
    ['expense', 100, 'Banking', 'TFSA', 'outflow', 'savings_investment', 10000, []],
    ['expense', 100, 'Banking', 'RRSP', 'outflow', 'savings_investment', 10000, []],
    ['expense', 100, 'Other', 'E-Transfer', 'outflow', 'transfer_out', 10000, []],
    ['expense', 100, 'Transportation', 'Car Loan', 'outflow', 'debt_payment', 10000, []],
    ['Purchase', 100, 'Banking', 'ATM Withdrawal', 'outflow', 'other_non_spend', 10000, []],
    ['income', 100, 'Other', 'E-Transfer', 'inflow', 'transfer_in', 10000, []],
    ['income', 100, 'Other', 'Transfer', 'inflow', 'transfer_in', 10000, []],
    ['income', 100, 'Other', 'TFSA', 'inflow', 'income', 10000, ['non_spend_category_on_inflow']],
    // category purpose takes precedence over subcategory
    ['expense', 100, 'Transfers', 'Car Loan', 'outflow', 'transfer_out', 10000, []],
    ['expense', 100, 'Income', 'TFSA', 'outflow', 'classification_conflict', 10000, ['income_category_on_outflow']],
  ])('%s %s %s/%s → %s / %s / %s¢', (type, amount, category, subcategory, direction, purpose, cents, conflicts) => {
    const c = classifyCashFlow({ type: type as string, amount, category: category as string, subcategory: subcategory as string });
    expect(c).toEqual({ direction, purpose, amountCents: cents, excluded: null, conflicts });
  });

  it('subcategory never flips direction', () => {
    for (const sub of [...NON_SPEND_SUBCATEGORIES]) {
      expect(classifyCashFlow({ type: 'income', amount: 1, category: 'Other', subcategory: sub }).direction).toBe('inflow');
      expect(classifyCashFlow({ type: 'expense', amount: 1, category: 'Other', subcategory: sub }).direction).toBe('outflow');
      expect(classifyCashFlow({ type: 'Purchase', amount: 1, category: 'Other', subcategory: sub }).direction).toBe('outflow');
    }
  });

  it('income-category outflows never land in income or ordinary spending', () => {
    for (const cat of ['Income', 'Business Income', 'Employment Income', ' income ', 'EMPLOYMENT INCOME']) {
      for (const type of ['expense', 'Purchase']) {
        const c = classifyCashFlow({ type, amount: 10, category: cat });
        expect(c.direction).toBe('outflow');
        expect(c.purpose).toBe('classification_conflict');
        expect(c.conflicts).toEqual(['income_category_on_outflow']);
      }
    }
  });

  it('type is case-insensitive; Credit/Debit/null/unknown are unclassified, never guessed', () => {
    expect(cashFlowDirectionForType('INCOME')).toBe('inflow');
    expect(cashFlowDirectionForType(' purchase ')).toBe('outflow');
    for (const t of ['Credit', 'credit', 'Debit', 'transfer', '', null, undefined]) {
      expect(classifyCashFlow({ type: t, amount: 5, category: 'Income' })).toEqual({
        direction: 'unclassified', purpose: 'unclassified', amountCents: null, excluded: 'unclassified_type', conflicts: [],
      });
    }
  });

  it('missing / invalid amounts are excluded, never $0', () => {
    for (const amount of [null, undefined, NaN, Infinity, -Infinity, 'abc', '', {}]) {
      const c = classifyCashFlow({ type: 'expense', amount, category: 'Groceries' });
      expect(c).toMatchObject({ direction: 'outflow', purpose: 'spending', amountCents: null, excluded: 'missing_amount' });
    }
    expect(amountToCents('12.34')).toBe(1234);
  });

  it('sign never decides direction', () => {
    expect(classifyCashFlow({ type: 'Purchase', amount: 50, category: 'Dining' }).direction).toBe('outflow');
    expect(classifyCashFlow({ type: 'income', amount: -50, category: 'Income' }).direction).toBe('inflow');
  });

  it.each([[10.10, 1010], [0.29, 29], [190.27, 19027], [-190.27, 19027], [2614.74, 261474], [0.1 + 0.2, 30]])(
    'money: |%s| → %s cents', (amount, cents) => {
      expect(classifyCashFlow({ type: 'expense', amount, category: 'Groceries' }).amountCents).toBe(cents);
    });

  it('every canonical NON_SPEND category / subcategory has a purpose (no second taxonomy)', () => {
    expect(Object.keys(NON_SPEND_CATEGORY_PURPOSE).sort()).toEqual([...NON_SPEND_CATEGORIES].sort());
    expect(Object.keys(NON_SPEND_SUBCATEGORY_PURPOSE).sort()).toEqual([...NON_SPEND_SUBCATEGORIES].sort());
  });

  it('income categories used for conflict flags are canonical categories', () => {
    const canonical = new Set(CANONICAL_CATEGORIES.map(c => c.toLowerCase()));
    for (const cat of INCOME_CATEGORIES) expect(canonical.has(cat)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate
// ─────────────────────────────────────────────────────────────────────────────
const COMPLETE = (n: number) => ({ complete: true, truncated: false, rowsFetched: n });
const MIXED: AggregateRow[] = [
  { id: '1', date: '2026-09-01', type: 'income', amount: 3000, category: 'Employment Income' },
  { id: '2', date: '2026-09-02', type: 'income', amount: 500, category: 'Transfers' },
  { id: '3', date: '2026-09-03', type: 'Purchase', amount: 120.55, category: 'Groceries' },
  { id: '4', date: '2026-09-04', type: 'expense', amount: -80.45, category: 'Groceries' },
  { id: '5', date: '2026-09-05', type: 'expense', amount: 400, category: 'Transfers' },
  { id: '6', date: '2026-09-06', type: 'expense', amount: 250, category: 'Debt Payments' },
  { id: '7', date: '2026-09-07', type: 'expense', amount: 100, category: 'Savings' },
  { id: '8', date: '2026-09-08', type: 'expense', amount: 10.1, category: 'Income' },
  { id: '9', date: '2026-09-09', type: 'expense', amount: null, category: 'Dining' },
  { id: '10', date: '2026-09-10', type: 'Credit', amount: 999, category: 'Income' },
  { id: '11', date: null, type: 'expense', amount: 77, category: 'Dining' },
  { id: '12', date: '2026-09-12', type: 'expense', amount: 0, category: 'Dining' },
  { id: '13', date: '2026-09-13', type: 'income', amount: -25, category: 'Income' },
  { id: '14', date: '2026-09-14', type: 'expense', amount: 60, category: 'Transportation', subcategory: 'Car Loan' },
  { id: '15', date: '2026-09-15', type: 'expense', amount: 200, category: 'Banking', subcategory: 'TFSA' },
  { id: '16', date: '2026-09-16', type: 'expense', amount: 40, category: 'Banking', subcategory: 'ATM Withdrawal' },
  { id: '17', date: '2026-09-17', type: 'expense', amount: 30, category: 'Business Income' },
  { id: '18', date: '2026-09-18', type: 'Purchase', amount: 5, category: 'Employment Income' },
  { id: '19', date: '2026-09-19', type: 'income', amount: 70, category: 'Other', subcategory: 'E-Transfer' },
  { id: '20', date: '2026-09-20', type: 'Debit', amount: 55, category: 'Groceries' },
];

describe('buildPeriodAggregate', () => {
  const agg = buildPeriodAggregate(MIXED, { fetch: COMPLETE(MIXED.length), period: { start: '2026-09-01', end: '2026-09-30' } });

  it('buckets: income excludes transfer-in; spending excludes transfers, debt, savings, other non-spend and conflicts', () => {
    expect(agg.cents).toEqual({
      income: 302500,                 // 3000 (Employment Income inflow) + |−25| (negative inflow, unchanged rule)
      spending: 20100,                // 120.55 + 80.45 + 0
      transferIn: 57000,              // 500 Transfers + 70 E-Transfer subcategory
      transferOut: 40000,
      debtPayments: 31000,            // 250 Debt Payments + 60 Car Loan subcategory
      savingsInvestment: 30000,       // 100 Savings + 200 TFSA subcategory
      otherNonSpend: 4000,            // 40 ATM Withdrawal subcategory
      classificationConflict: 4510,   // 10.10 Income + 30 Business Income + 5 Employment Income (outflows)
      totalInflow: 359500,
      totalOutflow: 129610,           // 20100 + 40000 + 31000 + 30000 + 4000 + 4510
      rawNetCashMovement: 229890,     // 359500 − 129610
      netExcludingInternalMovements: 242890, // 302500 − (20100 + 31000 + 4000 + 4510)
    });
  });

  it('net definitions: raw includes everything; user-facing net drops transfers and savings/investment only', () => {
    const c = agg.cents;
    expect(c.rawNetCashMovement).toBe(c.totalInflow - c.totalOutflow);
    expect(c.netExcludingInternalMovements).toBe(c.income - (c.spending + c.debtPayments + c.otherNonSpend + c.classificationConflict));
    // Savings/investment and transfers are the ONLY difference between the two nets
    expect(c.netExcludingInternalMovements - c.rawNetCashMovement).toBe(c.transferOut + c.savingsInvestment - c.transferIn);
    expect(Object.keys(c)).not.toContain('net');
  });

  it('a savings/investment outflow lowers raw net cash movement but not the user-facing net', () => {
    const base = [{ date: '2026-09-01', type: 'income', amount: 1000, category: 'Income' }];
    const withSavings = [...base, { date: '2026-09-02', type: 'expense', amount: 400, category: 'Savings' }];
    const a = buildPeriodAggregate(base, { fetch: COMPLETE(1) }).cents;
    const b = buildPeriodAggregate(withSavings, { fetch: COMPLETE(2) }).cents;
    expect(b.rawNetCashMovement).toBe(a.rawNetCashMovement - 40000);
    expect(b.netExcludingInternalMovements).toBe(a.netExcludingInternalMovements);
    expect(b.spending).toBe(0);
    expect(b.savingsInvestment).toBe(40000);
    expect(b.totalOutflow).toBe(40000);
  });

  it('total in/outflow reconcile with the buckets; counts reconcile', () => {
    const c = agg.cents;
    expect(c.totalInflow).toBe(c.income + c.transferIn);
    expect(c.totalOutflow).toBe(c.spending + c.transferOut + c.debtPayments + c.savingsInvestment + c.otherNonSpend + c.classificationConflict);
    expect(agg.counts).toEqual({
      included: 16, income: 2, spending: 3, transferIn: 2, transferOut: 1,
      debtPayments: 2, savingsInvestment: 2, otherNonSpend: 1, classificationConflict: 3,
    });
  });

  it('category totals come from the same classification and reconcile exactly', () => {
    const byPurpose = (p: string) => agg.categories.filter(x => x.purpose === p).reduce((s, x) => s + x.totalCents, 0);
    expect(byPurpose('income')).toBe(agg.cents.income);
    expect(byPurpose('spending')).toBe(agg.cents.spending);
    expect(byPurpose('transfer_in')).toBe(agg.cents.transferIn);
    expect(byPurpose('transfer_out')).toBe(agg.cents.transferOut);
    expect(byPurpose('debt_payment')).toBe(agg.cents.debtPayments);
    expect(byPurpose('savings_investment')).toBe(agg.cents.savingsInvestment);
    expect(byPurpose('other_non_spend')).toBe(agg.cents.otherNonSpend);
    expect(byPurpose('classification_conflict')).toBe(agg.cents.classificationConflict);
    expect(agg.categories.reduce((s, x) => s + x.count, 0)).toBe(agg.counts.included);
    expect(agg.categories.find(x => x.category === 'Groceries')).toEqual({ category: 'Groceries', direction: 'outflow', purpose: 'spending', totalCents: 20100, count: 2 });
  });

  it('same category string with different purposes is never merged into spending', () => {
    // "Income" inflow vs "Income" outflow conflict → two separate entries.
    const income = agg.categories.filter(x => x.category === 'Income');
    expect(income.map(x => `${x.direction}/${x.purpose}`).sort()).toEqual(['inflow/income', 'outflow/classification_conflict']);
    const transfers = agg.categories.filter(x => x.category === 'Transfers').map(x => x.purpose).sort();
    expect(transfers).toEqual(['transfer_in', 'transfer_out']);
  });

  it('exclusions and conflicts are counted, never folded into totals', () => {
    expect(agg.completeness.excluded).toEqual({ missingAmount: 1, missingDate: 1, outOfPeriod: 0, unclassifiedType: 2 }); // Credit + Debit
    expect(agg.completeness.conflicts).toEqual({ income_category_on_outflow: 3, non_spend_category_on_inflow: 0, negative_inflow: 1 });
    expect(agg.completeness).toMatchObject({ complete: true, truncated: false, authoritative: true, rowsFetched: 20 });
  });

  it('missingDate counts only rows supplied to the builder (a date-range fetch never selects them)', () => {
    const a = buildPeriodAggregate([{ date: null, type: 'expense', amount: 5, category: 'Dining' }, { date: 'n/a', type: 'expense', amount: 5, category: 'Dining' }], { fetch: COMPLETE(2) });
    expect(a.completeness.excluded.missingDate).toBe(2);
    expect(a.cents.totalOutflow).toBe(0);
  });

  it('rows outside the requested period are excluded and counted', () => {
    const a = buildPeriodAggregate([{ date: '2026-10-01', type: 'expense', amount: 5, category: 'Dining' }], {
      fetch: COMPLETE(1), period: { start: '2026-09-01', end: '2026-09-30' },
    });
    expect(a.cents.spending).toBe(0);
    expect(a.completeness.excluded.outOfPeriod).toBe(1);
  });

  it('truncated fetch → correct arithmetic but NOT authoritative', () => {
    const a = buildPeriodAggregate(MIXED, { fetch: { complete: false, truncated: true, rowsFetched: 20 } });
    expect(a.cents.spending).toBe(20100);
    expect(a.completeness).toMatchObject({ complete: false, truncated: true, authoritative: false });
  });

  it('empty period from a complete fetch is an authoritative zero', () => {
    const a = buildPeriodAggregate([], { fetch: COMPLETE(0) });
    expect(a.cents.totalOutflow).toBe(0);
    expect(a.categories).toEqual([]);
    expect(a.completeness.authoritative).toBe(true);
  });

  it('integer cents: many float-unfriendly amounts sum exactly', () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ date: '2026-09-01', type: 'expense', amount: 0.1, category: 'Dining', id: String(i) }));
    expect(buildPeriodAggregate(rows, { fetch: COMPLETE(1000) }).cents.spending).toBe(10000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Paged fetch
// ─────────────────────────────────────────────────────────────────────────────
type Call = { filters: Array<[string, string, unknown]>; orders: string[]; range: [number, number] | null };

function fakeClient(all: TransactionRangeRow[], opts: { serverCap?: number; failOnPage?: number } = {}) {
  const calls: Call[] = [];
  const client: RangeFetchClient = {
    from: (table: string) => ({
      select: () => {
        const call: Call = { filters: [], orders: [], range: null };
        calls.push(call);
        const run = () => {
          if (opts.failOnPage !== undefined && calls.length === opts.failOnPage) {
            return { data: null, error: { message: 'boom' } };
          }
          expect(table).toBe('transactions');
          let rows = all.filter(r => call.filters.every(([op, col, v]) => {
            const val = (r as unknown as Record<string, unknown>)[col];
            if (op === 'eq') return val === v;
            if (op === 'gte') return typeof val === 'string' && val >= (v as string);
            return typeof val === 'string' && val <= (v as string);
          }));
          rows = [...rows].sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : a.id < b.id ? -1 : 1));
          const [from, to] = call.range ?? [0, rows.length - 1];
          const cap = opts.serverCap ?? Infinity;
          return { data: rows.slice(from, Math.min(to + 1, from + cap)), error: null };
        };
        const q: RangeFetchQuery = {
          eq: (c: string, v: unknown) => { call.filters.push(['eq', c, v]); return q; },
          gte: (c: string, v: unknown) => { call.filters.push(['gte', c, v]); return q; },
          lte: (c: string, v: unknown) => { call.filters.push(['lte', c, v]); return q; },
          order: (c: string) => { call.orders.push(c); return q; },
          range: (f: number, t: number) => { call.range = [f, t]; return q; },
          then: (res, rej) => Promise.resolve(run()).then(res, rej),
        };
        return q;
      },
    }),
  };
  return { client, calls };
}

const U = 'user-a';
const mkRows = (n: number, userId = U, start = 0): TransactionRangeRow[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `t${String(start + i).padStart(6, '0')}`,
    date: `2026-09-${String(1 + ((start + i) % 28)).padStart(2, '0')}`,
    amount: 1, type: 'expense', category: 'Dining', subcategory: null, user_id: userId,
  }) as TransactionRangeRow);
const RANGE = { userId: U, startDate: '2026-09-01', endDate: '2026-09-30' };

describe('fetchTransactionsInRange', () => {
  it.each([0, 1, 26, TRANSACTION_RANGE_PAGE_SIZE, TRANSACTION_RANGE_PAGE_SIZE + 1, 1001, 2500])(
    '%s rows → all fetched, complete, ids unique', async (n) => {
      const { client } = fakeClient(mkRows(n));
      const r = await fetchTransactionsInRange(client, RANGE);
      expect(r).toMatchObject({ rowsFetched: n, complete: true, truncated: false, error: null });
      expect(new Set(r.rows.map(x => x.id)).size).toBe(n);
    });

  it('server cap below page size (max_rows < page) does not end paging early', async () => {
    const { client, calls } = fakeClient(mkRows(1001), { serverCap: 100 });
    const r = await fetchTransactionsInRange(client, RANGE);
    expect(r).toMatchObject({ rowsFetched: 1001, complete: true, truncated: false });
    expect(calls.length).toBe(12); // 11 non-empty pages of ≤100 + 1 empty page
  });

  it('user-scoped, inclusive date bounds, deterministic order', async () => {
    const other = mkRows(5, 'user-b', 100);
    const edge = [
      { id: 'e1', date: '2026-08-31', amount: 1, type: 'expense', category: 'x', subcategory: null, user_id: U },
      { id: 'e2', date: '2026-09-01', amount: 1, type: 'expense', category: 'x', subcategory: null, user_id: U },
      { id: 'e3', date: '2026-09-30', amount: 1, type: 'expense', category: 'x', subcategory: null, user_id: U },
      { id: 'e4', date: '2026-10-01', amount: 1, type: 'expense', category: 'x', subcategory: null, user_id: U },
    ] as unknown as TransactionRangeRow[];
    const { client, calls } = fakeClient([...other, ...edge]);
    const r = await fetchTransactionsInRange(client, RANGE);
    expect(r.rows.map(x => x.id)).toEqual(['e2', 'e3']);
    expect(calls[0].filters).toEqual([['eq', 'user_id', U], ['gte', 'date', '2026-09-01'], ['lte', 'date', '2026-09-30']]);
    expect(calls[0].orders).toEqual(['date', 'id']);
  });

  it('rows with a NULL date are never selected by the range query (and not reported by the fetch)', async () => {
    const rows = [...mkRows(3), { id: 'nodate', date: null, amount: 9, type: 'expense', category: 'x', subcategory: null, user_id: U }] as TransactionRangeRow[];
    const { client } = fakeClient(rows);
    const r = await fetchTransactionsInRange(client, RANGE);
    expect(r.rows.map(x => x.id)).not.toContain('nodate');
    expect(r).toMatchObject({ rowsFetched: 3, complete: true });
    expect(Object.keys(r)).not.toContain('missingDate');
  });

  it('hard ceiling reached before exhaustion → truncated, not complete', async () => {
    const { client } = fakeClient(mkRows(300));
    const r = await fetchTransactionsInRange(client, RANGE, { pageSize: 100, maxRows: 250 });
    expect(r).toMatchObject({ rowsFetched: 250, complete: false, truncated: true, error: null });
  });

  it('ceiling exactly equal to the row count → complete (probe finds nothing)', async () => {
    const { client } = fakeClient(mkRows(250));
    const r = await fetchTransactionsInRange(client, RANGE, { pageSize: 100, maxRows: 250 });
    expect(r).toMatchObject({ rowsFetched: 250, complete: true, truncated: false });
  });

  it('query error on any page → failed: no rows, not complete', async () => {
    const { client } = fakeClient(mkRows(1200), { failOnPage: 2 });
    const r = await fetchTransactionsInRange(client, RANGE);
    expect(r).toMatchObject({ rows: [], rowsFetched: 0, complete: false, error: 'boom' });
  });

  it('invalid range is rejected without querying', async () => {
    const { client, calls } = fakeClient(mkRows(3));
    for (const bad of [{ ...RANGE, userId: '' }, { ...RANGE, startDate: '2026-9-1' }, { ...RANGE, startDate: '2026-10-01' }]) {
      expect(await fetchTransactionsInRange(client, bad)).toMatchObject({ complete: false, error: 'invalid_range' });
    }
    expect(calls.length).toBe(0);
  });

  it('fetch completeness propagates into the aggregate', async () => {
    const { client } = fakeClient(mkRows(300));
    const f = await fetchTransactionsInRange(client, RANGE, { pageSize: 100, maxRows: 250 });
    const agg = buildPeriodAggregate(f.rows, { fetch: f, period: { start: RANGE.startDate, end: RANGE.endDate } });
    expect(agg.completeness).toMatchObject({ authoritative: false, truncated: true, rowsFetched: 250 });
    expect(agg.cents.spending).toBe(25000);
  });
});

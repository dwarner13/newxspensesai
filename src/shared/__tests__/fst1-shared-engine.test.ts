/**
 * FST-1 — shared financial engine regression tests against a client that caps
 * every request at 1,000 rows (hosted PostgREST behaviour).
 * Fixtures: 501, 801, 1001, 1501 (and 2,500) synthetic transactions.
 */
import { describe, it, expect } from 'vitest';
import { makeCappedClient, syntheticTransactions, expectedTotals } from './fixtures/capped-supabase';
import { fetchTransactionsInRange, rangeFetchColumns, TRANSACTION_RANGE_COLUMNS, TRANSACTION_SIGNAL_COLUMNS } from '../transaction-range-fetch';
import { buildPeriodAggregate } from '../period-aggregate';
import { pagedSelectAll } from '../paged-select';
import { computeIntegritySignals } from '../financial-integrity-signals';
import { fetchMerchantScopeRows } from '../merchant-scope-rows';

const SIZES = [501, 801, 1001, 1501, 2500];
const ALL = { startDate: '1900-01-01', endDate: '9999-12-31' };

describe('FST-1 range fetch + aggregate are exact above every cap', () => {
  for (const n of SIZES) {
    it(`${n} transactions: complete read, exact cents, exact counts`, async () => {
      const client = makeCappedClient({ transactions: syntheticTransactions(n) }, { shuffleUnordered: true });
      const res = await fetchTransactionsInRange(client as any, { userId: 'u-synthetic', ...ALL });
      expect(res.error).toBeNull();
      expect(res.complete).toBe(true);
      expect(res.truncated).toBe(false);
      expect(res.rowsFetched).toBe(n);
      const agg = buildPeriodAggregate(res.rows, { fetch: res, period: null });
      const want = expectedTotals(n);
      expect(agg.cents.income).toBe(want.income);
      expect(agg.cents.spending).toBe(want.spending);
      expect(agg.counts.income).toBe(want.incomeCount);
      expect(agg.counts.spending).toBe(want.spendingCount);
      expect(agg.completeness.authoritative).toBe(true);
    });
  }

  it('the OLD unpaged pattern under-counts above 1,000 (documents the defect)', async () => {
    const client = makeCappedClient({ transactions: syntheticTransactions(1501) }, { shuffleUnordered: true });
    const { data } = await (client.from('transactions').select('date, amount, category, type').eq('user_id', 'u-synthetic') as any);
    expect((data as unknown[]).length).toBe(1000);
  });

  it('ceiling reached with rows beyond it: truncated, never authoritative', async () => {
    const client = makeCappedClient({ transactions: syntheticTransactions(1501) });
    const res = await fetchTransactionsInRange(client as any, { userId: 'u-synthetic', ...ALL }, { maxRows: 1200 });
    expect(res.truncated).toBe(true);
    expect(res.complete).toBe(false);
    const agg = buildPeriodAggregate(res.rows, { fetch: res, period: null });
    expect(agg.completeness.authoritative).toBe(false);
  });

  it('a failed page is never complete', async () => {
    const client = makeCappedClient({ transactions: syntheticTransactions(1501) }, { failOnRequest: 2 });
    const res = await fetchTransactionsInRange(client as any, { userId: 'u-synthetic', ...ALL });
    expect(res.complete).toBe(false);
    expect(res.error).toBe('simulated failure');
  });

  it('another user\'s rows are never read', async () => {
    const rows = [...syntheticTransactions(600, 'u-a'), ...syntheticTransactions(700, 'u-b')];
    const res = await fetchTransactionsInRange(makeCappedClient({ transactions: rows }) as any, { userId: 'u-a', ...ALL });
    expect(res.rowsFetched).toBe(600);
    expect(res.rows.every(r => (r as any).user_id === undefined || (r as any).user_id === 'u-a')).toBe(true);
  });

  it('a confirmed Tag correction is reflected in the next aggregate (no cache)', async () => {
    const rows = syntheticTransactions(1001);
    const client = makeCappedClient({ transactions: rows });
    const before = buildPeriodAggregate((await fetchTransactionsInRange(client as any, { userId: 'u-synthetic', ...ALL })).rows,
      { fetch: { complete: true, truncated: false, rowsFetched: 1001 }, period: null });
    // Tag confirms: a Groceries purchase is really a Transfer.
    const target = rows.find(r => r.category === 'Groceries')!;
    target.category = 'Transfers';
    const res = await fetchTransactionsInRange(client as any, { userId: 'u-synthetic', ...ALL });
    const after = buildPeriodAggregate(res.rows, { fetch: res, period: null });
    const cents = Math.round(Math.abs(Number(target.amount)) * 100);
    expect(after.cents.spending).toBe(before.cents.spending - cents);
    expect(after.cents.transferOut).toBe(before.cents.transferOut + cents);
  });
});

describe('FST-1 columns option is additive', () => {
  it('defaults are unchanged; extras are unioned; unsafe names ignored', () => {
    expect(rangeFetchColumns()).toBe(TRANSACTION_RANGE_COLUMNS);
    expect(rangeFetchColumns(['merchant_name', 'id', 'x; drop table', 'import_id']))
      .toBe(`${TRANSACTION_RANGE_COLUMNS}, merchant_name, import_id`);
    expect(TRANSACTION_SIGNAL_COLUMNS).toEqual(['merchant_name', 'description', 'import_id']);
  });
});

describe('FST-1 pagedSelectAll', () => {
  for (const n of SIZES) {
    it(`${n} rows in one import: every row, in order`, async () => {
      const client = makeCappedClient({ transactions: syntheticTransactions(n) });
      const res = await pagedSelectAll<any>(() =>
        (client.from('transactions').select('*').eq('import_id', 'imp-1').order('date', { ascending: true }).order('id', { ascending: true }) as any));
      expect(res.complete).toBe(true);
      expect(res.rowsFetched).toBe(n);
      expect(new Set(res.rows.map(r => r.id)).size).toBe(n);
    });
  }
  it('truncation is decided by a probe, not a row count', async () => {
    const client = makeCappedClient({ transactions: syntheticTransactions(1001) });
    const exact = await pagedSelectAll<any>(() => client.from('transactions').select('*').order('id', { ascending: true }) as any, { maxRows: 1001 });
    expect(exact.truncated).toBe(false);
    const over = await pagedSelectAll<any>(() => client.from('transactions').select('*').order('id', { ascending: true }) as any, { maxRows: 1000 });
    expect(over.truncated).toBe(true);
    expect(over.complete).toBe(false);
  });
});

describe('FST-1 P-G8 merchant scope fetch is paged', () => {
  for (const n of [1001, 1501, 2500]) {
    it(`${n} rows: complete and not falsely "untruncated"`, async () => {
      const client = makeCappedClient({ transactions: syntheticTransactions(n) }, { shuffleUnordered: true });
      const res = await fetchMerchantScopeRows(client as any, 'u-synthetic', {});
      expect(res.error).toBeNull();
      expect(res.rows.length).toBe(n);
      expect(res.truncated).toBe(false);
    });
  }
  it('more than the 5,000 ceiling: truncated = true', async () => {
    const client = makeCappedClient({ transactions: syntheticTransactions(5100) });
    const res = await fetchMerchantScopeRows(client as any, 'u-synthetic', {});
    expect(res.rows.length).toBe(5000);
    expect(res.truncated).toBe(true);
  });
});

describe('FST-1 integrity signals (flag, never exclude)', () => {
  it('the same statement imported twice is flagged; repeats inside one import are not', () => {
    const a = syntheticTransactions(50, 'u', { importId: 'imp-A' });
    const b = syntheticTransactions(50, 'u', { importId: 'imp-B' }).map(r => ({ ...r, id: `b-${r.id}` }));
    const s = computeIntegritySignals([...a, ...b]);
    expect(s.possibleDuplicates.count).toBe(50);
    const exp = expectedTotals(50);
    expect(s.possibleDuplicates.cents).toBe(exp.income + exp.spending);
    const same = computeIntegritySignals([{ date: '2026-01-01', amount: -4.5, type: 'expense', merchant_name: 'Cafe', import_id: 'i1' },
      { date: '2026-01-01', amount: -4.5, type: 'expense', merchant_name: 'Cafe', import_id: 'i1' }]);
    expect(same.possibleDuplicates.count).toBe(0);
  });
  it('an income row with a spending category is a possible refund; payroll is not', () => {
    const s = computeIntegritySignals([
      { date: '2026-01-02', amount: 25, type: 'income', category: 'Shopping', import_id: 'i' },
      { date: '2026-01-03', amount: 2000, type: 'income', category: 'Income', import_id: 'i' },
      { date: '2026-01-04', amount: 300, type: 'income', category: 'Transfers', import_id: 'i' },
    ]);
    expect(s.possibleRefunds).toEqual({ count: 1, cents: 2500 });
  });
  it('a custom merchant key is honoured (Prime and Tag share merchantGroupingKey)', () => {
    const rows = [
      { date: '2026-01-01', amount: -10, type: 'expense', merchant_name: '7-ELEVEN #12', import_id: 'a' },
      { date: '2026-01-01', amount: -10, type: 'expense', merchant_name: '7 eleven 12', import_id: 'b' },
    ];
    expect(computeIntegritySignals(rows, { merchantKey: t => t.toLowerCase().replace(/[^a-z0-9]/g, '') }).possibleDuplicates.count).toBe(1);
  });
});

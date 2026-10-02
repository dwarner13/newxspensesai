/**
 * Prime V1-A CP3 — the live aggregate tools (cash_flow_summary,
 * transaction_category_totals) on the shared CP2 foundation, and the evidence
 * executor support for them.
 *
 * PRODUCTION tool + executor code runs; only `server/db` is replaced by an
 * in-memory Supabase stand-in implementing eq/gte/lte/order/range, a server
 * row cap, and per-call failure injection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type DbRow = {
  id: string; user_id: string; date: string | null; amount: unknown;
  type: string | null; category: string | null; subcategory: string | null;
};

const db = vi.hoisted(() => ({
  rows: [] as DbRow[],
  calls: 0,
  failOnCall: 0,
  serverCap: Infinity,
}));

vi.mock('../../server/db', () => {
  const client = {
    from: (table: string) => ({
      select: () => {
        const filters: Array<[string, string, unknown]> = [];
        let range: [number, number] | null = null;
        const run = () => {
          db.calls++;
          if (db.failOnCall && db.calls === db.failOnCall) return { data: null, error: { message: 'db exploded' } };
          if (table !== 'transactions') return { data: [], error: null };
          let rows = db.rows.filter(r => filters.every(([op, col, v]) => {
            const val = (r as unknown as Record<string, unknown>)[col];
            if (op === 'eq') return val === v;
            if (op === 'gte') return typeof val === 'string' && val >= (v as string);
            return typeof val === 'string' && val <= (v as string);
          }));
          rows = [...rows].sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : a.id < b.id ? -1 : 1));
          const [from, to] = range ?? [0, rows.length - 1];
          return { data: rows.slice(from, Math.min(to + 1, from + db.serverCap)), error: null };
        };
        const q: Record<string, unknown> = {
          eq: (c: string, v: unknown) => { filters.push(['eq', c, v]); return q; },
          gte: (c: string, v: unknown) => { filters.push(['gte', c, v]); return q; },
          lte: (c: string, v: unknown) => { filters.push(['lte', c, v]); return q; },
          order: () => q,
          range: (f: number, t: number) => { range = [f, t]; return q; },
          then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
        };
        return q;
      },
    }),
  };
  return { getSupabaseServerClient: () => client };
});

import {
  execute as cashFlowExecute,
  outputSchema as cashFlowOutput,
  type Output as CashFlowOutput,
} from '../../agent/tools/impl/cash_flow_summary';
import {
  execute as categoryExecute,
  outputSchema as categoryOutput,
  type Output as CategoryOutput,
} from '../../agent/tools/impl/transaction_category_totals';
import {
  executeEvidencePlan,
  buildEvidenceContextMessage,
  stepTimeoutMs,
  PER_TOOL_TIMEOUT_MS,
  TOTAL_EVIDENCE_BUDGET_MS,
  type DedupCache,
} from '../prime-evidence-executor';
import type { PrimeEvidencePlan, PrimeEvidencePlanStep } from '../prime-evidence-resolver';

const U = 'user-1';
const OTHER = 'user-2';
const SEPT = { startDate: '2026-09-01', endDate: '2026-09-30' };

const row = (id: string, date: string | null, type: string | null, amount: unknown, category: string | null, subcategory: string | null = null, user_id = U): DbRow =>
  ({ id, user_id, date, amount, type, category, subcategory });

/** Mixed September: every semantic case, plus out-of-period and other-user rows. */
const MIXED: DbRow[] = [
  row('a01', '2026-09-01', 'income', 3000, 'Employment Income'),
  row('a02', '2026-09-02', 'income', 500, 'Transfers'),
  row('a03', '2026-09-03', 'Purchase', 120.55, 'Groceries'),
  row('a04', '2026-09-04', 'expense', -80.45, 'Groceries'),
  row('a05', '2026-09-05', 'expense', 400, 'Transfers'),
  row('a06', '2026-09-06', 'expense', 250, 'Debt Payments'),
  row('a07', '2026-09-07', 'expense', 100, 'Savings'),
  row('a08', '2026-09-08', 'expense', 10.1, 'Income'),
  row('a09', '2026-09-09', 'expense', null, 'Dining'),
  row('a10', '2026-09-10', 'Credit', 125.5, 'Groceries'),
  row('a11', '2026-09-11', 'Debit', 4.5, 'Groceries'),
  row('a12', '2026-09-12', 'expense', 0, 'Dining'),
  row('a13', '2026-09-13', 'income', -25, 'Income'),
  row('a14', '2026-09-14', 'expense', 60, 'Transportation', 'Car Loan'),
  row('a15', '2026-09-15', 'expense', 200, 'Investments'),
  row('a16', '2026-09-16', 'expense', 40, 'Banking', 'ATM Withdrawal'),
  row('a17', '2026-09-17', 'Purchase', 15, 'Shopping', 'Points Redemption'),
  row('a18', '2026-09-30', 'expense', 9.99, 'Groceries'),
  row('x01', '2026-08-31', 'expense', 999, 'Groceries'),     // out of range
  row('x02', '2026-10-01', 'expense', 999, 'Groceries'),     // out of range
  row('x03', '2026-09-15', 'expense', 999, 'Groceries', null, OTHER), // other user
  row('x04', null, 'expense', 999, 'Groceries'),             // null date: never selected
];

const ok = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error('tool returned Err');
  return r.value;
};
const cashFlow = async (input = SEPT) => ok(await cashFlowExecute(input, { userId: U }));
const categories = async (input: Record<string, unknown> = SEPT) =>
  ok(await categoryExecute(categoryInputDefaults(input), { userId: U }));
const categoryInputDefaults = (i: Record<string, unknown>) => ({ type: 'all' as const, ...i }) as Parameters<typeof categoryExecute>[0];

beforeEach(() => {
  db.rows = MIXED.map(r => ({ ...r }));
  db.calls = 0;
  db.failOnCall = 0;
  db.serverCap = Infinity;
});

// ─────────────────────────────────────────────────────────────────────────────
// cash_flow_summary
// ─────────────────────────────────────────────────────────────────────────────
describe('cash_flow_summary — authoritative period aggregate', () => {
  it('1. complete mixed period: exact buckets, both named nets, schema-valid', async () => {
    const r = await cashFlow();
    expect(cashFlowOutput.safeParse(r).success).toBe(true);
    expect(r.queryStatus).toBe('verified');
    expect(r.cents).toEqual({
      income: 302500,                // 3000 + |−25|
      spending: 21099,               // 120.55 + 80.45 + 0 + 9.99
      transferIn: 50000,
      transferOut: 45500,            // 400 + 40 ATM + 15 Points Redemption
      debtPayments: 31000,           // 250 + 60 Car Loan
      savingsInvestment: 30000,      // 100 Savings + 200 Investments
      otherNonSpend: 0,
      classificationConflict: 1010,  // 10.10 expense + "Income"
      totalInflow: 352500,
      totalOutflow: 128609,          // 21099 + 45500 + 31000 + 30000 + 0 + 1010
      rawNetCashMovement: 223891,
      netExcludingInternalMovements: 249391, // 302500 − (21099 + 31000 + 0 + 1010)
    });
    expect(r.spending).toBe(210.99);
    expect(r.income).toBe(3025);
    expect(r.rawNetCashMovement).toBe(2238.91);
    expect(r.netExcludingInternalMovements).toBe(2493.91);
  });

  it('compatibility fields: nonSpend sum, netCashFlow alias, counts', async () => {
    const r = await cashFlow();
    const c = r.cents!;
    expect(r.nonSpend).toBe((c.transferOut + c.debtPayments + c.savingsInvestment + c.otherNonSpend + c.classificationConflict) / 100);
    expect(r.netCashFlow).toBe(r.netExcludingInternalMovements);
    expect(r.incomeTransactionCount).toBe(2);
    expect(r.spendingTransactionCount).toBe(4);
    expect(r.nonSpendTransactionCount).toBe(8); // 3 transfer-out, 2 debt, 2 savings, 1 conflict
    expect(r.transactionCount).toBe(15);        // 18 Sept rows − missing amount − Credit − Debit
  });

  it('2. complete zero period → verified_zero', async () => {
    const r = await cashFlow({ startDate: '2025-01-01', endDate: '2025-01-31' });
    expect(r).toMatchObject({ queryStatus: 'verified_zero', transactionCount: 0, spending: 0, income: 0 });
    expect(r.completeness).toMatchObject({ dataComplete: true, authoritative: true });
  });

  it('3–4. >25 rows and >500 rows (multiple pages) are complete and exact', async () => {
    db.rows = Array.from({ length: 1234 }, (_, i) =>
      row(`p${String(i).padStart(5, '0')}`, `2026-09-${String(1 + (i % 30)).padStart(2, '0')}`, 'Purchase', 0.1, 'Dining'));
    db.serverCap = 300; // API cap below the 500-row page: must not end paging early
    const r = await cashFlow();
    expect(r).toMatchObject({ queryStatus: 'verified', transactionCount: 1234, spending: 123.4 });
    expect(r.cents!.spending).toBe(12340);
    expect(r.completeness).toMatchObject({ dataComplete: true, rowsFetched: 1234 });
    expect(db.calls).toBeGreaterThan(4);
  });

  it('5. truncated fetch → partial, not authoritative', async () => {
    db.rows = Array.from({ length: 20_001 }, (_, i) => row(`t${i}`, '2026-09-10', 'expense', 1, 'Dining'));
    const r = await cashFlow();
    expect(r.queryStatus).toBe('partial');
    expect(r.completeness).toMatchObject({ dataComplete: false, truncated: true, authoritative: false, rowsFetched: 20_000 });
  });

  it('6. query error → query_error with null money, never zeros', async () => {
    db.failOnCall = 2; // fail on the second page request
    const r = await cashFlow();
    expect(r).toMatchObject({ queryStatus: 'query_error', error: 'db exploded', income: null, spending: null, netCashFlow: null });
    expect(cashFlowOutput.safeParse(r).success).toBe(true);
  });

  it('7. invalid date range → query_error without querying', async () => {
    const r = await cashFlow({ startDate: '2026-09-30', endDate: '2026-09-01' });
    expect(r).toMatchObject({ queryStatus: 'query_error', error: 'invalid_range' });
    expect(db.calls).toBe(0);
  });

  it('8–16. type direction, transfers/debt/savings/ATM/points, conflicts, negative income', async () => {
    const r = await cashFlow();
    const by = (cat: string, purpose: string) => r.categories!.find(e => e.category === cat && e.purpose === purpose);
    expect(by('Groceries', 'spending')).toMatchObject({ direction: 'outflow', totalCents: 21099, count: 3 }); // Purchase counted
    expect(by('Transfers', 'transfer_in')).toMatchObject({ direction: 'inflow', totalCents: 50000 });
    expect(by('Transfers', 'transfer_out')).toMatchObject({ direction: 'outflow', totalCents: 40000 });
    expect(by('Debt Payments', 'debt_payment')).toBeDefined();
    expect(by('Transportation', 'debt_payment')).toMatchObject({ totalCents: 6000 });   // Car Loan subcategory
    expect(by('Savings', 'savings_investment')).toBeDefined();
    expect(by('Investments', 'savings_investment')).toBeDefined();
    expect(by('Banking', 'transfer_out')).toMatchObject({ totalCents: 4000 });          // ATM Withdrawal
    expect(by('Shopping', 'transfer_out')).toMatchObject({ totalCents: 1500 });         // Points Redemption
    expect(by('Income', 'classification_conflict')).toMatchObject({ direction: 'outflow', totalCents: 1010 });
    expect(by('Income', 'income')).toMatchObject({ direction: 'inflow', totalCents: 2500 }); // |−25|, not subtracted
    expect(r.completeness!.conflicts).toEqual({ income_category_on_outflow: 1, non_spend_category_on_inflow: 0, negative_inflow: 1 });
  });

  it('9 + 18. Credit/Debit unclassified: excluded from every total, classificationComplete=false, known cents', async () => {
    const r = await cashFlow();
    expect(r.completeness).toMatchObject({
      dataComplete: true,
      authoritative: true,
      classificationComplete: false,
      unclassifiedCents: 13000,      // 125.50 Credit + 4.50 Debit
      unclassifiedAmount: 130,
    });
    expect(r.completeness!.excluded.unclassifiedType).toBe(2);
    expect(r.categories!.some(e => e.category === 'Groceries' && e.totalCents >= 12550 + 21099)).toBe(false);
  });

  it('17. integer-cent reconciliation across buckets and categories', async () => {
    const r = await cashFlow();
    const c = r.cents!;
    const sum = (p: string) => r.categories!.filter(e => e.purpose === p).reduce((s, e) => s + e.totalCents, 0);
    expect(sum('income')).toBe(c.income);
    expect(sum('spending')).toBe(c.spending);
    expect(sum('transfer_out')).toBe(c.transferOut);
    expect(c.totalInflow).toBe(c.income + c.transferIn);
    expect(c.totalOutflow).toBe(c.spending + c.transferOut + c.debtPayments + c.savingsInvestment + c.otherNonSpend + c.classificationConflict);
    expect(c.rawNetCashMovement).toBe(c.totalInflow - c.totalOutflow);
  });

  it('19. missing amount counted, not $0', async () => {
    const r = await cashFlow();
    expect(r.completeness!.excluded.missingAmount).toBe(1);
  });

  it('user-scoped and inclusive: other users, out-of-range and null-date rows never counted', async () => {
    const r = await cashFlow();
    expect(r.categories!.some(e => e.totalCents === 99900)).toBe(false);
    expect(r.completeness!.rowsFetched).toBe(18);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// transaction_category_totals
// ─────────────────────────────────────────────────────────────────────────────
describe('transaction_category_totals — same foundation, category filter in code', () => {
  it('20. complete category totals, schema-valid, with direction/purpose/cents', async () => {
    const r = await categories();
    expect(categoryOutput.safeParse(r).success).toBe(true);
    expect(r.queryStatus).toBe('verified');
    expect(r.categoryTotals.find(e => e.category === 'Groceries')).toEqual({
      category: 'Groceries', totalAmount: 210.99, transactionCount: 3, avgAmount: 70.33,
      totalCents: 21099, direction: 'outflow', purpose: 'spending',
    });
  });

  it('21–22. category filter, canonical + case-insensitive', async () => {
    for (const category of ['Groceries', 'groceries', '  GROCERIES ']) {
      const r = await categories({ ...SEPT, category });
      expect(r.categoryTotals.map(e => e.category)).toEqual(['Groceries']);
      expect(r.categoryFilter).toBe('Groceries');
      expect(r.totalsByPurpose!.spending).toEqual({ total: 210.99, totalCents: 21099, count: 3 });
    }
  });

  it('23. unmatched category → verified empty, not an error', async () => {
    const r = await categories({ ...SEPT, category: 'Underwater Basket Weaving' });
    expect(r).toMatchObject({ categoryTotals: [], queryStatus: 'verified_zero', grandTotal: 0 });
  });

  it('24. type=expense filters outflow and includes Purchase rows', async () => {
    const r = await categories({ ...SEPT, type: 'expense' });
    expect(r.categoryTotals.every(e => e.direction === 'outflow')).toBe(true);
    expect(r.categoryTotals.find(e => e.category === 'Groceries')!.transactionCount).toBe(3); // incl. the Purchase
  });

  it('25. type=income filters inflow direction (not raw DB type equality)', async () => {
    const r = await categories({ ...SEPT, type: 'income' });
    expect(r.categoryTotals.map(e => `${e.category}/${e.purpose}`).sort()).toEqual(['Employment Income/income', 'Income/income', 'Transfers/transfer_in']);
  });

  it('26. same category with different purposes stays distinguishable', async () => {
    const r = await categories();
    expect(r.categoryTotals.filter(e => e.category === 'Transfers').map(e => e.purpose).sort()).toEqual(['transfer_in', 'transfer_out']);
    expect(r.categoryTotals.filter(e => e.category === 'Income').map(e => e.purpose).sort()).toEqual(['classification_conflict', 'income']);
  });

  it('27. category totals reconcile with cash_flow_summary (same rows, same rules)', async () => {
    const [cf, cat] = await Promise.all([cashFlow(), categories()]);
    const p = cat.totalsByPurpose!;
    const c = cf.cents!;
    expect(p.income.totalCents).toBe(c.income);
    expect(p.spending.totalCents).toBe(c.spending);
    expect(p.transfer_in.totalCents).toBe(c.transferIn);
    expect(p.transfer_out.totalCents).toBe(c.transferOut);
    expect(p.debt_payment.totalCents).toBe(c.debtPayments);
    expect(p.savings_investment.totalCents).toBe(c.savingsInvestment);
    expect(p.classification_conflict.totalCents).toBe(c.classificationConflict);
    expect(cat.completeness).toEqual(cf.completeness);
  });

  it('28–29. grandTotal is the raw returned-entry sum (not spending); totalsByPurpose exact', async () => {
    const r = await categories();
    const rawCents = r.categoryTotals.reduce((s, e) => s + (e.totalCents ?? 0), 0);
    expect(r.grandTotal).toBe(rawCents / 100);
    expect(r.grandTotal).not.toBe(r.totalsByPurpose!.spending.total);
    const purposeSum = Object.values(r.totalsByPurpose!).reduce((s, v) => s + v.totalCents, 0);
    expect(purposeSum).toBe(rawCents);
  });

  it('30. >500 rows complete', async () => {
    db.rows = Array.from({ length: 777 }, (_, i) => row(`g${String(i).padStart(4, '0')}`, '2026-09-15', 'expense', 1.11, 'Groceries'));
    const r = await categories({ ...SEPT, category: 'groceries' });
    expect(r.categoryTotals[0]).toMatchObject({ totalCents: 86247, transactionCount: 777 });
    expect(r.completeness).toMatchObject({ dataComplete: true, rowsFetched: 777 });
  });

  it('31. partial and error mapping', async () => {
    db.failOnCall = 1;
    const err = await categories();
    expect(err).toMatchObject({ queryStatus: 'query_error', grandTotal: null, categoryTotals: [] });
    expect(categoryOutput.safeParse(err).success).toBe(true);

    db.failOnCall = 0; db.calls = 0;
    db.rows = Array.from({ length: 20_001 }, (_, i) => row(`t${i}`, '2026-09-10', 'expense', 1, 'Dining'));
    const partial = await categories();
    expect(partial.queryStatus).toBe('partial');
    expect(partial.completeness).toMatchObject({ authoritative: false, truncated: true });
  });

  it('omitted dates = all available history (null-date rows still never selected)', async () => {
    const r = await categories({});
    expect(r.completeness!.rowsFetched).toBe(20); // 18 in Sept + 2 out-of-range for user-1
    expect(r.dateRange).toEqual({ start: '2026-08-31', end: '2026-10-01' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Executor
// ─────────────────────────────────────────────────────────────────────────────
const step = (tool: string, kind: string, params: Record<string, unknown> = SEPT): PrimeEvidencePlanStep =>
  ({ evidenceKind: kind, source: `${tool} source`, tool, mode: 'tool', params, authoritative: true } as unknown as PrimeEvidencePlanStep);
const plan = (...steps: PrimeEvidencePlanStep[]): PrimeEvidencePlan =>
  ({ intent: 'financial_data_lookup', steps, unresolved: [] } as unknown as PrimeEvidencePlan);
const realTools = async (tool: string, args: Record<string, unknown>) => {
  const r = tool === 'cash_flow_summary'
    ? await cashFlowExecute(args as { startDate: string; endDate: string }, { userId: U })
    : await categoryExecute(categoryInputDefaults(args), { userId: U });
  return r.ok ? r.value : { error: 'tool error' };
};
const runReal = (p: PrimeEvidencePlan) => executeEvidencePlan(p, realTools, new Map() as DedupCache);

describe('executor — scoped aggregate timeout', () => {
  it('32–34. default stays 3 s; aggregate override 8 s, capped by the remaining total budget', () => {
    const t0 = 1_000_000;
    expect(PER_TOOL_TIMEOUT_MS).toBe(3_000);
    expect(stepTimeoutMs('tx_search', t0, t0)).toBe(3_000);
    expect(stepTimeoutMs('merchant_totals', t0, t0 + 7_900)).toBe(3_000);
    expect(stepTimeoutMs('cash_flow_summary', t0, t0)).toBe(8_000);
    expect(stepTimeoutMs('transaction_category_totals', t0, t0)).toBe(8_000);
    expect(stepTimeoutMs('cash_flow_summary', t0, t0 + 6_000)).toBe(TOTAL_EVIDENCE_BUDGET_MS - 6_000);
    expect(stepTimeoutMs('cash_flow_summary', t0, t0 + 9_000)).toBe(0);
  });

  describe('timing behaviour (fake timers)', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });
    const slow = (ms: number, value: unknown) => new Promise(res => setTimeout(() => res(value), ms));

    it('a 4 s aggregate call succeeds; a 4 s default tool still times out at 3 s', async () => {
      const cf = await (async () => { vi.useRealTimers(); const v = await cashFlow(); vi.useFakeTimers(); return v; })();
      const exec = (tool: string) => slow(4_000, tool === 'cash_flow_summary' ? cf : { rows: [] });
      const p = executeEvidencePlan(plan(step('tx_search', 'transaction_data'), step('cash_flow_summary', 'cash_flow')), exec, new Map());
      await vi.advanceTimersByTimeAsync(9_000);
      const r = await p;
      expect(r.results[0]).toMatchObject({ tool: 'tx_search', status: 'failed', error: 'step_timeout' });
      // 3 s already spent → aggregate bounded to the remaining 5 s, and a 4 s call fits
      expect(r.results[1]).toMatchObject({ tool: 'cash_flow_summary', status: 'resolved' });
    });

    it('the aggregate override never exceeds the remaining total budget', async () => {
      const exec = (tool: string) => slow(tool === 'tx_search' ? 2_900 : 5_200, tool === 'tx_search' ? { rows: [] } : { queryStatus: 'verified', transactionCount: 1 });
      const p = executeEvidencePlan(plan(step('tx_search', 'transaction_data'), step('cash_flow_summary', 'cash_flow')), exec, new Map());
      await vi.advanceTimersByTimeAsync(10_000);
      const r = await p;
      // 2.9 s used → only 5.1 s remain; a 5.2 s aggregate call must time out despite the 8 s override
      expect(r.results[1]).toMatchObject({ status: 'failed', error: 'step_timeout' });
    });

    it('no budget left → the aggregate step is not started', async () => {
      const exec = vi.fn((tool: string) => slow(tool === 'tx_search' ? 2_000 : 1, tool === 'tx_search' ? { rows: [] } : { transactionCount: 1 }));
      const p = executeEvidencePlan(plan(step('tx_search', 'transaction_data'), step('tx_search', 'transaction_data', { q: 'b' }), step('tx_search', 'transaction_data', { q: 'c' }), step('tx_search', 'transaction_data', { q: 'd' }), step('cash_flow_summary', 'cash_flow')), exec, new Map());
      await vi.advanceTimersByTimeAsync(20_000);
      const r = await p;
      expect(r.results[4].status).not.toBe('resolved');
      expect(exec.mock.calls.some(c => c[0] === 'cash_flow_summary')).toBe(false);
    });
  });
});

describe('executor — cash-flow evidence', () => {
  it('35. verified_zero cash flow → successful_empty', async () => {
    const r = await runReal(plan(step('cash_flow_summary', 'cash_flow', { startDate: '2025-01-01', endDate: '2025-01-31' })));
    expect(r.results[0]).toMatchObject({ status: 'successful_empty', rowCount: 0 });
  });

  it('36. query_error cash flow → failed', async () => {
    db.failOnCall = 1;
    const r = await runReal(plan(step('cash_flow_summary', 'cash_flow')));
    expect(r.results[0]).toMatchObject({ status: 'failed' });
    expect(buildEvidenceContextMessage(r)).toContain('Data retrieval failed');
  });

  it('37. partial stays non-authoritative and is labelled', async () => {
    db.rows = Array.from({ length: 20_001 }, (_, i) => row(`t${i}`, '2026-09-10', 'expense', 1, 'Dining'));
    const r = await runReal(plan(step('cash_flow_summary', 'cash_flow')));
    expect(r.results[0]).toMatchObject({ status: 'resolved', authoritative: false });
    expect(buildEvidenceContextMessage(r)).toContain('PARTIAL — the date range was not fully retrieved');
  });

  it('38–41. explicit buckets, both named nets, mandatory disclosures, no bare net / undefined / NaN', async () => {
    const msg = buildEvidenceContextMessage(await runReal(plan(step('cash_flow_summary', 'cash_flow'))))!;
    for (const line of [
      'Ordinary spending: $210.99 (4 txns)',
      'Income (excluding transfers in): $3,025.00 (2 txns)',
      'Debt payments: $310.00 (2 txns)',
      'Transfers in: $500.00 (1 txns)',
      'Transfers out: $455.00 (3 txns)',
      'Savings/investment movement: $300.00 (2 txns)',
      'Classification-conflict outflow: $10.10 (1 txns)',
      'Total inflow: $3,525.00',
      'Total outflow: $1,286.09',
      'Raw net cash movement (all classified inflow − all classified outflow, incl. transfers and savings/investment): $2,238.91',
      'Net excluding internal movements (income − ordinary spending, debt payments, other non-spend and conflicts; transfers and savings/investment excluded): $2,493.91',
      '2 transactions totalling $130.00 could not be classified (unsupported transaction type) and are excluded from all financial totals.',
      '1 transaction has a missing or invalid amount; its monetary value is unknown and excluded from the totals.',
      'Refunds/reversals are not identified',
    ]) expect(msg).toContain(line);
    expect(msg).not.toMatch(/undefined|NaN/);
    expect(msg).not.toMatch(/^\s*Net cash flow\b/m);
    expect(msg).not.toMatch(/^\s*Net:/m);
  });
});

describe('executor — category evidence', () => {
  it('42. category formatter carries purpose and purpose totals', async () => {
    const msg = buildEvidenceContextMessage(await runReal(plan(step('transaction_category_totals', 'category_aggregation'))))!;
    expect(msg).toContain('Groceries [Ordinary spending]: $210.99 (3 txns)');
    expect(msg).toContain('Transfers [Transfers in]: $500.00 (1 txns)');
    expect(msg).toContain('Ordinary spending: $210.99 (4 txns)');
    expect(msg).toContain('All-category raw total (may include income, transfers and other non-spend categories — NOT a spending total)');
    expect(msg).not.toMatch(/undefined|NaN/);
  });

  it('43. CP1 legacy category shape still normalizes and formats', async () => {
    const r = await executeEvidencePlan(plan(step('transaction_category_totals', 'category_aggregation')),
      async () => ({ totals: [{ category: 'Food', total: 500, count: 20 }], grandTotal: 500 }), new Map());
    expect((r.results[0].data as Record<string, unknown>).totals).toEqual([{ category: 'Food', totalCents: 50000, count: 20 }]);
    expect(buildEvidenceContextMessage(r)).toContain('Food: $500.00 (20 txns)');
  });

  it('aggregate evidence never carries transaction identity', async () => {
    const r = await runReal(plan(step('cash_flow_summary', 'cash_flow')));
    expect(JSON.stringify(r.results[0].data)).not.toMatch(/"id"\s*:/);
  });
});

// Output types are exercised above; keep type imports referenced for strict builds.
export type _CashFlow = CashFlowOutput;
export type _Category = CategoryOutput;

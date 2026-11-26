/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for handler events and fake DB rows */
/**
 * FST-2 S0–S3 — financial-summary, financial-export, tax-summary and generate-tax-report against an
 * INDEPENDENT oracle, on a fake database capped at 1,000 rows per request (hosted API behaviour).
 * Datasets: 1,000 / 1,501 / 3,000 / 10,000 synthetic transactions over three accounts plus a
 * duplicate re-import, with transfers, card payments (both sides, D-1), refunds, interest, fees,
 * uncategorized and 'Credit'-typed rows. No real customer data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { makeCappedClient, type FakeRow } from '../../../src/shared/__tests__/fixtures/capped-supabase';
import { generateLedger, oracleFor, IMPORTS, type LedgerRow, type Bucket } from '../../../src/shared/__tests__/fixtures/ledger-generator';
import { PURPOSE_LABEL } from '../_shared/financial-export-csv';

const state: { client: any; tokens: Record<string, string> } = { client: null, tokens: {} };
vi.mock('../_shared/supabase.js', () => ({ admin: () => state.client, serverSupabase: () => state.client }));
vi.mock('../_shared/verifyAuth.js', () => ({
  verifyAuth: async (event: any) => {
    const t = String(event?.headers?.authorization || '').replace(/^Bearer /, '');
    const userId = state.tokens[t];
    return userId ? { userId, error: null } : { userId: null, error: 'Unauthorized' };
  },
}));
vi.mock('../_shared/internalJobAuth.js', () => ({
  authenticateUser: async (event: any) => {
    const t = String(event?.headers?.authorization || '').replace(/^Bearer /, '');
    const userId = state.tokens[t];
    return userId ? { ok: true, principal: { userId } } : { ok: false };
  },
  claimedUserIdMatches: (claimed: unknown, userId: string) => claimed === undefined || claimed === null || claimed === '' || claimed === userId,
}));

const { handler: summary } = await import('../financial-summary');
const { handler: exporter } = await import('../financial-export');
const { handler: taxSummary } = await import('../tax-summary');
const { handler: taxReport } = await import('../generate-tax-report');

const A = 'user-a';
const B = 'user-b';
const ALL = { startDate: '2023-01-01', endDate: '2025-12-31' };

function db(rows: LedgerRow[], extra: Record<string, FakeRow[]> = {}): Record<string, FakeRow[]> {
  return {
    transactions: rows as unknown as FakeRow[],
    imports: [
      { id: IMPORTS.chequing, user_id: A, status: 'committed', file_url: 'x/chequing.pdf', created_at: '2023-01-01', statement_breakdown_json: { statement_meta: { issuer: 'Synthetic Bank', account_last4: '0001' } } },
      { id: IMPORTS.card, user_id: A, status: 'committed', file_url: 'x/card.pdf', created_at: '2023-01-02' },
      { id: IMPORTS.savings, user_id: A, status: 'committed', file_url: 'x/savings.pdf', created_at: '2023-01-03' },
      { id: IMPORTS.chequingReimport, user_id: A, status: 'committed', file_url: 'x/chequing-again.pdf', created_at: '2023-01-04' },
    ],
    profiles: [{ id: A, currency: 'CAD', first_name: 'Synthetic', full_name: 'Synthetic Customer' }, { id: B, currency: 'CAD' }],
    ...extra,
  };
}
const call = async (h: any, token: string, body: unknown) => h({ httpMethod: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) }, {});
const BUCKET_KEY: Record<Exclude<Bucket, 'unclassified'>, string> = {
  income: 'income', spending: 'spending', transferIn: 'transferIn', transferOut: 'transferOut',
  debtPayments: 'debtPayments', debtRepaymentsIn: 'debtRepaymentsIn', savingsInvestment: 'savingsInvestment',
};
const BUCKET_LABEL: Record<Exclude<Bucket, 'unclassified'>, string> = {
  income: PURPOSE_LABEL.income, spending: PURPOSE_LABEL.spending, transferIn: PURPOSE_LABEL.transfer_in, transferOut: PURPOSE_LABEL.transfer_out,
  debtPayments: PURPOSE_LABEL.debt_payment, debtRepaymentsIn: PURPOSE_LABEL.debt_repayment_in, savingsInvestment: PURPOSE_LABEL.savings_investment,
};

function parseCsv(csv: string): { meta: string[]; header: string[]; rows: string[][] } {
  const lines = csv.split('\r\n').filter(Boolean);
  const meta = lines.filter(l => l.startsWith('#'));
  const body = lines.filter(l => !l.startsWith('#'));
  const split = (l: string) => {
    const out: string[] = []; let cur = ''; let q = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur); return out;
  };
  return { meta, header: split(body[0]), rows: body.slice(1).map(split) };
}

beforeEach(() => { state.tokens = { 'tok-a': A, 'tok-b': B }; });

describe('S0/S2b financial-summary reconciles with the oracle at 119 / 1,000 / 1,501 / 3,000 / 10,000', () => {
  for (const n of [119, 1000, 1501, 3000, 10000]) {
    it(`${n} transactions`, async () => {
      const { rows, oracle } = generateLedger(n, A);
      state.client = makeCappedClient(db(rows), { shuffleUnordered: true });
      const res = await call(summary, 'tok-a', ALL);
      expect(res.statusCode).toBe(200);
      expect(res.headers['Cache-Control']).toBe('no-store');
      const b = JSON.parse(res.body);
      expect(b.status).toBe('verified');
      expect(b.contractVersion).toBe('fst2-summary-2');
      expect(b.transactionCount).toBe(oracle.count);
      for (const [bucket, key] of Object.entries(BUCKET_KEY)) {
        expect(b.totals.cents[key], bucket).toBe(oracle.cents[bucket as Bucket]);
        expect(b.counts[key], bucket).toBe(oracle.counts[bucket as Bucket]);
      }
      expect(b.completeness.excluded.unclassifiedType).toBe(oracle.counts.unclassified);
      expect(b.completeness.unclassifiedCents).toBe(oracle.cents.unclassified);
      expect(b.completeness.dataComplete).toBe(true);
      expect(b.completeness.countVerified).toBe(true);
      expect(b.signals.possibleDuplicates.count).toBe(oracle.possibleDuplicates);
      expect(b.signals.possibleRefunds.count).toBe(oracle.possibleRefunds);
      // D-1: card-side payments are never income
      expect(b.totals.cents.income).toBe(oracle.cents.income);
      // one complete read: pages of 1,000 + an empty page + one count (no repeated reads)
      expect(b.perf.databaseRequests).toBe(Math.ceil(n / 1000) + 2);
      expect(b.perf.attempts).toBe(1);
      expect(b.scope.currencyBasis).toBe('profile_assumed');

      // ── fst2-summary-2 (owner 2026-11-26): every breakdown reconciles to raw deposits/withdrawals ──
      const o = oracle.cents;
      const deposits = o.income + o.refunds + o.transferIn + o.debtRepaymentsIn;
      const withdrawals = o.spending + o.transferOut + o.debtPayments + o.savingsInvestment;
      expect(b.labels.deposits.cents).toBe(deposits);
      expect(b.labels.withdrawals.cents).toBe(withdrawals);
      expect(b.labels.netCashFlow.cents).toBe(deposits - withdrawals);          // net cash flow = deposits − withdrawals
      expect(b.labels.actualIncome.cents).toBe(o.income);                       // never refunds / transfers / card payments
      expect(b.labels.actualSpending.cents).toBe(o.spending);
      expect(b.labels.refunds.cents).toBe(o.refunds);
      expect(b.netExcludingTransfersAndSavings.cents).toBe(o.income + o.refunds - (o.spending + o.debtPayments));
      // reconciled breakdown: lines add up to the raw totals; the 'Credit'-typed rows are reported unplaced, never guessed
      const lineSum = (dir: string) => Math.round(b.statementBreakdown.lines.filter((l: any) => l.direction === dir).reduce((x: number, l: any) => x + l.amount * 100, 0));
      expect(lineSum('inflow')).toBe(deposits);
      expect(lineSum('outflow')).toBe(withdrawals);
      expect(b.statementBreakdown.unplacedCount).toBe(oracle.counts.unclassified);
      expect(b.statementBreakdown.reconciled).toBe(oracle.counts.unclassified === 0);
      // spending by category: purpose 'spending' only, sums to actual spending
      expect(b.spendingByCategory.reduce((x: number, c: any) => x + c.cents, 0)).toBe(o.spending);
      expect(b.spendingByCategory.some((c: any) => /transfer|debt|payment|savings/i.test(c.category))).toBe(false);
      // per statement: the statements add up to the whole (every synthetic row has an import)
      expect(Math.round(b.perStatement.reduce((x: number, p: any) => x + p.deposits * 100, 0))).toBe(deposits);
      expect(Math.round(b.perStatement.reduce((x: number, p: any) => x + p.withdrawals * 100, 0))).toBe(withdrawals);
      // the ONE review rule (no category / Uncategorized / Needs Review; not 'Other'), computed independently here
      expect(b.needsReviewCount).toBe(rows.filter(r => { const c = (r.category ?? '').trim().toLowerCase(); return c === '' || c === 'uncategorized' || c === 'needs review'; }).length);
      // no statement periods recorded in this fixture → coverage unknown → nothing comparable, no trend/stable
      expect(b.coverage.comparison.allowed).toBe(false);
      expect(b.periods).toEqual([]);
      expect(b.insights.some((i: any) => i.kind === 'trend' || i.kind === 'stable')).toBe(false);
      expect(b.insights.map((i: any) => i.kind)).toContain('not_enough_history');
      expect(b.calendarMonths.every((m: any) => m.comparable === false)).toBe(true);
      expect(b.goals.averageNetCashFlowPerPeriod).toBeNull();
      // owner 2026-11-26: retrieval complete + coverage unknown → labelled recorded totals, no comparisons/completeness
      expect(b.dataQuality).toMatchObject({ retrieval: 'complete', statementCoverage: 'unknown', allowed: { recordedTotals: true, completenessClaims: false, comparisons: false } });
      expect(b.dataQuality.totalsLabel).toMatch(/^Recorded transactions for 2023-01-01 to 2025-12-31. Statement coverage for this period is unknown/);
      expect(b.possibleBusinessExpenses).toMatchObject({ status: 'needs_review' });
      expect(b.possibleBusinessExpenses.wording).not.toMatch(/deduction(s)? found|deductible/i);
    });
  }

  it('with statement periods recorded for every account: comparisons allowed, periods/insights coverage-backed, net reconciles per period', async () => {
    const { rows } = generateLedger(3000, A);
    const committed = (id: string, issuer: string, l4: string) => ({ id, user_id: A, status: 'committed', committed_at: '2026-01-01', file_url: `x/${l4}.pdf`, created_at: '2023-01-01',
      statement_breakdown_json: { statement_meta: { issuer, account_last4: l4, period_start: '2023-01-01', period_end: '2025-12-31' } } });
    const data = db(rows);
    data.imports = [committed(IMPORTS.chequing, 'Synthetic Bank', '0001'), committed(IMPORTS.card, 'Synthetic Card', '0002'), committed(IMPORTS.savings, 'Synthetic Savings', '0003'), committed(IMPORTS.chequingReimport, 'Synthetic Bank', '0001')];
    state.client = makeCappedClient(data, { shuffleUnordered: true });
    const b = JSON.parse((await call(summary, 'tok-a', ALL)).body);
    expect(b.status).toBe('verified');
    expect(b.coverage.comparison.allowed).toBe(true);
    expect(b.dataQuality).toMatchObject({ retrieval: 'complete', statementCoverage: 'complete', allowed: { completenessClaims: true, comparisons: true } });
    expect(b.dataQuality.totalsLabel).toMatch(/^Complete for 2023-01-01 to 2025-12-31/);
    expect(b.periods.length).toBeGreaterThan(12);                  // full calendar months every account covers
    for (const p of b.periods) expect(Math.round(p.netCashFlow * 100)).toBe(Math.round(p.deposits * 100) - Math.round(p.withdrawals * 100));
    expect(b.insights.every((i: any) => i.kind === 'not_enough_history' || i.coverage.complete)).toBe(true);
    expect(b.goals.periodsUsed).toBe(b.periods.length);
    expect(b.calendarMonths.filter((m: any) => m.coverage === 'complete').length).toBe(b.periods.length);
  });
});

describe('S2 financial-export: complete files that add up to the stated totals', () => {
  for (const n of [1000, 1501, 3000, 10000]) {
    it(`accountant export, ${n} transactions: row count and per-classification sums == oracle`, async () => {
      const { rows, oracle } = generateLedger(n, A);
      state.client = makeCappedClient(db(rows), { shuffleUnordered: true });
      const res = await call(exporter, 'tok-a', { kind: 'accountant', ...ALL });
      expect(res.statusCode).toBe(200);
      expect(res.headers['Content-Type']).toMatch(/text\/csv/);
      expect(res.headers['X-Transaction-Count']).toBe(String(oracle.count));
      const csv = parseCsv(res.body);
      expect(csv.rows.length).toBe(oracle.count);
      const iClass = csv.header.indexOf('Classification');
      const iAbs = csv.header.findIndex(h => h.startsWith('Absolute amount'));
      const sums: Record<string, number> = {};
      for (const r of csv.rows) sums[r[iClass]] = (sums[r[iClass]] || 0) + Math.round(Number(r[iAbs]) * 100);
      for (const [bucket, label] of Object.entries(BUCKET_LABEL)) expect(sums[label] ?? 0, label).toBe(oracle.cents[bucket as Bucket]);
      expect(csv.meta.join('\n')).toContain(`COMPLETE — ${oracle.count} transactions`);
      expect(csv.meta.join('\n')).toContain('Not tax advice');
      expect(new Set(csv.rows.map(r => r[r.length - 1])).size).toBe(oracle.count); // every id once
    });
  }

  it('tax export for one year: only that year, tax sections == oracle, internal movement never an expense', async () => {
    const { rows } = generateLedger(3000, A);
    const o = oracleFor(rows, '2024-01-01', '2024-12-31');
    state.client = makeCappedClient(db(rows), { shuffleUnordered: true });
    const res = await call(exporter, 'tok-a', { kind: 'tax', year: 2024 });
    expect(res.statusCode).toBe(200);
    const csv = parseCsv(res.body);
    expect(csv.rows.length).toBe(o.count);
    const iSec = csv.header.indexOf('Tax section');
    const iAbs = csv.header.findIndex(h => h.startsWith('Absolute amount'));
    const bySec: Record<string, number> = {};
    for (const r of csv.rows) bySec[r[iSec]] = (bySec[r[iSec]] || 0) + Math.round(Number(r[iAbs]) * 100);
    const internalTitle = Object.keys(bySec).find(t => t.startsWith('Transfers, debt repayments & savings'))!;
    expect(bySec[internalTitle]).toBe(o.taxSections.internal.cents);
    expect(bySec['Income']).toBe(o.taxSections.income.cents);
    expect(bySec['Meals & Entertainment']).toBe(o.taxSections.meals.cents);
    expect(bySec['Personal']).toBe(o.taxSections.personal.cents);
    expect(bySec['Business Expenses']).toBe(o.taxSections.business.cents);
    expect(bySec['Other / Uncategorized']).toBe(o.taxSections.other.cents);
    expect(csv.rows.filter(r => r[iSec].startsWith('Unsectioned')).length).toBe(o.unsectioned);
  });

  it('CSV injection: a merchant starting with = is neutralised', async () => {
    const { rows } = generateLedger(1000, A);
    rows[0].merchant_name = '=HYPERLINK("http://x")';
    state.client = makeCappedClient(db(rows));
    const res = await call(exporter, 'tok-a', { kind: 'transactions', ...ALL });
    expect(res.body).not.toMatch(/,=HYPERLINK/);
    expect(res.body).toContain("'=HYPERLINK");
  });
});

describe('S3 tax-summary and tax report', () => {
  it('tax-summary 2024 at 10,000: complete, sections == oracle, internal section first, unsectioned disclosed', async () => {
    const { rows } = generateLedger(10000, A);
    const o = oracleFor(rows, '2024-01-01', '2024-12-31');
    state.client = makeCappedClient(db(rows), { shuffleUnordered: true });
    const res = await call(taxSummary, 'tok-a', { year: 2024 });
    const b = JSON.parse(res.body);
    expect(b.queryStatus).toBe('verified');
    expect(b.transactionCount).toBe(o.count);
    const sec = Object.fromEntries(b.sections.map((s: any) => [s.id, s]));
    for (const id of ['internal', 'income', 'meals', 'business', 'personal', 'other']) {
      expect(Math.round(sec[id].total * 100), id).toBe(o.taxSections[id].cents);
      expect(sec[id].count, id).toBe(o.taxSections[id].count);
    }
    expect(b.sections[0].id).toBe('internal');
    expect(b.unsectionedCount).toBe(o.unsectioned);
    expect(b.engine.incomeCents).toBe(o.cents.income);
    expect(b.engine.debtRepaymentsInCents).toBe(o.cents.debtRepaymentsIn);
  });

  it('tax report HTML: complete read, no deduction estimate, no owner-specific names', async () => {
    const { rows } = generateLedger(3000, A);
    state.client = makeCappedClient(db(rows), { shuffleUnordered: true });
    const res = await call(taxReport, 'tok-a', { year: 2024, format: 'html' });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toMatch(/50% deduction|Estimated 50%|Not Deductible/);
    const src = fs.readFileSync(path.join(__dirname, '../generate-tax-report.ts'), 'utf8');
    expect(src).not.toMatch(/gfs|rownmi|celtic|kollbrook|river city hyundai|northstar hyundai|northtown registry|kenyon|revolution moto/i);
    expect(src).not.toMatch(/\.limit\(5000\)/);
  });

  it('tax report refuses a partial year (no report from incomplete data)', async () => {
    const { rows } = generateLedger(3000, A);
    let n = 0;
    state.client = makeCappedClient(db(rows), {
      onRequest: (_k, table) => { if (table === 'transactions' && ++n % 2 === 0) rows.push({ ...rows[0], id: `${A}-churn-${n}`, date: '2024-01-01' }); },
    });
    const res = await call(taxReport, 'tok-a', { year: 2024, format: 'html' });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).status).toBe('partial');
  });
});

describe('Status distinctions: no data / verified zero / partial / unavailable', () => {
  it('no imported data at all → no_data (summary) and no file (export)', async () => {
    state.client = makeCappedClient(db([]));
    expect(JSON.parse((await call(summary, 'tok-a', ALL)).body).status).toBe('no_data');
    const ex = await call(exporter, 'tok-a', { kind: 'transactions', ...ALL });
    expect(JSON.parse(ex.body).status).toBe('no_data');
  });
  it('data exists but none in the period → verified_zero', async () => {
    const { rows } = generateLedger(1000, A);
    state.client = makeCappedClient(db(rows));
    const b = JSON.parse((await call(summary, 'tok-a', { startDate: '2030-01-01', endDate: '2030-12-31' })).body);
    expect(b.status).toBe('verified_zero');
    expect(b.transactionCount).toBe(0);
    expect(b.totals.cents.income).toBe(0);
  });
  it('read failure → 503 unavailable, never zero', async () => {
    const { rows } = generateLedger(1501, A);
    state.client = makeCappedClient(db(rows), { failOnRequest: 2, failTable: 'transactions' });
    const res = await call(summary, 'tok-a', ALL);
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).status).toBe('unavailable');
    expect(JSON.parse(res.body).totals).toBeUndefined();
  });
  it('continuous churn during the read → partial: no totals, export refused (409)', async () => {
    const { rows } = generateLedger(3000, A);
    let k = 0;
    state.client = makeCappedClient(db(rows), {
      onRequest: (_n, table) => { if (table === 'transactions' && ++k % 2 === 0) rows.push({ ...rows[0], id: `${A}-ins-${k}`, date: '2023-01-01' }); },
    });
    const s = JSON.parse((await call(summary, 'tok-a', ALL)).body);
    expect(s.status).toBe('partial');
    expect(s.totals).toBeNull();
    const ex = await call(exporter, 'tok-a', { kind: 'accountant', ...ALL });
    expect(ex.statusCode).toBe(409);
  });
});

describe('Isolation, concurrency and freshness', () => {
  it('a customer never sees another customer\'s rows; body userId is ignored', async () => {
    const a = generateLedger(1501, A);
    const b = generateLedger(1000, B);
    state.client = makeCappedClient(db([...a.rows, ...b.rows]), { shuffleUnordered: true });
    const rb = JSON.parse((await call(summary, 'tok-b', { ...ALL, userId: A })).body);
    expect(rb.transactionCount).toBe(b.oracle.count);
    expect(rb.totals.cents.income).toBe(b.oracle.cents.income);
    const exA = parseCsv((await call(exporter, 'tok-a', { kind: 'transactions', ...ALL, userId: B })).body);
    expect(exA.rows.length).toBe(a.oracle.count);
    expect(exA.rows.every(r => r[r.length - 1].startsWith(A))).toBe(true);
  });
  it('no token → 401; another customer\'s import id scope yields only own rows', async () => {
    const a = generateLedger(1000, A);
    state.client = makeCappedClient(db(a.rows));
    expect((await call(summary, 'nope', ALL)).statusCode).toBe(401);
    const scoped = JSON.parse((await call(summary, 'tok-b', { ...ALL, importIds: [IMPORTS.card] })).body);
    expect(scoped.status).toBe('no_data');
  });
  it('a single insert during the read is caught by the count check and the read is retried (consistent result)', async () => {
    const { rows, oracle } = generateLedger(3000, A);
    // insert on the SECOND page request with an early date: it shifts the offsets mid-read
    let k = 0;
    state.client = makeCappedClient(db(rows), {
      onRequest: (_n, table) => { if (table === 'transactions' && ++k === 2) rows.push({ ...rows[5], id: `${A}-late`, date: '2023-01-01' }); },
    });
    const b = JSON.parse((await call(summary, 'tok-a', ALL)).body);
    expect(b.status).toBe('verified');
    expect(b.transactionCount).toBe(oracle.count + 1);
    expect(b.perf.attempts).toBe(2);
  });
  it('a Tag correction confirmed between two requests is reflected immediately (no stale result)', async () => {
    const { rows } = generateLedger(3000, A);
    state.client = makeCappedClient(db(rows));
    const before = JSON.parse((await call(summary, 'tok-a', ALL)).body);
    const target = rows.find(r => r.kind === 'purchase')!;
    target.category = 'Transfers'; // customer confirmed Tag's proposal: this purchase was a transfer
    const after = JSON.parse((await call(summary, 'tok-a', ALL)).body);
    const cents = Math.round(Math.abs(target.amount) * 100);
    expect(after.totals.cents.spending).toBe(before.totals.cents.spending - cents);
    expect(after.totals.cents.transferOut).toBe(before.totals.cents.transferOut + cents);
  });
  it('a recategorisation DURING a read gives one consistent state (old or new), never a double count', async () => {
    const { rows, oracle } = generateLedger(3000, A);
    const target = rows.find(r => r.kind === 'purchase' && r.date > '2025-06-01')!;
    let k = 0;
    state.client = makeCappedClient(db(rows), { onRequest: (_n, table) => { if (table === 'transactions' && ++k === 2) target.category = 'Transfers'; } });
    const b = JSON.parse((await call(summary, 'tok-a', ALL)).body);
    expect(b.transactionCount).toBe(oracle.count);
    const cents = Math.round(Math.abs(target.amount) * 100);
    const oldState = b.totals.cents.spending === oracle.cents.spending && b.totals.cents.transferOut === oracle.cents.transferOut;
    const newState = b.totals.cents.spending === oracle.cents.spending - cents && b.totals.cents.transferOut === oracle.cents.transferOut + cents;
    expect(oldState || newState).toBe(true);
  });
});

describe('Performance (in-memory, request counts are the meaningful measure)', () => {
  it('10,000 transactions: one read of 12 requests; aggregate + export under 3 s locally', async () => {
    const { rows } = generateLedger(10000, A);
    state.client = makeCappedClient(db(rows));
    const t0 = Date.now();
    const s = JSON.parse((await call(summary, 'tok-a', ALL)).body);
    const e = await call(exporter, 'tok-a', { kind: 'accountant', ...ALL });
    const ms = Date.now() - t0;
    expect(s.perf.databaseRequests).toBe(12);
    expect(e.statusCode).toBe(200);
    expect(ms).toBeLessThan(3000);
    // eslint-disable-next-line no-console
    console.log(`[FST-2 perf] 10,000 rows: summary ${s.perf.durationMs} ms (${s.perf.databaseRequests} requests); summary+export ${ms} ms in-memory`);
  });
});

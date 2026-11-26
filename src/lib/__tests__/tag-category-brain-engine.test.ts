/**
 * Unified financial engine (owner GO 2026-11-26) — tag_category_brain refactor (AI Architecture HQ
 * verdict: REFACTOR). The tool states no money figures (those come only from the shared engine via
 * transaction_category_totals / merchant_totals), reads completely, flags an incomplete read, and
 * resolves periods through the shared calendar helpers. Synthetic data only.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

type Row = Record<string, unknown>;
const state: { rows: Row[]; cap: number; failAt: number | null; calls: Array<{ filters: Array<[string, string, unknown]> }> } = { rows: [], cap: 1000, failAt: null, calls: [] };

function query() {
  const filters: Array<[string, string, unknown]> = [];
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => { filters.push(['eq', c, v]); return q; },
    gte: (c: string, v: unknown) => { filters.push(['gte', c, v]); return q; },
    lt: (c: string, v: unknown) => { filters.push(['lt', c, v]); return q; },
    order: () => q,
    range: async (from: number, to: number) => {
      state.calls.push({ filters });
      if (state.failAt !== null && from >= state.failAt) return { data: null, error: { message: 'down' } };
      const match = state.rows.filter(r => filters.every(([op, c, v]) =>
        op === 'eq' ? r[c] === v : op === 'gte' ? String(r[c]) >= String(v) : String(r[c]) < String(v)));
      const end = Math.min(to, from + state.cap - 1); // PostgREST row cap
      return { data: match.slice(from, end + 1), error: null };
    },
  };
  return q;
}
vi.mock('../../server/db', () => ({ getSupabaseServerClient: () => ({ from: () => query() }) }));

import { execute, outputSchema, resolveTimeframe } from '../../agent/tools/impl/tag_category_brain';
import { getMonthRange, getPreviousMonthRange } from '../../shared/financial-dates';

const U = 'u-brain';
const tx = (i: number, extra: Row = {}): Row => ({
  id: `t${String(i).padStart(5, '0')}`, user_id: U, category: 'Food & Dining', date: `2026-10-${String(1 + (i % 28)).padStart(2, '0')}`,
  merchant_name: i % 3 === 0 ? 'CORNER COFFEE' : 'GRAINS BAKERY', category_source: i % 2 ? 'ai' : 'learned', confidence: 0.9, amount: -5, ...extra,
});

beforeEach(() => { state.rows = []; state.cap = 1000; state.failAt = null; state.calls = []; });

describe('tag_category_brain states no money figures', () => {
  it('output has no amount / total / income fields and points money questions to the engine', async () => {
    state.rows = [tx(1), tx(2), tx(3, { amount: 12.5, type: 'income' }) /* a refund-like inflow */];
    const r = await execute({ category: 'Food & Dining', timeframe: 'all' }, { userId: U });
    expect(r.ok).toBe(true);
    const out = (r as { value: Record<string, unknown> }).value;
    expect(() => outputSchema.parse(out)).not.toThrow();
    const keys = JSON.stringify(Object.keys(out)) + JSON.stringify((out.topMerchants as unknown[])[0]);
    expect(keys).not.toMatch(/totalSpent|totalIncome|avgTransactionAmount|totalAmount/);
    expect(out.moneyFiguresFrom).toBe('transaction_category_totals');
    expect(JSON.stringify(out.notes)).not.toMatch(/\$\d/);
  });
  it('the source has no money math and no "trending" claim', () => {
    const src = readFileSync(resolve(__dirname, '../../agent/tools/impl/tag_category_brain.ts'), 'utf8');
    expect(src).not.toMatch(/\.amount\b|Math\.abs\(Number/);
    expect(src).not.toMatch(/trending/i);
    const registry = readFileSync(resolve(__dirname, '../../agent/tools/index.ts'), 'utf8');
    const i = registry.indexOf("['tag_category_brain'");
    expect(registry.slice(i, i + 400)).not.toMatch(/trending|totals,/i);
  });
});

describe('tag_category_brain reads completely and says when it could not', () => {
  it('more than 1,000 rows behind a 1,000-row API cap are all counted', async () => {
    state.rows = Array.from({ length: 2600 }, (_, i) => tx(i));
    const r = await execute({ category: 'Food & Dining', timeframe: 'all' }, { userId: U });
    const out = (r as { value: { totalTransactions: number; complete: boolean } }).value;
    expect(out).toMatchObject({ totalTransactions: 2600, complete: true });
  });
  it('a failed page is an error, never a smaller "complete" count', async () => {
    state.rows = Array.from({ length: 1200 }, (_, i) => tx(i));
    state.failAt = 500;
    const r = await execute({ category: 'Food & Dining', timeframe: 'all' }, { userId: U });
    expect(r.ok).toBe(false);
  });
  it('only this customer and this category are read', async () => {
    state.rows = [tx(1), tx(2, { user_id: 'someone-else' }), tx(3, { category: 'Travel' })];
    const r = await execute({ category: 'Food & Dining', timeframe: 'all' }, { userId: U });
    expect((r as { value: { totalTransactions: number } }).value.totalTransactions).toBe(1);
  });
});

describe('tag_category_brain periods come from the shared calendar helpers', () => {
  const now = new Date('2026-11-15T12:00:00Z');
  it('this_month / last_month equal financial-dates, end exclusive', () => {
    expect(resolveTimeframe('this_month', null, now)).toEqual({ start: getMonthRange(null, now).start, endExclusive: getMonthRange(null, now).end });
    expect(resolveTimeframe('last_month', null, now)).toEqual({ start: getPreviousMonthRange(null, now).start, endExclusive: getPreviousMonthRange(null, now).end });
  });
  it('last_30_days is the 30 calendar days ending today (inclusive)', () => {
    expect(resolveTimeframe('last_30_days', null, now)).toEqual({ start: '2026-10-17', endExclusive: '2026-11-16' });
  });
  it('the read filters on the engine date column with an exclusive end', async () => {
    state.rows = [tx(1)];
    await execute({ category: 'Food & Dining', timeframe: 'last_month' }, { userId: U });
    const f = state.calls[0].filters;
    expect(f.some(([op, c]) => op === 'gte' && c === 'date')).toBe(true);
    expect(f.some(([op, c]) => op === 'lt' && c === 'date')).toBe(true);
  });
});

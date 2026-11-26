/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles */
/**
 * AR-1b F-6 (owner GO 2026-11-26): merchant_totals takes amount and purpose from the shared engine.
 * Refunds are separate (never added to spending); grandTotal covers every merchant in scope, not only
 * the listed top N. Synthetic data only.
 */
import { describe, it, expect, vi } from 'vitest';
import { makeCappedClient } from './fixtures/capped-supabase';

const state: { client: any } = { client: null };
vi.mock('../../server/db', () => ({ getSupabaseServerClient: () => state.client }));

const U = 'u-f6';
let n = 0;
const tx = (merchant: string, amount: number, type: 'expense' | 'income', category = 'Shopping') =>
  ({ id: `f6-${++n}`, user_id: U, date: `2026-03-${String((n % 27) + 1).padStart(2, '0')}`, amount: type === 'income' ? amount : -amount, type, category, subcategory: null, merchant_name: merchant, merchant: merchant });

describe('merchant_totals F-6', () => {
  it('a refund is reported separately and never increases spending', async () => {
    state.client = makeCappedClient({ transactions: [tx('STORE A', 100, 'expense'), tx('STORE A', 30, 'income')] });
    const { execute } = await import('../../agent/tools/impl/merchant_totals');
    const r: any = await execute({ merchant: 'STORE A' } as any, { userId: U } as any);
    expect(r.ok).toBe(true);
    const m = r.value.merchants[0];
    expect(m.total).toBe(100);          // not 130
    expect(m.refunds).toBe(30);
    expect(r.value.refundsTotal).toBe(30);
    expect(r.value.grandTotal).toBe(100);
  });

  it('grandTotal covers every merchant in scope; listedTotal covers only the listed top N', async () => {
    const rows = [tx('A', 500, 'expense'), tx('B', 300, 'expense'), tx('C', 200, 'expense'), tx('D', 100, 'expense')];
    state.client = makeCappedClient({ transactions: rows });
    const { execute } = await import('../../agent/tools/impl/merchant_totals');
    const r: any = await execute({ limit: 2 } as any, { userId: U } as any);
    expect(r.value.merchants).toHaveLength(2);
    expect(r.value.listedTotal).toBe(800);
    expect(r.value.grandTotal).toBe(1100);   // was 800 (top-N only)
    expect(r.value.transactionCount).toBe(4);
  });
});

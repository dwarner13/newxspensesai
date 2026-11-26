/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles */
/**
 * AR-1b FR-035/036 (owner GO 2026-11-26): Crystal's income / expense summaries come from the shared
 * engine. Synthetic data only; the 1,000-row API cap is simulated.
 */
import { describe, it, expect, vi } from 'vitest';
import { makeCappedClient, type FakeRow } from './fixtures/capped-supabase';

const state: { client: any } = { client: null };
vi.mock('../../server/db', () => ({ getSupabaseServerClient: () => state.client }));

const U = 'u-crystal';
let n = 0;
const tx = (amount: number, type: 'income' | 'expense', category: string, subcategory: string | null = null, merchant = 'M'): FakeRow =>
  ({ id: `c-${String(++n).padStart(6, '0')}`, user_id: U, date: '2026-03-10', amount: type === 'income' ? amount : -amount, type, category, subcategory, merchant_name: merchant, merchant });

const ROWS = [
  tx(2000, 'income', 'Income', 'Employment', 'EMPLOYER'),
  tx(150, 'income', 'Transfers', 'e-Transfer'),       // transfer in: not income
  tx(30, 'income', 'Shopping', null, 'STORE'),         // refund: not income
  tx(80, 'expense', 'Groceries', null, 'GROCER'),
  tx(1100, 'expense', 'Housing', 'Mortgage'),          // debt payment: not spending
  tx(250, 'expense', 'Transfers', 'e-Transfer'),       // transfer out: not spending
  tx(100, 'expense', 'Transfers', 'ATM Withdrawal'),   // cash: not spending
];

describe('Crystal summaries on the shared engine', () => {
  it('income = actual income only (no transfers in, no refunds); refunds separate', async () => {
    state.client = makeCappedClient({ transactions: ROWS });
    const { execute } = await import('../../agent/tools/impl/crystal_summarize_income');
    const r: any = await execute({ startDate: '2026-03-01', endDate: '2026-03-31' }, { userId: U });
    expect(r.value).toMatchObject({ total: 2000, count: 1, refunds: 30, queryStatus: 'verified' });
    expect(r.value.topMerchants[0]).toMatchObject({ merchant: 'EMPLOYER', total: 2000 });
  });

  it('expenses = actual spending only (no mortgage, transfers or cash)', async () => {
    state.client = makeCappedClient({ transactions: ROWS });
    const { execute } = await import('../../agent/tools/impl/crystal_summarize_expenses');
    const r: any = await execute({}, { userId: U });
    expect(r.value).toMatchObject({ total: 80, count: 1, queryStatus: 'verified' });
  });

  it('beyond the 1,000-row API cap every row is read (was silently capped)', async () => {
    const many = Array.from({ length: 1500 }, () => tx(10, 'expense', 'Groceries'));
    state.client = makeCappedClient({ transactions: many });
    const { execute } = await import('../../agent/tools/impl/crystal_summarize_expenses');
    const r: any = await execute({ startDate: '2026-03-01', endDate: '2026-03-31' }, { userId: U });
    expect(r.value).toMatchObject({ total: 15000, count: 1500, queryStatus: 'verified' });
  });

  it('a failed read gives no totals, never a smaller number', async () => {
    state.client = makeCappedClient({ transactions: ROWS }, { failOnRequest: 1 });
    const { execute } = await import('../../agent/tools/impl/crystal_summarize_income');
    const r: any = await execute({}, { userId: U });
    expect(r.value.total).toBeNull();
    expect(['query_error', 'partial']).toContain(r.value.queryStatus);
  });
});

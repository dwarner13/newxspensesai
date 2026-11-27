import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import { pagedSelectAll } from '../../../shared/paged-select';
import { buildPeriodAggregate, type AggregateRow } from '../../../shared/period-aggregate';

export const id = 'transactions_query';

/**
 * N1 / AR-1b FR-037 (owner GO 2026-11-27, FINAL EMPLOYEE TOOL AUDIT): LIMITED DISPLAY ROWS are
 * separated from COMPLETE AGGREGATE TOTALS.
 *  - `transactions` is one display page (at most 100 rows) — never a basis for totals.
 *  - `page.totalMatching` is an exact head count of the same filters.
 *  - `totals` come from a COMPLETE paged read of the same filters through the shared engine
 *    (buildPeriodAggregate / classifyCashFlow): actual spending excludes transfers, debt payments,
 *    savings/investments and refunds; deposits / withdrawals by direction. If the read is not
 *    complete, every figure is null and `totals.complete` is false — a partial retrieval is never
 *    presented as a total.
 * Amount filters apply to the ABSOLUTE amount (expenses are stored negative).
 */
export const inputSchema = z.object({
  startDate: z.string().optional(), // YYYY-MM-DD format
  endDate: z.string().optional(), // YYYY-MM-DD format
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  type: z.enum(['expense', 'income', 'all']).optional().default('all'),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  merchant: z.string().optional(),
  limit: z.number().optional().default(100),
  offset: z.number().optional().default(0),
});

const money = z.number().nullable();
export const outputSchema = z.object({
  transactions: z.array(z.object({
    id: z.string(),
    date: z.string(),
    description: z.string().nullable(),
    merchant: z.string().nullable(),
    amount: z.number(),
    category: z.string().nullable(),
    type: z.string().nullable(),
  })),
  /** Rows in this display page (NOT the number of matching transactions; see page.totalMatching). */
  total: z.number(),
  page: z.object({
    offset: z.number(),
    limit: z.number(),
    returned: z.number(),
    totalMatching: z.number().nullable(),
    hasMore: z.boolean().nullable(),
    note: z.string(),
  }),
  totals: z.object({
    complete: z.boolean(),
    transactionCount: z.number().nullable(),
    deposits: money,
    withdrawals: money,
    netCashFlow: money,
    actualIncome: money,
    actualSpending: money,
    refunds: money,
    excludedFromSpending: z.object({ transfersOut: money, debtPayments: money, savingsInvestment: money }),
    note: z.string(),
  }),
  summary: z.object({
    transactionCount: z.number().nullable(),
    dateRange: z.object({ start: z.string().nullable(), end: z.string().nullable() }),
  }),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

const MAX_PAGE = 100;
const dollars = (cents: number) => Math.round(cents) / 100;

type Row = AggregateRow & {
  id: string; date: string; description: string | null; merchant: string | null;
  amount: number; category: string | null; type: string | null;
};

/** Same filters for the display page, the count and the complete read. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder chain
function applyFilters(q: any, input: Input): any {
  if (input.startDate) q = q.gte('date', input.startDate);
  if (input.endDate) q = q.lte('date', input.endDate);
  if (input.category) {
    const c = input.category.toLowerCase();
    q = c === 'uncategorized' || c === 'null' ? q.is('category', null) : q.eq('category', input.category);
  }
  if (input.categories && input.categories.length > 0) q = q.in('category', input.categories);
  if (input.type && input.type !== 'all') q = q.eq('type', input.type);
  if (input.minAmount !== undefined) {
    const m = Math.abs(input.minAmount);
    q = q.or(`amount.gte.${m},amount.lte.${-m}`);
  }
  if (input.maxAmount !== undefined) {
    const m = Math.abs(input.maxAmount);
    q = q.lte('amount', m).gte('amount', -m);
  }
  if (input.merchant) q = q.ilike('merchant', `%${input.merchant}%`);
  return q;
}

/**
 * Query transactions with flexible filters. Returns one DISPLAY PAGE of rows plus COMPLETE totals
 * for every matching transaction (shared engine). Use `totals` for any amount; never add up the rows.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();
    const offset = Math.max(0, input.offset || 0);
    const limit = Math.min(MAX_PAGE, Math.max(1, input.limit || MAX_PAGE));
    const cols = 'id, date, description, merchant, amount, category, subcategory, type';

    const [pageRes, countRes, full] = await Promise.all([
      // 1) display page (ordered, limited) — for showing rows only
      applyFilters(supabase.from('transactions').select(cols).eq('user_id', userId), input)
        .order('date', { ascending: false }).order('id', { ascending: false })
        .range(offset, offset + limit - 1),
      // 2) exact count of the same filters
      applyFilters(supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId), input),
      // 3) complete read of the same filters for the totals (shared paging helper, stable order)
      pagedSelectAll<Row>(() => applyFilters(supabase.from('transactions').select(cols).eq('user_id', userId), input)
        .order('date', { ascending: true }).order('id', { ascending: true })),
    ]);
    if (pageRes.error) throw pageRes.error;

    const rows = (pageRes.data || []) as Row[];
    const totalMatching = !countRes?.error && typeof countRes?.count === 'number' ? countRes.count : null;
    const complete = full.complete && !full.error && (totalMatching === null || full.rowsFetched === totalMatching);
    const agg = complete
      ? buildPeriodAggregate(full.rows, { fetch: { complete: true, truncated: false, rowsFetched: full.rowsFetched } })
      : null;
    const c = agg?.cents;
    const dates = (complete ? full.rows : rows).map(t => t.date).filter(Boolean).sort();

    return Ok({
      transactions: rows.map(t => ({
        id: t.id, date: t.date, description: t.description, merchant: t.merchant,
        amount: t.amount, category: t.category, type: t.type,
      })),
      total: rows.length,
      page: {
        offset, limit, returned: rows.length, totalMatching,
        hasMore: totalMatching === null ? null : offset + rows.length < totalMatching,
        note: 'Display page only — do not add these rows up; use totals for any amount.',
      },
      totals: {
        complete,
        transactionCount: complete ? full.rowsFetched : null,
        deposits: c ? dollars(c.totalInflow) : null,
        withdrawals: c ? dollars(c.totalOutflow) : null,
        netCashFlow: c ? dollars(c.rawNetCashMovement) : null,
        actualIncome: c ? dollars(c.income) : null,
        actualSpending: c ? dollars(c.spending) : null,
        refunds: c ? dollars(c.refunds) : null,
        excludedFromSpending: {
          transfersOut: c ? dollars(c.transferOut) : null,
          debtPayments: c ? dollars(c.debtPayments) : null,
          savingsInvestment: c ? dollars(c.savingsInvestment) : null,
        },
        note: complete
          ? 'Complete totals for every matching transaction (shared engine). Actual spending excludes transfers, debt payments, savings/investments and refunds.'
          : 'Totals unavailable: not every matching transaction could be read. Do not state a total; say the figures could not be verified.',
      },
      summary: {
        transactionCount: totalMatching,
        dateRange: { start: dates.length > 0 ? dates[0] : null, end: dates.length > 0 ? dates[dates.length - 1] : null },
      },
    });
  } catch (error) {
    console.error('[transactions_query] Error:', error);
    return Err(error as Error);
  }
}

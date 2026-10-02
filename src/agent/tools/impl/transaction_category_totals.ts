import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import { resolveCategoryOrPassthrough } from '../../../shared/financial-taxonomy';
import { fetchTransactionsInRange, type RangeFetchClient } from '../../../shared/transaction-range-fetch';
import {
  buildPeriodAggregate,
  centsToDollars,
  aggregateQueryStatus,
  completenessOutputSchema,
  toCompletenessOutput,
  type AggregateCategoryTotal,
  type PeriodAggregate,
} from '../../../shared/period-aggregate';

export const id = 'transaction_category_totals';

export const inputSchema = z.object({
  startDate: z.string().optional(), // YYYY-MM-DD format (inclusive)
  endDate: z.string().optional(), // YYYY-MM-DD format (inclusive)
  /** Direction filter on the CLASSIFIED rows: expense = outflow (incl. Purchase), income = inflow. */
  type: z.enum(['expense', 'income', 'all']).optional().default('all'),
  /** Optional canonical category filter (case-insensitive; resolved via the canonical taxonomy). */
  category: z.string().optional(),
});

const PURPOSES = [
  'income', 'spending', 'transfer_in', 'transfer_out', 'debt_payment',
  'savings_investment', 'other_non_spend', 'classification_conflict',
] as const;
type Purpose = typeof PURPOSES[number];

const purposeTotalSchema = z.object({ total: z.number(), totalCents: z.number(), count: z.number() });

export const outputSchema = z.object({
  categoryTotals: z.array(z.object({
    category: z.string().nullable(),
    totalAmount: z.number(),
    transactionCount: z.number(),
    avgAmount: z.number(),
    // Authoritative additions (always present from this tool)
    totalCents: z.number().optional(),
    direction: z.enum(['inflow', 'outflow']).optional(),
    purpose: z.string().optional(),
  })),
  /** Raw sum of the RETURNED entries (all purposes) — NOT ordinary spending. Null on query_error. */
  grandTotal: z.number().nullable(),
  dateRange: z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
  }),
  queryStatus: z.enum(['verified', 'verified_zero', 'partial', 'query_error']).optional(),
  /** Present only when queryStatus = 'query_error'. */
  error: z.string().optional(),
  /** Deterministic totals of the RETURNED entries by financial purpose. */
  totalsByPurpose: z.object(Object.fromEntries(PURPOSES.map(p => [p, purposeTotalSchema])) as Record<Purpose, typeof purposeTotalSchema>).optional(),
  /** Canonical category the filter resolved to (when a category was requested). */
  categoryFilter: z.string().nullable().optional(),
  completeness: completenessOutputSchema.optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/** Wide inclusive bounds used when a date is omitted (all available history). */
const ALL_HISTORY_START = '1900-01-01';
const ALL_HISTORY_END = '9999-12-31';

/**
 * Get transaction totals grouped by category (V1-A CP3: authoritative).
 *
 * Fetches EVERY transaction in the inclusive `date` range (paged), classifies
 * and aggregates once with the shared CP2 foundation (same rows and rules as
 * cash_flow_summary), then filters by direction / canonical category in code.
 * Omitted dates mean all available history; rows with a NULL `date` cannot be
 * selected by a date range and are not included.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient() as unknown as RangeFetchClient;
    const startDate = input.startDate ?? ALL_HISTORY_START;
    const endDate = input.endDate ?? ALL_HISTORY_END;

    const fetched = await fetchTransactionsInRange(supabase, { userId, startDate, endDate });
    if (fetched.error) {
      console.error('[transaction_category_totals] Query error:', fetched.error);
      return Ok({
        categoryTotals: [],
        grandTotal: null,
        dateRange: { start: null, end: null },
        queryStatus: 'query_error' as const,
        error: fetched.error,
      });
    }

    const agg = buildPeriodAggregate(fetched.rows, {
      fetch: fetched,
      period: input.startDate || input.endDate ? { start: startDate, end: endDate } : null,
    });
    return Ok(toCategoryTotalsOutput(input, agg));
  } catch (error) {
    console.error('[transaction_category_totals] Error:', error);
    return Err(error as Error);
  }
}

/** Canonical (lower-cased) category name for a filter, or the trimmed input if not canonical. */
export function canonicalCategoryKey(category: string): string {
  const resolved = resolveCategoryOrPassthrough(category);
  return (resolved?.category ?? category).trim().toLowerCase();
}

/** Pure mapping from the shared aggregate to the tool output (filters applied here). */
export function toCategoryTotalsOutput(input: Input, agg: PeriodAggregate): Output {
  const direction = input.type === 'expense' ? 'outflow' : input.type === 'income' ? 'inflow' : null;
  const categoryKey = input.category && input.category.trim() ? canonicalCategoryKey(input.category) : null;

  const entries: AggregateCategoryTotal[] = agg.categories.filter(e =>
    (direction === null || e.direction === direction)
    && (categoryKey === null || e.category.trim().toLowerCase() === categoryKey));

  const totalsByPurpose = Object.fromEntries(
    PURPOSES.map(p => [p, { total: 0, totalCents: 0, count: 0 }]),
  ) as Record<Purpose, { total: number; totalCents: number; count: number }>;
  let grandCents = 0;
  let first: string | null = null;
  let last: string | null = null;
  for (const e of entries) {
    const bucket = totalsByPurpose[e.purpose as Purpose];
    bucket.totalCents += e.totalCents;
    bucket.count += e.count;
    grandCents += e.totalCents;
    if (first === null || e.firstDate < first) first = e.firstDate;
    if (last === null || e.lastDate > last) last = e.lastDate;
  }
  for (const p of PURPOSES) totalsByPurpose[p].total = centsToDollars(totalsByPurpose[p].totalCents);

  const includedCount = entries.reduce((s, e) => s + e.count, 0);
  return {
    categoryTotals: entries.map(e => ({
      category: e.category === 'Uncategorized' ? null : e.category,
      totalAmount: centsToDollars(e.totalCents),
      transactionCount: e.count,
      avgAmount: e.count > 0 ? centsToDollars(Math.round(e.totalCents / e.count)) : 0,
      totalCents: e.totalCents,
      direction: e.direction,
      purpose: e.purpose,
    })),
    grandTotal: centsToDollars(grandCents),
    dateRange: { start: first, end: last },
    queryStatus: aggregateQueryStatus(agg, includedCount),
    totalsByPurpose,
    categoryFilter: categoryKey === null ? null : (resolveCategoryOrPassthrough(input.category!)?.category ?? input.category!.trim()),
    completeness: toCompletenessOutput(agg),
  };
}

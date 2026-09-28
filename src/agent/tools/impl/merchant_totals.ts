import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import { isNonSpendCategory } from '../../../shared/financial-taxonomy';
import { merchantGroupingKey } from '../../../../netlify/functions/_shared/merchantNormalize';

export const id = 'merchant_totals';

export const inputSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  merchant: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['expense', 'income']).optional(),
  limit: z.number().min(1).max(50).optional(),
});

export const outputSchema = z.object({
  merchants: z.array(z.object({
    merchant: z.string(),
    groupingKey: z.string(),
    total: z.number(),
    count: z.number(),
    average: z.number(),
    firstSeen: z.string(),
    lastSeen: z.string(),
  })),
  grandTotal: z.number(),
  transactionCount: z.number(),
  dateRange: z.object({ start: z.string(), end: z.string() }),
  queryStatus: z.enum(['verified', 'verified_zero', 'partial', 'query_error']),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;

/**
 * Maximum rows fetched from DB before JS aggregation.
 * If the query returns exactly this many rows, the result is treated
 * as potentially truncated and queryStatus is set to 'partial'.
 * This prevents silently returning incomplete merchant totals.
 */
export const ROW_FETCH_LIMIT = 5000;

/**
 * P3.2B — Merchant Totals
 *
 * Read-only, user-scoped merchant aggregation evidence tool.
 * Groups transactions by merchantGroupingKey() and returns
 * per-merchant totals, counts, averages, and date ranges.
 *
 * Display representative: most-frequent raw merchant_name variant
 * per group (deterministic tie-breaking by alphabetical order).
 *
 * Non-spend categories are excluded by default (transfers, loan
 * payments, investments) — same canonical semantics as cash_flow_summary.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();
    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    let query = supabase
      .from('transactions')
      .select('merchant_name, merchant, amount, date, category, type')
      .eq('user_id', userId);

    if (input.startDate) query = query.gte('date', input.startDate);
    if (input.endDate) query = query.lte('date', input.endDate);
    if (input.merchant) {
      query = query.or(
        `merchant_name.ilike.%${input.merchant}%,merchant.ilike.%${input.merchant}%`,
      );
    }
    if (input.category) query = query.eq('category', input.category);
    if (input.type) query = query.eq('type', input.type);

    query = query.limit(ROW_FETCH_LIMIT);

    const { data: transactions, error } = await query;

    if (error) {
      console.error('[merchant_totals] Query error:', error);
      return Ok({
        merchants: [],
        grandTotal: 0,
        transactionCount: 0,
        dateRange: { start: input.startDate || '', end: input.endDate || '' },
        queryStatus: 'query_error' as const,
      });
    }

    const txns = transactions || [];
    const truncated = txns.length >= ROW_FETCH_LIMIT;

    if (txns.length === 0) {
      return Ok({
        merchants: [],
        grandTotal: 0,
        transactionCount: 0,
        dateRange: { start: input.startDate || '', end: input.endDate || '' },
        queryStatus: 'verified_zero' as const,
      });
    }

    // Filter out non-spend categories (unless explicitly filtering by type/category)
    const filtered = (!input.type && !input.category)
      ? txns.filter(t => !isNonSpendCategory(t.category))
      : txns;

    // Group by merchantGroupingKey
    const groups = new Map<string, {
      rawVariants: Map<string, number>;
      total: number;
      count: number;
      firstSeen: string;
      lastSeen: string;
    }>();

    for (const t of filtered) {
      const rawMerchant = t.merchant_name || t.merchant || 'Unknown';
      const key = merchantGroupingKey(rawMerchant);
      const amount = Math.abs(t.amount || 0);
      const date = t.date || '';

      let group = groups.get(key);
      if (!group) {
        group = {
          rawVariants: new Map(),
          total: 0,
          count: 0,
          firstSeen: date,
          lastSeen: date,
        };
        groups.set(key, group);
      }

      group.total += amount;
      group.count++;
      group.rawVariants.set(rawMerchant, (group.rawVariants.get(rawMerchant) || 0) + 1);

      if (date && (!group.firstSeen || date < group.firstSeen)) group.firstSeen = date;
      if (date && (!group.lastSeen || date > group.lastSeen)) group.lastSeen = date;
    }

    // Build result array, sorted by total descending
    const merchantResults = Array.from(groups.entries())
      .map(([key, group]) => {
        // Display representative: most-frequent raw variant, alphabetical tie-break
        const representative = Array.from(group.rawVariants.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          [0][0];

        return {
          merchant: representative,
          groupingKey: key,
          total: Math.round(group.total * 100) / 100,
          count: group.count,
          average: Math.round((group.total / group.count) * 100) / 100,
          firstSeen: group.firstSeen,
          lastSeen: group.lastSeen,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    const grandTotal = merchantResults.reduce((sum, m) => sum + m.total, 0);
    const transactionCount = merchantResults.reduce((sum, m) => sum + m.count, 0);

    // Effective date range from actual data
    let earliestDate = '';
    let latestDate = '';
    for (const m of merchantResults) {
      if (m.firstSeen && (!earliestDate || m.firstSeen < earliestDate)) earliestDate = m.firstSeen;
      if (m.lastSeen && (!latestDate || m.lastSeen > latestDate)) latestDate = m.lastSeen;
    }

    return Ok({
      merchants: merchantResults,
      grandTotal: Math.round(grandTotal * 100) / 100,
      transactionCount,
      dateRange: {
        start: input.startDate || earliestDate,
        end: input.endDate || latestDate,
      },
      queryStatus: truncated ? 'partial' as const : 'verified' as const,
    });
  } catch (error) {
    console.error('[merchant_totals] Error:', error);
    return Err(error as Error);
  }
}

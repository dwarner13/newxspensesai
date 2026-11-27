import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import {
  fetchMerchantScopeRows,
  applyMerchantScope,
  merchantEvidenceFingerprint,
  MERCHANT_SCOPE_ROW_FETCH_LIMIT,
  type MerchantScopeClient,
} from '../../../shared/merchant-scope-rows';

import { classifyCashFlow } from '../../../shared/financial-taxonomy';

export const id = 'merchant_totals';

export const inputSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  merchant: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['expense', 'income']).optional(),
  limit: z.number().min(1).max(50).optional(),
  /** Deterministic groupingKeys to exclude from results.
   *  Applied after JS grouping, before computing grandTotal/count.
   *  Keys must match merchantGroupingKey() output exactly. */
  excludeGroups: z.array(z.string()).max(20).optional(),
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
    /** AR-1b F-6: money back from this merchant (refunds), never added to total. */
    refunds: z.number().optional(),
  })),
  /** AR-1b F-6: total over EVERY merchant in scope (not only the listed ones). */
  grandTotal: z.number(),
  transactionCount: z.number(),
  /** Total and count of the merchants listed (top N by total). */
  listedTotal: z.number().optional(),
  listedCount: z.number().optional(),
  /** Refunds across every merchant in scope (separate from grandTotal). */
  refundsTotal: z.number().optional(),
  dateRange: z.object({ start: z.string(), end: z.string() }),
  queryStatus: z.enum(['verified', 'verified_zero', 'partial', 'query_error']),
  /** P3.2B2C parity: fingerprint of the exact rows behind grandTotal/transactionCount. */
  evidence: z.object({
    count: z.number(),
    total: z.number(),
    idsHash: z.string(),
  }).optional(),
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
export const ROW_FETCH_LIMIT = MERCHANT_SCOPE_ROW_FETCH_LIMIT;

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
 *
 * Row-set semantics (fetch, non-spend, group keys, exclusions) are shared with
 * the B2C bridge via src/shared/merchant-scope-rows.ts.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();
    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const fetched = await fetchMerchantScopeRows(supabase as unknown as MerchantScopeClient, userId, {
      merchantQuery: input.merchant,
      startDate: input.startDate,
      endDate: input.endDate,
      category: input.category,
      type: input.type,
    });

    if (fetched.error) {
      console.error('[merchant_totals] Query error:', fetched.error);
      return Ok({
        merchants: [],
        grandTotal: 0,
        transactionCount: 0,
        dateRange: { start: input.startDate || '', end: input.endDate || '' },
        queryStatus: 'query_error' as const,
      });
    }

    const txns = fetched.rows;
    const truncated = fetched.truncated;

    if (txns.length === 0) {
      return Ok({
        merchants: [],
        grandTotal: 0,
        transactionCount: 0,
        dateRange: { start: input.startDate || '', end: input.endDate || '' },
        queryStatus: 'verified_zero' as const,
      });
    }

    // Shared scope semantics: non-spend filter (unless type/category explicit),
    // merchantGroupingKey(merchant_name || merchant), exact group exclusions.
    const scoped = applyMerchantScope(txns, {
      category: input.category,
      type: input.type,
      excludeGroups: input.excludeGroups,
    });

    // Group by merchantGroupingKey
    const groups = new Map<string, {
      rawVariants: Map<string, number>;
      total: number;
      refundCents: number;
      count: number;
      firstSeen: string;
      lastSeen: string;
    }>();

    for (const t of scoped) {
      const rawMerchant = t.merchant_name || t.merchant || 'Unknown';
      const key = t.groupKey;
      // AR-1b F-6 (owner GO 2026-11-26): amount and purpose from the shared engine. A refund is
      // reported separately and never adds to spending; a row with no direction or amount is skipped.
      const cls = classifyCashFlow(t);
      if (cls.excluded !== null || cls.amountCents === null) continue;
      const refundPurpose = cls.purpose === 'refund';
      const amount = refundPurpose ? 0 : cls.amountCents / 100;
      const date = t.date || '';

      let group = groups.get(key);
      if (!group) {
        group = {
          rawVariants: new Map(),
          total: 0,
          refundCents: 0,
          count: 0,
          firstSeen: date,
          lastSeen: date,
        };
        groups.set(key, group);
      }

      if (refundPurpose) { group.refundCents += cls.amountCents; } else { group.total += amount; group.count++; }
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
          ...(group.refundCents > 0 ? { refunds: group.refundCents / 100 } : {}),
        };
      })
      .filter(m => m.count > 0 || (m.refunds ?? 0) > 0)
      .sort((a, b) => b.total - a.total);
    const listed = merchantResults.slice(0, limit);

    // AR-1b F-6: grandTotal / transactionCount cover EVERY merchant in scope; listed* cover the top N.
    const grandTotal = merchantResults.reduce((sum, m) => sum + m.total, 0);
    const transactionCount = merchantResults.reduce((sum, m) => sum + m.count, 0);
    const listedTotal = listed.reduce((sum, m) => sum + m.total, 0);
    const listedCount = listed.reduce((sum, m) => sum + m.count, 0);
    const refundsTotal = merchantResults.reduce((sum, m) => sum + (m.refunds ?? 0), 0);

    // Evidence fingerprint over exactly the rows behind grandTotal/transactionCount (refunds excluded)
    const evidence = merchantEvidenceFingerprint(scoped.filter(t => {
      const c = classifyCashFlow(t);
      return c.excluded === null && c.amountCents !== null && c.purpose !== 'refund';
    }));

    // Effective date range from actual data
    let earliestDate = '';
    let latestDate = '';
    for (const m of listed) {
      if (m.firstSeen && (!earliestDate || m.firstSeen < earliestDate)) earliestDate = m.firstSeen;
      if (m.lastSeen && (!latestDate || m.lastSeen > latestDate)) latestDate = m.lastSeen;
    }

    return Ok({
      merchants: listed,
      grandTotal: Math.round(grandTotal * 100) / 100,
      transactionCount,
      listedTotal: Math.round(listedTotal * 100) / 100,
      listedCount,
      refundsTotal: Math.round(refundsTotal * 100) / 100,
      dateRange: {
        start: input.startDate || earliestDate,
        end: input.endDate || latestDate,
      },
      queryStatus: truncated ? 'partial' as const : 'verified' as const,
      evidence,
    });
  } catch (error) {
    console.error('[merchant_totals] Error:', error);
    return Err(error as Error);
  }
}

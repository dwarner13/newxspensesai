/**
 * Shared engine path for Crystal's income / expense summaries (owner GO 2026-11-26, UNIFIED FINANCIAL
 * ENGINE; AR-1b FR-035/036). Replaces the tools' own Math.abs sums over raw `type`:
 *  - complete paged read (fetchTransactionsInRange); an incomplete read returns NO totals;
 *  - purpose from the shared engine (classifyCashFlow): 'income' = actual income (no refunds, transfers
 *    in or card/loan payments received); 'spending' = actual spending (no transfers, cash, debt
 *    payments or savings). Refunds are reported separately.
 */
import { getSupabaseServerClient } from '../../../server/db';
import { fetchTransactionsInRange, type RangeFetchClient } from '../../../shared/transaction-range-fetch';
import { classifyCashFlow } from '../../../shared/financial-taxonomy';

export const ALL_HISTORY = { start: '1900-01-01', end: '2100-12-31' };

export interface CrystalSummary {
  total: number | null;
  count: number;
  average: number | null;
  topMerchants: Array<{ merchant: string; total: number; count: number }>;
  refunds: number | null;
  queryStatus: 'verified' | 'verified_zero' | 'partial' | 'query_error';
  definition: string;
}

export async function crystalSummary(
  userId: string,
  range: { startDate?: string; endDate?: string },
  purpose: 'income' | 'spending',
): Promise<CrystalSummary> {
  const definition = purpose === 'income'
    ? 'Actual income: deposits that are not transfers, refunds or card/loan payments received (shared engine).'
    : 'Actual spending: everyday purchases; excludes transfers, cash withdrawals, debt payments and savings (shared engine).';
  const fetched = await fetchTransactionsInRange(getSupabaseServerClient() as unknown as RangeFetchClient, {
    userId, startDate: range.startDate || ALL_HISTORY.start, endDate: range.endDate || ALL_HISTORY.end,
  }, { columns: ['merchant_name', 'merchant'] });

  if (fetched.error && !fetched.complete) {
    return { total: null, count: 0, average: null, topMerchants: [], refunds: null, queryStatus: 'query_error', definition };
  }
  if (!fetched.complete || fetched.truncated) {
    // Owner rule: incomplete database retrieval prohibits totals.
    return { total: null, count: 0, average: null, topMerchants: [], refunds: null, queryStatus: 'partial', definition };
  }

  let cents = 0; let count = 0; let refundCents = 0;
  const merchants = new Map<string, { cents: number; count: number }>();
  for (const row of fetched.rows as Array<Record<string, unknown>>) {
    const c = classifyCashFlow(row as Parameters<typeof classifyCashFlow>[0]);
    if (c.excluded !== null || c.amountCents === null) continue;
    if (c.purpose === 'refund') { refundCents += c.amountCents; continue; }
    if (c.purpose !== purpose) continue;
    cents += c.amountCents; count++;
    const name = String(row.merchant_name || row.merchant || 'Unknown');
    const m = merchants.get(name) ?? { cents: 0, count: 0 };
    m.cents += c.amountCents; m.count++;
    merchants.set(name, m);
  }
  const topMerchants = [...merchants.entries()]
    .map(([merchant, m]) => ({ merchant, total: m.cents / 100, count: m.count }))
    .sort((a, b) => b.total - a.total);
  return {
    total: cents / 100,
    count,
    average: count > 0 ? Math.round(cents / count) / 100 : 0,
    topMerchants,
    refunds: refundCents / 100,
    queryStatus: count === 0 ? 'verified_zero' : 'verified',
    definition,
  };
}

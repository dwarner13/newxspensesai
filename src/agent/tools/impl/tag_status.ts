/**
 * COLLAB-2a — tag_status: read-only Prime → Tag consultation.
 *
 * Returns Tag's categorization state for the signed-in customer: category counts by source,
 * needs-review count, recent corrections, and suspected misclassifications (Tag's own review
 * rules), for an explicit scope. Identity is ctx.userId only (server-verified); every query is
 * filtered by it. No writes of any kind. Logs carry counts and status only — never merchant names.
 */

import { z } from 'zod';
import { Result, Ok } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import { resolveTagStatusScope, summarizeTagStatus, type TagStatusRow } from '../../../shared/tag-status';
import { fetchTransactionCoverage, type CoverageClient } from '../../../shared/prime-data-coverage';

export const id = 'tag_status';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const inputSchema = z.object({
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  /** Where the dates came from: the customer's explicit request, or the period already established in this conversation. */
  periodSource: z.enum(['requested', 'conversation']).optional(),
  /** Explicit document context: one imported statement. Used only when no period is given. */
  importId: z.string().uuid().optional(),
}).strict();

const anomalySchema = z.object({
  kind: z.enum(['likely_miscategorized', 'inconsistent_category', 'possible_duplicate', 'possible_amount_misread']),
  merchant: z.string(),
  count: z.number(),
  currentCategory: z.string(),
  suggestedCategory: z.string().nullable(),
  reason: z.string(),
});

export const outputSchema = z.object({
  status: z.enum(['ok', 'no_transactions_in_period', 'no_imported_data', 'outside_imported_coverage', 'partial', 'query_error']),
  scope: z.object({
    source: z.enum(['requested_period', 'conversation_period', 'document', 'default_current_month']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    importId: z.string().optional(),
    label: z.string(),
    conflict: z.string().optional(),
  }),
  totals: z.object({ transactionCount: z.number(), categorized: z.number(), uncategorized: z.number(), otherCount: z.number() }),
  provenance: z.object({ customer_confirmed: z.number(), possibly_customer_approved: z.number(), automatic: z.number(), needs_review: z.number(), unknown: z.number() }),
  needsReviewCount: z.number(),
  protectedFromProposals: z.number(),
  recentCorrections: z.object({ available: z.boolean(), count: z.number(), topMerchants: z.array(z.string()) }),
  anomalies: z.array(anomalySchema),
  coverage: z.object({ earliestDate: z.string().nullable(), latestDate: z.string().nullable() }).nullable(),
  caveats: z.array(z.string()),
  readOnly: z.literal(true),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export const MAX_ROWS = 5000;
const FEEDBACK_DAYS = 90;

export async function execute(
  input: Input,
  ctx: { userId: string; now?: () => Date },
): Promise<Result<Output>> {
  const now = ctx.now ? ctx.now() : new Date();
  const scope = resolveTagStatusScope(input, now);
  const userId = ctx.userId;
  if (!userId) {
    return Ok(summarizeTagStatus({ scope, rows: null, queryFailed: true, capped: false, userHasAnyTransactions: null, coverage: null, feedbackMerchants: null }));
  }

  const sb = getSupabaseServerClient();

  let rows: TagStatusRow[] | null = null;
  let capped = false;
  try {
    let q = sb
      .from('transactions')
      .select('id, merchant_name, category, category_source, amount, date')
      .eq('user_id', userId);
    if (scope.startDate && scope.endDate) q = q.gte('date', scope.startDate).lte('date', scope.endDate);
    if (scope.importId) q = q.eq('import_id', scope.importId);
    const { data, error } = await q.limit(MAX_ROWS + 1);
    if (!error && Array.isArray(data)) {
      capped = data.length > MAX_ROWS;
      rows = (data as TagStatusRow[]).slice(0, MAX_ROWS);
    }
  } catch {
    rows = null;
  }

  let feedbackMerchants: string[] | null = null;
  try {
    const since = new Date(now.getTime() - FEEDBACK_DAYS * 86_400_000).toISOString();
    const { data, error } = await sb
      .from('tag_category_feedback')
      .select('merchant')
      .eq('user_id', userId)
      .gte('created_at', since)
      .limit(500);
    if (!error && Array.isArray(data)) feedbackMerchants = data.map((r: { merchant?: unknown }) => (typeof r.merchant === 'string' ? r.merchant : '')).filter(Boolean);
  } catch {
    feedbackMerchants = null;
  }

  const coverage = rows && rows.length === 0 ? await fetchTransactionCoverage(sb as unknown as CoverageClient, userId) : null;

  const status = summarizeTagStatus({
    scope,
    rows,
    queryFailed: rows === null,
    capped,
    userHasAnyTransactions: coverage ? coverage.transactionCount > 0 : (rows && rows.length > 0 ? true : null),
    coverage: coverage ? { earliestDate: coverage.earliestDate, latestDate: coverage.latestDate } : null,
    feedbackMerchants,
  });

  // Counts and status only — never merchant names or amounts.
  console.log(`[tag_status] status=${status.status} scope=${status.scope.source} rows=${status.totals.transactionCount} anomalies=${status.anomalies.length}`);
  return Ok(status);
}

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
import { pagedSelectAll } from '../../../shared/paged-select';

export const id = 'tag_status';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const inputSchema = z.object({
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  /** Where the dates came from: the customer's explicit request, or the period already established in this conversation. */
  periodSource: z.enum(['requested', 'conversation']).optional(),
  /** Explicit document context: one imported statement. Used only when no period is given. */
  importId: z.string().uuid().optional(),
  /**
   * P-LIVE-02: the customer asked about every imported transaction ("all I've ever uploaded",
   * "entire history"). Also the default when no period or statement is given.
   */
  allHistory: z.boolean().optional(),
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
    source: z.enum(['requested_period', 'conversation_period', 'document', 'all_history', 'default_current_month']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    importId: z.string().optional(),
    label: z.string(),
    conflict: z.string().optional(),
  }),
  totals: z.object({ transactionCount: z.number(), categorized: z.number(), uncategorized: z.number(), otherCount: z.number() }),
  provenance: z.object({ verified_customer: z.number(), protected_unverified: z.number(), automatic: z.number(), needs_review: z.number(), unknown: z.number() }),
  needsReviewCount: z.number(),
  needsReview: z.object({
    complete: z.boolean(), count: z.number().nullable(),
    inflow: z.object({ count: z.number(), cents: z.number() }).nullable(),
    outflow: z.object({ count: z.number(), cents: z.number() }).nullable(),
    unclassified: z.object({ count: z.number(), cents: z.number() }).nullable(),
    netCents: z.number().nullable(), rowIds: z.array(z.string()), rowIdsTruncated: z.boolean(),
  }).optional(),
  protectedFromProposals: z.number(),
  recentCorrections: z.object({ available: z.boolean(), count: z.number(), topMerchants: z.array(z.string()), windowDays: z.number().nullable().optional() }),
  completedActions: z.object({ available: z.boolean(), count: z.number(), byType: z.record(z.number()), windowDays: z.number().nullable() }).optional(),
  anomalies: z.array(anomalySchema),
  coverage: z.object({ earliestDate: z.string().nullable(), latestDate: z.string().nullable() }).nullable(),
  caveats: z.array(z.string()),
  readOnly: z.literal(true),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/** Hard ceiling for one consultation; reads are paged (the hosted API returns at most 1,000 rows per request). */
export const MAX_ROWS = 20_000;
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
  // P-LIVE-02: complete, ordered, paged read. The previous single limited read was silently cut
  // to 1,000 rows by the API and still reported "not capped".
  const read = await pagedSelectAll<TagStatusRow>(() => {
    let q = sb
      .from('transactions')
      .select('id, merchant_name, category, category_source, amount, date, type, subcategory')
      .eq('user_id', userId);
    if (scope.startDate && scope.endDate) q = q.gte('date', scope.startDate).lte('date', scope.endDate);
    if (scope.importId) q = q.eq('import_id', scope.importId);
    return q.order('date', { ascending: true }).order('id', { ascending: true });
  }, { maxRows: MAX_ROWS });
  if (!read.error) {
    rows = read.rows;
    capped = read.truncated;
  }

  // Completed corrections recorded by Tag. All time for an all-history question, otherwise the
  // last FEEDBACK_DAYS days. Paged; failure is reported honestly (never guessed).
  let feedbackMerchants: string[] | null = null;
  const feedbackWindowDays: number | null = scope.source === 'all_history' ? null : FEEDBACK_DAYS;
  const since = new Date(now.getTime() - FEEDBACK_DAYS * 86_400_000).toISOString();
  const readFeedback = (withId: boolean) => pagedSelectAll<{ id?: unknown; merchant?: unknown }>(() => {
    let q = sb.from('tag_category_feedback').select(withId ? 'id, merchant' : 'merchant').eq('user_id', userId);
    if (feedbackWindowDays !== null) q = q.gte('created_at', since);
    q = q.order('created_at', { ascending: true });
    return withId ? q.order('id', { ascending: true }) : q;
  }, { maxRows: MAX_ROWS });
  // The live schema of this table is not reproducible from git: fall back to no id column
  // (ordered by created_at only) rather than report the history as unavailable.
  let fb = await readFeedback(true);
  if (fb.error && /column|42703|does not exist/i.test(fb.error)) fb = await readFeedback(false);
  if (!fb.error) {
    feedbackMerchants = fb.rows.map(r => (typeof r.merchant === 'string' ? r.merchant : '')).filter(Boolean);
  }

  // Completed Tag actions (owner 2026-11-25: authoritative, customer-isolated correction history).
  // tag-action records every confirmed change in tag_activity_log. Only the action TYPE is read and
  // only counts leave this function: no transaction ids, amounts or conversation content.
  // Live tag_activity_log has NO action_type column (42703 — the read always failed); the stable
  // action name is stored in change_source (Tag HQ writer fix, 2026-11-26).
  let completedActionTypes: string[] | null = null;
  const act = await pagedSelectAll<{ id?: unknown; change_source?: unknown }>(() => {
    let q = sb.from('tag_activity_log').select('id, change_source').eq('user_id', userId);
    if (feedbackWindowDays !== null) q = q.gte('created_at', since);
    return q.order('created_at', { ascending: true }).order('id', { ascending: true });
  }, { maxRows: MAX_ROWS });
  if (!act.error) {
    completedActionTypes = act.rows.map(r => (typeof r.change_source === 'string' && r.change_source ? r.change_source : 'other'));
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
    feedbackWindowDays,
    completedActionTypes,
  });

  // Counts and status only — never merchant names or amounts.
  console.log(`[tag_status] status=${status.status} scope=${status.scope.source} rows=${status.totals.transactionCount} anomalies=${status.anomalies.length}`);
  return Ok(status);
}

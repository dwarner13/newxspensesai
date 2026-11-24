/**
 * COLLAB-2a — read-only Prime → Tag consultation: pure scope resolution and summarization for the
 * `tag_status` tool. No I/O and no logging here (merchant names must never reach logs).
 *
 * Owner decisions (2026-11-23):
 *  - Scope precedence: explicit customer period → established conversation period → explicit
 *    document (import) context → current calendar month. The period used is always stated.
 *  - Never silently widen an empty period. Zero matching transactions, no imported data, a period
 *    outside the imported coverage, a capped (partial) read and a query failure are distinct.
 *  - Read-only: findings are proposals; customer-confirmed categories are never proposed for change.
 *  - Until C4, category-source labels are not fully reliable and must be disclosed as such.
 */

import { detectReviewIssues, type ReviewTx } from './tag-review-rules';

export type ScopeSource = 'requested_period' | 'conversation_period' | 'document' | 'default_current_month';
export type Provenance = 'customer_confirmed' | 'possibly_customer_approved' | 'automatic' | 'needs_review' | 'unknown';
export type TagStatusResult =
  | 'ok'
  | 'no_transactions_in_period'
  | 'no_imported_data'
  | 'outside_imported_coverage'
  | 'partial'
  | 'query_error';

export interface TagStatusScope {
  source: ScopeSource;
  startDate?: string;
  endDate?: string;
  importId?: string;
  label: string;
  /** Set when a requested period and a document were both referenced (never silently combined). */
  conflict?: string;
}

export const C4_PROVENANCE_CAVEAT =
  'Category-source labels are not fully reliable yet: some categories labelled as Tag rules or Tag chat may have been approved by the customer, so they are counted as possibly customer-approved and never proposed for change. Treat customer-confirmed counts as a minimum, not a guarantee.';

// Source groups follow the C4 inventory (C4_category_integrity_plan.md §0).
const CUSTOMER_SOURCES = new Set(['manual', 'manual_edit', 'user_correction', 'user_chat', 'user_edit', 'user_split', 'user_type_fix', 'user_undo', 'user_confirmed']);
// Written both by customer-approved Tag actions AND by automatic writers. Until C4 separates them,
// they are treated as possibly customer-approved: counted separately and never proposed for change.
const AMBIGUOUS_SOURCES = new Set(['tag_chat', 'tag_rule']);
const AUTOMATIC_SOURCES = new Set(['ai', 'hardcoded', 'rule', 'merchant_map', 'merchant_sweep', 'sign_conflict', 'bulk_fix', 'xlsx-spreadsheet', 'learned', 'tag_single', 'tag_bulk', 'tag_conversation', 'tag_assisted']);

export function classifyCategorySource(source: unknown): Provenance {
  const s = typeof source === 'string' ? source.trim().toLowerCase() : '';
  if (CUSTOMER_SOURCES.has(s)) return 'customer_confirmed';
  if (AMBIGUOUS_SOURCES.has(s)) return 'possibly_customer_approved';
  if (AUTOMATIC_SOURCES.has(s)) return 'automatic';
  if (s === 'needs_review') return 'needs_review';
  return 'unknown';
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function monthBounds(today: Date): { startDate: string; endDate: string; label: string } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const label = start.toLocaleDateString('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { startDate: iso(start), endDate: iso(end), label };
}

/**
 * Resolve the scope (owner precedence, Phase 2 authorization 2026-11-23):
 *   1. explicit customer-requested period (periodSource 'requested', the default for dates);
 *   2. explicitly referenced document (importId);
 *   3. period established in the conversation (periodSource 'conversation');
 *   4. current calendar month.
 * When an explicit period AND a document are both given they are never silently combined: the
 * requested period is used and `conflict` explains the distinction so Prime can clarify.
 */
export function resolveTagStatusScope(
  input: { startDate?: string; endDate?: string; periodSource?: 'requested' | 'conversation'; importId?: string },
  today: Date,
): TagStatusScope {
  const s = input.startDate && ISO.test(input.startDate) ? input.startDate : undefined;
  const e = input.endDate && ISO.test(input.endDate) ? input.endDate : undefined;
  const hasPeriod = !!(s && e && s <= e);
  const hasDocument = !!(input.importId && UUID.test(input.importId));
  const requested = hasPeriod && input.periodSource !== 'conversation';
  if (requested) {
    return {
      source: 'requested_period',
      startDate: s,
      endDate: e,
      label: `${s} through ${e}`,
      ...(hasDocument ? { conflict: 'Both a period and a specific statement were referenced. Results cover the requested period only, not the statement; ask which one the customer meant if it matters.' } : {}),
    };
  }
  if (hasDocument) {
    return { source: 'document', importId: input.importId, label: 'the selected imported statement' };
  }
  if (hasPeriod) {
    return { source: 'conversation_period', startDate: s, endDate: e, label: `${s} through ${e}` };
  }
  const m = monthBounds(today);
  return { source: 'default_current_month', startDate: m.startDate, endDate: m.endDate, label: `${m.label} (current month — no period was given)` };
}

export interface TagStatusRow {
  id: string;
  merchant_name: string | null;
  category: string | null;
  category_source: string | null;
  amount: number | null;
  date: string | null;
}

export interface TagStatusAnomaly {
  kind: 'likely_miscategorized' | 'inconsistent_category' | 'possible_duplicate' | 'possible_amount_misread';
  merchant: string;
  count: number;
  currentCategory: string;
  suggestedCategory: string | null;
  reason: string;
}

export interface TagStatus {
  status: TagStatusResult;
  scope: TagStatusScope;
  totals: { transactionCount: number; categorized: number; uncategorized: number; otherCount: number };
  provenance: Record<Provenance, number>;
  needsReviewCount: number;
  protectedFromProposals: number;
  recentCorrections: { available: boolean; count: number; topMerchants: string[] };
  anomalies: TagStatusAnomaly[];
  coverage: { earliestDate: string | null; latestDate: string | null } | null;
  caveats: string[];
  readOnly: true;
}

const MAX_ANOMALIES = 10;
const MAX_TOP_MERCHANTS = 5;
const UNCATEGORIZED = new Set(['', 'uncategorized', 'unknown']);

function anomalyKind(issueType: string | undefined, reason: string, current: string, suggested: string): TagStatusAnomaly['kind'] {
  if (issueType === 'amount_anomaly') return 'possible_amount_misread';
  if (/likely a parsing duplicate/.test(reason)) return 'possible_duplicate';
  if (/^Inconsistent/.test(reason)) return 'inconsistent_category';
  return current === suggested ? 'possible_duplicate' : 'likely_miscategorized';
}

export function summarizeTagStatus(input: {
  scope: TagStatusScope;
  rows: TagStatusRow[] | null;
  queryFailed: boolean;
  capped: boolean;
  userHasAnyTransactions: boolean | null;
  coverage: { earliestDate: string | null; latestDate: string | null } | null;
  feedbackMerchants: string[] | null;
}): TagStatus {
  const { scope } = input;
  const empty: TagStatus = {
    status: 'query_error',
    scope,
    totals: { transactionCount: 0, categorized: 0, uncategorized: 0, otherCount: 0 },
    provenance: { customer_confirmed: 0, possibly_customer_approved: 0, automatic: 0, needs_review: 0, unknown: 0 },
    needsReviewCount: 0,
    protectedFromProposals: 0,
    recentCorrections: { available: false, count: 0, topMerchants: [] },
    anomalies: [],
    coverage: input.coverage,
    caveats: [C4_PROVENANCE_CAVEAT],
    readOnly: true,
  };
  if (input.queryFailed || !input.rows) {
    return { ...empty, caveats: ['Tag data could not be retrieved; do not guess categorization status.', C4_PROVENANCE_CAVEAT] };
  }

  const rows = input.rows;
  const provenance: Record<Provenance, number> = { customer_confirmed: 0, possibly_customer_approved: 0, automatic: 0, needs_review: 0, unknown: 0 };
  let uncategorized = 0;
  let otherCount = 0;
  for (const r of rows) {
    provenance[classifyCategorySource(r.category_source)]++;
    const c = (r.category ?? '').trim().toLowerCase();
    if (UNCATEGORIZED.has(c)) uncategorized++;
    else if (c === 'other') otherCount++;
  }

  // Customer-confirmed and possibly-customer-approved rows are never proposed for change (owner rule;
  // C4 will make the distinction authoritative).
  const proposable: ReviewTx[] = rows
    .filter(r => { const p = classifyCategorySource(r.category_source); return p !== 'customer_confirmed' && p !== 'possibly_customer_approved'; })
    .map(r => ({
      id: r.id,
      merchant_name: r.merchant_name ?? '',
      category: r.category ?? '',
      amount: Number(r.amount ?? 0),
      posted_at: r.date ?? '',
    }));
  let n = 0;
  const issues = detectReviewIssues(proposable, () => `i${++n}`);
  const anomalies: TagStatusAnomaly[] = issues.slice(0, MAX_ANOMALIES).map(i => {
    const kind = anomalyKind(i.issueType, i.reason, i.currentCategory, i.suggestedCategory);
    return {
      kind,
      merchant: i.merchant,
      count: i.count,
      currentCategory: i.currentCategory,
      suggestedCategory: kind === 'likely_miscategorized' || kind === 'inconsistent_category' ? i.suggestedCategory : null,
      // Reasons from the rules may contain amounts/dates (duplicates, misreads); keep a neutral reason instead.
      reason: kind === 'possible_duplicate' ? 'Several identical transactions on the same day — possibly imported twice.'
        : kind === 'possible_amount_misread' ? 'This amount is far above what is typical for this merchant — possibly misread from the statement.'
        : i.reason,
    };
  });

  const feedback = input.feedbackMerchants;
  const counts = new Map<string, number>();
  for (const m of feedback ?? []) {
    const k = (m || '').trim();
    if (k) counts.set(k, (counts.get(k) || 0) + 1);
  }
  const topMerchants = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_TOP_MERCHANTS).map(([m]) => m);

  const caveats = [C4_PROVENANCE_CAVEAT];
  let status: TagStatusResult = 'ok';
  if (rows.length === 0) {
    if (input.userHasAnyTransactions === false) status = 'no_imported_data';
    else if (scope.startDate && scope.endDate && input.coverage?.latestDate && input.coverage.earliestDate
      && (scope.startDate > input.coverage.latestDate || scope.endDate < input.coverage.earliestDate)) status = 'outside_imported_coverage';
    else status = 'no_transactions_in_period';
    caveats.push('No transactions matched this scope. Do not widen the period on your own; state the period and, if useful, the imported coverage.');
  } else if (input.capped) {
    status = 'partial';
    caveats.push('Only part of this period was scanned (row limit reached); counts are minimums.');
  }
  if (scope.source === 'default_current_month') caveats.push('No period was given, so the current calendar month was used. Say so.');
  if (scope.conflict) caveats.push(scope.conflict);
  if (feedback === null) caveats.push('Recent correction history could not be retrieved.');

  return {
    status,
    scope,
    totals: { transactionCount: rows.length, categorized: rows.length - uncategorized, uncategorized, otherCount },
    provenance,
    needsReviewCount: provenance.needs_review,
    protectedFromProposals: provenance.customer_confirmed + provenance.possibly_customer_approved,
    recentCorrections: { available: feedback !== null, count: feedback?.length ?? 0, topMerchants },
    anomalies,
    coverage: input.coverage,
    caveats,
    readOnly: true,
  };
}

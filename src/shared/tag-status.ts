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
 *
 * P-LIVE-02 (owner, 2026-11-25): categorization status is about OUTSTANDING work, so with no
 * explicit period or statement the scope is ALL imported transactions ('all_history'), never the
 * current month. An explicit all-history request also beats a conversation period.
 *  - Until C4, category-source labels are not fully reliable and must be disclosed as such.
 */

import { detectReviewIssues, type ReviewTx } from './tag-review-rules';

export type ScopeSource = 'requested_period' | 'conversation_period' | 'document' | 'all_history' | 'default_current_month';
/**
 * Owner GO 2026-11-25 (FINAL RELIABILITY CORRECTIONS item 3; shared definitions agreed with Tag HQ
 * and AI Architecture HQ): PROTECTED is not the same as CUSTOMER-APPROVED.
 *  - verified_customer: set by the customer directly in the app (single edit, split, type fix).
 *  - protected_unverified: protected from automatic change, but the origin is not verified
 *    (historical corrections, manual entries, Tag rules, Tag chat). Never described as customer-approved.
 */
export type Provenance = 'verified_customer' | 'protected_unverified' | 'automatic' | 'needs_review' | 'unknown';
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
  'Only categories the customer set directly in the app (an edit, a split or a type fix) count as verified customer choices. Other protected categories (older corrections, manual entries, Tag rules, Tag chat) are never changed automatically or proposed for change, but their origin is not verified: never describe them as customer-approved. The verified count is a minimum, not a guarantee.';

// Shared provenance definitions (owner GO 2026-11-25; Tag HQ + AI Architecture HQ concur).
/** Written only by a customer action in the app, verified server-side. */
export const VERIFIED_CUSTOMER_SOURCES: ReadonlySet<string> = new Set(['user_edit', 'user_split', 'user_type_fix']);
/** Never changed by automatic writers. Superset of VERIFIED; the rest is "protected (origin unverified)". */
export const PROTECTED_SOURCES: ReadonlySet<string> = new Set([
  ...VERIFIED_CUSTOMER_SOURCES,
  'tag_rule', 'tag_chat', 'user_correction', 'user_chat', 'user_undo', 'manual', 'manual_edit', 'user_confirmed',
]);
/** True when a category source must never be changed automatically or proposed for change. */
export function isProtectedSource(source: unknown): boolean {
  return typeof source === 'string' && PROTECTED_SOURCES.has(source.trim().toLowerCase());
}

// DEPRECATED aliases (no behaviour change; CUSTOMER_SOURCES ∪ AMBIGUOUS_SOURCES === PROTECTED_SOURCES).
// Use PROTECTED_SOURCES for protection and VERIFIED_CUSTOMER_SOURCES for "customer-approved" wording.
// Source groups follow the C4 inventory (C4_category_integrity_plan.md §0).
/** @deprecated use PROTECTED_SOURCES / VERIFIED_CUSTOMER_SOURCES */
export const CUSTOMER_SOURCES: ReadonlySet<string> = new Set(['manual', 'manual_edit', 'user_correction', 'user_chat', 'user_edit', 'user_split', 'user_type_fix', 'user_undo', 'user_confirmed']);
// Written both by customer-approved Tag actions AND by automatic writers. Until C4 separates them,
// they are treated as possibly customer-approved: counted separately and never proposed for change.
/** @deprecated use PROTECTED_SOURCES */
export const AMBIGUOUS_SOURCES: ReadonlySet<string> = new Set(['tag_chat', 'tag_rule']);
const AUTOMATIC_SOURCES = new Set(['ai', 'hardcoded', 'rule', 'merchant_map', 'merchant_sweep', 'sign_conflict', 'bulk_fix', 'xlsx-spreadsheet', 'learned', 'tag_single', 'tag_bulk', 'tag_conversation', 'tag_assisted']);

export function classifyCategorySource(source: unknown): Provenance {
  const s = typeof source === 'string' ? source.trim().toLowerCase() : '';
  if (VERIFIED_CUSTOMER_SOURCES.has(s)) return 'verified_customer';
  if (PROTECTED_SOURCES.has(s)) return 'protected_unverified';
  if (AUTOMATIC_SOURCES.has(s)) return 'automatic';
  if (s === 'needs_review') return 'needs_review';
  return 'unknown';
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the scope (owner precedence, Phase 2 authorization 2026-11-23):
 *   1. explicit customer-requested period (periodSource 'requested', the default for dates);
 *   2. an explicit all-history request (allHistory) — P-LIVE-02, beats 3 and 4;
 *   3. explicitly referenced document (importId);
 *   4. period established in the conversation (periodSource 'conversation');
 *   5. otherwise ALL imported transactions (P-LIVE-02; was: current calendar month).
 * When an explicit period AND a document are both given they are never silently combined: the
 * requested period is used and `conflict` explains the distinction so Prime can clarify.
 */
export function resolveTagStatusScope(
  input: { startDate?: string; endDate?: string; periodSource?: 'requested' | 'conversation'; importId?: string; allHistory?: boolean },
  _today: Date,
): TagStatusScope {
  // P-LIVE-02: the date no longer decides the scope (no current-month fallback); the parameter is
  // kept so existing callers are unchanged.
  void _today;
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
  // An explicit all-history request beats a statement or a period carried over from the conversation.
  if (input.allHistory) {
    return { source: 'all_history', label: ALL_HISTORY_LABEL };
  }
  if (hasDocument) {
    return { source: 'document', importId: input.importId, label: 'the selected imported statement' };
  }
  if (hasPeriod) {
    return { source: 'conversation_period', startDate: s, endDate: e, label: `${s} through ${e}` };
  }
  // P-LIVE-02: no period and no statement → all outstanding work (all imported transactions).
  return { source: 'all_history', label: ALL_HISTORY_LABEL };
}

export const ALL_HISTORY_LABEL = 'all imported transactions (entire history)';

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
  /**
   * Completed corrections recorded by Tag (tag_category_feedback). windowDays null = all time.
   * These are stored correction records, separate from conversation history.
   */
  recentCorrections: { available: boolean; count: number; topMerchants: string[]; windowDays?: number | null };
  /**
   * Completed Tag actions recorded by tag-action (tag_activity_log): counts by action type only.
   * Customer-isolated; no ids, amounts or conversation content. Absent when not read.
   */
  completedActions?: { available: boolean; count: number; byType: Record<string, number>; windowDays: number | null };
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
  /** Window of the correction records: days, or null for all time. */
  feedbackWindowDays?: number | null;
  /** Action types of completed Tag actions in the window; null = could not be read; undefined = not read. */
  completedActionTypes?: string[] | null;
}): TagStatus {
  const { scope } = input;
  const empty: TagStatus = {
    status: 'query_error',
    scope,
    totals: { transactionCount: 0, categorized: 0, uncategorized: 0, otherCount: 0 },
    provenance: { verified_customer: 0, protected_unverified: 0, automatic: 0, needs_review: 0, unknown: 0 },
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
  const provenance: Record<Provenance, number> = { verified_customer: 0, protected_unverified: 0, automatic: 0, needs_review: 0, unknown: 0 };
  let uncategorized = 0;
  let otherCount = 0;
  for (const r of rows) {
    provenance[classifyCategorySource(r.category_source)]++;
    const c = (r.category ?? '').trim().toLowerCase();
    if (UNCATEGORIZED.has(c)) uncategorized++;
    else if (c === 'other') otherCount++;
  }

  // Protected rows (verified customer choices AND protected rows of unverified origin) are never
  // proposed for change (owner rule).
  const proposable: ReviewTx[] = rows
    .filter(r => { const p = classifyCategorySource(r.category_source); return p !== 'verified_customer' && p !== 'protected_unverified'; })
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
  if (scope.source === 'all_history') caveats.push('Scope is every imported transaction (entire history). Say so; do not narrow it to a month or ask permission to widen it.');
  if (scope.conflict) caveats.push(scope.conflict);
  if (feedback === null) caveats.push("Tag's correction history could not be retrieved, so completed corrections cannot be listed. Customer-confirmed categories stored on the transactions are still counted. Say this limitation plainly.");

  return {
    status,
    scope,
    totals: { transactionCount: rows.length, categorized: rows.length - uncategorized, uncategorized, otherCount },
    provenance,
    needsReviewCount: provenance.needs_review,
    protectedFromProposals: provenance.verified_customer + provenance.protected_unverified,
    recentCorrections: { available: feedback !== null, count: feedback?.length ?? 0, topMerchants, windowDays: input.feedbackWindowDays === undefined ? 90 : input.feedbackWindowDays },
    ...(input.completedActionTypes === undefined ? {} : {
      completedActions: {
        available: input.completedActionTypes !== null,
        count: input.completedActionTypes?.length ?? 0,
        byType: (input.completedActionTypes ?? []).reduce<Record<string, number>>((m, t) => { m[t] = (m[t] || 0) + 1; return m; }, {}),
        windowDays: input.feedbackWindowDays === undefined ? 90 : input.feedbackWindowDays,
      },
    }),
    anomalies,
    coverage: input.coverage,
    caveats,
    readOnly: true,
  };
}

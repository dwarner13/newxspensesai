/**
 * MERCHANT SCOPE ROW SET (P3.2B2C parity repair)
 *
 * ONE implementation of "which transactions belong to a merchant analysis scope",
 * shared by:
 *   1. merchant_totals            — aggregates the row set into group totals
 *   2. tx-search merchantScope    — returns the same row set as verified rows
 *                                   for the B2C "show me those transactions" bridge
 *
 * Semantics (identical for both callers):
 *   - user ownership:   transactions.user_id = verified userId
 *   - merchant match:   merchant_name ILIKE %q% OR merchant ILIKE %q%
 *   - dates:            the `date` column (never posted_at)
 *   - category / type:  exact equality when provided
 *   - non-spend:        excluded unless a category or type filter is explicit
 *   - group identity:   merchantGroupingKey(merchant_name || merchant || 'Unknown')
 *   - include/exclude:  exact equality on normalized group keys (null-safe —
 *                       grouping happens in code, not via SQL NOT ILIKE)
 *   - ordering:         date DESC, id DESC (deterministic ordinals)
 *
 * The row set defines SCOPE only. Transaction identity still comes from the
 * verified DB rows and the P3.3C ownership gate.
 */

import { merchantGroupingKey } from '../../netlify/functions/_shared/merchantNormalize';
import { isNonSpendCategory } from './financial-taxonomy';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MerchantScope {
  /** Merchant filter (ILIKE on merchant_name / merchant). Omitted = all merchants. */
  merchantQuery?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  type?: 'expense' | 'income';
  /** When provided, only rows whose group key is listed are kept. */
  includeGroups?: string[];
  /** Rows whose group key is listed are removed (exact equality). */
  excludeGroups?: string[];
}

export interface MerchantScopeRow {
  id: string;
  merchant_name?: string | null;
  merchant?: string | null;
  amount?: number | null;
  date?: string | null;
  category?: string | null;
  type?: string | null;
  [column: string]: unknown;
}

export type ScopedRow<T extends MerchantScopeRow = MerchantScopeRow> = T & { groupKey: string };

export interface MerchantEvidenceFingerprint {
  count: number;
  /** Sum of |amount|, rounded to cents (merchant_totals spend semantics). */
  total: number;
  /** Stable hash of the sorted transaction id set. */
  idsHash: string;
}

export type MerchantEvidenceParity =
  | { status: 'match'; expected: MerchantEvidenceFingerprint; actual: MerchantEvidenceFingerprint }
  | { status: 'mismatch'; expected: MerchantEvidenceFingerprint; actual: MerchantEvidenceFingerprint }
  | { status: 'unverified'; expected: null; actual: MerchantEvidenceFingerprint };

/** Minimal query-builder surface used by fetchMerchantScopeRows (Supabase-compatible). */
export interface MerchantScopeQuery extends PromiseLike<{ data: unknown; error: { message?: string } | null }> {
  eq(column: string, value: unknown): MerchantScopeQuery;
  gte(column: string, value: unknown): MerchantScopeQuery;
  lte(column: string, value: unknown): MerchantScopeQuery;
  or(filters: string): MerchantScopeQuery;
  limit(count: number): MerchantScopeQuery;
}

export interface MerchantScopeClient {
  from(table: string): { select(columns: string): MerchantScopeQuery };
}

/**
 * Maximum rows fetched before in-code scoping. If the query returns exactly
 * this many rows the set is treated as potentially truncated.
 */
export const MERCHANT_SCOPE_ROW_FETCH_LIMIT = 5000;

/** Columns every caller needs (merchant_totals' original set + id). */
export const MERCHANT_SCOPE_BASE_COLUMNS = ['id', 'merchant_name', 'merchant', 'amount', 'date', 'category', 'type'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the merchant superset for a scope. Group include/exclude and non-spend
 * filtering are NOT applied here — call applyMerchantScope on the result.
 */
export async function fetchMerchantScopeRows(
  sb: MerchantScopeClient,
  userId: string,
  scope: MerchantScope,
  extraColumns: string[] = [],
): Promise<{ rows: MerchantScopeRow[]; truncated: boolean; error: string | null }> {
  const columns = Array.from(new Set([...MERCHANT_SCOPE_BASE_COLUMNS, ...extraColumns])).join(', ');
  let query = sb.from('transactions').select(columns).eq('user_id', userId);

  if (scope.startDate) query = query.gte('date', scope.startDate);
  if (scope.endDate) query = query.lte('date', scope.endDate);
  if (scope.merchantQuery) {
    query = query.or(
      `merchant_name.ilike.%${scope.merchantQuery}%,merchant.ilike.%${scope.merchantQuery}%`,
    );
  }
  if (scope.category) query = query.eq('category', scope.category);
  if (scope.type) query = query.eq('type', scope.type);

  query = query.limit(MERCHANT_SCOPE_ROW_FETCH_LIMIT);

  const { data, error } = await query;
  if (error) return { rows: [], truncated: false, error: error.message || 'query_error' };
  const rows = Array.isArray(data) ? (data as MerchantScopeRow[]) : [];
  return { rows, truncated: rows.length >= MERCHANT_SCOPE_ROW_FETCH_LIMIT, error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPING (pure)
// ─────────────────────────────────────────────────────────────────────────────

/** Group key used by merchant analysis. Null-safe: merchant_name, then merchant. */
export function merchantRowGroupKey(row: Pick<MerchantScopeRow, 'merchant_name' | 'merchant'>): string {
  return merchantGroupingKey(row.merchant_name || row.merchant || 'Unknown');
}

/** Deterministic evidence ordering: date DESC, then id DESC. */
export function compareMerchantScopeRows(a: MerchantScopeRow, b: MerchantScopeRow): number {
  const da = a.date || '';
  const db = b.date || '';
  if (da !== db) return da < db ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/**
 * Apply merchant-analysis scope semantics to fetched rows:
 * non-spend filter, exact group include/exclude, deterministic ordering.
 */
export function applyMerchantScope<T extends MerchantScopeRow>(
  rows: T[],
  scope: Pick<MerchantScope, 'category' | 'type' | 'includeGroups' | 'excludeGroups'>,
): ScopedRow<T>[] {
  const dropNonSpend = !scope.type && !scope.category;
  const include = scope.includeGroups && scope.includeGroups.length > 0 ? new Set(scope.includeGroups) : null;
  const exclude = new Set(scope.excludeGroups || []);
  return rows
    .filter(r => !(dropNonSpend && isNonSpendCategory(r.category)))
    .map(r => ({ ...r, groupKey: merchantRowGroupKey(r) }))
    .filter(r => !exclude.has(r.groupKey) && (!include || include.has(r.groupKey)))
    .sort(compareMerchantScopeRows);
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE FINGERPRINT + PARITY
// ─────────────────────────────────────────────────────────────────────────────

/** FNV-1a 32-bit over a string, hex. Deterministic and dependency-free. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function merchantEvidenceFingerprint(rows: Array<Pick<MerchantScopeRow, 'id' | 'amount'>>): MerchantEvidenceFingerprint {
  const ids = rows.map(r => String(r.id)).sort();
  const total = rows.reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0);
  return {
    count: rows.length,
    total: Math.round(total * 100) / 100,
    idsHash: fnv1a(ids.join(',')),
  };
}

export function compareMerchantEvidence(
  expected: MerchantEvidenceFingerprint | null | undefined,
  actual: MerchantEvidenceFingerprint,
): MerchantEvidenceParity {
  if (!expected) return { status: 'unverified', expected: null, actual };
  const same = expected.count === actual.count
    && Math.abs(expected.total - actual.total) < 0.005
    && expected.idsHash === actual.idsHash;
  return same ? { status: 'match', expected, actual } : { status: 'mismatch', expected, actual };
}

// ─────────────────────────────────────────────────────────────────────────────
// B2C BRIDGE (scope translation + completeness disclosure)
// ─────────────────────────────────────────────────────────────────────────────

export interface MerchantScopeContextLike {
  merchantQuery: string;
  activeGroups: Array<{ groupingKey: string }>;
  excludedGroups: string[];
  temporalScope: { startDate: string; endDate: string } | null;
  categoryFilter: string | null;
}

/**
 * Category scope from a merchant analysis context. Only an exact string is a valid
 * scope — older contexts may hold a non-string value, which is ignored (undefined).
 */
export function merchantCategoryScope(categoryFilter: unknown): string | undefined {
  return typeof categoryFilter === 'string' && categoryFilter ? categoryFilter : undefined;
}

/** Bridge result cap (matches tx_search schema max). */
export const B2C_BRIDGE_LIMIT = 200;

/**
 * Translate a MerchantAnalysisContext into tx_search args that request the SAME
 * merchant row set merchant_totals aggregated (scope only — no identity).
 */
export function buildMerchantBridgeArgs(mac: MerchantScopeContextLike): {
  merchantScope: MerchantScope;
  limit: number;
} {
  const excludeGroups = mac.excludedGroups.filter(k => typeof k === 'string' && k.trim().length > 0).map(k => k.trim());
  const excludeSet = new Set(excludeGroups);
  const includeGroups = mac.activeGroups
    .map(g => g.groupingKey)
    .filter(k => typeof k === 'string' && k.length > 0 && !excludeSet.has(k));
  const merchantScope: MerchantScope = { merchantQuery: mac.merchantQuery };
  if (mac.temporalScope?.startDate) merchantScope.startDate = mac.temporalScope.startDate;
  if (mac.temporalScope?.endDate) merchantScope.endDate = mac.temporalScope.endDate;
  const category = merchantCategoryScope(mac.categoryFilter);
  if (category) merchantScope.category = category;
  if (includeGroups.length > 0) merchantScope.includeGroups = includeGroups;
  if (excludeGroups.length > 0) merchantScope.excludeGroups = excludeGroups;
  return { merchantScope, limit: B2C_BRIDGE_LIMIT };
}

export interface B2CCompleteness {
  /** True only when retrieval provably equals the analysed evidence and nothing was cut. */
  complete: boolean;
  parity: MerchantEvidenceParity['status'];
  shown: number;
  matched: number;
  expectedCount: number | null;
  expectedTotal: number | null;
  truncated: boolean;
}

export function assessB2CCompleteness(input: {
  parity: MerchantEvidenceParity;
  shown: number;
  truncated: boolean;
}): B2CCompleteness {
  const { parity, shown, truncated } = input;
  return {
    complete: parity.status === 'match' && !truncated && shown === parity.actual.count,
    parity: parity.status,
    shown,
    matched: parity.actual.count,
    expectedCount: parity.expected ? parity.expected.count : null,
    expectedTotal: parity.expected ? parity.expected.total : null,
    truncated,
  };
}

/**
 * Assess a B2C bridge tx_search payload against the analysed evidence.
 * Complete only when: fingerprints match, nothing was truncated, and the rendered
 * card count equals the matched row count. Everything else fails safe.
 */
export function assessB2CBridgeResult(input: {
  expected: MerchantEvidenceFingerprint | null | undefined;
  payload: unknown;
  cardCount: number;
}): B2CCompleteness {
  const p = input.payload as {
    rows?: unknown;
    meta?: { merchantScope?: { truncated?: unknown; fingerprint?: MerchantEvidenceFingerprint } };
  } | null | undefined;
  const rows = Array.isArray(p?.rows) ? (p!.rows as Array<Pick<MerchantScopeRow, 'id' | 'amount'>>) : [];
  const scopeMeta = p?.meta?.merchantScope;
  const actual = scopeMeta?.fingerprint ?? merchantEvidenceFingerprint(rows);
  return assessB2CCompleteness({
    parity: compareMerchantEvidence(input.expected, actual),
    shown: input.cardCount,
    truncated: scopeMeta ? !!scopeMeta.truncated : false,
  });
}

/**
 * Model instruction for the established B2C frame. Fails safe: anything short of
 * a verified complete match forbids presenting the list as the full analysed set.
 */
export function formatB2CCompletenessInstruction(c: B2CCompleteness): string {
  if (c.complete) {
    return `${c.shown} transactions found. These are exactly the transactions in the merchant analysis you just summarized. Do NOT call tx_search — these candidates are already established and authoritative for this request.`;
  }
  const lines: string[] = [];
  if (c.parity === 'mismatch' && c.expectedCount !== null) {
    lines.push(`PARTIAL RESULT: the merchant analysis counted ${c.expectedCount} transactions totaling $${(c.expectedTotal ?? 0).toFixed(2)}, but verified retrieval returned ${c.matched} transactions${c.shown !== c.matched ? ` (showing ${c.shown})` : ''}.`);
  } else if (c.parity === 'unverified') {
    lines.push(`UNVERIFIED RESULT: ${c.shown} transactions were retrieved, but they could not be verified against the earlier merchant total.`);
  } else {
    lines.push(`PARTIAL RESULT: showing ${c.shown} of ${c.matched} matching transactions.`);
  }
  lines.push('You MUST tell the user plainly that this list may not be the complete set behind the earlier total. Do NOT describe these as "all" or "those" transactions and do NOT restate the earlier total as the total of this list.');
  lines.push('Do NOT call tx_search — these candidates are already established and authoritative for this request.');
  return lines.join('\n');
}

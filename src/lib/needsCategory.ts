/**
 * Owner-approved review rule (2026-11-25): a transaction needs review when it has no
 * category or is 'Uncategorized'. A customer-approved 'Other' is NOT uncategorized.
 * The single predicate for every count, filter and banner on Categories and Transactions,
 * so they always agree. Expanded review states and bulk corrections wait for C4.
 */
export function needsCategory(category: string | null | undefined): boolean {
  const c = (category ?? '').trim().toLowerCase();
  // REVIEW-2 (2026-11-26): a row labelled 'Needs Review' is not a category the customer
  // chose; it literally says it needs review. Counting it stops "All transactions have a
  // category" from appearing beside rows that read 'Needs Review' (seen in BYTE-LIVE-01).
  return c === '' || c === 'uncategorized' || c === 'needs review';
}

/** The same rule as a Supabase `.or()` filter, for server-side counts. */
export const NEEDS_CATEGORY_OR_FILTER = 'category.is.null,category.eq.,category.ilike.uncategorized,category.ilike.needs review';

export function countNeedsCategory(rows: ReadonlyArray<{ category?: string | null }>): number {
  let n = 0;
  for (const r of rows) if (needsCategory(r.category)) n++;
  return n;
}

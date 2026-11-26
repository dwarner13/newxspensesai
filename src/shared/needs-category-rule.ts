/**
 * The ONE review rule (owner-approved 2026-11-25; 'Needs Review' refinement owner-confirmed
 * 2026-11-26). Shared by the server (financial-summary needsReviewCount / needs_review insight) and the
 * client (src/lib/needsCategory re-exports this at integration), so every count agrees.
 * A transaction needs review when it has no category, 'Uncategorized' or 'Needs Review'.
 * A customer-approved 'Other' is NOT counted.
 */
export function needsCategory(category: string | null | undefined): boolean {
  const c = (category ?? '').trim().toLowerCase();
  return c === '' || c === 'uncategorized' || c === 'needs review';
}

/** The same rule as a Supabase `.or()` filter, for server-side counts. */
export const NEEDS_CATEGORY_OR_FILTER = 'category.is.null,category.eq.,category.ilike.uncategorized,category.ilike.needs review';

export function countNeedsCategory(rows: ReadonlyArray<{ category?: string | null }>): number {
  let n = 0;
  for (const r of rows) if (needsCategory(r.category)) n++;
  return n;
}

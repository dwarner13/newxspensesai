/**
 * Owner-approved review rule (2026-11-25): a transaction needs review when it has no
 * category or is 'Uncategorized'. A customer-approved 'Other' is NOT uncategorized.
 * The single predicate for every count, filter and banner on Categories and Transactions,
 * so they always agree. Expanded review states and bulk corrections wait for C4.
 */
export function needsCategory(category: string | null | undefined): boolean {
  const c = (category ?? '').trim();
  return c === '' || c.toLowerCase() === 'uncategorized';
}

export function countNeedsCategory(rows: ReadonlyArray<{ category?: string | null }>): number {
  let n = 0;
  for (const r of rows) if (needsCategory(r.category)) n++;
  return n;
}

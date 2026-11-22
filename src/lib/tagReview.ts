/**
 * C2-E2A — Prime ↔ Tag navigation (no new chat engine, no event bus).
 *
 * Prime's "Review with Tag" navigates to the existing Transactions page with
 * `?tagTx=<transaction uuid>`; the page opens the existing Tag panel focused on that row
 * and offers "Back to Prime", which reopens the existing Prime panel in place.
 *
 * Only an ID travels in the URL. The page resolves it against the user's own loaded
 * transactions (or a single RLS-scoped, user-filtered read), and Tag re-reads the row
 * server-side scoped to the authenticated user before using any detail.
 */

export const TAG_REVIEW_PARAM = 'tagTx';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isTransactionUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Path that opens Tag on Transactions focused on one transaction, or null for a bad ID. */
export function buildTagReviewPath(transactionId: unknown): string | null {
  if (!isTransactionUuid(transactionId)) return null;
  return `/dashboard/transactions?${TAG_REVIEW_PARAM}=${encodeURIComponent(transactionId)}`;
}

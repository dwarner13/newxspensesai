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

/**
 * C2-E2A-F1 — bring the selected transaction into view on Transactions.
 *
 * The list is filtered (year defaults to the current year; type, statement, account, Tag
 * category/subcategory and search) and shows the first `visibleCount` rows. When the
 * selected row is hidden by the current filters, the filters that could hide it are reset
 * (year switches to the transaction's own year) — never to a different transaction.
 */
export type TxListFilters = {
  year: number | 'all';
  type: 'all' | 'expenses' | 'income';
  statement: string;
  account: string;
  category: string;
  subcategory: string;
  search: string;
};

/** Filters under which the transaction dated `txDate` is guaranteed to be listed. */
export function filtersRevealing(txDate: string | null | undefined): TxListFilters {
  const y = Number(String(txDate || '').slice(0, 4));
  return {
    year: Number.isInteger(y) && y > 1900 ? y : 'all',
    type: 'all',
    statement: 'all',
    account: 'all',
    category: '',
    subcategory: '',
    search: '',
  };
}

/** How many rows must be rendered so the row at `index` exists (keeps the current count when enough). */
export function visibleCountFor(index: number, current: number): number {
  if (index < 0) return current;
  return index < current ? current : index + 10;
}

/**
 * C3b: display-only amount label for an amount-anomaly card. Uses the signed transaction amount
 * from issue.samples[0].amount (negative = money out, positive = money in). If that is missing or
 * not a finite number, falls back to the unsigned issue.totalAmount with no sign, and if that is
 * also unusable shows 'Amount unavailable'. Pure formatting: never reads or writes data.
 */
type AnomalyAmountSource = { samples?: Array<{ amount?: unknown } | null | undefined> | null; totalAmount?: unknown } | null | undefined;
export function anomalyAmountDisplay(issue: AnomalyAmountSource): { text: string; ariaLabel: string } {
  const fmt = (n: number) =>
    `$${Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const raw = issue?.samples?.[0]?.amount;
  const signed = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (Number.isFinite(signed)) {
    if (signed < 0) return { text: `-${fmt(signed)}`, ariaLabel: `Money out: ${fmt(signed)}` };
    if (signed > 0) return { text: `+${fmt(signed)}`, ariaLabel: `Money in: ${fmt(signed)}` };
    return { text: fmt(0), ariaLabel: `Amount: ${fmt(0)}` };
  }
  const total = Number(issue?.totalAmount);
  if (issue?.totalAmount != null && Number.isFinite(total)) {
    return { text: fmt(total), ariaLabel: `Amount: ${fmt(total)}` };
  }
  return { text: 'Amount unavailable', ariaLabel: 'Amount unavailable' };
}

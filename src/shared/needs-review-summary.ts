/**
 * LA-4 (owner live acceptance 2026-11-27): the ONE served review figure, so Prime, Tag and every
 * screen state the same count AND amount for the same scope.
 *
 *  - Selection: the shared review rule only (needs-category-rule: no category / Uncategorized /
 *    Needs Review; a customer-approved 'Other' is NOT counted).
 *  - Amounts: engine integer cents split by the ENGINE direction (type decides direction). Never
 *    an absolute-value sum: a refund needing review is money coming in, not extra spending.
 *  - Rows whose type has no direction are disclosed separately (stored sign, in neither side).
 *  - Incomplete read ⇒ count and every amount are null (never a smaller number).
 *  - rowIds ordered by (date, id); capped, with a truncation flag.
 * Pure: callers pass rows from a complete engine read (readAuthoritativeLedger / fetchTransactionsInRange).
 */
import { classifyCashFlow, parseTransactionAmount } from './financial-taxonomy';
import { needsCategory } from './needs-category-rule';

export const NEEDS_REVIEW_ROW_ID_CAP = 200;

export interface NeedsReviewSide { count: number; cents: number }

export interface NeedsReviewSummary {
  /** Every transaction in scope was read. When false, every figure below is null. */
  complete: boolean;
  count: number | null;
  /** Money coming in (engine direction inflow): refunds, income, transfers in … */
  inflow: NeedsReviewSide | null;
  /** Money going out (engine direction outflow). */
  outflow: NeedsReviewSide | null;
  /** Type has no direction: in neither side; cents carry the stored sign. */
  unclassified: NeedsReviewSide | null;
  /** inflow − outflow (unclassified excluded and disclosed). */
  netCents: number | null;
  rowIds: string[];
  rowIdsTruncated: boolean;
}

type ReviewRow = { id?: unknown; date?: string | null; amount?: unknown; type?: string | null; category?: string | null; subcategory?: string | null };

export function buildNeedsReview(rows: ReadonlyArray<ReviewRow>, opts: { complete: boolean }): NeedsReviewSummary {
  if (!opts.complete) {
    return { complete: false, count: null, inflow: null, outflow: null, unclassified: null, netCents: null, rowIds: [], rowIdsTruncated: false };
  }
  const selected = rows.filter(r => needsCategory(r.category));
  const inflow: NeedsReviewSide = { count: 0, cents: 0 };
  const outflow: NeedsReviewSide = { count: 0, cents: 0 };
  const unclassified: NeedsReviewSide = { count: 0, cents: 0 };
  for (const r of selected) {
    const c = classifyCashFlow({ type: r.type ?? null, category: r.category ?? null, subcategory: r.subcategory ?? null, amount: r.amount });
    if (c.direction === 'inflow' && c.amountCents !== null) { inflow.count++; inflow.cents += c.amountCents; continue; }
    if (c.direction === 'outflow' && c.amountCents !== null) { outflow.count++; outflow.cents += c.amountCents; continue; }
    const parsed = parseTransactionAmount(r.amount);
    unclassified.count++;
    unclassified.cents += parsed === null ? 0 : Math.round(parsed * 100);
  }
  const ordered = [...selected].sort((a, b) => {
    const da = a.date ?? null; const db = b.date ?? null;
    if (da === null && db !== null) return 1;
    if (db === null && da !== null) return -1;
    return String(da ?? '').localeCompare(String(db ?? '')) || String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });
  const ids = ordered.map(r => String(r.id ?? '')).filter(Boolean);
  return {
    complete: true,
    count: selected.length,
    inflow,
    outflow,
    unclassified,
    netCents: inflow.cents - outflow.cents,
    rowIds: ids.slice(0, NEEDS_REVIEW_ROW_ID_CAP),
    rowIdsTruncated: ids.length > NEEDS_REVIEW_ROW_ID_CAP,
  };
}

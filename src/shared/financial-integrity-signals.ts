/**
 * FINANCIAL INTEGRITY SIGNALS (Financial source of truth, FST-1)
 *
 * Surfaces — never silently corrects — two things the canonical classifier
 * (classifyCashFlow) cannot decide from stored data:
 *
 *   possibleRefunds   inflow rows (type 'income') whose category is an ordinary
 *                     spending category (e.g. "Shopping"). commit-import writes
 *                     income rows with category "Income" unless a real category
 *                     was assigned, so a spending category on an inflow is the
 *                     strongest available refund/reversal signal. They remain in
 *                     income (no reclassification); the count and amount are
 *                     disclosed so a total is never presented as clean when it
 *                     may contain refunds.
 *
 *   possibleDuplicates rows identical on (date, cents, type, normalised
 *                     merchant/description) that come from TWO OR MORE
 *                     different imports — the signature of the same statement
 *                     imported twice. Repeats inside one import (two identical
 *                     coffees) are legitimate and never flagged. The rows stay
 *                     in the totals; the extra copies are counted and their
 *                     amount disclosed.
 *
 * Pure and deterministic. Tag and Prime use the same function so both
 * employees disclose the same numbers.
 */

import { amountToCents, cashFlowDirectionForType, INCOME_CATEGORIES, NON_SPEND_CATEGORY_PURPOSE } from './financial-taxonomy';

export interface SignalRow {
  id?: string | null;
  date?: string | null;
  amount?: unknown;
  type?: string | null;
  category?: string | null;
  merchant_name?: string | null;
  merchant?: string | null;
  description?: string | null;
  import_id?: string | null;
}

export interface FinancialIntegritySignals {
  possibleRefunds: { count: number; cents: number };
  /** Extra copies beyond the first, across different imports. */
  possibleDuplicates: { count: number; cents: number; groups: number };
  /** False when the rows carried no import_id, so duplicates could not be assessed. */
  duplicateCheckAvailable: boolean;
}

/** Categories that are not ordinary spending on an inflow (no refund signal). */
const NOT_A_REFUND_CATEGORY = new Set(['', 'uncategorized', 'other', 'income', 'business income', 'employment income']);

function normaliseText(row: SignalRow): string {
  return String(row.merchant_name || row.merchant || row.description || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * `merchantKey` turns merchant text into a grouping key. Pass merchantGroupingKey
 * (netlify/functions/_shared/merchantNormalize) so Prime and Tag group identically;
 * the default is a plain lower-case alphanumeric normalisation.
 */
export function computeIntegritySignals(
  rows: ReadonlyArray<SignalRow>,
  opts: { merchantKey?: (text: string) => string } = {},
): FinancialIntegritySignals {
  const keyOf = opts.merchantKey;
  let refundCount = 0;
  let refundCents = 0;
  let sawImportId = false;
  const groups = new Map<string, { imports: Set<string>; cents: number; rows: number }>();

  for (const row of rows) {
    const cents = amountToCents(row.amount);
    const direction = cashFlowDirectionForType(row.type);
    const category = (row.category || '').trim().toLowerCase();

    if (direction === 'inflow' && cents !== null
        && !NOT_A_REFUND_CATEGORY.has(category)
        && !INCOME_CATEGORIES.has(category)
        && NON_SPEND_CATEGORY_PURPOSE[category] === undefined) {
      refundCount++;
      refundCents += cents;
    }

    const date = typeof row.date === 'string' ? row.date.slice(0, 10) : '';
    const raw = String(row.merchant_name || row.merchant || row.description || '');
    const text = keyOf ? keyOf(raw) : normaliseText(row);
    if (row.import_id) sawImportId = true;
    if (!date || cents === null || !text || !row.import_id) continue;
    const key = `${date}\u0000${cents}\u0000${(row.type || '').toLowerCase()}\u0000${text}`;
    const g = groups.get(key) || { imports: new Set<string>(), cents, rows: 0 };
    g.imports.add(String(row.import_id));
    g.rows++;
    groups.set(key, g);
  }

  let dupCount = 0;
  let dupCents = 0;
  let dupGroups = 0;
  for (const g of groups.values()) {
    if (g.imports.size < 2) continue;
    // Conservative: the copies attributable to repeated imports are (imports - 1)
    // per group, never more than the extra rows present.
    const extra = Math.min(g.rows - 1, g.imports.size - 1);
    if (extra <= 0) continue;
    dupGroups++;
    dupCount += extra;
    dupCents += extra * g.cents;
  }

  return {
    possibleRefunds: { count: refundCount, cents: refundCents },
    possibleDuplicates: { count: dupCount, cents: dupCents, groups: dupGroups },
    duplicateCheckAvailable: sawImportId || rows.length === 0,
  };
}

/**
 * CANDIDATE FRAME FACTS (semantic repair, Stage 2)
 *
 * Deterministic, read-only arithmetic over the VERIFIED VISIBLE candidate frame
 * (the numbered transactions the user is shown). Prime explains these facts; it
 * does not do authoritative financial arithmetic itself.
 *
 * Semantics follow the EXISTING product convention (same as merchant_totals and
 * the candidate cards), and nothing more:
 *   - amount shown = |amount| (stored signs are not reliable debit/credit markers)
 *   - spending rows = rows whose category is NOT non-spend (isNonSpendCategory)
 *   - non-spending rows are summarized separately and never added to spending
 *   - refunds cannot be identified from stored data, so nothing is netted
 *   - no currency information exists, so no conversion is attempted
 *
 * Pure: never mutates candidates, never selects, never touches identity.
 */

import { isNonSpendCategory } from './financial-taxonomy';

/** Any visible-frame row (Layer 2 candidate or candidate card). Ordinal = index + 1. */
export interface FrameCandidateLike {
  id: string;
  merchant?: string | null;
  amount?: number | null;
  date?: string | null;
  category?: string | null;
}

export interface FrameFactRow {
  ordinal: number;
  id: string;
  merchant: string | null;
  date: string | null;
  amountCents: number;
}

export interface CandidateFrameFacts {
  /** Transactions in the visible frame. */
  count: number;
  /** Rows with a usable (finite) amount. */
  amountCount: number;
  /** Rows without a usable amount — excluded from arithmetic, never treated as zero. */
  missingAmountCount: number;
  /** Rows not in non-spend categories (product spending convention). */
  spending: { count: number; totalCents: number; averageCents: number } | null;
  /** Rows in non-spend categories (transfers, income, payments, …). Never spending. */
  nonSpending: { count: number; totalCents: number } | null;
  /** Both spending and non-spending rows present — never combine into one total. */
  mixed: boolean;
  /** Largest / smallest shown amount (|amount|); ties keep the earliest ordinal. */
  largest: FrameFactRow | null;
  smallest: FrameFactRow | null;
}

function usableCents(amount: number | null | undefined): number | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
  return Math.round(Math.abs(amount) * 100);
}

/** Summarize the visible frame in integer cents. Returns null for an empty frame. */
export function summarizeCandidateFrame(
  candidates: ReadonlyArray<FrameCandidateLike> | null | undefined,
): CandidateFrameFacts | null {
  if (!candidates || candidates.length === 0) return null;

  let amountCount = 0;
  let spendCount = 0;
  let spendCents = 0;
  let nonSpendCount = 0;
  let nonSpendCents = 0;
  let largest: FrameFactRow | null = null;
  let smallest: FrameFactRow | null = null;

  candidates.forEach((c, index) => {
    const cents = usableCents(c.amount);
    if (cents === null) return;
    amountCount++;
    if (isNonSpendCategory(c.category)) {
      nonSpendCount++;
      nonSpendCents += cents;
    } else {
      spendCount++;
      spendCents += cents;
    }
    const row: FrameFactRow = {
      ordinal: index + 1,
      id: c.id,
      merchant: c.merchant ?? null,
      date: c.date ?? null,
      amountCents: cents,
    };
    if (!largest || cents > largest.amountCents) largest = row;
    if (!smallest || cents < smallest.amountCents) smallest = row;
  });

  return {
    count: candidates.length,
    amountCount,
    missingAmountCount: candidates.length - amountCount,
    spending: spendCount > 0
      ? { count: spendCount, totalCents: spendCents, averageCents: Math.round(spendCents / spendCount) }
      : null,
    nonSpending: nonSpendCount > 0 ? { count: nonSpendCount, totalCents: nonSpendCents } : null,
    mixed: spendCount > 0 && nonSpendCount > 0,
    largest,
    smallest,
  };
}

/** $1,234.56 from integer cents (amounts as recorded; no currency conversion). */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function describeRow(r: FrameFactRow): string {
  return `#${r.ordinal}${r.merchant ? ` ${r.merchant}` : ''} ${formatCents(r.amountCents)}${r.date ? ` (${r.date})` : ''}`;
}

/** Raw tx_search totals are computed differently and must not be used for the visible frame. */
export const RAW_TX_SEARCH_TOTALS_NOTE =
  'Raw search totals (e.g. totals.sum / totals.spending) are NOT authoritative for these visible transactions — use the VERIFIED VISIBLE FRAME FACTS.';

/** The single canonical facts block given to Prime for a verified visible frame. */
export function formatCandidateFrameFacts(facts: CandidateFrameFacts | null): string {
  if (!facts) return '';
  const n = facts.count;
  const lines: string[] = [
    `VERIFIED VISIBLE FRAME FACTS (authoritative — computed in code from the ${n} transaction${n === 1 ? '' : 's'} currently shown as numbered cards, using amounts as shown and the product's spending categories; quote these, do not recalculate):`,
    `- Shown: ${n} transaction${n === 1 ? '' : 's'}${facts.missingAmountCount > 0 ? ` (${facts.missingAmountCount} without an amount — excluded from the arithmetic)` : ''}`,
  ];
  if (facts.spending) {
    lines.push(`- Spending: ${facts.spending.count} transaction${facts.spending.count === 1 ? '' : 's'}, total ${formatCents(facts.spending.totalCents)}, average ${formatCents(facts.spending.averageCents)}`);
  }
  if (facts.nonSpending) {
    lines.push(`- Non-spending categories (transfers/income/payments — NOT spending): ${facts.nonSpending.count} transaction${facts.nonSpending.count === 1 ? '' : 's'}, amounts ${formatCents(facts.nonSpending.totalCents)}`);
  }
  if (facts.mixed) {
    lines.push('- Spending and non-spending are separate. Never add them together or report one combined total.');
  }
  if (facts.largest) lines.push(`- Largest: ${describeRow(facts.largest)}`);
  if (facts.smallest) lines.push(`- Smallest: ${describeRow(facts.smallest)}`);
  lines.push(
    `Rules: When the user refers to these/those transactions and the context points to this list, answer from these facts. A stated count of ${n} matches this list. If the user states a different count, do not choose a subset — ask whether they mean all ${n} shown or a specific subset. These facts cover only the ${n} shown transactions; refunds are not netted. Set wording never selects a transaction.`,
  );
  return lines.join('\n');
}

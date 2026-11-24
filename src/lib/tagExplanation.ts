/**
 * D-5 — owner-approved accuracy wording for Tag's explanation in the transaction drawer.
 *
 * - No confidence percentage: tag-explain often synthesizes it from merchant-history
 *   counts, so it is not a verified score (owner decision: hide, invent nothing new).
 * - Merchant history is an approximate substring match capped at 100 by tag-explain, so it
 *   is shown as "About N similar transactions" or "100+ similar transactions".
 * - The category source is explained in plain words only when tag-explain reports a
 *   known source; 'unknown' shows nothing.
 * - Tax: no definitive deductibility claims; one neutral note for categories that may be
 *   tax-relevant.
 */

export type TagCategorySource = 'manual' | 'learned' | 'ai' | 'rule' | 'unknown' | string | null | undefined;

const SOURCE_TEXT: Record<string, string> = {
  manual: 'You set this category',
  rule: 'Matches a categorization rule',
  learned: 'Matches how this merchant was categorized before',
  ai: 'Suggested by Tag',
};

/** Plain-language reason from tag-explain's categorySource, or null when unknown. */
export function describeCategorySource(source: TagCategorySource): string | null {
  if (!source) return null;
  return SOURCE_TEXT[String(source)] ?? null;
}

/** tag-explain counts other transactions with a similar merchant name, capped at this limit. */
export const MERCHANT_HISTORY_CAP = 100;

/** "About N similar transactions" / "100+ similar transactions"; null when none. */
export function describeMerchantHistory(count: number | null | undefined): string | null {
  const n = Math.floor(Number(count) || 0);
  if (n <= 0) return null;
  if (n >= MERCHANT_HISTORY_CAP) return `${MERCHANT_HISTORY_CAP}+ similar transactions`;
  return `About ${n} similar transaction${n === 1 ? '' : 's'}`;
}

export const TAX_NOTE = 'Potentially tax-relevant — confirm with a tax professional.';

/**
 * Categories that previously carried a deductibility / taxable-income claim. They now show
 * only TAX_NOTE. Transfers and Savings (previously "Not deductible") show nothing.
 */
const POTENTIALLY_TAX_RELEVANT = new Set([
  'Transportation', 'Housing', 'Utilities', 'Healthcare', 'Education', 'Insurance',
  'Subscriptions', 'Bank Fees', 'Travel', 'Food & Dining', 'Shopping', 'Income', 'Debt Payments',
]);

export function isPotentiallyTaxRelevant(category: string | null | undefined): boolean {
  return !!category && POTENTIALLY_TAX_RELEVANT.has(category);
}

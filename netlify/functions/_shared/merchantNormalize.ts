export function normalizeMerchantName(input: unknown): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;

  let value = raw
    // common processor/prefix noise
    .replace(/^(sq\s*\*|pos\s+|dbt\s+purchase\s+|debit\s+purchase\s+|purchase\s+)/i, '')
    .replace(/\b(card|visa|mastercard|amex)\b/gi, ' ')
    // remove ids/tokens often appended by terminals
    .replace(/\b(ref|auth|trace|txn|terminal|store)\s*[:#-]?\s*[a-z0-9-]+\b/gi, ' ')
    .replace(/[#*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If cleanup removed too much, keep original.
  if (!value) value = raw;

  return value;
}

export function merchantKey(input: unknown): string {
  return String(normalizeMerchantName(input) || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * P3.2B — Canonical merchant grouping key.
 *
 * Deterministic noise removal for merchant aggregation.
 * Designed so that store-number variants collapse into one group
 * while meaningful subtypes (Gas vs Wholesale) remain distinct.
 *
 * REMOVES:
 * - Known processor prefixes (SQ *, POS, DBT PURCHASE)
 * - Formatting chars (#, *, ., ,, /, \)
 * - Apostrophes (McDonald's = McDonalds)
 * - Trailing 3-6 digit store/terminal numbers
 * - Trailing legal suffixes (INC, LTD, CORP, CO, LLC)
 * - Case differences
 *
 * PRESERVES:
 * - All mid-string alphanumeric tokens (KJH3948, 3H81X)
 * - Subtype words (GAS, WHOLESALE)
 * - Hyphens converted to spaces for grouping (7-ELEVEN = 7 ELEVEN)
 *
 * MUST NOT:
 * - Remove meaningful mid-string identifiers
 * - Guess aliases (AMZN != Amazon)
 * - Guess families (Costco Gas != Costco Wholesale)
 * - Turn unknown merchants into known merchants
 */
export function merchantGroupingKey(input: string): string {
  let v = (input || '').trim();
  if (!v) return '';

  // 1. Remove known processor prefixes
  v = v.replace(/^(sq\s*\*|pos\s+|dbt\s+purchase\s+|debit\s+purchase\s+)/i, '');

  // 2. Replace formatting noise with spaces
  v = v.replace(/[#*.,/\\]/g, ' ');

  // 3. Remove apostrophes (grouping: McDonald's = McDonalds)
  v = v.replace(/'/g, '');

  // 4. Hyphens to spaces (grouping: 7-ELEVEN = 7 ELEVEN)
  v = v.replace(/-/g, ' ');

  // 5. Collapse whitespace + trim
  v = v.replace(/\s+/g, ' ').trim();

  // 6. Remove trailing 3-6 digit store/terminal numbers
  v = v.replace(/\s+\d{3,6}$/, '');

  // 7. Remove trailing legal suffixes
  v = v.replace(/\s+(INC|LTD|CORP|CO|LLC)$/i, '');

  // 8. Lowercase
  v = v.toLowerCase();

  // 9. Final collapse + trim
  v = v.replace(/\s+/g, ' ').trim();

  return v;
}


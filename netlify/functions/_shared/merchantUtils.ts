/**
 * Merchant name normalization — backend copy.
 * Keep in sync with src/lib/merchantUtils.ts.
 */

export function normalizeMerchant(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[#*\/\\\.,'"\\-]/g, ' ')
    .replace(/\b(inc|ltd|corp|co|llc|store|stores|canada|cdm|w|e|n|s)\b/g, '')
    .replace(/\d{3,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function merchantsMatch(a: string, b: string): boolean {
  const na = normalizeMerchant(a);
  const nb = normalizeMerchant(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

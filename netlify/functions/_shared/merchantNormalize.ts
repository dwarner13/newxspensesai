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


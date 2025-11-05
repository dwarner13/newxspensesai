/**
 * Guardrails - Content moderation and PII masking
 */

/**
 * Moderate content (stub)
 */
export async function moderate(text: string): Promise<{ ok: boolean }> {
  // Stub implementation - always returns ok
  return { ok: true };
}

/**
 * Mask PII in text - replaces emails, phones, and card numbers with placeholders
 */
export function maskPII(text: string): string {
  let masked = text;
  
  // Email pattern
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  masked = masked.replace(emailPattern, '[EMAIL_REDACTED]');
  
  // Phone pattern (various formats)
  const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  masked = masked.replace(phonePattern, '[PHONE_REDACTED]');
  
  // Credit card pattern (13-19 digits, may have spaces/dashes)
  const cardPattern = /\b(?:\d[ -]*?){13,19}\b/g;
  masked = masked.replace(cardPattern, (match) => {
    // Keep last 4 digits for better UX
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `****-****-****-${digits.slice(-4)}`;
    }
    return '[CARD_REDACTED]';
  });
  
  return masked;
}


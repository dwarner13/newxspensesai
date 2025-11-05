/**
 * Guardrails - Content moderation and PII masking
 */

/**
 * Moderate content using OpenAI moderation API
 * Returns { ok: false, reason } if flagged for violence/sexual/minors/illegal
 */
export async function moderate(text: string): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    // If no API key, allow but log warning
    console.warn('[guardrails] OpenAI API key not configured, skipping moderation');
    return { ok: true };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: text.slice(0, 10_000)  // API limit
      })
    });

    if (!response.ok) {
      console.error('[guardrails] Moderation API error:', response.status);
      // On API error, allow but log
      return { ok: true };
    }

    const data = await response.json();
    const result = data.results?.[0];
    
    if (!result) {
      return { ok: true };
    }

    // Check critical blocking categories
    const blockedCategories: string[] = [];
    if (result.category_scores) {
      const scores = result.category_scores as any;
      
      // Block on these categories
      if (scores['violence'] > 0.8) blockedCategories.push('violence');
      if (scores['sexual/minors'] > 0.5) blockedCategories.push('sexual/minors');
      if (scores['illegal'] > 0.7) blockedCategories.push('illegal');
    }

    if (result.flagged && blockedCategories.length > 0) {
      return {
        ok: false,
        reason: `Content flagged: ${blockedCategories.join(', ')}`
      };
    }

    return { ok: true };

  } catch (error: any) {
    console.error('[guardrails] Moderation check failed:', error);
    // On error, allow but log
    return { ok: true };
  }
}

/**
 * Mask PII in text - replaces emails, phones, card numbers, IBAN, BIC, and SIN-like patterns
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
  
  // IBAN pattern (generic: 2 letters + 2 digits + up to 30 alphanumeric)
  // Format: XX00 XXXX XXXX XXXX XXXX XXXX XXXX (varies by country)
  const ibanPattern = /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/gi;
  masked = masked.replace(ibanPattern, '[IBAN_REDACTED]');
  
  // BIC/SWIFT pattern (8 or 11 characters: 4 letters + 2 letters + 2 alphanumeric + optional 3 alphanumeric)
  const bicPattern = /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g;
  masked = masked.replace(bicPattern, '[BIC_REDACTED]');
  
  // SIN-like pattern (9 digits, may have spaces/dashes: XXX-XXX-XXX or XXXXXXXXX)
  // Generic pattern for Social Insurance Numbers (Canadian SIN, US SSN format)
  const sinPattern = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3}\b/g;
  masked = masked.replace(sinPattern, '[SIN_REDACTED]');
  
  return masked;
}


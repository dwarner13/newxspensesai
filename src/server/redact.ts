import { Result, Ok } from '../types/result';
import { maskPII } from '../../netlify/functions/_shared/pii';

export interface RedactionResult {
  redacted: string;
  tokens: Map<string, string>;
}

/**
 * Normalize detector type names to expected token format
 * Maps detector names like "pan_generic", "bank_account_us" to "CARD", "BANK", etc.
 */
function normalizeType(detectorType: string): string {
  const typeMap: Record<string, string> = {
    'PAN_GENERIC': 'CARD',
    'BANK_ACCOUNT_US': 'BANK',
    'PHONE_INTL': 'PHONE',
    'EMAIL': 'EMAIL',
    'SSN_US': 'SSN',
    'SSN_US_NO_DASH': 'SSN',
    'IP_V4': 'IP',
    'IP_V6': 'IP',
    'ZIP_US': 'POSTAL',
    'POSTAL_CA': 'POSTAL',
  };
  
  // Check exact match first
  if (typeMap[detectorType]) {
    return typeMap[detectorType];
  }
  
  // Check partial matches
  if (detectorType.includes('CARD') || detectorType.includes('PAN')) return 'CARD';
  if (detectorType.includes('BANK')) return 'BANK';
  if (detectorType.includes('PHONE')) return 'PHONE';
  if (detectorType.includes('EMAIL')) return 'EMAIL';
  if (detectorType.includes('SSN')) return 'SSN';
  if (detectorType.includes('IP')) return 'IP';
  if (detectorType.includes('ZIP') || detectorType.includes('POSTAL')) return 'POSTAL';
  
  // Default: use first part before underscore or full name
  return detectorType.split('_')[0] || detectorType;
}

/**
 * Redact PII from text using canonical maskPII() from pii.ts
 * Returns redacted text and tokens map for unmasking
 * 
 * Uses canonical PII masking from netlify/functions/_shared/pii.ts (30+ detector types)
 * Maintains backward compatibility with Result<RedactionResult> return type
 * Converts maskPII format ([REDACTED:X], ****1111) to token format ({{X}}, {{CARD_1111}})
 */
export function redactText(input: string): Result<RedactionResult> {
  // Use canonical maskPII() with last4 strategy (preserves last 4 digits for UX)
  const result = maskPII(input, 'last4');
  
  const tokens = new Map<string, string>();
  let redacted = result.masked;
  
  // Find all replacements in the masked text and map them to found items
  // Process found items and create replacement map
  const replacements: Array<{ pattern: RegExp; token: string; original: string }> = [];
  
  for (const found of result.found) {
    const originalText = found.match;
    const type = normalizeType(found.type.toUpperCase());
    const index = found.index;
    
    // Find what replaced this in the masked text by looking near the index
    const searchStart = Math.max(0, index - 5);
    const searchEnd = Math.min(result.masked.length, index + originalText.length + 20);
    const segment = result.masked.substring(searchStart, searchEnd);
    
    let replacement = '';
    let token = '';
    
    // Check for [REDACTED:XXX] format
    const redactedMatch = segment.match(/\[REDACTED:([^\]]+)\]/);
    if (redactedMatch) {
      replacement = redactedMatch[0];
      // For emails, always generate unique token even if fully redacted
      if (type === 'EMAIL') {
        const hash = originalText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString(36).substring(0, 6);
        token = `{{${type}_${hash}}}`;
      } else {
        token = `{{${type}}}`;
      }
    } else {
      // Check for last4 pattern (****...####)
      const last4Match = segment.match(/(\*{3,}\d{4})/);
      if (last4Match) {
        const last4 = last4Match[0].match(/\d{4}/)?.[0] || '';
        replacement = last4Match[0];
        token = `{{${type}_${last4}}}`;
      } else {
      // Check for email pattern (j***@domain.com)
      const emailMatch = segment.match(/([a-zA-Z0-9]\*{3}@[^\s]+)/);
      if (emailMatch) {
        replacement = emailMatch[0];
        // Generate unique token for email (use hash of original)
        const hash = originalText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString(36).substring(0, 6);
        token = `{{${type}_${hash}}}`;
      } else {
          // Fallback
          replacement = `[REDACTED:${type}]`;
          token = `{{${type}}}`;
        }
      }
    }
    
    // Escape replacement for regex
    const escapedReplacement = replacement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    replacements.push({
      pattern: new RegExp(escapedReplacement, 'g'),
      token,
      original: originalText
    });
    
    tokens.set(token, originalText);
  }
  
  // Replace all occurrences (only first match per pattern to avoid duplicates)
  for (const rep of replacements) {
    // Use non-global regex to replace only first occurrence
    const nonGlobalPattern = new RegExp(rep.pattern.source.replace(/g$/, ''));
    redacted = redacted.replace(nonGlobalPattern, rep.token);
  }
  
  return Ok({ 
    redacted, 
    tokens 
  });
}

// Inline tests
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  
  it('redacts credit card numbers', () => {
    const result = redactText('My card is 4532015112830366');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.redacted).toBe('My card is {{CARD_0366}}');
    }
  });
  
  it('redacts email addresses', () => {
    const result = redactText('Contact me at john@example.com');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.redacted).toMatch(/Contact me at {{EMAIL_\w+}}/);
    }
  });
  
  it('redacts phone numbers', () => {
    const result = redactText('Call me at 555-123-4567');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.redacted).toBe('Call me at {{PHONE}}');
    }
  });
}

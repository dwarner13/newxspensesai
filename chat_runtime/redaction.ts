/**
 * Centralized Chat Runtime - PII Redaction
 * ==========================================
 * Redacts personally identifiable information from messages
 * 
 * @module chat_runtime/redaction
 */

import type { RedactionResult, RedactionOptions } from './types';

// ============================================================================
// PII Patterns
// ============================================================================

export const PII_PATTERNS = {
  // Credit card numbers (with Luhn validation)
  creditCard: {
    pattern: /\b(?:\d{4}[\s-]?){3}\d{1,4}\b/g,
    validate: (match: string) => {
      const digits = match.replace(/[\s-]/g, '');
      return digits.length >= 13 && digits.length <= 19 && isValidLuhn(digits);
    },
    replacement: (match: string) => {
      const digits = match.replace(/[\s-]/g, '');
      const last4 = digits.slice(-4);
      return `{{CARD_${last4}}}`;
    },
  },
  
  // Social Security Numbers
  ssn: {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: () => '{{SSN}}',
  },
  
  // Email addresses
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: (match: string) => {
      const [name, domain] = match.split('@');
      return `{{EMAIL_${name[0]}***@${domain}}}`;
    },
  },
  
  // Phone numbers (various formats)
  phone: {
    pattern: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    replacement: () => '{{PHONE}}',
  },
  
  // US ZIP codes
  zip: {
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: () => '{{POSTAL}}',
  },
  
  // IP addresses
  ip: {
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    validate: (match: string) => {
      const parts = match.split('.');
      return parts.every(p => parseInt(p) <= 255);
    },
    replacement: () => '{{IP}}',
  },
  
  // Account numbers (9-19 digits)
  accountNumber: {
    pattern: /\b\d{9,19}\b/g,
    validate: (match: string) => {
      // Avoid false positives (dates, amounts, etc.)
      const num = match;
      // Skip if looks like a year
      if (num.length === 4 && num.startsWith('20')) return false;
      // Skip if looks like a timestamp
      if (num.length === 13) return false;
      return true;
    },
    replacement: (match: string) => {
      const last4 = match.slice(-4);
      return `{{ACCT_${last4}}}`;
    },
  },
} as const;

// ============================================================================
// Redaction Functions
// ============================================================================

/**
 * Redact PII from text
 */
export function redactText(
  text: string,
  options: RedactionOptions = {}
): RedactionResult {
  const {
    patterns = Object.keys(PII_PATTERNS),
    preserveFormat = true,
    logMatches = false,
  } = options;
  
  let redacted = text;
  const tokens = new Map<string, string>();
  const matches: Array<{
    type: string;
    original: string;
    replacement: string;
    start: number;
    end: number;
  }> = [];
  
  // Apply each pattern
  for (const patternName of patterns) {
    if (!(patternName in PII_PATTERNS)) continue;
    
    const config = PII_PATTERNS[patternName as keyof typeof PII_PATTERNS];
    const { pattern, validate, replacement } = config;
    
    // Find all matches
    const patternMatches: Array<{ match: string; index: number }> = [];
    let match: RegExpExecArray | null;
    
    // Reset regex state
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(text)) !== null) {
      const matchedText = match[0];
      
      // Validate if validator exists
      if (validate && !validate(matchedText)) {
        continue;
      }
      
      patternMatches.push({
        match: matchedText,
        index: match.index,
      });
    }
    
    // Apply replacements in reverse order to maintain indices
    patternMatches.reverse().forEach(({ match: matchedText, index }) => {
      const token = typeof replacement === 'function'
        ? replacement(matchedText)
        : replacement();
      
      // Store original value
      if (preserveFormat) {
        tokens.set(token, matchedText);
      }
      
      // Replace in text
      redacted = redacted.substring(0, index) + token + redacted.substring(index + matchedText.length);
      
      // Log match
      matches.push({
        type: patternName,
        original: logMatches ? matchedText : '***',
        replacement: token,
        start: index,
        end: index + matchedText.length,
      });
    });
  }
  
  return {
    redacted,
    tokens,
    matches,
  };
}

/**
 * Unmask redacted tokens (use with caution!)
 */
export function unmaskText(
  redactedText: string,
  tokens: Map<string, string>
): string {
  let unmasked = redactedText;
  
  for (const [token, original] of tokens.entries()) {
    unmasked = unmasked.replace(new RegExp(escapeRegex(token), 'g'), original);
  }
  
  return unmasked;
}

/**
 * Partially unmask (e.g., show last 4 of card)
 */
function partialUnmask(token: string): string {
  // {{CARD_1234}} -> "****1234"
  const cardMatch = token.match(/\{\{CARD_(\d{4})\}\}/);
  if (cardMatch) {
    return `****${cardMatch[1]}`;
  }
  
  // {{ACCT_5678}} -> "ACCT-****5678"
  const acctMatch = token.match(/\{\{ACCT_(\d{4})\}\}/);
  if (acctMatch) {
    return `ACCT-****${acctMatch[1]}`;
  }
  
  // {{EMAIL_j***@example.com}} -> show as-is
  const emailMatch = token.match(/\{\{EMAIL_(.*?)\}\}/);
  if (emailMatch) {
    return emailMatch[1];
  }
  
  // Generic tokens -> show type only
  if (token === '{{SSN}}') return 'SSN-***';
  if (token === '{{PHONE}}') return 'PHONE-***';
  if (token === '{{POSTAL}}') return 'ZIP-***';
  if (token === '{{IP}}') return 'IP-***';
  
  return '[REDACTED]';
}

/**
 * Check if text contains PII
 */
function containsPII(text: string): boolean {
  for (const config of Object.values(PII_PATTERNS)) {
    // Reset regex state
    config.pattern.lastIndex = 0;
    
    if (config.pattern.test(text)) {
      // Validate if validator exists
      if ('validate' in config && config.validate) {
        // Need to check each match
        config.pattern.lastIndex = 0;
        let match;
        while ((match = config.pattern.exec(text)) !== null) {
          if (config.validate(match[0])) {
            return true;
          }
        }
      } else {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get PII types found in text
 */
function detectPIITypes(text: string): string[] {
  const types: string[] = [];
  
  for (const [name, config] of Object.entries(PII_PATTERNS)) {
    // Reset regex state
    config.pattern.lastIndex = 0;
    
    if (config.pattern.test(text)) {
      types.push(name);
    }
  }
  
  return types;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Luhn algorithm for credit card validation
 */
function isValidLuhn(cardNumber: string): boolean {
  let sum = 0;
  let isEven = false;
  
  // Loop through values starting from the rightmost digit
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Exports
// ============================================================================

export {
  redactText as redact,
  unmaskText as unmask,
  partialUnmask,
  containsPII,
  detectPIITypes,
};

// Default export
export default {
  redact: redactText,
  unmask: unmaskText,
  partialUnmask,
  containsPII,
  detectPIITypes,
  patterns: PII_PATTERNS,
};


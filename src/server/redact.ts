import { Result, Ok } from '../types/result';

export interface RedactionResult {
  redacted: string;
  tokens: Map<string, string>;
}

export function redactText(input: string): Result<RedactionResult> {
  let redacted = input;
  const tokens = new Map<string, string>();
  
  // Credit card numbers (13-19 digits with Luhn validation)
  const cardRegex = /\b(?:\d{4}[\s-]?){3}\d{1,7}\b/g;
  redacted = redacted.replace(cardRegex, (match) => {
    const digits = match.replace(/[\s-]/g, '');
    if (isValidLuhn(digits) && digits.length >= 13 && digits.length <= 19) {
      const last4 = digits.slice(-4);
      const token = `{{CARD_${last4}}}`;
      tokens.set(token, match);
      return token;
    }
    return match;
  });
  
  // Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  redacted = redacted.replace(emailRegex, (match) => {
    const token = `{{EMAIL_${Math.random().toString(36).substr(2, 4)}}}`;
    tokens.set(token, match);
    return token;
  });
  
  // Phone numbers (various formats)
  const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
  redacted = redacted.replace(phoneRegex, (match) => {
    const token = `{{PHONE}}`;
    tokens.set(token, match);
    return token;
  });
  
  // US ZIP codes
  const zipRegex = /\b\d{5}(?:-\d{4})?\b/g;
  redacted = redacted.replace(zipRegex, (match) => {
    const token = `{{POSTAL}}`;
    tokens.set(token, match);
    return token;
  });
  
  // SSN/SIN patterns
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g;
  redacted = redacted.replace(ssnRegex, (match) => {
    if (match.length === 9 || match.includes('-')) {
      const token = `{{SSN}}`;
      tokens.set(token, match);
      return token;
    }
    return match;
  });
  
  // IP addresses
  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  redacted = redacted.replace(ipRegex, (match) => {
    const token = `{{IP}}`;
    tokens.set(token, match);
    return token;
  });
  
  return Ok({ redacted, tokens});
}

function isValidLuhn(digits: string): boolean {
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    
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

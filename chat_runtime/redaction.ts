/**
 * Centralized Chat Runtime - PII Redaction
 * ==========================================
 * Redacts personally identifiable information from messages
 * 
 * Uses canonical PII masking from netlify/functions/_shared/pii.ts
 * 
 * @module chat_runtime/redaction
 */

import type { RedactionResult, RedactionOptions } from './types';
import { maskPII, containsPII as checkPII } from '../netlify/functions/_shared/pii';

// ============================================================================
// Redaction Functions
// ============================================================================

/**
 * Redact PII from text
 * Uses canonical maskPII() from _shared/pii.ts (40+ detector types)
 */
export function redactText(
  text: string,
  options: RedactionOptions = {}
): RedactionResult {
  const {
    preserveFormat = true,
    logMatches = false,
  } = options;
  
  // Use canonical maskPII() with last4 strategy (preserves last 4 digits for UX)
  const result = maskPII(text, 'last4');
  
  // Convert maskPII result format to RedactionResult format
  const tokens = new Map<string, string>();
  const matches: Array<{
    type: string;
    original: string;
    replacement: string;
    start: number;
    end: number;
  }> = [];
  
  // Build matches from found PII instances
  // Note: maskPII replaces sequentially, so we track replacements
  for (const found of result.found) {
    // Extract replacement from masked text at this position
    // Since maskPII replaces in-order, we can find the replacement
    // by comparing original text segment with masked text segment
    const originalText = found.match;
    const originalStart = found.index;
    const originalEnd = originalStart + originalText.length;
    
    // Find corresponding segment in masked text
    // maskPII processes detectors in order, so offsets accumulate
    // For simplicity, we'll extract a reasonable replacement
    const maskedSegment = result.masked.substring(
      Math.max(0, originalStart - 10), 
      Math.min(result.masked.length, originalEnd + 30)
    );
    
    // Try to identify the replacement pattern
    let replacement = `[REDACTED:${found.type.toUpperCase()}]`;
    
    // Check for common patterns in the masked segment
    const redactedMatch = maskedSegment.match(/\[REDACTED:[^\]]+\]/);
    const last4Match = maskedSegment.match(/\*{3,}\d{4}/);
    const emailMaskMatch = maskedSegment.match(/[a-zA-Z0-9]\*{3}@[^\s]+/);
    
    if (redactedMatch) {
      replacement = redactedMatch[0];
    } else if (last4Match) {
      replacement = last4Match[0];
    } else if (emailMaskMatch) {
      replacement = emailMaskMatch[0];
    } else {
      // Use a segment of the masked text as replacement
      replacement = result.masked.substring(originalStart, Math.min(result.masked.length, originalStart + 20));
    }
    
    if (preserveFormat) {
      tokens.set(replacement, originalText);
    }
    
    matches.push({
      type: found.type,
      original: logMatches ? originalText : '***',
      replacement,
      start: originalStart,
      end: originalEnd,
    });
  }
  
  return {
    redacted: result.masked,
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
 * Uses canonical containsPII() from _shared/pii.ts
 */
function containsPII(text: string): boolean {
  return checkPII(text);
}

/**
 * Get PII types found in text
 * Uses canonical maskPII() detection from _shared/pii.ts
 */
function detectPIITypes(text: string): string[] {
  const result = maskPII(text, 'last4');
  return [...new Set(result.found.map(f => f.type))];
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
  // Note: Patterns now come from pii-patterns.ts (canonical source)
};


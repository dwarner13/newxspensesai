/**
 * 🛡️ PII Masking Helper
 * 
 * Simple wrapper around pii-patterns.ts for easy masking with detection metadata.
 * Returns both the masked text and information about what was found.
 */

import { PII_DETECTORS, getDetector, type MaskStrategy } from './pii-patterns';

export type MaskResult = {
  masked: string;
  found: { type: string; match: string; index: number }[];
};

/**
 * Mask PII in text using all configured detectors
 * @param text - Input text that may contain PII
 * @param strategy - Masking strategy: 'last4', 'full', or 'domain'
 * @returns Masked text and array of detected PII instances
 */
export function maskPII(text: string, strategy: MaskStrategy = 'last4'): MaskResult {
  const found: MaskResult['found'] = [];
  let masked = text;

  // Apply each PII detector in order
  // Priority: Financial → Government → Contact → Address → Network
  const detectors = [
    // Financial (highest priority - credit cards, bank accounts)
    'ca_credit_card',
    'us_credit_card', 
    'uk_credit_card',
    'ca_bank_account',
    'us_bank_account',
    'uk_bank_account',
    
    // Government IDs (high priority)
    'ca_sin',
    'us_ssn',
    'uk_nino',
    
    // Contact (medium priority)
    'email',
    'phone_na',
    'phone_uk',
    
    // Other identifiers
    'ca_health_card',
    'us_passport',
    'uk_nhs',
    'ca_drivers_license',
  ];

  // Process each detector
  for (const detectorName of detectors) {
    const detector = getDetector(detectorName);
    if (!detector) continue;

    const rx = detector.rx;
    const matches = [...masked.matchAll(rx)];

    for (const match of matches) {
      if (!match[0]) continue;
      
      const originalText = match[0];
      const index = match.index || 0;

      // Store what we found (before masking)
      found.push({
        type: detector.name,
        match: originalText,
        index
      });

      // Apply masking using detector's mask function
      const maskedValue = detector.mask(originalText, strategy);
      
      // Replace in text
      masked = masked.replace(originalText, maskedValue);
    }
  }

  return { masked, found };
}

/**
 * Quick check if text contains any PII (without masking)
 * Useful for fast pre-checks before expensive operations
 */
export function containsPII(text: string): boolean {
  const detectors = ['ca_credit_card', 'us_credit_card', 'ca_sin', 'us_ssn', 'email', 'phone_na'];
  
  for (const detectorName of detectors) {
    const detector = getDetector(detectorName);
    if (detector && detector.rx.test(text)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get count of PII instances by type
 * Useful for metrics and logging
 */
export function countPII(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  
  const detectors = Object.keys(PII_DETECTORS);
  
  for (const detectorName of detectors) {
    const detector = getDetector(detectorName);
    if (!detector) continue;
    
    const matches = text.match(detector.rx);
    if (matches && matches.length > 0) {
      counts[detector.name] = matches.length;
    }
  }
  
  return counts;
}

/**
 * Mask specific PII types only
 * Useful when you only want to mask certain categories
 */
export function maskSpecificPII(
  text: string, 
  types: string[], 
  strategy: MaskStrategy = 'last4'
): MaskResult {
  const found: MaskResult['found'] = [];
  let masked = text;

  for (const detectorName of types) {
    const detector = getDetector(detectorName);
    if (!detector) continue;

    const rx = detector.rx;
    const matches = [...masked.matchAll(rx)];

    for (const match of matches) {
      if (!match[0]) continue;
      
      const originalText = match[0];
      const index = match.index || 0;

      found.push({
        type: detector.name,
        match: originalText,
        index
      });

      const maskedValue = detector.mask(originalText, strategy);
      masked = masked.replace(originalText, maskedValue);
    }
  }

  return { masked, found };
}

/**
 * Legacy regex patterns for backward compatibility
 * Use PII_DETECTORS from pii-patterns.ts for new code
 */
export const LEGACY_PATTERNS = {
  CC_RE: /\b(?:\d[ -]*?){13,19}\b/g,
  EMAIL_RE: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  PHONE_RE: /(?:\+?\d{1,3}[ -]?)?(?:\(?\d{3}\)?[ -]?)?\d{3}[ -]?\d{4}/g,
  SSN_RE: /\b\d{3}-\d{2}-\d{4}\b/g,
};

/**
 * Simple group masking helper (legacy)
 * Keeps last N characters, masks the rest
 */
export function maskGroup(s: string, keepLast = 4): string {
  const onlyDigits = s.replace(/\D/g, '');
  const last = onlyDigits.slice(-keepLast);
  const masked = '█'.repeat(Math.max(0, onlyDigits.length - keepLast)) + last;
  return masked;
}


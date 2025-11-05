/**
 * 🛡️ PII Masking Helper
 * 
 * Simple wrapper around pii-patterns.ts for easy masking with detection metadata.
 * Returns both the masked text and information about what was found.
 * 
 * All PII detection should import from this file, not pii-patterns.ts directly.
 */

import { 
  PII_DETECTORS, 
  getDetector, 
  getCriticalDetectors,
  type MaskStrategy,
  type PiiDetector,
  maskPII as maskPIIDirect,
  detectPII as detectPIIDirect
} from './pii-patterns';

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

  // Use all detectors from PII_DETECTORS (priority order by category)
  // CRITICAL: Run routing numbers FIRST (before SSN) to avoid false positives
  // Then run specific government IDs before generic patterns
  
  // Financial: routing must run before SSN (routing numbers can look like SSNs)
  const financialDetectors = PII_DETECTORS.filter(d => d.category === 'financial');
  const routingDetector = financialDetectors.find(d => d.name === 'routing_us');
  const bankDetectors = financialDetectors.filter(d => d.name.includes('bank'));
  const otherFinancial = financialDetectors.filter(d => d.name !== 'routing_us' && !d.name.includes('bank'));
  
  // Within government category, prioritize specific IDs over generic patterns
  const governmentDetectors = PII_DETECTORS.filter(d => d.category === 'government');
  const specificGovt = governmentDetectors.filter(d => 
    d.name.includes('ssn') || d.name.includes('passport') || d.name.includes('sin') || d.name.includes('nino')
  );
  const genericGovt = governmentDetectors.filter(d => 
    !d.name.includes('ssn') && !d.name.includes('passport') && !d.name.includes('sin') && !d.name.includes('nino')
  );
  
  // Within network category, prioritize IP addresses
  const networkDetectors = PII_DETECTORS.filter(d => d.category === 'network');
  const ipDetectors = networkDetectors.filter(d => d.name.includes('ip'));
  const otherNetwork = networkDetectors.filter(d => !d.name.includes('ip'));
  
  const detectorsByPriority: PiiDetector[] = [
    // Routing numbers FIRST (before SSN) - they can look like SSNs but are more specific
    ...(routingDetector ? [routingDetector] : []),
    // Government IDs: specific IDs (SSN, passport, SIN, NINO) before generic patterns
    // This prevents false positives (e.g., SSNs matching bank account patterns)
    ...specificGovt,
    // Financial: credit cards BEFORE bank accounts (16-digit numbers are credit cards)
    ...otherFinancial.filter(d => d.name.includes('pan') || d.name.includes('card')),
    ...bankDetectors,
    ...otherFinancial.filter(d => !d.name.includes('pan') && !d.name.includes('card')),
    // Government IDs: generic patterns
    ...genericGovt,
    // Contact
    ...PII_DETECTORS.filter(d => d.category === 'contact'),
    // Address
    ...PII_DETECTORS.filter(d => d.category === 'address'),
    // Network: IP addresses first, then other
    ...ipDetectors,
    ...otherNetwork,
  ];

  // Process each detector in priority order
  for (const detector of detectorsByPriority) {
    const rx = detector.rx;
    const matches = [...masked.matchAll(rx)];

    for (const match of matches) {
      if (!match[0]) continue;
      
      const originalText = match[0];
      const index = match.index || 0;

      // Skip if already masked - check both the match and surrounding context
      // This prevents double-masking and ensures idempotency
      if (originalText.includes('[REDACTED:') || 
          originalText.startsWith('***') ||
          originalText.match(/^\*{4,}/) || // Starts with 4+ asterisks
          masked.substring(Math.max(0, index - 5), Math.min(masked.length, index + originalText.length + 10)).includes('[REDACTED:')) {
        continue;
      }

      // Apply masking using detector's mask function first to check if it's valid
      const maskedValue = detector.mask(originalText, strategy);
      
      // Only record and replace if mask function actually changed the text
      // This ensures we don't record false positives that the mask function rejects
      if (maskedValue !== originalText) {
        // Store what we found (before masking)
        found.push({
          type: detector.name,
          match: originalText,
          index
        });
        
        masked = masked.replace(originalText, maskedValue);
      }
    }
  }

  return { masked, found };
}

/**
 * Detect PII in text without masking
 * Re-export from pii-patterns.ts
 */
export function detectPII(text: string): { types: string[]; matches: Record<string, string[]> } {
  return detectPIIDirect(text);
}

/**
 * Quick check if text contains any PII (without masking)
 * Useful for fast pre-checks before expensive operations
 */
export function containsPII(text: string): boolean {
  // Use critical detectors for fast check
  const critical = getCriticalDetectors();
  
  for (const detector of critical) {
    if (detector.rx.test(text)) {
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
  
  for (const detector of PII_DETECTORS) {
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
 * Re-export types and utilities from pii-patterns.ts
 */
export type { MaskStrategy, PiiDetector } from './pii-patterns';
export { 
  PII_DETECTORS,
  getDetector,
  getDetectorsByCategory,
  getCriticalDetectors,
  getDetectorSummary
} from './pii-patterns';


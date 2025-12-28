/**
 * Vendor Normalization
 * 
 * Day 16: Supercharged Intelligence Layer
 * 
 * Normalizes merchant/vendor descriptions to canonical names.
 */

export function normalizeVendor(desc: string): { vendor: string; hints: string[]; confidence: number } {
  const d = (desc || '').toUpperCase().replace(/\s+/g, ' ').trim();
  
  // Remove transaction IDs, numbers, common suffixes
  let v = d
    .replace(/[#\d\-]+/g, '')
    .replace(/\b(CANADA|COM|CA|INC|LTD|STORE|NO\.|MARKETPLACE|MKT|MKTPLACE)\b/g, '')
    .trim();
  
  // Collapse multiple spaces
  v = v.replace(/\s{2,}/g, ' ');
  
  // Vendor dictionary (canonical → match patterns)
  const dict: Record<string, string> = {
    'SAFEWAY': 'SAFEWAY',
    'SHELL': 'SHELL',
    'COSTCO': 'COSTCO',
    'NETFLIX': 'NETFLIX',
    'AMAZON': 'AMAZON',
    'APPLE': 'APPLE',
    'UBER': 'UBER',
    'WALMART': 'WALMART',
    'STARBUCKS': 'STARBUCKS',
    'TIM HORTONS': 'TIM HORTONS',
    'MCDONALDS': 'MCDONALDS'
  };
  
  // Check for exact match or contains match
  const hit = Object.keys(dict).find(k => v.includes(k));
  const vendor = hit ? dict[hit] : (v.split(' ')[0] || 'UNKNOWN');
  const confidence = hit ? 0.95 : 0.6;
  
  return {
    vendor,
    hints: hit ? [hit] : [],
    confidence
  };
}


















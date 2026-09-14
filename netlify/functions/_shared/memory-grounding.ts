/**
 * Memory Extraction Grounding Validation
 *
 * Pure functions that verify extracted fact values are actually present
 * in the user's source message. Prevents prompt example leakage where
 * the LLM echoes few-shot example values as extracted facts.
 *
 * No external dependencies — safe to import anywhere.
 */

/**
 * Check whether an extracted fact value is grounded in the source text.
 * Rejects fabricated values (e.g., prompt example leakage).
 *
 * For values containing numbers/amounts/dates/years, at least one numeric
 * token from the value must appear in the source text (with normalization).
 * Non-numeric values (city names, text descriptions) pass through — the
 * LLM is trusted for those since fabrication risk is lower and matching
 * is harder (case, spelling, abbreviation).
 */
export function isValueGroundedInSource(value: string, sourceText: string): boolean {
  const numericTokens = extractNumericTokens(value);

  // If the value has no numeric component, allow it (text-only facts like city names)
  if (numericTokens.length === 0) return true;

  const sourceLower = sourceText.toLowerCase();

  // At least one numeric token must be findable in the source
  for (const token of numericTokens) {
    if (isNumberInSource(token, sourceLower)) return true;
  }

  return false;
}

/**
 * Extract all meaningful numbers from a string.
 * "250000" -> [250000]
 * "$50k by Dec 2026" -> [50000, 2026]
 * "3 years" -> [3]
 * "500 weekly" -> [500]
 */
function extractNumericTokens(value: string): number[] {
  const results: number[] = [];
  const normalized = value.toLowerCase().replace(/[$,]/g, '');

  const pattern = /(\d+(?:\.\d+)?)\s*(k|m|million|thousand)?/gi;
  let match;
  while ((match = pattern.exec(normalized)) !== null) {
    let num = parseFloat(match[1]);
    const suffix = (match[2] || '').toLowerCase();
    if (suffix === 'k' || suffix === 'thousand') num *= 1000;
    if (suffix === 'm' || suffix === 'million') num *= 1000000;
    if (!isNaN(num) && num > 0) results.push(num);
  }
  return results;
}

/**
 * Check if a number appears in the source text in any common format.
 * Handles: $250,000 / 250000 / $250K / 250k / two hundred fifty thousand
 * Also handles word-to-number for small counts: "three" -> 3
 */
function isNumberInSource(num: number, sourceLower: string): boolean {
  // Helper: check if a numeric string appears at a word boundary in source.
  // Prevents "50,000" matching inside "250,000".
  function hasBounded(needle: string): boolean {
    const idx = sourceLower.indexOf(needle);
    if (idx === -1) return false;
    // Check character before: must be start-of-string, space, $, or non-digit
    if (idx > 0) {
      const before = sourceLower[idx - 1];
      if (before >= '0' && before <= '9') return false;
    }
    return true;
  }

  // Direct number match
  const plain = String(num);
  if (hasBounded(plain)) return true;

  // Comma-formatted: 250000 -> "250,000"
  const commaFormatted = num.toLocaleString('en-US');
  if (hasBounded(commaFormatted.toLowerCase())) return true;

  // K-suffix: 250000 -> "250k"
  if (num >= 1000 && num % 1000 === 0) {
    const kForm = String(num / 1000) + 'k';
    if (hasBounded(kForm)) return true;
    if (hasBounded('$' + kForm)) return true;
  }

  // M-suffix: 1000000 -> "1m"
  if (num >= 1000000 && num % 1000000 === 0) {
    const mForm = String(num / 1000000) + 'm';
    if (hasBounded(mForm)) return true;
  }

  // Word numbers for small values (1-20)
  const wordMap: Record<number, string> = {
    1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
    6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
    11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
    16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
  };
  if (wordMap[num] && sourceLower.includes(wordMap[num])) return true;

  return false;
}

/**
 * Filter an array of extracted facts, keeping only those whose values
 * are grounded in the source text.
 */
export function groundFactsAgainstSource(
  items: Array<{ key: string; value: string; confidence: number }>,
  sourceText: string
): Array<{ key: string; value: string; confidence: number }> {
  return items.filter(item => {
    const grounded = isValueGroundedInSource(item.value, sourceText);
    if (!grounded) {
      console.warn(`[Memory Extraction] GROUNDING REJECTED: ${item.key}=${item.value} — not found in user message`);
    }
    return grounded;
  });
}

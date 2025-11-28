/**
 * Amount Extraction Utilities
 * Helper functions for extracting and validating transaction amounts from OCR text
 */

/**
 * Extract all valid dollar amounts from OCR text
 * Matches patterns like: 76.09, 1,613.72, 355.00, 9.37, $76.09
 * Returns unique amounts in canonical format (without commas, preserving decimals)
 * 
 * This extracts ALL amounts found in the text, including both per-line transaction amounts
 * and totals/balances, so we can use them for validation.
 * 
 * IMPROVED: Handles OCR errors, garbled text, and various formatting issues.
 */
export function extractAmountsFromText(rawText: string): string[] {
  if (!rawText || rawText.trim().length === 0) {
    return [];
  }

  // Step 1: Aggressive normalization for OCR errors
  // Replace common OCR mistakes:
  // - "u" or "U" might be "0" or "5" in numbers
  // - "O" might be "0"
  // - "l" or "I" might be "1"
  // - "S" might be "5"
  // But be careful - only do this in numeric contexts
  
  // Normalize whitespace around punctuation first
  let normalized = rawText.replace(/\s+([.,])\s+/g, '$1');
  
  // Normalize dollar signs
  normalized = normalized.replace(/\$\s+/g, '$');
  
  // Fix common OCR errors in decimal numbers (only in numeric contexts)
  // Pattern: digits followed by common OCR mistakes, then decimal point
  normalized = normalized.replace(/(\d+)[uUoO](\.\d{2})\b/g, '$10$2'); // "76u.09" -> "760.09" (but we'll filter large ones)
  normalized = normalized.replace(/(\d+)[lI](\.\d{2})\b/g, '$11$2'); // "76l.09" -> "761.09"
  normalized = normalized.replace(/(\d+)S(\.\d{2})\b/g, '$15$2'); // "76S.09" -> "765.09"
  
  // Fix garbled amounts like "u,au.65" -> try to extract "510.65" or similar
  // Look for patterns where letters might be numbers (common OCR errors)
  normalized = normalized.replace(/([uUoO0])\s*,\s*([auAU0])(\.\d{2})\b/g, (match, p1, p2) => {
    // Try to decode: u,au -> 5,10 or 0,10
    const first = p1.toLowerCase() === 'u' ? '5' : (p1.toLowerCase() === 'o' ? '0' : p1);
    const second = p2.toLowerCase() === 'a' ? '1' : (p2.toLowerCase() === 'u' ? '0' : p2);
    return `${first}${second}${match.slice(-3)}`; // Keep the .XX part
  });
  
  // Fix more OCR errors: "76u.09" -> "76.09" (u might be OCR error for nothing)
  // But be careful - only fix if it makes sense
  normalized = normalized.replace(/(\d{1,2})[uUoO](\.\d{2})\b/g, (match, digits, decimals) => {
    // If it's a 2-digit number followed by u/o, it's likely an OCR error
    // e.g., "76u.09" should be "76.09"
    const num = parseFloat(digits);
    if (num >= 1 && num <= 99) {
      return `${digits}${decimals}`;
    }
    return match; // Keep original if unsure
  });

  const amounts = new Set<string>();

  // Pattern 1: Standard format - 76.09, 1,613.72, $76.09
  const regex1 = /\$?\s*(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex1.exec(normalized)) !== null) {
    const intPart = match[1].replace(/,/g, '');
    const decPart = match[2];
    const canonical = `${intPart}.${decPart}`;
    const numValue = parseFloat(canonical);
    
    // Filter reasonable transaction amounts (exclude very large totals unless they're common)
    if (numValue > 0 && numValue < 100000) {
      amounts.add(canonical);
    }
  }

  // Pattern 2: Handle amounts with spaces in the middle (OCR errors)
  // e.g., "76 . 09", "1 , 613 . 72"
  const regex2 = /(\d{1,3}(?:[,\s]\d{3})*)\s*\.\s*(\d{2})\b/g;
  while ((match = regex2.exec(rawText)) !== null) {
    const intPart = match[1].replace(/[,\s]/g, '');
    const decPart = match[2];
    const canonical = `${intPart}.${decPart}`;
    const numValue = parseFloat(canonical);
    if (numValue > 0 && numValue < 100000) {
      amounts.add(canonical);
    }
  }

  // Pattern 3: Handle amounts where decimal point might be OCR'd as comma or other
  // e.g., "76,09" (European format) or "76 09" (space instead of decimal)
  const regex3 = /(\d{1,3}(?:,\d{3})*)[,\s](\d{2})\b(?!\d)/g;
  while ((match = regex3.exec(rawText)) !== null) {
    // Only treat as amount if it's followed by whitespace or end of line (not more digits)
    const intPart = match[1].replace(/,/g, '');
    const decPart = match[2];
    const canonical = `${intPart}.${decPart}`;
    const numValue = parseFloat(canonical);
    if (numValue > 0 && numValue < 100000 && numValue !== parseFloat(intPart)) {
      // Only add if it's actually a decimal (not just an integer)
      amounts.add(canonical);
    }
  }

  // Pattern 4: Look for amounts in table-like structures
  // Common pattern: date, description, amount columns
  // Try to find amounts that appear after dates (Sep 17, Sep 18, etc.)
  const dateAmountPattern = /(?:Sep|Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug)\s+\d{1,2}[,\s]+.*?(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})\b/gi;
  while ((match = dateAmountPattern.exec(rawText)) !== null) {
    const intPart = match[1].replace(/,/g, '');
    const decPart = match[2];
    const canonical = `${intPart}.${decPart}`;
    const numValue = parseFloat(canonical);
    if (numValue > 0 && numValue < 100000) {
      amounts.add(canonical);
    }
  }

  // Filter out obvious non-amounts:
  // - 4-digit numbers ending in .00 (likely store numbers like 1709.00, 33535.00)
  // - Very large numbers (> 50,000) unless they're common statement totals
  const filtered = Array.from(amounts).filter(amt => {
    const num = parseFloat(amt);
    const intPart = Math.floor(num);
    
    // Skip if it's a round 4-digit number (likely store number)
    if (intPart >= 1000 && intPart < 10000 && num % 1 === 0) {
      return false;
    }
    
    // Skip if it's a round 5-digit number (likely store number)
    if (intPart >= 10000 && intPart < 100000 && num % 1 === 0) {
      return false;
    }
    
    return true;
  });

  return filtered.sort((a, b) => parseFloat(a) - parseFloat(b));
}

/**
 * Validate transactions against allowed amounts
 * Flags transactions with amounts not found in the OCR text
 * Uses exact numeric comparison (Set-based) for efficient matching
 * 
 * Treats 1,613.72 and 1613.72 as the same amount by comparing numerically.
 * Always sets needsAmountReview explicitly (false for valid, true for invalid).
 */
export function validateTransactions(
  transactions: Array<{ amount: number | string; [key: string]: any }>,
  allowedAmounts: string[]
): Array<{ amount: number | string; needsAmountReview?: boolean; [key: string]: any }> {
  if (!allowedAmounts || allowedAmounts.length === 0) {
    // If no allowed amounts, don't flag anything (can't validate)
    return transactions.map(tx => ({
      ...tx,
      amount: typeof tx.amount === 'string' ? parseFloat(tx.amount.replace(/,/g, '')) : tx.amount,
      needsAmountReview: false,
    }));
  }

  // Build Set of allowed numeric values for O(1) lookup
  const allowedNums = new Set<number>(
    allowedAmounts.map(a => Number(String(a).replace(/,/g, '')))
  );

  return transactions.map(tx => {
    const rawAmt = String(tx.amount ?? '');
    const amtNum = Number(rawAmt.replace(/,/g, ''));

    // Handle invalid amounts
    if (isNaN(amtNum) || amtNum <= 0) {
      return {
        ...tx,
        amount: typeof tx.amount === 'string' ? parseFloat(tx.amount.replace(/,/g, '')) : tx.amount,
        needsAmountReview: true,
      };
    }

    // Check if amount matches any allowed amount (exact numeric comparison)
    if (!allowedNums.has(amtNum)) {
      return {
        ...tx,
        amount: typeof tx.amount === 'string' ? parseFloat(tx.amount.replace(/,/g, '')) : tx.amount,
        needsAmountReview: true,
      };
    }

    return {
      ...tx,
      amount: typeof tx.amount === 'string' ? parseFloat(tx.amount.replace(/,/g, '')) : tx.amount,
      needsAmountReview: false,
    };
  });
}


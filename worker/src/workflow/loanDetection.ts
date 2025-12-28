/**
 * Loan Snapshot Detection from OCR Text
 * 
 * Detects mortgage/loan information from OCR text and extracts structured data.
 * Uses simple regex and heuristics - not perfect NLP, but good enough for common formats.
 */

export interface LoanSnapshotCandidate {
  loan_type: 'mortgage' | 'loan';
  principal: number;
  annualRatePct: number;
  paymentAmount: number;
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly';
  taxAmount?: number | null;
}

/**
 * Detect loan snapshot from OCR text
 * 
 * Looks for patterns like:
 * - "Mortgage" or "Loan" in title
 * - Large dollar amount near "Balance" or "Mortgage"
 * - Interest rate with "%"
 * - Payment amount with frequency
 */
export function detectLoanSnapshot(ocrText: string): LoanSnapshotCandidate | null {
  if (!ocrText || ocrText.trim().length < 50) {
    return null; // Too short to be meaningful
  }

  const text = ocrText.toLowerCase();
  
  // Check if this looks like a loan/mortgage document
  const hasLoanKeywords = /\b(mortgage|loan|home loan|car loan|personal loan|line of credit)\b/i.test(ocrText);
  if (!hasLoanKeywords) {
    return null;
  }

  // Extract principal/balance
  // Look for patterns like "Balance: $175,787.00" or "Mortgage Balance: $175,787"
  const balancePatterns = [
    /\b(?:balance|principal|outstanding|remaining|current balance)[\s:]*\$?\s*([\d,]+\.?\d*)/i,
    /\$?\s*([\d,]+\.?\d*)\s*(?:balance|principal|mortgage|loan)/i,
  ];

  let principal: number | null = null;
  for (const pattern of balancePatterns) {
    const match = ocrText.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      // Reasonable mortgage/loan range: $1,000 to $10,000,000
      if (amount >= 1000 && amount <= 10000000) {
        principal = amount;
        break;
      }
    }
  }

  if (!principal) {
    return null; // Can't detect principal
  }

  // Extract interest rate
  // Look for patterns like "5.39%" or "Interest Rate: 5.39%"
  const ratePatterns = [
    /\b(?:interest|rate|apr)[\s:]*(\d+\.?\d*)\s*%/i,
    /(\d+\.?\d*)\s*%\s*(?:interest|rate|apr)/i,
  ];

  let annualRatePct: number | null = null;
  for (const pattern of ratePatterns) {
    const match = ocrText.match(pattern);
    if (match) {
      const rate = parseFloat(match[1]);
      // Reasonable rate range: 0.1% to 30%
      if (rate >= 0.1 && rate <= 30) {
        annualRatePct = rate;
        break;
      }
    }
  }

  if (!annualRatePct) {
    return null; // Can't detect rate
  }

  // Extract payment amount
  // Look for patterns like "Payment: $275.75" or "$275.75 per week"
  const paymentPatterns = [
    /\b(?:payment|monthly payment|weekly payment|bi.?weekly payment)[\s:]*\$?\s*([\d,]+\.?\d*)/i,
    /\$?\s*([\d,]+\.?\d*)\s*(?:per|payment)/i,
  ];

  let paymentAmount: number | null = null;
  for (const pattern of paymentPatterns) {
    const match = ocrText.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      // Reasonable payment range: $50 to $50,000
      if (amount >= 50 && amount <= 50000) {
        paymentAmount = amount;
        break;
      }
    }
  }

  if (!paymentAmount) {
    return null; // Can't detect payment
  }

  // Detect payment frequency
  let paymentFrequency: 'weekly' | 'biweekly' | 'monthly' = 'monthly'; // Default
  if (/\b(weekly|per week|each week)\b/i.test(ocrText)) {
    paymentFrequency = 'weekly';
  } else if (/\b(bi.?weekly|bi.?weekly|every two weeks|fortnightly)\b/i.test(ocrText)) {
    paymentFrequency = 'biweekly';
  } else if (/\b(monthly|per month|each month)\b/i.test(ocrText)) {
    paymentFrequency = 'monthly';
  }

  // Detect loan type
  const loanType: 'mortgage' | 'loan' = /\b(mortgage|home loan)\b/i.test(ocrText) ? 'mortgage' : 'loan';

  // Optional: Extract tax amount (property tax)
  let taxAmount: number | null = null;
  const taxPatterns = [
    /\b(?:property tax|tax)[\s:]*\$?\s*([\d,]+\.?\d*)/i,
    /\$?\s*([\d,]+\.?\d*)\s*(?:property tax|tax)/i,
  ];

  for (const pattern of taxPatterns) {
    const match = ocrText.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (amount >= 10 && amount <= 10000) {
        taxAmount = amount;
        break;
      }
    }
  }

  return {
    loan_type: loanType,
    principal,
    annualRatePct,
    paymentAmount,
    paymentFrequency,
    taxAmount: taxAmount || null,
  };
}




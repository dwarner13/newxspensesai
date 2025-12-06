/**
 * Confidence Scoring Utility
 * 
 * Calculates confidence scores for OCR extractions
 */

import type { NormalizedTransaction, ConfidenceScores } from '../types/transactions';

/**
 * Calculate confidence scores for a transaction
 */
export function calculateConfidence(
  transaction: NormalizedTransaction,
  ocrText?: string
): ConfidenceScores {
  let merchantScore = 0;
  let amountScore = 0;
  let dateScore = 0;

  // Merchant confidence
  if (transaction.merchant) {
    const merchant = transaction.merchant.trim();
    
    // Length > 3 characters: +0.3
    if (merchant.length > 3) {
      merchantScore += 0.3;
    }
    
    // Contains known merchant patterns: +0.4
    const knownPatterns = [
      /starbucks/i,
      /walmart/i,
      /amazon/i,
      /costco/i,
      /target/i,
      /mcdonald/i,
      /tim hortons/i,
      /subway/i,
    ];
    
    const hasKnownPattern = knownPatterns.some(pattern => pattern.test(merchant));
    if (hasKnownPattern) {
      merchantScore += 0.4;
    }
    
    // All caps or mixed case (not gibberish): +0.3
    const hasValidCase = /^[A-Z][a-z]+/.test(merchant) || /^[A-Z\s]+$/.test(merchant);
    if (hasValidCase && merchant.length > 2) {
      merchantScore += 0.3;
    }
    
    // Found in OCR text: +0.2 (if OCR text provided)
    if (ocrText && ocrText.toLowerCase().includes(merchant.toLowerCase())) {
      merchantScore += 0.2;
    }
  }
  
  merchantScore = Math.min(merchantScore, 1.0);

  // Amount confidence
  if (transaction.amount !== undefined && transaction.amount !== null) {
    const amount = Math.abs(transaction.amount);
    
    // Matches currency format regex: +0.5
    const isValidFormat = /^\d+\.?\d{0,2}$/.test(amount.toString());
    if (isValidFormat) {
      amountScore += 0.5;
    }
    
    // Found in OCR text with $ or CAD: +0.3
    if (ocrText) {
      const amountStr = amount.toFixed(2);
      const hasDollarSign = ocrText.includes(`$${amountStr}`) || ocrText.includes(`CAD ${amountStr}`);
      if (hasDollarSign) {
        amountScore += 0.3;
      }
    }
    
    // Reasonable value (not $0.00 or $999999): +0.2
    if (amount > 0 && amount < 100000) {
      amountScore += 0.2;
    }
  }
  
  amountScore = Math.min(amountScore, 1.0);

  // Date confidence
  if (transaction.date) {
    // Valid ISO format: +0.4
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(transaction.date)) {
      dateScore += 0.4;
      
      // Within last 2 years: +0.3
      const date = new Date(transaction.date);
      const now = new Date();
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      
      if (date >= twoYearsAgo && date <= now) {
        dateScore += 0.3;
      }
      
      // Found in OCR text: +0.3
      if (ocrText) {
        const dateStr = transaction.date;
        const dateFormats = [
          dateStr,
          dateStr.replace(/-/g, '/'),
          dateStr.replace(/-/g, '.'),
        ];
        
        const foundInOcr = dateFormats.some(format => ocrText.includes(format));
        if (foundInOcr) {
          dateScore += 0.3;
        }
      }
    }
  }
  
  dateScore = Math.min(dateScore, 1.0);

  // Overall: weighted average (merchant 40%, amount 40%, date 20%)
  const overall = (
    merchantScore * 0.4 +
    amountScore * 0.4 +
    dateScore * 0.2
  );

  return {
    overall: Math.round(overall * 100) / 100, // Round to 2 decimals
    merchant: Math.round(merchantScore * 100) / 100,
    amount: Math.round(amountScore * 100) / 100,
    date: Math.round(dateScore * 100) / 100,
  };
}








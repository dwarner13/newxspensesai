/**
 * Split Detection Utility
 * 
 * Identify transactions that might be "splits" (e.g., shared bills, recurring partials)
 */

import type { CommittedTransaction } from '../types/transactions';

export interface SplitCandidate {
  transaction_id: string;
  reason: string;
  confidence: number;
}

/**
 * Detect transactions that might need to be split
 */
export function detectSplitCandidates(
  transactions: CommittedTransaction[]
): SplitCandidate[] {
  const candidates: SplitCandidate[] = [];

  for (const tx of transactions) {
    const amount = Math.abs(tx.amount);
    const merchant = (tx.merchant_name || '').toLowerCase();
    let confidence = 0;
    const reasons: string[] = [];

    // Heuristic 1: Odd cent amounts (e.g., $47.23) might indicate split bills
    const cents = Math.round((amount % 1) * 100);
    if (cents !== 0 && cents !== 50) {
      confidence += 0.2;
      reasons.push('Odd cent amount');
    }

    // Heuristic 2: Large restaurant bills (>$50) might be shared
    if (amount > 50 && (
      merchant.includes('restaurant') ||
      merchant.includes('cafe') ||
      merchant.includes('bar') ||
      merchant.includes('pub')
    )) {
      confidence += 0.3;
      reasons.push('Large restaurant bill');
    }

    // Heuristic 3: Round dollar amounts that are multiples of common split amounts
    // (e.g., $60 might be 3x $20 or 2x $30)
    if (cents === 0 && amount >= 30 && amount <= 200) {
      const divisors = [2, 3, 4, 5];
      const hasCommonDivisor = divisors.some(d => amount % d === 0 && amount / d >= 10);
      if (hasCommonDivisor) {
        confidence += 0.2;
        reasons.push('Amount divisible by common split numbers');
      }
    }

    // Heuristic 4: Transactions with multiple line items (if available)
    // Note: This would require checking tx.items or metadata, which may not be available
    // For now, we'll skip this heuristic

    // Heuristic 5: Recurring merchant with varying amounts might indicate partial payments
    // This would require historical analysis, so we'll keep it simple for now

    if (confidence > 0.3) {
      candidates.push({
        transaction_id: tx.id,
        reason: reasons.join(', '),
        confidence: Math.min(confidence, 0.9), // Cap at 0.9
      });
    }
  }

  // Sort by confidence (highest first)
  candidates.sort((a, b) => b.confidence - a.confidence);

  return candidates;
}








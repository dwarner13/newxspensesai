/**
 * Recurring Detection Utility
 * 
 * Detect likely recurring transactions
 */

import type { CommittedTransaction } from '../types/transactions';

export interface RecurringPattern {
  merchant_name: string;
  average_amount: number;
  std_dev_amount: number;
  average_interval_days: number;
  occurrences: number;
}

/**
 * Calculate standard deviation of amounts
 */
function calculateStdDev(amounts: number[]): number {
  if (amounts.length === 0) return 0;
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
  return Math.sqrt(variance);
}

/**
 * Calculate average interval between dates (in days)
 */
function calculateAverageInterval(dates: Date[]): number {
  if (dates.length < 2) return 0;

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const intervals: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const diffMs = sorted[i].getTime() - sorted[i - 1].getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    intervals.push(diffDays);
  }

  return intervals.reduce((a, b) => a + b, 0) / intervals.length;
}

/**
 * Detect recurring patterns in transactions
 */
export function detectRecurringPatterns(
  transactions: CommittedTransaction[],
  minOccurrences: number = 3
): RecurringPattern[] {
  // Group transactions by merchant
  const byMerchant = new Map<string, CommittedTransaction[]>();

  for (const tx of transactions) {
    const merchant = tx.merchant_name || 'unknown';
    if (!byMerchant.has(merchant)) {
      byMerchant.set(merchant, []);
    }
    byMerchant.get(merchant)!.push(tx);
  }

  const patterns: RecurringPattern[] = [];

  for (const [merchant, txs] of byMerchant.entries()) {
    if (txs.length < minOccurrences) {
      continue;
    }

    // Extract amounts and dates
    const amounts = txs.map(tx => Math.abs(tx.amount));
    const dates = txs
      .map(tx => new Date(tx.posted_at))
      .filter(date => !isNaN(date.getTime()));

    if (dates.length < minOccurrences) {
      continue;
    }

    // Calculate statistics
    const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDevAmount = calculateStdDev(amounts);
    const averageInterval = calculateAverageInterval(dates);

    // Check if amounts are relatively consistent (std dev < 20% of mean)
    const coefficientOfVariation = stdDevAmount / averageAmount;
    if (coefficientOfVariation > 0.2) {
      continue; // Too much variation
    }

    // Check if intervals are relatively consistent (within ±7 days of average)
    const intervalVariations = [];
    for (let i = 1; i < dates.length; i++) {
      const diffMs = dates[i].getTime() - dates[i - 1].getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      intervalVariations.push(Math.abs(diffDays - averageInterval));
    }

    const avgVariation = intervalVariations.reduce((a, b) => a + b, 0) / intervalVariations.length;
    if (avgVariation > 7) {
      continue; // Intervals too inconsistent
    }

    patterns.push({
      merchant_name: merchant,
      average_amount: Math.round(averageAmount * 100) / 100,
      std_dev_amount: Math.round(stdDevAmount * 100) / 100,
      average_interval_days: Math.round(averageInterval * 10) / 10,
      occurrences: txs.length,
    });
  }

  // Sort by occurrences (most frequent first)
  patterns.sort((a, b) => b.occurrences - a.occurrences);

  return patterns;
}

/**
 * Check if a transaction is likely recurring based on patterns
 */
export function isLikelyRecurring(
  tx: CommittedTransaction,
  patterns: RecurringPattern[]
): boolean {
  const merchant = tx.merchant_name || '';
  const amount = Math.abs(tx.amount);

  for (const pattern of patterns) {
    if (pattern.merchant_name.toLowerCase() === merchant.toLowerCase()) {
      // Check if amount is within 2 standard deviations of average
      const diff = Math.abs(amount - pattern.average_amount);
      if (diff <= pattern.std_dev_amount * 2) {
        return true;
      }
    }
  }

  return false;
}








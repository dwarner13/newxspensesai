/**
 * Duplicate Detection Utility
 * 
 * Detects possible duplicate transactions
 */

import { getSupabase } from '../lib/supabase';
import type { NormalizedTransaction, PossibleDuplicate, CommittedTransaction } from '../types/transactions';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len2][len1];
}

/**
 * Calculate similarity percentage between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  return ((maxLength - distance) / maxLength) * 100;
}

/**
 * Normalize merchant name for comparison
 */
function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[#\d]+/g, '') // Remove numbers and #
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check for duplicate transactions
 */
export async function checkForDuplicates(
  transaction: NormalizedTransaction,
  userId: string
): Promise<PossibleDuplicate[]> {
  if (!transaction.date || !transaction.amount || !transaction.merchant) {
    return [];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  try {
    // Calculate date range (±3 days)
    const transactionDate = new Date(transaction.date);
    const startDate = new Date(transactionDate);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(transactionDate);
    endDate.setDate(endDate.getDate() + 3);

    // Query transactions within date range
    const { data: candidates, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('posted_at', startDate.toISOString().split('T')[0])
      .lte('posted_at', endDate.toISOString().split('T')[0]);

    if (error || !candidates) {
      console.error('[duplicateDetection] Error querying transactions:', error);
      return [];
    }

    const amount = Math.abs(transaction.amount);
    const normalizedMerchant = normalizeMerchantName(transaction.merchant);
    const duplicates: PossibleDuplicate[] = [];

    // Check each candidate
    for (const candidate of candidates as CommittedTransaction[]) {
      const candidateAmount = Math.abs(candidate.amount);
      
      // Amount match (±$0.50)
      const amountDiff = Math.abs(candidateAmount - amount);
      if (amountDiff > 0.5) {
        continue;
      }

      // Merchant name fuzzy match
      const candidateMerchant = normalizeMerchantName(candidate.merchant_name);
      const similarity = calculateSimilarity(normalizedMerchant, candidateMerchant);

      // If similarity > 80%, consider it a duplicate
      if (similarity >= 80) {
        duplicates.push({
          transactionId: candidate.id,
          similarity: Math.round(similarity),
          transaction: candidate,
        });
      }
    }

    // Sort by similarity (highest first)
    duplicates.sort((a, b) => b.similarity - a.similarity);

    return duplicates;
  } catch (error) {
    console.error('[duplicateDetection] Error checking duplicates:', error);
    return [];
  }
}

/**
 * Suggest merge between two transactions
 */
export function suggestMerge(
  tx1: NormalizedTransaction,
  tx2: CommittedTransaction
): {
  shouldMerge: boolean;
  recommendation: 'keep_tx1' | 'keep_tx2' | 'merge';
  reason: string;
} {
  // Compare detail level
  const tx1HasItems = tx1.items && tx1.items.length > 0;
  const tx2HasDescription = !!tx2.merchant_name && tx2.merchant_name.length > 5;

  if (tx1HasItems && !tx2HasDescription) {
    return {
      shouldMerge: true,
      recommendation: 'keep_tx1',
      reason: 'Transaction 1 has more detail (line items)',
    };
  }

  if (tx2HasDescription && !tx1HasItems) {
    return {
      shouldMerge: true,
      recommendation: 'keep_tx2',
      reason: 'Transaction 2 has more detail',
    };
  }

  // Default: keep the one with more complete data
  const tx1Completeness = [
    tx1.date ? 1 : 0,
    tx1.merchant ? 1 : 0,
    tx1.amount !== undefined ? 1 : 0,
    tx1.items ? tx1.items.length : 0,
  ].reduce((a, b) => a + b, 0);

  const tx2Completeness = [
    tx2.posted_at ? 1 : 0,
    tx2.merchant_name ? 1 : 0,
    tx2.amount !== undefined ? 1 : 0,
    tx2.category ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  if (tx1Completeness > tx2Completeness) {
    return {
      shouldMerge: true,
      recommendation: 'keep_tx1',
      reason: 'Transaction 1 has more complete data',
    };
  }

  return {
    shouldMerge: true,
    recommendation: 'keep_tx2',
    reason: 'Transaction 2 has more complete data',
  };
}










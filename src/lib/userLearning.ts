/**
 * User Learning Utility
 * 
 * Keep client-side "learning" hints about user behavior around categorization
 */

import type { CommittedTransaction } from '../types/transactions';

export interface UserLearningRule {
  id: string;
  merchant_pattern: string;
  suggested_category: string;
  confidence: number; // 0–1
  created_at: string;
  updated_at: string;
}

/**
 * Normalize merchant name for pattern matching
 */
function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[#\d]+/g, '') // Remove numbers and #
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Derive a learning rule from a transaction and user-selected category
 */
export function deriveLearningRuleFromTransaction(
  tx: CommittedTransaction,
  category: string
): UserLearningRule {
  const merchant = tx.merchant_name || 'unknown';
  const normalized = normalizeMerchantName(merchant);
  const now = new Date().toISOString();

  return {
    id: `rule-${normalized}-${category}`.replace(/[^a-z0-9-]/g, '-'),
    merchant_pattern: normalized,
    suggested_category: category,
    confidence: 0.8, // Start with moderate confidence
    created_at: now,
    updated_at: now,
  };
}

/**
 * Apply user learning rules to a transaction
 * 
 * Returns the matching rule if found, null otherwise
 */
export function applyUserLearning(
  rules: UserLearningRule[],
  tx: CommittedTransaction
): UserLearningRule | null {
  const merchant = tx.merchant_name || '';
  const normalized = normalizeMerchantName(merchant);

  if (!normalized || normalized === 'unknown') {
    return null;
  }

  // Find matching rules (exact match or contains)
  const matches = rules.filter(rule => {
    const rulePattern = rule.merchant_pattern.toLowerCase();
    return normalized.includes(rulePattern) || rulePattern.includes(normalized);
  });

  if (matches.length === 0) {
    return null;
  }

  // Return the highest confidence match
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches[0];
}








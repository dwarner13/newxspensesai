/**
 * Smart Suggestions Utility
 * 
 * Provides AI-style but client-side suggestion helpers for categorization and actions
 */

import type { CommittedTransaction } from '../types/transactions';

export interface Suggestion {
  id: string;
  label: string;
  type: 'category' | 'merchant' | 'rule' | 'action';
  confidence: number; // 0–1
  data?: Record<string, any>;
}

/**
 * Common category keywords for pattern matching
 */
const categoryKeywords: Record<string, string[]> = {
  'Restaurants': ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'subway', 'pizza', 'burger', 'dining'],
  'Groceries': ['grocery', 'supermarket', 'walmart', 'costco', 'target', 'safeway', 'loblaws', 'food', 'produce'],
  'Gas': ['gas', 'fuel', 'petro', 'shell', 'esso', 'chevron', 'mobil'],
  'Entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'entertainment', 'theater', 'concert'],
  'Shopping': ['amazon', 'store', 'retail', 'shopping', 'mall', 'outlet'],
  'Transportation': ['uber', 'lyft', 'taxi', 'transit', 'bus', 'train', 'metro'],
  'Healthcare': ['pharmacy', 'drug', 'medical', 'doctor', 'hospital', 'clinic', 'health'],
  'Utilities': ['hydro', 'electric', 'water', 'utility', 'power', 'gas bill'],
  'Insurance': ['insurance', 'premium', 'coverage'],
  'Education': ['school', 'university', 'tuition', 'education', 'course'],
};

/**
 * Get suggestions for a transaction based on its fields
 */
export function getSuggestionsForTransaction(tx: CommittedTransaction): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const merchant = (tx.merchant_name || '').toLowerCase();
  const memo = (tx.subcategory || '').toLowerCase();
  const amount = Math.abs(tx.amount);

  // Category suggestions based on merchant name
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matches = keywords.filter(kw => merchant.includes(kw) || memo.includes(kw));
    if (matches.length > 0) {
      suggestions.push({
        id: `cat-${category.toLowerCase()}`,
        label: category,
        type: 'category',
        confidence: Math.min(0.7 + (matches.length * 0.1), 0.95),
        data: { category, matches: matches.length },
      });
    }
  }

  // Action suggestions based on transaction characteristics
  if (amount > 100 && amount % 1 !== 0) {
    // Large amount with cents might be a bill
    suggestions.push({
      id: 'action-mark-recurring',
      label: 'Mark as Recurring',
      type: 'action',
      confidence: 0.6,
      data: { action: 'mark-recurring' },
    });
  }

  if (amount > 50 && merchant.includes('restaurant')) {
    // Large restaurant bill might be split
    suggestions.push({
      id: 'action-split',
      label: 'Split Bill',
      type: 'action',
      confidence: 0.5,
      data: { action: 'split' },
    });
  }

  // Rule creation suggestion for frequent merchants
  if (merchant.length > 3) {
    suggestions.push({
      id: 'action-create-rule',
      label: 'Create Auto-Categorization Rule',
      type: 'rule',
      confidence: 0.4,
      data: { merchant: tx.merchant_name },
    });
  }

  // Sort by confidence (highest first)
  suggestions.sort((a, b) => b.confidence - a.confidence);

  // Return top 5 suggestions
  return suggestions.slice(0, 5);
}

/**
 * Merge two suggestion sets, deduplicating and limiting results
 */
export function mergeSuggestionSets(
  primary: Suggestion[],
  secondary: Suggestion[],
  max: number = 8
): Suggestion[] {
  const seen = new Set<string>();
  const merged: Suggestion[] = [];

  // Add primary suggestions first
  for (const suggestion of primary) {
    if (!seen.has(suggestion.id)) {
      seen.add(suggestion.id);
      merged.push(suggestion);
    }
  }

  // Add secondary suggestions
  for (const suggestion of secondary) {
    if (!seen.has(suggestion.id) && merged.length < max) {
      seen.add(suggestion.id);
      merged.push(suggestion);
    }
  }

  // Sort by confidence
  merged.sort((a, b) => b.confidence - a.confidence);

  return merged.slice(0, max);
}








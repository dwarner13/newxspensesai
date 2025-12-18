/**
 * Semantic Search Utility
 * 
 * Provide simple text search over transactions
 */

import type { CommittedTransaction, PendingTransaction } from '../types/transactions';

export interface SemanticSearchOptions {
  fields?: (keyof CommittedTransaction)[];
  caseSensitive?: boolean;
}

export type Transaction = CommittedTransaction | PendingTransaction;

/**
 * Tokenize a search query into individual words
 */
function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Check if a transaction matches the search query
 */
function matchesTransaction(
  tx: Transaction,
  tokens: string[],
  options: SemanticSearchOptions = {}
): boolean {
  const { caseSensitive = false } = options;
  
  // Default fields to search
  const defaultFields: (keyof CommittedTransaction)[] = [
    'merchant_name',
    'category',
    'subcategory',
  ];

  const fields = options.fields || defaultFields;
  const searchableText: string[] = [];

  // Extract searchable text from transaction
  if ('merchant_name' in tx && tx.merchant_name) {
    searchableText.push(String(tx.merchant_name));
  }
  if ('category' in tx && tx.category) {
    searchableText.push(String(tx.category));
  }
  if ('subcategory' in tx && tx.subcategory) {
    searchableText.push(String(tx.subcategory));
  }
  
  // For pending transactions, also check data_json
  if ('data_json' in tx && tx.data_json) {
    if (tx.data_json.merchant) {
      searchableText.push(String(tx.data_json.merchant));
    }
    if (tx.data_json.description) {
      searchableText.push(String(tx.data_json.description));
    }
  }

  // Combine all searchable text
  const combinedText = searchableText.join(' ').toLowerCase();

  // Check if all tokens are found
  return tokens.every(token => {
    const searchToken = caseSensitive ? token : token.toLowerCase();
    return combinedText.includes(searchToken);
  });
}

/**
 * Perform semantic search on transactions
 */
export function semanticSearchTransactions(
  transactions: Transaction[],
  query: string,
  options: SemanticSearchOptions = {}
): Transaction[] {
  if (!query || query.trim().length === 0) {
    return transactions;
  }

  const tokens = tokenizeQuery(query.trim());
  if (tokens.length === 0) {
    return transactions;
  }

  return transactions.filter(tx => matchesTransaction(tx, tokens, options));
}










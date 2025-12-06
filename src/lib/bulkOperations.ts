/**
 * Bulk Operations Utility
 * 
 * Helper functions for bulk selection and bulk actions on transactions
 */

import type { CommittedTransaction, PendingTransaction } from '../types/transactions';

export type BulkActionType =
  | 'approve'
  | 'reject'
  | 'categorize'
  | 'mark-recurring'
  | 'archive';

export interface BulkActionResult {
  total: number;
  succeeded: number;
  failed: number;
}

export type Transaction = CommittedTransaction | PendingTransaction;

/**
 * Toggle selection of a transaction ID
 */
export function toggleSelection(
  selectedIds: Set<string>,
  id: string
): Set<string> {
  const newSet = new Set(selectedIds);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
  }
  return newSet;
}

/**
 * Select all transaction IDs
 */
export function selectAll(
  transactions: Transaction[]
): Set<string> {
  return new Set(transactions.map(tx => tx.id));
}

/**
 * Clear all selections
 */
export function clearSelection(): Set<string> {
  return new Set<string>();
}

/**
 * Perform a bulk action on selected transactions
 * 
 * This is a pure function that returns counts. Actual mutations should be handled
 * by the caller (e.g., calling API endpoints).
 */
export function performBulkAction(
  action: BulkActionType,
  transactions: Transaction[],
  selectedIds: Set<string>
): BulkActionResult {
  const selected = transactions.filter(tx => selectedIds.has(tx.id));
  const total = selected.length;

  if (total === 0) {
    return { total: 0, succeeded: 0, failed: 0 };
  }

  // For now, simulate success/failure based on transaction state
  // In a real implementation, this would call API endpoints
  let succeeded = 0;
  let failed = 0;

  for (const tx of selected) {
    // Basic validation checks
    if (action === 'approve' && 'data_json' in tx) {
      // Can approve pending transactions
      succeeded++;
    } else if (action === 'reject' && 'data_json' in tx) {
      // Can reject pending transactions
      succeeded++;
    } else if (action === 'categorize') {
      // Can categorize any transaction
      succeeded++;
    } else if (action === 'mark-recurring') {
      // Can mark any transaction as recurring
      succeeded++;
    } else if (action === 'archive') {
      // Can archive committed transactions
      if ('merchant_name' in tx) {
        succeeded++;
      } else {
        failed++;
      }
    } else {
      failed++;
    }
  }

  return { total, succeeded, failed };
}








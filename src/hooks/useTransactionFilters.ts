/**
 * useTransactionFilters Hook
 * 
 * Manages filter state for transactions
 */

import { useState, useMemo, useCallback } from 'react';
import type { TransactionFilters, CommittedTransaction, PendingTransaction } from '../types/transactions';

export interface UseTransactionFiltersResult {
  filters: TransactionFilters;
  setFilters: (filters: TransactionFilters | ((prev: TransactionFilters) => TransactionFilters)) => void;
  filteredTransactions: CommittedTransaction[];
  filteredPending: PendingTransaction[];
  clearFilters: () => void;
}

const defaultFilters: TransactionFilters = {
  status: 'all',
  source: 'all',
};

export function useTransactionFilters(
  transactions: CommittedTransaction[],
  pendingTransactions: PendingTransaction[]
): UseTransactionFiltersResult {
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Date range filter
    if (filters.dateRange) {
      filtered = filtered.filter((tx) => {
        const txDate = tx.posted_at;
        return txDate >= filters.dateRange!.start && txDate <= filters.dateRange!.end;
      });
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter((tx) => {
        return filters.categories!.some((cat) => {
          return tx.category === cat || tx.subcategory === cat;
        });
      });
    }

    // Amount range filter
    if (filters.minAmount !== undefined) {
      filtered = filtered.filter((tx) => Math.abs(tx.amount) >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter((tx) => Math.abs(tx.amount) <= filters.maxAmount!);
    }

    // Source filter
    if (filters.source && filters.source !== 'all') {
      if (filters.source === 'ocr') {
        filtered = filtered.filter((tx) => tx.import_id && tx.document_id);
      } else if (filters.source === 'manual') {
        filtered = filtered.filter((tx) => !tx.import_id);
      } else if (filters.source === 'import') {
        filtered = filtered.filter((tx) => !!tx.import_id);
      }
    }

    // Merchant filter
    if (filters.merchant) {
      const merchantLower = filters.merchant.toLowerCase();
      filtered = filtered.filter((tx) =>
        tx.merchant_name.toLowerCase().includes(merchantLower)
      );
    }

    return filtered;
  }, [transactions, filters]);

  const filteredPending = useMemo(() => {
    let filtered = [...pendingTransactions];

    // Status filter
    if (filters.status === 'needs-review') {
      filtered = filtered.filter((tx) => tx.needsReview);
    } else if (filters.status === 'pending') {
      // All pending (no filter)
    } else if (filters.status === 'reviewed') {
      // No pending transactions are reviewed
      filtered = [];
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
      filtered = filtered.filter((tx) => {
        const txDate = tx.data_json.date;
        if (!txDate) return false;
        return txDate >= filters.dateRange!.start && txDate <= filters.dateRange!.end;
      });
    }

    // Amount range filter
    if (filters.minAmount !== undefined) {
      filtered = filtered.filter((tx) => {
        const amount = tx.data_json.amount;
        return amount !== undefined && Math.abs(amount) >= filters.minAmount!;
      });
    }
    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter((tx) => {
        const amount = tx.data_json.amount;
        return amount !== undefined && Math.abs(amount) <= filters.maxAmount!;
      });
    }

    // Merchant filter
    if (filters.merchant) {
      const merchantLower = filters.merchant.toLowerCase();
      filtered = filtered.filter((tx) => {
        const merchant = tx.data_json.merchant;
        return merchant && merchant.toLowerCase().includes(merchantLower);
      });
    }

    return filtered;
  }, [pendingTransactions, filters]);

  return {
    filters,
    setFilters,
    filteredTransactions,
    filteredPending,
    clearFilters,
  };
}








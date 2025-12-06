/**
 * TransactionsQuickView Component
 * 
 * Mobile-friendly dialog for viewing transactions with filters
 * Desktop: centered modal, 80vh tall
 * Mobile: full-screen sheet style
 */

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { TransactionList } from './TransactionList';
import { useTransactions } from '../../hooks/useTransactions';
import { usePendingTransactions } from '../../hooks/usePendingTransactions';
import type { TransactionsQuickViewMode } from '../workspace/planning/TransactionsWorkspacePanel';
import type { CommittedTransaction, PendingTransaction, TransactionFilters } from '../../types/transactions';

interface TransactionsQuickViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: TransactionsQuickViewMode;
}

export function TransactionsQuickView({ open, onOpenChange, mode }: TransactionsQuickViewProps) {
  const { transactions: allTransactions, isLoading: transactionsLoading } = useTransactions();
  const { pendingTransactions: allPendingTransactions, isLoading: pendingLoading } = usePendingTransactions();

  // Filter transactions based on mode
  const { transactions, pendingTransactions } = useMemo(() => {
    if (mode === "pending") {
      return {
        transactions: [],
        pendingTransactions: allPendingTransactions,
      };
    }

    if (mode === "uncategorized") {
      return {
        transactions: allTransactions.filter(tx => !tx.category || tx.category === 'Uncategorized'),
        pendingTransactions: allPendingTransactions.filter(ptx => !ptx.data_json.category || ptx.data_json.category === 'Uncategorized'),
      };
    }

    if (mode === "lastImport") {
      // Get the most recent import_id
      const recentImportIds = new Set(
        allTransactions
          .map(tx => tx.import_id)
          .filter(Boolean)
          .slice(0, 1)
      );
      
      return {
        transactions: allTransactions.filter(tx => recentImportIds.has(tx.import_id || '')),
        pendingTransactions: allPendingTransactions.filter(ptx => recentImportIds.has(ptx.import_id || '')),
      };
    }

    // "all" mode
    return {
      transactions: allTransactions,
      pendingTransactions: allPendingTransactions,
    };
  }, [mode, allTransactions, allPendingTransactions]);

  const isLoading = transactionsLoading || pendingLoading;
  const totalCount = transactions.length + pendingTransactions.length;

  const getTitle = () => {
    switch (mode) {
      case "all":
        return "All transactions";
      case "pending":
        return "Pending review";
      case "uncategorized":
        return "Uncategorized transactions";
      case "lastImport":
        return "Last import";
      default:
        return "Transactions";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "all":
        return "Scroll to review, search, and filter your transactions. Mobile friendly view.";
      case "pending":
        return "Review transactions that need your attention before they're committed.";
      case "uncategorized":
        return "Transactions that haven't been assigned a category yet.";
      case "lastImport":
        return "Transactions from your most recent import.";
      default:
        return "Scroll to review, search, and filter your transactions.";
    }
  };

  const handleTransactionClick = (tx: CommittedTransaction | PendingTransaction, isPending: boolean) => {
    // For now, just log - can be extended later
    console.log('Transaction clicked:', tx);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 max-sm:p-0">
      <div
        className={`
          w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-xl
          flex flex-col overflow-hidden
          h-[80vh] max-h-[90vh]
          max-sm:h-screen max-sm:max-w-none max-sm:rounded-none
        `}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-semibold text-white">
                {getTitle()}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {getDescription()}
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable table */}
        <div className="flex-1 overflow-auto px-6 pb-4 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-slate-400">Loading transactions...</p>
            </div>
          ) : (
            <TransactionList
              transactions={transactions}
              pendingTransactions={pendingTransactions}
              filters={{} as TransactionFilters}
              onTransactionClick={handleTransactionClick}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-6 py-3 flex-shrink-0 max-sm:justify-between">
          <span className="text-xs text-slate-500 max-sm:block hidden">
            Showing {totalCount} transaction{totalCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 max-sm:hidden">
              Showing {totalCount} transaction{totalCount !== 1 ? 's' : ''}
            </span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}








/**
 * TransactionList Component
 * 
 * Main transaction table component
 */

import React, { useState, useMemo } from 'react';
import { TransactionRow } from './TransactionRow';
import type { CommittedTransaction, PendingTransaction, TransactionFilters } from '../../types/transactions';

interface TransactionListProps {
  transactions: CommittedTransaction[];
  pendingTransactions: PendingTransaction[];
  filters: TransactionFilters;
  onTransactionClick: (transaction: CommittedTransaction | PendingTransaction, isPending: boolean) => void;
  onApprove?: (pendingId: string) => void;
  onReject?: (pendingId: string) => void;
  onEdit?: (transaction: CommittedTransaction | PendingTransaction, isPending: boolean) => void;
}

export function TransactionList({
  transactions,
  pendingTransactions,
  filters,
  onTransactionClick,
  onApprove,
  onReject,
  onEdit,
}: TransactionListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Combine and sort all transactions
  const allItems = useMemo(() => {
    const combined: Array<{
      type: 'committed' | 'pending';
      transaction?: CommittedTransaction;
      pendingTransaction?: PendingTransaction;
      sortDate: string;
    }> = [];

    // Add committed transactions
    transactions.forEach((tx) => {
      combined.push({
        type: 'committed',
        transaction: tx,
        sortDate: tx.posted_at,
      });
    });

    // Add pending transactions
    pendingTransactions.forEach((ptx) => {
      combined.push({
        type: 'pending',
        pendingTransaction: ptx,
        sortDate: ptx.data_json.date || ptx.parsed_at,
      });
    });

    // Sort by date (newest first)
    combined.sort((a, b) => {
      return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
    });

    return combined;
  }, [transactions, pendingTransactions]);

  // Pagination
  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = allItems.slice(startIndex, startIndex + itemsPerPage);

  const handleRowClick = (item: typeof allItems[0]) => {
    if (item.type === 'committed' && item.transaction) {
      onTransactionClick(item.transaction, false);
    } else if (item.type === 'pending' && item.pendingTransaction) {
      onTransactionClick(item.pendingTransaction as any, true);
    }
  };

  const handleApprove = (pendingId: string) => {
    onApprove?.(pendingId);
  };

  const handleReject = (pendingId: string) => {
    onReject?.(pendingId);
  };

  const handleEdit = (item: typeof allItems[0]) => {
    if (item.type === 'committed' && item.transaction) {
      onEdit?.(item.transaction, false);
    } else if (item.type === 'pending' && item.pendingTransaction) {
      onEdit?.(item.pendingTransaction as any, true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="grid grid-cols-[100px_1fr_120px_120px_100px_auto] gap-3 items-center px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Merchant</div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Amount</div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Category</div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Status</div>
        <div></div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {paginatedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4">
            <p className="text-sm text-slate-400 mb-2">No transactions found</p>
            <p className="text-xs text-slate-500">
              {filters.status === 'needs-review'
                ? 'No transactions need review'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          paginatedItems.map((item) => (
            <TransactionRow
              key={item.type === 'committed' ? item.transaction!.id : item.pendingTransaction!.id}
              transaction={item.transaction}
              pendingTransaction={item.pendingTransaction}
              onClick={() => handleRowClick(item)}
              onApprove={
                item.type === 'pending' && item.pendingTransaction
                  ? () => handleApprove(item.pendingTransaction!.id)
                  : undefined
              }
              onReject={
                item.type === 'pending' && item.pendingTransaction
                  ? () => handleReject(item.pendingTransaction!.id)
                  : undefined
              }
              onEdit={() => handleEdit(item)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900">
          <div className="text-xs text-slate-400">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, allItems.length)} of {allItems.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}








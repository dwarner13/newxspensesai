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
  categories?: string[];
  onCategoryChange?: (txId: string, category: string) => void;
  sortOrder?: 'newest' | 'oldest';
  showRowActions?: boolean;
  highlightTransactionIds?: Set<string>;
}

export function TransactionList({
  transactions,
  pendingTransactions,
  filters,
  onTransactionClick,
  onApprove,
  onReject,
  onEdit,
  categories,
  onCategoryChange,
  sortOrder = 'newest',
  showRowActions = true,
  highlightTransactionIds,
}: TransactionListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const useDateGroupedView = true;

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

    // Sort by date
    combined.sort((a, b) => {
      const diff = new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
      return sortOrder === 'oldest' ? -diff : diff;
    });

    return combined;
  }, [transactions, pendingTransactions, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = allItems.slice(startIndex, startIndex + itemsPerPage);

  const groupedByDay = useMemo(() => {
    const sections: Array<{ key: string; label: string; items: typeof paginatedItems }> = [];

    const toDayKey = (rawDate: string): string => {
      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return 'unknown-date';
      return d.toISOString().slice(0, 10);
    };

    const toDayLabel = (key: string): string => {
      if (key === 'unknown-date') return 'Unknown date';
      const d = new Date(`${key}T00:00:00`);
      if (Number.isNaN(d.getTime())) return 'Unknown date';
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    };

    for (const item of paginatedItems) {
      const key = toDayKey(item.sortDate);
      const current = sections[sections.length - 1];
      if (!current || current.key !== key) {
        sections.push({ key, label: toDayLabel(key), items: [item] });
      } else {
        current.items.push(item);
      }
    }

    return sections;
  }, [paginatedItems]);

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
      <div
        className={`grid ${
          useDateGroupedView
            ? (showRowActions
              ? 'grid-cols-[minmax(220px,1.6fr)_120px_minmax(150px,1fr)_130px_auto]'
              : 'grid-cols-[minmax(220px,1.8fr)_120px_minmax(150px,1fr)_130px]')
            : (showRowActions
              ? 'grid-cols-[88px_minmax(180px,1.4fr)_120px_minmax(150px,1fr)_130px_auto]'
              : 'grid-cols-[88px_minmax(200px,1.6fr)_120px_minmax(150px,1fr)_130px]')
        } gap-2 items-center px-4 py-2 bg-slate-900 border-b border-slate-800`}
      >
        {!useDateGroupedView ? (
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</div>
        ) : null}
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Merchant</div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Amount</div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Category</div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</div>
        {showRowActions ? <div></div> : null}
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
        ) : useDateGroupedView ? (
          groupedByDay.map((section) => (
            <div key={section.key}>
              <div className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-950/80 border-b border-slate-800/70 sticky top-0 z-[1]">
                {section.label}
              </div>
              {section.items.map((item) => (
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
                  categories={categories}
                  onCategoryChange={onCategoryChange}
                  showDate={false}
                  showActions={showRowActions}
                  isHighlighted={highlightTransactionIds?.has(
                    item.type === 'committed' ? item.transaction!.id : item.pendingTransaction!.id
                  ) || false}
                />
              ))}
            </div>
          ))
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
              categories={categories}
              onCategoryChange={onCategoryChange}
              showDate
              showActions={showRowActions}
              isHighlighted={highlightTransactionIds?.has(
                item.type === 'committed' ? item.transaction!.id : item.pendingTransaction!.id
              ) || false}
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










/**
 * TransactionList — bank-style grouped feed with load-more pagination.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { TransactionRow } from './TransactionRow';
import type { CommittedTransaction, PendingTransaction, TransactionFilters } from '../../types/transactions';

const PAGE_SIZE = 40;

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
  /** Optional Crystal-style insight shown once under the first date group. */
  groupInsight?: string | null;
  onAskTag?: (transaction: CommittedTransaction | PendingTransaction, isPending: boolean) => void;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatGroupLabel(isoDateKey: string): string {
  if (isoDateKey === 'unknown-date') return 'Unknown date';
  const d = new Date(`${isoDateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  const today = startOfLocalDay(new Date());
  const yest = startOfLocalDay(new Date(today.getTime() - 86400000));
  const day = startOfLocalDay(d);
  if (day.getTime() === today.getTime()) return 'Today';
  if (day.getTime() === yest.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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
  groupInsight = null,
  onAskTag,
}: TransactionListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const allItems = useMemo(() => {
    const combined: Array<{
      type: 'committed' | 'pending';
      transaction?: CommittedTransaction;
      pendingTransaction?: PendingTransaction;
      sortDate: string;
    }> = [];

    transactions.forEach((tx) => {
      combined.push({
        type: 'committed',
        transaction: tx,
        sortDate: tx.posted_at,
      });
    });

    pendingTransactions.forEach((ptx) => {
      combined.push({
        type: 'pending',
        pendingTransaction: ptx,
        sortDate: ptx.data_json.date || ptx.parsed_at,
      });
    });

    combined.sort((a, b) => {
      const diff = new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
      return sortOrder === 'oldest' ? -diff : diff;
    });

    return combined;
  }, [transactions, pendingTransactions, sortOrder]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [transactions, pendingTransactions, sortOrder]);

  const visibleItems = useMemo(
    () => allItems.slice(0, visibleCount),
    [allItems, visibleCount]
  );

  const groupedByDay = useMemo(() => {
    const sections: Array<{ key: string; label: string; items: typeof visibleItems }> = [];

    const toDayKey = (rawDate: string): string => {
      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return 'unknown-date';
      return d.toISOString().slice(0, 10);
    };

    for (const item of visibleItems) {
      const key = toDayKey(item.sortDate);
      const current = sections[sections.length - 1];
      if (!current || current.key !== key) {
        sections.push({ key, label: formatGroupLabel(key), items: [item] });
      } else {
        current.items.push(item);
      }
    }

    return sections;
  }, [visibleItems]);

  const handleRowClick = (item: (typeof allItems)[0]) => {
    if (item.type === 'committed' && item.transaction) {
      onTransactionClick(item.transaction, false);
    } else if (item.type === 'pending' && item.pendingTransaction) {
      onTransactionClick(item.pendingTransaction, true);
    }
  };

  const handleApprove = (pendingId: string) => {
    onApprove?.(pendingId);
  };

  const handleReject = (pendingId: string) => {
    onReject?.(pendingId);
  };

  const handleEdit = (item: (typeof allItems)[0]) => {
    if (item.type === 'committed' && item.transaction) {
      onEdit?.(item.transaction, false);
    } else if (item.type === 'pending' && item.pendingTransaction) {
      onEdit?.(item.pendingTransaction as CommittedTransaction, true);
    }
  };

  const hasMore = visibleCount < allItems.length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto min-h-0">
        {visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-base text-slate-400 mb-1">No transactions found</p>
            <p className="text-sm text-slate-500">
              {filters.status === 'needs-review'
                ? 'Nothing needs review right now'
                : 'Try adjusting filters or search'}
            </p>
          </div>
        ) : (
          groupedByDay.map((section, sectionIndex) => (
            <div key={section.key} className="mb-1">
              <div
                className="sticky top-0 z-[2] px-1 py-2.5 mt-2 first:mt-0 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-sm"
              >
                <div className="text-[14px] font-medium uppercase tracking-wider text-slate-500">
                  {section.label}
                </div>
                {sectionIndex === 0 && groupInsight ? (
                  <p className="mt-1.5 text-sm text-violet-300/90 leading-snug pr-2">{groupInsight}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5 pt-2">
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
                    isHighlighted={
                      highlightTransactionIds?.has(
                        item.type === 'committed' ? item.transaction!.id : item.pendingTransaction!.id
                      ) || false
                    }
                    layout="feed"
                    onAskTag={
                      onAskTag
                        ? () => {
                            if (item.type === 'committed' && item.transaction) {
                              onAskTag(item.transaction, false);
                            } else if (item.type === 'pending' && item.pendingTransaction) {
                              onAskTag(item.pendingTransaction, true);
                            }
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center py-4 border-t border-slate-800/80 bg-slate-950/50">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="rounded-full border border-slate-600 bg-slate-800/80 px-6 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:border-slate-500 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

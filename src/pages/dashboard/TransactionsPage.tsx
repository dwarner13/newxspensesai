/**
 * TransactionsPage Component
 * 
 * Complete workspace layout for Transactions
 * 
 * Layout:
 * - Left column (33%): Transactions Workspace Panel + PendingReviewCard + ProgressIndicator
 * - Center column (42%): SemanticSearch + BulkActionsBar + TransactionList
 * - Right column (25%): Activity Feed (handled by DashboardLayout)
 * 
 * NOTE: This page reads from the normalized transactions table used by Smart Import.
 * The useTransactions hook calls tx-list-latest endpoint, which queries the transactions
 * table (the same table that Smart Import pipeline writes to via commit-import).
 */

import React, { useState, useMemo, useCallback } from 'react';
import { TransactionsWorkspacePanel, type TransactionsQuickViewMode } from '../../components/workspace/planning/TransactionsWorkspacePanel';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useTransactions } from '../../hooks/useTransactions';
import { usePendingTransactions } from '../../hooks/usePendingTransactions';
import { useTransactionFilters } from '../../hooks/useTransactionFilters';
import { TransactionList } from '../../components/transactions/TransactionList';
import { PendingReviewCard } from '../../components/transactions/PendingReviewCard';
import { ProgressIndicator } from '../../components/transactions/ProgressIndicator';
import { BulkActionsBar } from '../../components/transactions/BulkActionsBar';
import { SemanticSearch } from '../../components/transactions/SemanticSearch';
import { SplitTransactionModal } from '../../components/transactions/SplitTransactionModal';
import { TransactionsQuickView } from '../../components/transactions/TransactionsQuickView';
import { toggleSelection, selectAll, clearSelection, performBulkAction, type BulkActionType } from '../../lib/bulkOperations';
import type { ProgressStats } from '../../lib/gamification';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';
import toast from 'react-hot-toast';

type Transaction = CommittedTransaction | PendingTransaction;

export default function TransactionsPage() {
  // Scroll to top when page loads
  useScrollToTop();
  
  // Data hooks
  const { transactions, isLoading: transactionsLoading } = useTransactions();
  const { pendingTransactions, isLoading: pendingLoading } = usePendingTransactions();
  const { filters } = useTransactionFilters(transactions, pendingTransactions);

  // State for selection and search
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<Transaction[] | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<CommittedTransaction | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  
  // State for Quick View dialog
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewMode, setQuickViewMode] = useState<TransactionsQuickViewMode>("all");

  // Calculate stats for progress indicator
  const progressStats: ProgressStats = useMemo(() => {
    const lowConfidence = pendingTransactions.filter(pt => pt.confidence.overall < 0.75).length;
    const highConfidence = pendingTransactions.filter(pt => pt.confidence.overall >= 0.75).length;
    const duplicates = pendingTransactions.filter(pt => pt.possibleDuplicate).length;

    return {
      total: transactions.length + pendingTransactions.length,
      reviewed: transactions.length,
      highConfidence,
      lowConfidence,
      duplicates,
    };
  }, [transactions, pendingTransactions]);

  // Calculate pending counts
  const pendingCount = pendingTransactions.length;
  const lowConfidenceCount = pendingTransactions.filter(pt => pt.confidence.overall < 0.75).length;
  
  // Calculate stats for workspace panel
  const totalCount = transactions.length + pendingTransactions.length;
  const monthCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions.filter(tx => new Date(tx.posted_at) >= startOfMonth).length;
  }, [transactions]);
  const uncategorizedCount = useMemo(() => {
    const uncategorizedCommitted = transactions.filter(tx => !tx.category || tx.category === 'Uncategorized').length;
    const uncategorizedPending = pendingTransactions.filter(ptx => !ptx.data_json.category || ptx.data_json.category === 'Uncategorized').length;
    return uncategorizedCommitted + uncategorizedPending;
  }, [transactions, pendingTransactions]);
  
  // Get last import count (most recent import_id)
  const lastImportCount = useMemo(() => {
    const recentImportIds = new Set(
      transactions
        .map(tx => tx.import_id)
        .filter(Boolean)
        .slice(0, 1)
    );
    if (recentImportIds.size === 0) return undefined;
    return transactions.filter(tx => recentImportIds.has(tx.import_id || '')).length;
  }, [transactions]);

  // Combine all transactions for search
  const allTransactions: Transaction[] = useMemo(() => {
    return [...transactions, ...pendingTransactions];
  }, [transactions, pendingTransactions]);

  // Use search results if available, otherwise use all transactions
  const displayTransactions = searchResults || transactions;
  const displayPending = searchResults ? [] : pendingTransactions; // If searching, don't show pending separately

  // Handlers
  const handleBulkAction = useCallback((action: BulkActionType) => {
    const result = performBulkAction(action, allTransactions, selectedIds);
    toast.success(`${action} action: ${result.succeeded} succeeded, ${result.failed} failed`);
    // TODO: Wire to actual API mutations
    setSelectedIds(clearSelection());
  }, [allTransactions, selectedIds]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => toggleSelection(prev, id));
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(selectAll(allTransactions));
  }, [allTransactions]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(clearSelection());
  }, []);

  const handleTransactionClick = useCallback((tx: CommittedTransaction | PendingTransaction, isPending: boolean) => {
    if (!isPending && 'merchant_name' in tx) {
      setSelectedTransaction(tx);
      setIsSplitModalOpen(true);
    }
  }, []);

  const handleSplitSave = useCallback((parts: Array<{ id: string; amount: number; category?: string; note?: string }>) => {
    toast.success(`Split into ${parts.length} transactions`);
    setIsSplitModalOpen(false);
    setSelectedTransaction(null);
    // TODO: Wire to actual API
  }, []);

  const handleReviewClick = useCallback(() => {
    // Scroll to pending transactions or filter to show them
    toast.success('Filtering to pending transactions');
    // TODO: Update filters to show pending
  }, []);
  
  const openQuickView = useCallback((mode: TransactionsQuickViewMode) => {
    setQuickViewMode(mode);
    setQuickViewOpen(true);
  }, []);

  return (
    <>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={
          <div className="h-full flex flex-col gap-4">
            <TransactionsWorkspacePanel
              totalCount={totalCount}
              monthCount={monthCount}
              pendingCount={pendingCount}
              uncategorizedCount={uncategorizedCount}
              lastImportCount={lastImportCount}
              openQuickView={openQuickView}
            />
            <PendingReviewCard
              pendingCount={pendingCount}
              lowConfidenceCount={lowConfidenceCount}
              onReviewClick={handleReviewClick}
            />
            <ProgressIndicator stats={progressStats} />
          </div>
        }
        center={
          <div className="h-full flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-800 flex-shrink-0">
              <SemanticSearch
                allTransactions={allTransactions}
                onResults={setSearchResults}
              />
            </div>

            {/* Bulk Actions Bar */}
            <BulkActionsBar
              selectedCount={selectedIds.size}
              onAction={handleBulkAction}
              onClearSelection={handleClearSelection}
            />

            {/* Transaction List */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {transactionsLoading || pendingLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-400">Loading transactions...</p>
                </div>
              ) : (
                <TransactionList
                  transactions={displayTransactions}
                  pendingTransactions={displayPending}
                  filters={filters}
                  onTransactionClick={handleTransactionClick}
                />
              )}
            </div>
          </div>
        }
        right={<ActivityFeedSidebar scope="transactions" />}
      />

      {/* Split Transaction Modal */}
      <SplitTransactionModal
        isOpen={isSplitModalOpen}
        transaction={selectedTransaction}
        onClose={() => {
          setIsSplitModalOpen(false);
          setSelectedTransaction(null);
        }}
        onSave={handleSplitSave}
      />
      
      {/* Transactions Quick View Dialog */}
      <TransactionsQuickView
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        mode={quickViewMode}
      />
    </>
  );
}


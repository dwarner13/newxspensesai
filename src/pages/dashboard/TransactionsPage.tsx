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

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { type TransactionsQuickViewMode } from '../../components/workspace/planning/TransactionsWorkspacePanel';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useTransactions } from '../../hooks/useTransactions';
import { usePendingTransactions } from '../../hooks/usePendingTransactions';
import { useTransactionFilters } from '../../hooks/useTransactionFilters';
import { TransactionList } from '../../components/transactions/TransactionList';
import { StatementSummaryHeader } from '../../components/transactions/StatementSummaryHeader';
import { BulkActionsBar } from '../../components/transactions/BulkActionsBar';
import { SemanticSearch } from '../../components/transactions/SemanticSearch';
import { SplitTransactionModal } from '../../components/transactions/SplitTransactionModal';
import { TransactionsQuickView } from '../../components/transactions/TransactionsQuickView';
import { clearSelection, performBulkAction, type BulkActionType } from '../../lib/bulkOperations';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

type Transaction = CommittedTransaction | PendingTransaction;

export default function TransactionsPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const importIdFilter = String(searchParams.get('importId') || '').trim();
  const isStatementView = importIdFilter.length > 0;
  
  // Data hooks
  const {
    transactions,
    isLoading: transactionsLoading,
    isError: transactionsError,
    errorMessage: transactionsErrorMessage,
    refetch: refetchTransactions,
  } = useTransactions();
  const {
    pendingTransactions,
    isLoading: pendingLoading,
    isError: pendingError,
    errorMessage: pendingErrorMessage,
    refetch: refetchPendingTransactions,
  } = usePendingTransactions();
  const committedSampleRow = useMemo(
    () =>
      transactions.find(
        (row): row is CommittedTransaction => Boolean(row && typeof row === 'object')
      ) || null,
    [transactions]
  );
  const hasCommittedImportIdField = useMemo(
    () =>
      Boolean(
        committedSampleRow &&
          Object.prototype.hasOwnProperty.call(committedSampleRow as Record<string, unknown>, 'import_id')
      ),
    [committedSampleRow]
  );
  const hasCommittedDocumentIdField = useMemo(
    () =>
      Boolean(
        committedSampleRow &&
          Object.prototype.hasOwnProperty.call(committedSampleRow as Record<string, unknown>, 'document_id')
      ),
    [committedSampleRow]
  );
  const [statementDocumentId, setStatementDocumentId] = useState<string | null>(null);
  const [isImportLinkLoading, setIsImportLinkLoading] = useState(false);
  const attemptedImportLookupRef = useRef<Set<string>>(new Set());

  // Declared before the useEffect below to avoid temporal dead zone error
  const scopedPendingTransactions = useMemo(
    () =>
      importIdFilter
        ? pendingTransactions.filter((ptx) => {
            const record = ptx as unknown as Record<string, unknown>;
            const importObject = record.import as Record<string, unknown> | undefined;
            const nestedImportId = String(importObject?.id || '').trim();
            const flatImportId = String(ptx.import_id || '').trim();
            return nestedImportId === importIdFilter || flatImportId === importIdFilter;
          })
        : pendingTransactions,
    [pendingTransactions, importIdFilter]
  );

  useEffect(() => {
    let cancelled = false;
    if (!isStatementView) {
      attemptedImportLookupRef.current.clear();
      setStatementDocumentId(null);
      setIsImportLinkLoading(false);
      return;
    }
    if (hasCommittedImportIdField || !hasCommittedDocumentIdField) {
      setStatementDocumentId(null);
      setIsImportLinkLoading(false);
      return;
    }
    if (statementDocumentId) {
      setIsImportLinkLoading(false);
      return;
    }

    const pendingDerivedDocumentId =
      scopedPendingTransactions
        .map((ptx) => {
          const pendingRecord = ptx as unknown as Record<string, unknown>;
          const pendingImport = pendingRecord.import as Record<string, unknown> | undefined;
          const pendingImportDocument = pendingImport?.document as Record<string, unknown> | undefined;
          return String(
            pendingImportDocument?.id ||
              pendingImport?.document_id ||
              pendingImport?.id_document ||
              (ptx.data_json as { documentId?: string; docId?: string })?.documentId ||
              (ptx.data_json as { documentId?: string; docId?: string })?.docId ||
              ''
          ).trim();
        })
        .find((value) => value.length > 0) || null;

    if (pendingDerivedDocumentId) {
      setStatementDocumentId(pendingDerivedDocumentId);
      attemptedImportLookupRef.current.add(importIdFilter);
      setIsImportLinkLoading(false);
      return;
    }
    if (attemptedImportLookupRef.current.has(importIdFilter)) {
      setIsImportLinkLoading(false);
      return;
    }

    const loadImportLinks = async () => {
      attemptedImportLookupRef.current.add(importIdFilter);
      setIsImportLinkLoading(true);
      try {
        const supabase = getSupabase();
        if (!supabase) {
          return;
        }
        let documentId: string | null = null;

        const primary = await supabase
          .from('imports')
          .select('id,document_id,document:user_documents(id)')
          .eq('id', importIdFilter)
          .maybeSingle();

        if (!primary.error && primary.data) {
          const importData = primary.data as Record<string, unknown>;
          const nestedDocument = importData.document as Record<string, unknown> | undefined;
          documentId = String(importData.document_id || nestedDocument?.id || '').trim() || null;
        } else {
          const compat = await supabase
            .from('imports')
            .select('document_id')
            .eq('id', importIdFilter)
            .maybeSingle();
          if (!compat.error && compat.data) {
            documentId = String((compat.data as Record<string, unknown>).document_id || '') || null;
          }
        }

        if (!cancelled) {
          setStatementDocumentId(documentId || null);
        }
      } finally {
        if (!cancelled) {
          setIsImportLinkLoading(false);
        }
      }
    };

    void loadImportLinks();
    return () => {
      cancelled = true;
    };
  }, [
    hasCommittedDocumentIdField,
    hasCommittedImportIdField,
    importIdFilter,
    isStatementView,
    scopedPendingTransactions,
    statementDocumentId,
  ]);

  const scopedTransactions = useMemo(() => {
    if (!isStatementView) return transactions;

    if (hasCommittedImportIdField) {
      return transactions.filter((tx) => String(tx.import_id || '') === importIdFilter);
    }

    if (!hasCommittedDocumentIdField || !statementDocumentId) {
      return [];
    }

    return transactions.filter((tx) => {
      const record = tx as Record<string, unknown>;
      const documentId = String(record.document_id || '').trim();
      return documentId === statementDocumentId;
    });
  }, [
    hasCommittedDocumentIdField,
    hasCommittedImportIdField,
    importIdFilter,
    isStatementView,
    statementDocumentId,
    transactions,
  ]);
  const { filters } = useTransactionFilters(scopedTransactions, scopedPendingTransactions);

  // State for selection and search
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<Transaction[] | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<CommittedTransaction | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  
  // State for Quick View dialog
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewMode, setQuickViewMode] = useState<TransactionsQuickViewMode>("all");

  // Calculate pending counts
  const pendingCount = scopedPendingTransactions.length;
  
  // Calculate stats for workspace panel
  const totalCount = scopedTransactions.length + scopedPendingTransactions.length;
  const monthCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return scopedTransactions.filter(tx => new Date(tx.posted_at) >= startOfMonth).length;
  }, [scopedTransactions]);
  const uncategorizedCount = useMemo(() => {
    const uncategorizedCommitted = scopedTransactions.filter(tx => !tx.category || tx.category === 'Uncategorized').length;
    const uncategorizedPending = scopedPendingTransactions.filter((ptx) => {
      const pendingCategory = (ptx.data_json as { category?: string }).category;
      return !pendingCategory || pendingCategory === 'Uncategorized';
    }).length;
    return uncategorizedCommitted + uncategorizedPending;
  }, [scopedTransactions, scopedPendingTransactions]);
  
  // Combine all transactions for search
  const allTransactions: Transaction[] = useMemo(() => {
    return [...scopedTransactions, ...scopedPendingTransactions];
  }, [scopedTransactions, scopedPendingTransactions]);
  const transactionSummary = useMemo(() => {
    const getSafeAmount = (tx: Transaction): number => {
      if ('merchant_name' in tx) {
        return Number.isFinite(tx.amount) ? tx.amount : 0;
      }
      const rawAmount = (tx as PendingTransaction)?.data_json?.amount;
      const parsed = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const getSafeDate = (tx: Transaction): string | null => {
      if ('merchant_name' in tx) {
        return tx.posted_at || null;
      }
      const pending = tx as PendingTransaction;
      return pending?.data_json?.date || pending?.parsed_at || null;
    };
    const amounts = allTransactions.map(getSafeAmount);
    const totalTransactions = amounts.length;
    const largestTransaction = amounts.length > 0 ? Math.max(...amounts.map((v) => Math.abs(v))) : 0;
    const largestExpense = amounts.length > 0 ? Math.max(0, ...amounts.filter((v) => v < 0).map((v) => Math.abs(v))) : 0;
    const totalIncome = amounts.filter((v) => v > 0).reduce((sum, v) => sum + v, 0);
    const totalSpending = Math.abs(amounts.filter((v) => v < 0).reduce((sum, v) => sum + v, 0));
    const averageTransaction = totalTransactions > 0
      ? amounts.reduce((sum, v) => sum + Math.abs(v), 0) / totalTransactions
      : 0;
    const allDates = allTransactions
      .map(getSafeDate)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return {
      totalTransactions,
      largestTransaction,
      largestExpense,
      totalIncome,
      totalSpending,
      averageTransaction,
      firstTransaction: allDates[0] || null,
      lastTransaction: allDates[allDates.length - 1] || null,
    };
  }, [allTransactions]);

  const filteredSearchCommitted = useMemo(
    () => (searchResults ? searchResults.filter((tx): tx is CommittedTransaction => 'merchant_name' in tx) : []),
    [searchResults]
  );
  const filteredSearchPending = useMemo(
    () => (searchResults ? searchResults.filter((tx): tx is PendingTransaction => 'data_json' in tx) : []),
    [searchResults]
  );

  // Use search results if available, otherwise use all transactions
  const displayTransactions = searchResults ? filteredSearchCommitted : scopedTransactions;
  const displayPending = searchResults ? filteredSearchPending : scopedPendingTransactions;
  const showCommittedNotLinkableNote = useMemo(() => {
    if (!isStatementView || hasCommittedImportIdField || transactions.length === 0) {
      return false;
    }
    if (!hasCommittedDocumentIdField) {
      return true;
    }
    if (isImportLinkLoading) {
      return false;
    }
    return !statementDocumentId;
  }, [
    hasCommittedDocumentIdField,
    hasCommittedImportIdField,
    isImportLinkLoading,
    isStatementView,
    statementDocumentId,
    transactions.length,
  ]);
  const importScopedCount = scopedTransactions.length + scopedPendingTransactions.length;
  const formatMoney = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 2,
    }).format(value);
  }, []);
  const formatDate = useCallback((value: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);
  const statementHeaderSummary = useMemo(() => {
    const parseAmount = (value: unknown): number => {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
      }
      if (typeof value === 'string') {
        const normalized = value.replace(/[^0-9.-]/g, '');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    const getSafeAmount = (tx: Transaction): number => {
      if ('merchant_name' in tx) {
        const record = tx as unknown as Record<string, unknown>;
        const type = String(record.type || '').toLowerCase();
        const direction = String(record.direction || '').toLowerCase();
        const isDebitFlag =
          record.is_debit === true ||
          direction === 'out' ||
          direction === 'debit' ||
          type === 'debit' ||
          type === 'expense';
        const isCreditFlag =
          direction === 'in' ||
          direction === 'credit' ||
          type === 'credit' ||
          type === 'income';
        let signed = parseAmount(record.amount);
        if (isDebitFlag && signed > 0) {
          signed = -Math.abs(signed);
        } else if (isCreditFlag && signed < 0) {
          signed = Math.abs(signed);
        }
        return signed;
      }
      const rawAmount = (tx as PendingTransaction)?.data_json?.amount;
      return parseAmount(rawAmount);
    };

    const visibleRows: Transaction[] = [...scopedTransactions, ...scopedPendingTransactions];
    const amounts = visibleRows.map(getSafeAmount);
    const statementTransactions = visibleRows.length;
    const income = amounts.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
    const spending = Math.abs(amounts.filter((value) => value < 0).reduce((sum, value) => sum + value, 0));
    const net = income - spending;
    const pendingReview = scopedPendingTransactions.length;
    const uncategorizedCommitted = scopedTransactions.filter(
      (tx) => !tx.category || tx.category === 'Uncategorized'
    ).length;
    const uncategorizedPending = scopedPendingTransactions.filter((ptx) => {
      const category = (ptx.data_json as { category?: string }).category;
      return !category || category === 'Uncategorized';
    }).length;

    return {
      statementTransactions,
      income,
      spending,
      net,
      pendingReview,
      uncategorized: uncategorizedCommitted + uncategorizedPending,
    };
  }, [scopedPendingTransactions, scopedTransactions]);

  const clearImportFilter = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.delete('importId');
    const nextSearch = params.toString();
    navigate({
      pathname: location.pathname,
      search: nextSearch ? `?${nextSearch}` : '',
    });
  }, [location.pathname, location.search, navigate]);

  // Handlers
  const handleBulkAction = useCallback((action: BulkActionType) => {
    const result = performBulkAction(action, allTransactions, selectedIds);
    toast.success(`${action} action: ${result.succeeded} succeeded, ${result.failed} failed`);
    // TODO: Wire to actual API mutations
    setSelectedIds(clearSelection());
  }, [allTransactions, selectedIds]);

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
  const hasLoadError = transactionsError || pendingError;
  const loadErrorMessage = transactionsErrorMessage || pendingErrorMessage || 'Failed to load transactions.';

  const handleRetryLoad = useCallback(async () => {
    await Promise.allSettled([refetchTransactions(), refetchPendingTransactions()]);
  }, [refetchTransactions, refetchPendingTransactions]);

  return (
    <>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        center={
          <div className="grid h-[calc(100vh-220px)] min-h-[520px] max-h-[780px] grid-cols-1 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
              {isStatementView && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
                      Statement View
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Import …{importIdFilter.slice(-8)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearImportFilter}
                    className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    Back to All Transactions
                  </button>
                </div>
              )}
              {isStatementView && (
                <div className="mb-3">
                  <StatementSummaryHeader
                    statementTransactions={statementHeaderSummary.statementTransactions}
                    income={statementHeaderSummary.income}
                    spending={statementHeaderSummary.spending}
                    net={statementHeaderSummary.net}
                    pendingReview={statementHeaderSummary.pendingReview}
                    uncategorized={statementHeaderSummary.uncategorized}
                    formatMoney={formatMoney}
                  />
                </div>
              )}
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Transactions workspace</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openQuickView('all')}
                    className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    View all
                  </button>
                  <button
                    type="button"
                    onClick={handleReviewClick}
                    className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    Pending review
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[11px] text-slate-400">Total</div>
                  <div className="text-sm font-semibold text-slate-100">{totalCount}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[11px] text-slate-400">This month</div>
                  <div className="text-sm font-semibold text-slate-100">{monthCount}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[11px] text-slate-400">Pending review</div>
                  <div className="text-sm font-semibold text-amber-300">{pendingCount}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <div className="text-[11px] text-slate-400">Uncategorized</div>
                  <div className="text-sm font-semibold text-slate-100">{uncategorizedCount}</div>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
              <div className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="border-b border-slate-800 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-100">Transactions</div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-md border border-slate-700 px-2 py-1">All transactions</span>
                    <span className="rounded-md border border-slate-700 px-2 py-1">Sort newest</span>
                    <span className="rounded-md border border-slate-700 px-2 py-1">Filters</span>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-800 p-4 flex-shrink-0">
                <SemanticSearch
                  allTransactions={allTransactions}
                  onResults={setSearchResults}
                />
              </div>

              {importIdFilter && (
                <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                  <div className="min-w-0 truncate">
                    Showing import <span className="font-semibold">…{importIdFilter.slice(-8)}</span> ({importScopedCount} records)
                  </div>
                  <button
                    type="button"
                    onClick={clearImportFilter}
                    className="shrink-0 rounded-md border border-cyan-300/40 px-2 py-1 text-[11px] text-cyan-100 hover:bg-cyan-400/20 transition-colors"
                  >
                    Clear filter
                  </button>
                </div>
              )}
              {showCommittedNotLinkableNote && (
                <div className="mx-4 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  Committed transactions can’t be linked to this import in this environment yet. Showing pending only.
                </div>
              )}

              <BulkActionsBar
                selectedCount={selectedIds.size}
                onAction={handleBulkAction}
                onClearSelection={handleClearSelection}
              />

              <div className="flex-1 min-h-0 overflow-hidden">
                {hasLoadError ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-sm text-amber-300">Could not load transactions right now.</p>
                    <p className="text-xs text-slate-400">{loadErrorMessage}</p>
                    <button
                      type="button"
                      onClick={() => {
                        void handleRetryLoad();
                      }}
                      className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : transactionsLoading || pendingLoading ? (
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

              <div className="hidden xl:flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Summary</div>
              </div>
              <div className="space-y-3 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total transactions</span>
                  <span className="font-semibold text-slate-100">{transactionSummary.totalTransactions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Largest transaction</span>
                  <span className="font-semibold text-emerald-400">{formatMoney(transactionSummary.largestTransaction)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Largest expense</span>
                  <span className="font-semibold text-red-400">{formatMoney(transactionSummary.largestExpense)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Average transaction</span>
                  <span className="font-semibold text-emerald-400">{formatMoney(transactionSummary.averageTransaction)}</span>
                </div>
                <div className="h-px bg-slate-800" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total income</span>
                  <span className="font-semibold text-emerald-400">{formatMoney(transactionSummary.totalIncome)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total spending</span>
                  <span className="font-semibold text-red-400">{formatMoney(transactionSummary.totalSpending)}</span>
                </div>
                <div className="h-px bg-slate-800" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">First transaction</span>
                  <span className="font-medium text-slate-200">{formatDate(transactionSummary.firstTransaction)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last transaction</span>
                  <span className="font-medium text-slate-200">{formatDate(transactionSummary.lastTransaction)}</span>
                </div>
              </div>
              </div>
            </div>
          </div>
        }
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


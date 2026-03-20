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
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { type TransactionsQuickViewMode } from '../../components/workspace/planning/TransactionsWorkspacePanel';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useTransactions } from '../../hooks/useTransactions';
import { usePendingTransactions } from '../../hooks/usePendingTransactions';
import { useImportList } from '../../hooks/useImportList';
import { MonthNavigator } from '../../components/transactions/MonthNavigator';
import { TransactionList } from '../../components/transactions/TransactionList';
import { useTransactionFilters } from '../../hooks/useTransactionFilters';
import { TransactionInsightDrawer } from '../../components/transactions/TransactionInsightDrawer';
import { StatementSummaryHeader } from '../../components/transactions/StatementSummaryHeader';
import { BulkActionsBar } from '../../components/transactions/BulkActionsBar';
import { SemanticSearch } from '../../components/transactions/SemanticSearch';
import { SplitTransactionModal } from '../../components/transactions/SplitTransactionModal';
import { TransactionsQuickView } from '../../components/transactions/TransactionsQuickView';
import { clearSelection, performBulkAction, type BulkActionType } from '../../lib/bulkOperations';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';
import { getSupabase } from '../../lib/supabase';
import { fetchCategoriesTree } from '../../lib/categories';
import { createCategoryRule } from '../../lib/categoryRules';
import { fetchPrimeSummarySingleFlight } from '../../lib/ai/primeSummaryClient';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import UnifiedAssistantChat from '../../components/chat/UnifiedAssistantChat';
import toast from 'react-hot-toast';

type Transaction = CommittedTransaction | PendingTransaction;
type WowPreviewRow = {
  id: string;
  posted_at: string;
  merchant_name: string;
  amount: number;
  category: string;
};
type DeviceImportNotice = {
  id: string;
  label: string;
  docName: string;
};
type StatementReviewRow = {
  id: string;
  source: 'committed' | 'pending';
  postedAt: string | null;
  merchant: string;
  amount: number;
  category: string;
  status: string;
  payload: CommittedTransaction | PendingTransaction;
};

function toInstitutionLabel(label: string): string {
  const raw = String(label || '').trim();
  if (!raw) return 'Statement';
  const issuerOnly = raw.split('•')[0]?.trim();
  const normalized = (issuerOnly || raw).trim();
  const hasInstitutionLikeText = /[A-Za-z]{3,}/.test(normalized);
  return hasInstitutionLikeText ? normalized : 'Statement';
}

export default function TransactionsPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { userId } = useAuth();
  const { openChat } = useUnifiedChatLauncher();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const importIdFilter = String(searchParams.get('importId') || '').trim();
  const isStatementView = importIdFilter.length > 0;
  const categoryFilter = String(searchParams.get('category') || '').trim();
  const statusFilter = String(searchParams.get('status') || '').trim();
  const focusFilter = String(searchParams.get('focus') || '').trim();
  const focusListFilter = String(searchParams.get('focusList') || '').trim();
  const highImpactMode = searchParams.get('highImpact') === '1';
  const focusListTokens = useMemo(
    () =>
      focusListFilter
        .split('|')
        .map((v) => v.trim())
        .filter(Boolean),
    [focusListFilter]
  );
  
  // Import list for MonthNavigator
  const { imports: importList, isLoading: importListLoading } = useImportList();
  const selectedImport = useMemo(
    () => importList.find((item) => item.id === importIdFilter) || null,
    [importList, importIdFilter]
  );
  const selectedStatementLabel = selectedImport?.statementLabel || selectedImport?.docName || 'Statement';
  const selectedStatementInstitution = toInstitutionLabel(selectedStatementLabel);
  const lastSeenImportIdRef = useRef<string | null>(null);
  const [deviceImportNotice, setDeviceImportNotice] = useState<DeviceImportNotice | null>(null);
  const [primeRecapSummary, setPrimeRecapSummary] = useState('');
  const [primeRecapLoading, setPrimeRecapLoading] = useState(false);
  const [primeRecapError, setPrimeRecapError] = useState<string | null>(null);
  const [isStatementReviewModalOpen, setIsStatementReviewModalOpen] = useState(false);
  const [isDiagnosticsPanelOpen, setIsDiagnosticsPanelOpen] = useState(false);
  const [highlightViewingScope, setHighlightViewingScope] = useState(false);

  const navigateToImportScope = useCallback((importId: string | null, opts?: { openStatementModal?: boolean; clearTableFilters?: boolean }) => {
    const params = new URLSearchParams(location.search);
    if (importId) {
      params.set('importId', importId);
    } else {
      params.delete('importId');
    }
    if (opts?.clearTableFilters) {
      params.delete('category');
      params.delete('status');
      params.delete('focus');
      params.delete('focusList');
      params.delete('highImpact');
    }
    const nextSearch = params.toString();
    navigate({
      pathname: location.pathname,
      search: nextSearch ? `?${nextSearch}` : '',
    });
    if (opts?.openStatementModal !== false) {
      setIsStatementReviewModalOpen(Boolean(importId));
    }
  }, [location.pathname, location.search, navigate]);
  const handleSelectMonth = useCallback((importId: string | null) => {
    navigateToImportScope(importId, { openStatementModal: true });
  }, [navigateToImportScope]);
  useEffect(() => {
    if (importListLoading || importList.length === 0) return;
    const newest = importList[0];
    if (!newest?.id) return;
    if (!lastSeenImportIdRef.current) {
      lastSeenImportIdRef.current = newest.id;
      return;
    }
    if (newest.id !== lastSeenImportIdRef.current && newest.id !== importIdFilter) {
      setDeviceImportNotice({
        id: newest.id,
        label: newest.label,
        docName: newest.docName,
      });
    }
    lastSeenImportIdRef.current = newest.id;
  }, [importList, importListLoading, importIdFilter]);
  useEffect(() => {
    if (!deviceImportNotice) return;
    if (importIdFilter === deviceImportNotice.id) {
      setDeviceImportNotice(null);
    }
  }, [deviceImportNotice, importIdFilter]);
  useEffect(() => {
    if (!isStatementView && isStatementReviewModalOpen) {
      setIsStatementReviewModalOpen(false);
    }
  }, [isStatementReviewModalOpen, isStatementView]);
  useEffect(() => {
    if (!highlightViewingScope || typeof window === 'undefined') return;
    const timeoutId = window.setTimeout(() => setHighlightViewingScope(false), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [highlightViewingScope]);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isDiagnosticsPanelOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDiagnosticsPanelOpen]);
  useEffect(() => {
    let cancelled = false;
    if (!importIdFilter) {
      setPrimeRecapSummary('');
      setPrimeRecapError(null);
      setPrimeRecapLoading(false);
      return;
    }
    const loadPrimeRecap = async () => {
      setPrimeRecapLoading(true);
      setPrimeRecapError(null);
      try {
        const { summary } = await fetchPrimeSummarySingleFlight({ importId: importIdFilter });
        if (cancelled) return;
        if (summary) {
          setPrimeRecapSummary(summary);
          return;
        }
        setPrimeRecapError('Prime recap is not ready yet for this statement.');
      } catch {
        if (!cancelled) {
          setPrimeRecapError('Could not load Prime recap right now.');
        }
      } finally {
        if (!cancelled) setPrimeRecapLoading(false);
      }
    };
    void loadPrimeRecap();
    return () => {
      cancelled = true;
    };
  }, [importIdFilter]);

  // Data hooks
  const {
    transactions,
    isLoading: transactionsLoading,
    isError: transactionsError,
    errorMessage: transactionsErrorMessage,
    refetch: refetchTransactions,
  } = useTransactions({
    importId: importIdFilter || null,
  });
  const {
    pendingTransactions,
    isLoading: pendingLoading,
    isError: pendingError,
    errorMessage: pendingErrorMessage,
    refetch: refetchPendingTransactions,
  } = usePendingTransactions({
    importId: importIdFilter || null,
    includeDuplicateChecks: false,
  });
  // Categories for inline editing
  const [categoryList, setCategoryList] = useState<string[]>([]);
  useEffect(() => {
    if (!userId) return;
    fetchCategoriesTree(userId).then((cats) => {
      setCategoryList(cats.map((c) => c.name));
    }).catch(() => {
      // silently fall back to TransactionRow's built-in default list
    });
  }, [userId]);
  const handleCategoryChange = useCallback((txId: string, category: string) => {
    // Rows handle optimistic updates; subscription/refetch reconciles authoritative state.
    void txId;
    void category;
  }, []);

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
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const showWowPreview = true;
  const [showClassicDiagnostics] = useState(false);
  const [wowSelectedIds, setWowSelectedIds] = useState<Set<string>>(new Set());
  const [wowGroupMode, setWowGroupMode] = useState<'none' | 'selected' | 'merchant' | 'category'>('none');
  const [wowPage, setWowPage] = useState(1);
  const [isGroupEditOpen, setIsGroupEditOpen] = useState(false);
  const [groupEditCategory, setGroupEditCategory] = useState('');
  const [dismissedGroupKeys, setDismissedGroupKeys] = useState<Record<string, true>>({});

  // State for selection and search
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<Transaction[] | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<CommittedTransaction | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedDrawerRow, setSelectedDrawerRow] = useState<
    { kind: 'committed'; transaction: CommittedTransaction } | { kind: 'pending'; transaction: PendingTransaction } | null
  >(null);
  
  // State for Quick View dialog
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewMode, setQuickViewMode] = useState<TransactionsQuickViewMode>("all");
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [selectedCategoryDrilldown, setSelectedCategoryDrilldown] = useState<string | null>(null);
  const [moveEditorTxId, setMoveEditorTxId] = useState<string | null>(null);
  const [moveEditorCategory, setMoveEditorCategory] = useState('');
  const [isMoveSaving, setIsMoveSaving] = useState(false);
  const [selectedCategoryDrawerTxId, setSelectedCategoryDrawerTxId] = useState<string | null>(null);
  const [selectedCategoryDrawerReceiptUrl, setSelectedCategoryDrawerReceiptUrl] = useState<string | null>(null);
  const [isCategoryDrawerReceiptLoading, setIsCategoryDrawerReceiptLoading] = useState(false);
  const wowRowsScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeRuleCount, setActiveRuleCount] = useState<number | null>(null);
  const [recentFeedbackCount, setRecentFeedbackCount] = useState<number | null>(null);
  const spendingBreakdownRef = useRef<HTMLDivElement | null>(null);
  const previewScopeRef = useRef<HTMLDivElement | null>(null);
  const deepLinkHandledRef = useRef<string>('');

  // Calculate pending counts
  const pendingCount = scopedPendingTransactions.length;
  
  // Calculate stats for workspace panel
  const totalCount = scopedTransactions.length + scopedPendingTransactions.length;
  const statementCount = importList.length;
  const latestStatementId = importList[0]?.id || null;
  const latestStatementLabel = importList[0]?.statementLabel || 'No recent statement';
  const latestStatementInstitution = toInstitutionLabel(latestStatementLabel);
  const committedCountByImport = useMemo(() => {
    const counts = new Map<string, number>();
    transactions.forEach((tx) => {
      const importId = String(tx.import_id || '').trim();
      if (!importId) return;
      counts.set(importId, (counts.get(importId) || 0) + 1);
    });
    return counts;
  }, [transactions]);
  const pendingCountByImport = useMemo(() => {
    const counts = new Map<string, number>();
    pendingTransactions.forEach((ptx) => {
      const record = ptx as unknown as Record<string, unknown>;
      const nestedImport = record.import as Record<string, unknown> | undefined;
      const importId = String(nestedImport?.id || ptx.import_id || '').trim();
      if (!importId) return;
      counts.set(importId, (counts.get(importId) || 0) + 1);
    });
    return counts;
  }, [pendingTransactions]);
  const statementQueueItems = useMemo(() => {
    return importList.slice(0, 5).map((imp) => {
      const committed = committedCountByImport.get(imp.id) || 0;
      const pending = pendingCountByImport.get(imp.id) || 0;
      const total = committed + pending;
      const status = String(imp.status || '').toLowerCase();
      const isDone = status.includes('committed') || status.includes('analyzed');
      const isFailed = status.includes('failed') || status.includes('error');
      const isReady = !isDone && !isFailed && (status.includes('parsed') || status.includes('ready') || status.includes('normalized'));
      const statusLabel = isFailed
        ? 'Needs attention'
        : isDone
          ? 'Ready in table'
          : isReady
            ? 'Ready to review'
            : 'Loading';
      return {
        ...imp,
        displayName: toInstitutionLabel(imp.statementLabel),
        committed,
        pending,
        total,
        isDone,
        isFailed,
        isReady,
        statusLabel,
      };
    });
  }, [committedCountByImport, importList, pendingCountByImport]);
  const activeQueueScopeItem = useMemo(
    () => statementQueueItems.find((item) => item.id === importIdFilter) || statementQueueItems[0] || null,
    [importIdFilter, statementQueueItems]
  );
  const viewingScopeName =
    activeQueueScopeItem?.displayName ||
    (isStatementView ? selectedStatementInstitution : latestStatementInstitution);
  const [lastSyncAtMs, setLastSyncAtMs] = useState<number>(() => Date.now());
  const [syncNowMs, setSyncNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const intervalId = window.setInterval(() => setSyncNowMs(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);
  useEffect(() => {
    if (transactionsLoading || pendingLoading || importListLoading) return;
    setLastSyncAtMs(Date.now());
  }, [
    importList.length,
    importListLoading,
    pendingLoading,
    pendingTransactions.length,
    transactions.length,
    transactionsLoading,
  ]);
  const viewingScopeMetaLabel = activeQueueScopeItem
    ? `${activeQueueScopeItem.label} · ${activeQueueScopeItem.statusLabel}`
    : null;
  const syncDeltaSec = Math.max(0, Math.floor((syncNowMs - lastSyncAtMs) / 1000));
  const syncLabel =
    syncDeltaSec < 10
      ? 'Last sync: just now'
      : syncDeltaSec < 60
        ? `Last sync: ${syncDeltaSec}s ago`
        : syncDeltaSec < 3600
          ? `Last sync: ${Math.floor(syncDeltaSec / 60)}m ago`
          : `Last sync: ${Math.floor(syncDeltaSec / 3600)}h ago`;
  const unclassifiedStatementCount = useMemo(() => {
    const importIds = new Set<string>();
    scopedTransactions.forEach((tx) => {
      if (!tx.category || tx.category === 'Uncategorized') {
        const id = String(tx.import_id || '').trim();
        if (id) importIds.add(id);
      }
    });
    scopedPendingTransactions.forEach((ptx) => {
      const category = String(ptx.tag_category || ptx.data_json?.category || '').trim();
      if (!category || category.toLowerCase() === 'uncategorized') {
        const id = String(ptx.import_id || '').trim();
        if (id) importIds.add(id);
      }
    });
    return importIds.size;
  }, [scopedPendingTransactions, scopedTransactions]);
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

  const categoryConfidenceRows = useMemo(() => {
    const buckets = new Map<
      string,
      {
        weightedScore: number;
        samples: number;
        txCount: number;
      }
    >();

    const addSample = (categoryRaw: string | null | undefined, score: number) => {
      const category = String(categoryRaw || 'Uncategorized').trim() || 'Uncategorized';
      const safeScore = Math.max(0, Math.min(1, score));
      const existing = buckets.get(category) || { weightedScore: 0, samples: 0, txCount: 0 };
      existing.weightedScore += safeScore;
      existing.samples += 1;
      existing.txCount += 1;
      buckets.set(category, existing);
    };

    // Committed transactions are generally higher confidence because they are approved.
    scopedTransactions.forEach((tx) => {
      const category = tx.category || 'Uncategorized';
      const score = category === 'Uncategorized' ? 0.2 : 0.92;
      addSample(category, score);
    });

    // Pending transactions carry model confidence (if available) and are most useful for training.
    scopedPendingTransactions.forEach((ptx) => {
      const pendingRecord = ptx as unknown as Record<string, unknown>;
      const tagCategory = String(pendingRecord.tag_category || '').trim();
      const dataCategory = String((ptx.data_json as { category?: string }).category || '').trim();
      const category = tagCategory || dataCategory || 'Uncategorized';
      const tagConfidence = Number(pendingRecord.tag_confidence);
      const derivedScore = Number.isFinite(tagConfidence)
        ? tagConfidence
        : category === 'Uncategorized'
          ? 0.22
          : 0.68;
      addSample(category, derivedScore);
    });

    return Array.from(buckets.entries())
      .map(([category, aggregate]) => {
        const avg = aggregate.samples > 0 ? aggregate.weightedScore / aggregate.samples : 0;
        const scorePct = Math.round(avg * 100);
        return {
          category,
          scorePct,
          txCount: aggregate.txCount,
          needsTraining: scorePct < 70 || category === 'Uncategorized',
        };
      })
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 8);
  }, [scopedPendingTransactions, scopedTransactions]);

  const focusCategoryTraining = useCallback((category: string, needsTraining: boolean) => {
    const params = new URLSearchParams(location.search);
    params.set('category', category);
    // Only force uncategorized queue when the clicked category itself is uncategorized.
    // For named categories (e.g. "Other"), keep status clear so matching rows actually show.
    const isUncategorizedCategory = category.trim().toLowerCase() === 'uncategorized';
    if (needsTraining && isUncategorizedCategory) {
      params.set('status', 'uncategorized');
    } else {
      params.delete('status');
    }
    const nextSearch = params.toString();
    navigate({
      pathname: location.pathname,
      search: nextSearch ? `?${nextSearch}` : '',
    });
  }, [location.pathname, location.search, navigate]);
  
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

  // Category breakdown for right panel — expenses only, grouped by category
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    scopedTransactions.forEach((tx) => {
      if (tx.amount >= 0) return;
      const cat = tx.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + Math.abs(tx.amount));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [scopedTransactions]);

  useEffect(() => {
    if (!focusFilter) {
      deepLinkHandledRef.current = '';
      return;
    }
    if (deepLinkHandledRef.current === focusFilter) return;
    if (categoryBreakdown.length === 0) return;

    const focusedCategory = categoryBreakdown.find(
      ([cat]) => cat.toLowerCase() === focusFilter.toLowerCase()
    )?.[0];

    if (spendingBreakdownRef.current) {
      spendingBreakdownRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (focusedCategory) {
      setSelectedCategoryDrilldown(focusedCategory);
      setCategoryDrawerOpen(true);
    }

    deepLinkHandledRef.current = focusFilter;
  }, [focusFilter, categoryBreakdown]);

  const categoryDrawerTransactions = useMemo(() => {
    if (!selectedCategoryDrilldown) return [] as CommittedTransaction[];
    return scopedTransactions
      .filter((tx) => (tx.category || 'Uncategorized') === selectedCategoryDrilldown)
      .sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
  }, [scopedTransactions, selectedCategoryDrilldown]);

  const categoryDrawerTotal = useMemo(
    () => categoryDrawerTransactions.reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0),
    [categoryDrawerTransactions]
  );

  const categoryChoices = useMemo(
    () => (categoryList.length > 0 ? categoryList : [
      'Food & Dining',
      'Groceries',
      'Transportation',
      'Entertainment',
      'Shopping',
      'Healthcare',
      'Utilities',
      'Travel',
      'Income',
      'Business',
      'Education',
      'Home & Garden',
      'Personal Care',
      'Subscriptions',
      'Bank Fees',
      'Transfers',
      'Other',
      'Uncategorized',
    ]),
    [categoryList]
  );

  const loadCategoryDrawerReceipt = useCallback(async (tx: CommittedTransaction) => {
    const supabase = getSupabase();
    if (!supabase) return null;
    const docId = String(tx.document_id || '').trim();
    if (!docId) return null;
    const { data } = await supabase
      .from('user_documents')
      .select('storage_path')
      .eq('id', docId)
      .maybeSingle();
    const storagePath = String((data as Record<string, unknown> | null)?.storage_path || '').trim();
    if (!storagePath) return null;
    for (const bucket of ['original_docs', 'redacted_docs']) {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      if (urlData?.publicUrl) return urlData.publicUrl;
    }
    return null;
  }, []);

  const handleQuickMoveCategory = useCallback(async (tx: CommittedTransaction, nextCategory: string) => {
    if (!userId || !nextCategory) return;
    const supabase = getSupabase();
    if (!supabase) {
      toast.error('Database connection unavailable');
      return;
    }
    setIsMoveSaving(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          category: nextCategory,
          category_source: 'manual',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tx.id)
        .eq('user_id', userId);
      if (error) {
        toast.error(`Move failed: ${error.message}`);
        return;
      }
      toast.success(`Moved to ${nextCategory}`);
      setMoveEditorTxId(null);
      setMoveEditorCategory('');
      await refetchTransactions();
    } finally {
      setIsMoveSaving(false);
    }
  }, [refetchTransactions, userId]);

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

  // URL-param filters: ?category=X and ?status=uncategorized
  const urlFilteredCommitted = useMemo(() => {
    let result = displayTransactions;
    if (categoryFilter) {
      const normalizedCategoryFilter = categoryFilter.trim().toLowerCase();
      result = result.filter(
        (tx) => String(tx.category || 'Uncategorized').trim().toLowerCase() === normalizedCategoryFilter
      );
    }
    if (focusFilter) {
      const normFocus = focusFilter.toLowerCase();
      result = result.filter((tx) => {
        const merchant = String(tx.merchant_name || '').toLowerCase();
        const category = String(tx.category || '').toLowerCase();
        return merchant.includes(normFocus) || category === normFocus;
      });
    }
    if (focusListTokens.length > 0) {
      const normalizedTokens = focusListTokens.map((token) => token.toLowerCase());
      result = result.filter((tx) => {
        const merchant = String(tx.merchant_name || '').toLowerCase();
        return normalizedTokens.some((token) => merchant.includes(token));
      });
    }
    if (statusFilter === 'uncategorized') {
      result = result.filter(
        (tx) => !tx.category || tx.category === 'Uncategorized'
      );
    }
    return result;
  }, [displayTransactions, categoryFilter, focusFilter, focusListTokens, statusFilter]);

  const urlFilteredPending = useMemo(() => {
    let result = displayPending;
    if (categoryFilter) {
      const normalizedCategoryFilter = categoryFilter.trim().toLowerCase();
      result = result.filter((ptx) => {
        const dj = ptx.data_json as Record<string, unknown>;
        const category = String(ptx.tag_category || (dj.category as string | undefined) || 'Uncategorized')
          .trim()
          .toLowerCase();
        return category === normalizedCategoryFilter;
      });
    }
    if (focusFilter) {
      const normFocus = focusFilter.toLowerCase();
      result = result.filter((ptx) => {
        const dj = ptx.data_json as Record<string, unknown>;
        const merchant = String(dj.merchant || dj.description || '').toLowerCase();
        const category = String(ptx.tag_category || (dj.category as string | undefined) || '').toLowerCase();
        return merchant.includes(normFocus) || category === normFocus;
      });
    }
    if (focusListTokens.length > 0) {
      const normalizedTokens = focusListTokens.map((token) => token.toLowerCase());
      result = result.filter((ptx) => {
        const dj = ptx.data_json as Record<string, unknown>;
        const merchant = String(dj.merchant || dj.description || '').toLowerCase();
        return normalizedTokens.some((token) => merchant.includes(token));
      });
    }
    if (statusFilter === 'uncategorized') return result;
    return result;
  }, [displayPending, categoryFilter, focusFilter, focusListTokens, statusFilter]);

  const highImpactHighlightIds = useMemo(() => {
    if (!highImpactMode) return new Set<string>();
    const picked = new Set<string>();

    const committedSorted = [...urlFilteredCommitted]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 12);
    committedSorted.forEach((tx) => {
      picked.add(tx.id);
    });

    const pendingSorted = [...urlFilteredPending]
      .map((tx) => ({
        id: tx.id,
        amount: Math.abs(Number((tx.data_json as Record<string, unknown>).amount || 0)),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
    pendingSorted.forEach((tx) => {
      picked.add(tx.id);
    });

    return picked;
  }, [highImpactMode, urlFilteredCommitted, urlFilteredPending]);
  const [activeHighlightIds, setActiveHighlightIds] = useState<Set<string>>(new Set());
  const highlightSignature = useMemo(
    () => Array.from(highImpactHighlightIds).sort().join('|'),
    [highImpactHighlightIds]
  );
  useEffect(() => {
    if (!highImpactMode || highImpactHighlightIds.size === 0) {
      setActiveHighlightIds(new Set());
      return;
    }
    setActiveHighlightIds(new Set(highImpactHighlightIds));
    const timer = window.setTimeout(() => {
      setActiveHighlightIds(new Set());
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [highImpactMode, highlightSignature, highImpactHighlightIds]);
  useEffect(() => {
    if (!highImpactMode || activeHighlightIds.size === 0) return;
    const firstId = Array.from(activeHighlightIds)[0];
    if (!firstId) return;
    const el = document.getElementById(`tx-row-${firstId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeHighlightIds, highImpactMode]);

  const smartPendingGroup = useMemo(() => {
    const normalizeLabel = (value: string): string =>
      value
        .toLowerCase()
        .replace(/[_\-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();

    const buckets = new Map<
      string,
      {
        ids: string[];
        amount: number;
        label: string;
      }
    >();

    for (const tx of urlFilteredPending) {
      const dj = tx.data_json as Record<string, unknown>;
      const rawLabel = String(dj.merchant || dj.description || 'Unknown transaction').trim();
      const normalized = normalizeLabel(rawLabel);
      const amountRaw = Number(dj.amount ?? 0);
      const amount = Number.isFinite(amountRaw) ? Math.abs(amountRaw) : 0;
      const key = `${amount.toFixed(2)}|${normalized || 'unknown'}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.ids.push(tx.id);
      } else {
        buckets.set(key, {
          ids: [tx.id],
          amount,
          label: rawLabel || 'Unknown transaction',
        });
      }
    }

    const candidates = Array.from(buckets.entries())
      .map(([key, value]) => ({ key, ...value }))
      .filter((entry) => entry.ids.length >= 3)
      .sort((a, b) => b.ids.length - a.ids.length);

    const top = candidates[0];
    if (!top) return null;
    if (dismissedGroupKeys[top.key]) return null;
    return top;
  }, [urlFilteredPending, dismissedGroupKeys]);

  const suggestedGroupCategory = useMemo(() => {
    if (!smartPendingGroup) return 'Entertainment';
    const label = smartPendingGroup.label.toLowerCase();
    if (/(netflix|spotify|youtube|disney|prime video|apple music|audible)/i.test(label)) return 'Entertainment';
    if (/(uber|lyft|taxi|petro|shell|esso|gas)/i.test(label)) return 'Transportation';
    if (/(tim hortons|starbucks|restaurant|cafe|coffee|pizza|food)/i.test(label)) return 'Food & Dining';
    if (/(subscription|monthly|annual)/i.test(label)) return 'Subscriptions';
    return 'Entertainment';
  }, [smartPendingGroup]);

  useEffect(() => {
    if (!smartPendingGroup) return;
    setGroupEditCategory(suggestedGroupCategory);
  }, [smartPendingGroup?.key, suggestedGroupCategory]);

  const ruleOpportunityRows = useMemo(() => {
    const normalize = (value: string) =>
      value.toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const buckets = new Map<string, { label: string; count: number; suggested: string }>();
    for (const ptx of scopedPendingTransactions) {
      const dj = ptx.data_json as Record<string, unknown>;
      const merchant = String(dj.merchant || dj.description || '').trim();
      if (!merchant) continue;
      const key = normalize(merchant);
      if (!key) continue;
      const current = buckets.get(key) || {
        label: merchant,
        count: 0,
        suggested: String(ptx.tag_category || (dj.category as string | undefined) || 'Uncategorized'),
      };
      current.count += 1;
      if (current.label.length > merchant.length) current.label = merchant;
      buckets.set(key, current);
    }
    return Array.from(buckets.values())
      .filter((row) => row.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [scopedPendingTransactions]);

  const inferRuleCategory = useCallback((merchantLabel: string, fallback?: string) => {
    const label = String(merchantLabel || '').toLowerCase();
    if (/(sobeys|walmart|costco|superstore|metro|nofrills|loblaws|grocery)/i.test(label)) return 'Groceries';
    if (/(netflix|spotify|disney|prime video|youtube|subscription|audible|apple music)/i.test(label)) return 'Subscriptions';
    if (/(shell|petro|esso|gas|fuel|chevron|mobil|husky)/i.test(label)) return 'Transportation';
    if (/(tim hortons|starbucks|restaurant|cafe|coffee|pizza|food|uber eats|doordash|skip)/i.test(label)) return 'Food & Dining';
    if (/(uber|lyft|taxi|transit|bus|train|parking)/i.test(label)) return 'Transportation';
    if (fallback && fallback !== 'Uncategorized') return fallback;
    return 'Other';
  }, []);
  const ruleSuggestionChips = useMemo(() => {
    const seen = new Set<string>();
    const chips: Array<{ merchant: string; category: string; count: number }> = [];
    for (const row of ruleOpportunityRows) {
      const merchant = String(row.label || '').trim();
      if (!merchant) continue;
      const key = merchant.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      chips.push({
        merchant,
        category: inferRuleCategory(merchant, row.suggested),
        count: row.count,
      });
      if (chips.length >= 3) break;
    }
    if (chips.length < 3) {
      const fallbackCounts = new Map<string, number>();
      for (const tx of allTransactions) {
        const merchant = 'merchant_name' in tx
          ? String(tx.merchant_name || '').trim()
          : String((tx.data_json as Record<string, unknown>).merchant || (tx.data_json as Record<string, unknown>).description || '').trim();
        if (!merchant) continue;
        const key = merchant.toLowerCase();
        fallbackCounts.set(key, (fallbackCounts.get(key) || 0) + 1);
      }
      const fallbackRows = Array.from(fallbackCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
      for (const [merchantKey, count] of fallbackRows) {
        if (chips.length >= 3) break;
        if (seen.has(merchantKey)) continue;
        seen.add(merchantKey);
        const merchant = merchantKey.replace(/\b\w/g, (c) => c.toUpperCase());
        chips.push({
          merchant,
          category: inferRuleCategory(merchant),
          count,
        });
      }
    }
    return chips;
  }, [allTransactions, inferRuleCategory, ruleOpportunityRows]);
  const [isRuleCreateSaving, setIsRuleCreateSaving] = useState<string | null>(null);
  const handleCreateRuleFromChip = useCallback(async (merchant: string, category: string) => {
    if (!userId || !merchant || !category) return;
    setIsRuleCreateSaving(merchant);
    try {
      const result = await createCategoryRule(userId, merchant, category, 'contains');
      if (!result.ok) {
        toast.error('Could not create rule');
        return;
      }
      toast.success(`Rule added: ${merchant} -> ${category}`);
      setActiveRuleCount((prev) => (typeof prev === 'number' ? prev + 1 : prev));
    } finally {
      setIsRuleCreateSaving(null);
    }
  }, [userId]);

  const uncertainQueue = useMemo(() => {
    const total = scopedPendingTransactions.length;
    const uncertain = scopedPendingTransactions.filter((ptx) => {
      const score = Number((ptx as unknown as Record<string, unknown>).tag_confidence);
      const hasLowConfidence = Number.isFinite(score) ? score < 0.7 : ptx.confidence.overall < 0.75;
      const category = String(ptx.tag_category || (ptx.data_json as { category?: string }).category || 'Uncategorized');
      return hasLowConfidence || category === 'Uncategorized';
    }).length;
    const pct = total > 0 ? Math.round((uncertain / total) * 100) : 0;
    return { uncertain, total, pct };
  }, [scopedPendingTransactions]);

  const recentLearningRows = useMemo(() => {
    const sourceCounts = {
      vendor_memory: 0,
      rules: 0,
      ai: 0,
    };
    scopedPendingTransactions.forEach((ptx) => {
      const src = String((ptx as unknown as Record<string, unknown>).tag_rule_source || '').toLowerCase();
      if (src === 'vendor_memory') sourceCounts.vendor_memory += 1;
      else if (src === 'rules') sourceCounts.rules += 1;
      else if (src === 'ai') sourceCounts.ai += 1;
    });
    return [
      { label: 'Memory matches', value: sourceCounts.vendor_memory, tone: 'text-emerald-300' },
      { label: 'Rule-based tags', value: sourceCounts.rules, tone: 'text-cyan-300' },
      { label: 'AI-assisted tags', value: sourceCounts.ai, tone: 'text-violet-300' },
      { label: 'Manual corrections (30d)', value: recentFeedbackCount ?? 0, tone: 'text-amber-300' },
    ];
  }, [recentFeedbackCount, scopedPendingTransactions]);

  const focusUncertainQueue = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.set('status', 'uncategorized');
    const nextSearch = params.toString();
    navigate({
      pathname: location.pathname,
      search: nextSearch ? `?${nextSearch}` : '',
    });
  }, [location.pathname, location.search, navigate]);

  const focusRuleOpportunity = useCallback((merchantLabel: string) => {
    const normalized = merchantLabel.toLowerCase();
    const focused = allTransactions.filter((tx) => {
      if ('merchant_name' in tx) {
        return String(tx.merchant_name || '').toLowerCase().includes(normalized);
      }
      const dj = tx.data_json as Record<string, unknown>;
      return String(dj.merchant || dj.description || '').toLowerCase().includes(normalized);
    });
    setSearchResults(focused);
    toast(`Focused on "${merchantLabel}" for quick rule creation.`);
  }, [allTransactions]);

  useEffect(() => {
    let cancelled = false;
    const loadWorkspaceSignals = async () => {
      if (!userId) {
        if (!cancelled) {
          setActiveRuleCount(null);
          setRecentFeedbackCount(null);
        }
        return;
      }
      const supabase = getSupabase();
      if (!supabase) return;
      const days30AgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const [rulesResult, feedbackResult] = await Promise.all([
          supabase
            .from('vendor_category_memory')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('tag_category_feedback')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', days30AgoIso),
        ]);

        if (!cancelled) {
          setActiveRuleCount(rulesResult.error ? null : (rulesResult.count ?? 0));
          setRecentFeedbackCount(feedbackResult.error ? null : (feedbackResult.count ?? 0));
        }
      } catch {
        if (!cancelled) {
          setActiveRuleCount(null);
          setRecentFeedbackCount(null);
        }
      }
    };

    void loadWorkspaceSignals();
    return () => {
      cancelled = true;
    };
  }, [userId, scopedPendingTransactions.length]);

  const clearCategoryFilter = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.delete('category');
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' });
  }, [location.pathname, location.search, navigate]);

  const clearStatusFilter = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.delete('status');
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' });
  }, [location.pathname, location.search, navigate]);
  const clearFocusFilter = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.delete('focus');
    params.delete('focusList');
    params.delete('highImpact');
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' });
  }, [location.pathname, location.search, navigate]);
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
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    // Guard against OCR date-parsing artifacts that produce ancient years
    // (e.g. "0119-12-31" parsed from a 2-digit year gets interpreted as 119 AD)
    const year = d.getFullYear();
    if (year < 1900 || year > 2100) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);
  const wowPreviewRows = useMemo<WowPreviewRow[]>(() => {
    const liveRows = urlFilteredCommitted.map((tx) => ({
      id: tx.id,
      posted_at: tx.posted_at,
      merchant_name: tx.merchant_name || 'Unknown merchant',
      amount: Number(tx.amount || 0),
      category: tx.category || 'Uncategorized',
    }));
    return liveRows;
  }, [urlFilteredCommitted]);
  const wowVisibleRows = useMemo(() => {
    if (wowGroupMode === 'selected') {
      return wowPreviewRows.filter((row) => wowSelectedIds.has(row.id));
    }
    if (wowGroupMode === 'merchant') {
      const merchantTotals = new Map<string, number>();
      wowPreviewRows.forEach((row) => {
        merchantTotals.set(row.merchant_name, (merchantTotals.get(row.merchant_name) || 0) + Math.abs(row.amount));
      });
      const topMerchant = Array.from(merchantTotals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
      return topMerchant ? wowPreviewRows.filter((row) => row.merchant_name === topMerchant) : wowPreviewRows;
    }
    if (wowGroupMode === 'category') {
      const categoryTotals = new Map<string, number>();
      wowPreviewRows.forEach((row) => {
        categoryTotals.set(row.category, (categoryTotals.get(row.category) || 0) + Math.abs(row.amount));
      });
      const topCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
      return topCategory ? wowPreviewRows.filter((row) => row.category === topCategory) : wowPreviewRows;
    }
    return wowPreviewRows;
  }, [wowGroupMode, wowPreviewRows, wowSelectedIds]);
  const wowGroupTotal = useMemo(
    () => wowVisibleRows.reduce((sum, row) => sum + Math.abs(row.amount), 0),
    [wowVisibleRows]
  );
  const wowPageSize = 10;
  const scopeChipCount = wowVisibleRows.length;
  const viewingScopePrefix = isStatementView ? 'Viewing' : 'Queue focus';
  const viewingScopeDisplayName = viewingScopeName || (isStatementView ? 'Statement' : 'All statements');
  const viewingScopeChipLabel = `${viewingScopePrefix}: ${viewingScopeDisplayName} (${scopeChipCount} transaction${scopeChipCount === 1 ? '' : 's'})`;
  const wowTotalPages = useMemo(
    () => Math.max(1, Math.ceil(wowVisibleRows.length / wowPageSize)),
    [wowVisibleRows.length]
  );
  const wowPagedRows = useMemo(() => {
    const start = (wowPage - 1) * wowPageSize;
    return wowVisibleRows.slice(start, start + wowPageSize);
  }, [wowPage, wowVisibleRows]);
  const wowPageButtons = useMemo<Array<number | '…'>>(() => {
    if (wowTotalPages <= 7) {
      return Array.from({ length: wowTotalPages }, (_, idx) => idx + 1);
    }
    const pages = new Set<number>([1, wowTotalPages, wowPage - 1, wowPage, wowPage + 1]);
    const normalized = Array.from(pages)
      .filter((p) => p >= 1 && p <= wowTotalPages)
      .sort((a, b) => a - b);
    const output: Array<number | '…'> = [];
    for (let i = 0; i < normalized.length; i += 1) {
      const current = normalized[i];
      const prev = normalized[i - 1];
      if (i > 0 && prev !== undefined && current - prev > 1) {
        output.push('…');
      }
      output.push(current);
    }
    return output;
  }, [wowPage, wowTotalPages]);
  useEffect(() => {
    setWowPage(1);
  }, [wowGroupMode, importIdFilter]);
  useEffect(() => {
    if (wowPage <= wowTotalPages) return;
    setWowPage(wowTotalPages);
  }, [wowPage, wowTotalPages]);
  useEffect(() => {
    wowRowsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [wowPage]);
  const statementReviewRows = useMemo<StatementReviewRow[]>(() => {
    const committedRows: StatementReviewRow[] = scopedTransactions.map((tx) => ({
      id: tx.id,
      source: 'committed',
      postedAt: tx.posted_at || null,
      merchant: tx.merchant_name || 'Unknown merchant',
      amount: Number(tx.amount || 0),
      category: tx.category || 'Uncategorized',
      status: 'committed',
      payload: tx,
    }));

    const pendingRows: StatementReviewRow[] = scopedPendingTransactions.map((ptx) => {
      const data = ptx.data_json || {};
      const pendingCategory = ptx.tag_category || data.category || 'Uncategorized';
      const pendingStatus = ptx.tag_status || (ptx.needsReview ? 'needs_review' : 'pending');
      return {
        id: ptx.id,
        source: 'pending',
        postedAt: data.date || ptx.parsed_at || null,
        merchant: data.merchant || data.description || 'Unknown merchant',
        amount: Number(data.amount || 0),
        category: String(pendingCategory),
        status: String(pendingStatus),
        payload: ptx,
      };
    });

    return [...committedRows, ...pendingRows].sort((a, b) => {
      const ta = Date.parse(a.postedAt || '');
      const tb = Date.parse(b.postedAt || '');
      if (!Number.isNaN(ta) && !Number.isNaN(tb)) return tb - ta;
      if (!Number.isNaN(ta)) return -1;
      if (!Number.isNaN(tb)) return 1;
      return 0;
    });
  }, [scopedPendingTransactions, scopedTransactions]);
  const selectStatementFromPanel = useCallback((importId: string | null) => {
    setIsDiagnosticsPanelOpen(false);
    setHighlightViewingScope(true);
    navigateToImportScope(importId, { openStatementModal: false, clearTableFilters: true });
  }, [navigateToImportScope]);
  const handleViewingScopeClick = useCallback(() => {
    setHighlightViewingScope(true);
    navigateToImportScope(null, { openStatementModal: false, clearTableFilters: true });
  }, [navigateToImportScope]);
  const handleSelectMonthInTable = useCallback((importId: string | null) => {
    setHighlightViewingScope(true);
    navigateToImportScope(importId, { openStatementModal: false, clearTableFilters: true });
  }, [navigateToImportScope]);
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
    const spending = amounts.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
    const income = Math.abs(amounts.filter((value) => value < 0).reduce((sum, value) => sum + value, 0));
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
  const focusUncategorizedTransactions = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.set('category', 'Uncategorized');
    params.delete('focus');
    params.delete('focusList');
    params.delete('highImpact');
    navigate({
      pathname: location.pathname,
      search: params.toString() ? `?${params.toString()}` : '',
    });
  }, [location.pathname, location.search, navigate]);
  const openPrimeBriefingFromPanel = useCallback(() => {
    setIsDiagnosticsPanelOpen(false);
    openChat({
      initialEmployeeSlug: 'prime-boss',
      context: {
        page: 'transactions',
        panel: 'diagnostics-side',
        importId: importIdFilter || null,
        scope: isStatementView ? 'statement' : 'all-statements',
        kickoff: 'review-unclassified-statements',
      },
    });
  }, [importIdFilter, isStatementView, openChat]);
  const openPrimeFromTransactions = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'prime-boss',
      context: {
        page: 'transactions',
        importId: importIdFilter || null,
        scope: isStatementView ? 'statement' : 'all-statements',
      },
    });
  }, [importIdFilter, isStatementView, openChat]);
  const aiScopeLockLabel = useMemo(() => {
    if (isStatementView) return selectedStatementInstitution;
    return 'All statements';
  }, [isStatementView, selectedStatementInstitution]);
  const aiScopeLockCount = isStatementView
    ? importScopedCount
    : urlFilteredCommitted.length + urlFilteredPending.length;

  // Tag AI bulk categorization — calls tag-categorize-batch once per unique importId
  const [isTagRunning, setIsTagRunning] = useState(false);
  const handleCategorizeWithTagAI = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error('Session expired — please refresh');
      return;
    }

    const uniqueImportIds = [...new Set(
      scopedPendingTransactions.map((p) => p.import_id).filter(Boolean)
    )];
    if (uniqueImportIds.length === 0) {
      toast('No pending transactions to categorize');
      return;
    }

    setIsTagRunning(true);
    let totalCategorized = 0;
    let totalErrors = 0;

    for (const importId of uniqueImportIds) {
      try {
        const res = await fetch('/.netlify/functions/tag-categorize-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ importId, limit: 200, maxAiCallsPerRun: 50 }),
        });
        const json = await res.json() as { ok: boolean; updated?: number };
        if (json.ok) {
          totalCategorized += json.updated ?? 0;
        } else {
          totalErrors++;
        }
      } catch {
        totalErrors++;
      }
    }

    setIsTagRunning(false);
    if (totalErrors > 0 && totalCategorized === 0) {
      toast.error('Tag AI categorization failed — check console');
    } else if (totalErrors > 0) {
      toast.success(`Tag AI categorized ${totalCategorized} transactions (${totalErrors} import(s) failed)`);
    } else {
      toast.success(`Tag AI categorized ${totalCategorized} transaction${totalCategorized !== 1 ? 's' : ''}`);
    }
    // Real-time subscription on usePendingTransactions handles the refresh
  }, [scopedPendingTransactions]);

  const approvePendingBatch = useCallback(async (pendingIds: string[], categoryOverride?: string) => {
    if (!userId || pendingIds.length === 0) return false;
    const supabase = getSupabase();
    if (!supabase) return false;

    const idSet = new Set(pendingIds);
    const targets = pendingTransactions.filter((p) => idSet.has(p.id));
    if (targets.length === 0) return false;
    const now = new Date().toISOString();

    const inserts = targets.map((pending) => {
      const dj = pending.data_json as Record<string, unknown>;
      const parsedAmount = Number(dj.amount ?? 0);
      const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
      const category =
        categoryOverride ||
        pending.tag_category ||
        (dj.category as string | undefined) ||
        null;
      const parsedDate = dj.date ? new Date(String(dj.date)) : null;
      const posted_at =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toISOString()
          : now;
      return {
        user_id: userId,
        posted_at,
        merchant_name: String(dj.merchant || dj.description || 'Unknown merchant'),
        amount,
        category,
        import_id: pending.import_id,
        created_at: now,
        updated_at: now,
      };
    });

    const { error: insertError } = await supabase.from('transactions').insert(inserts);

    if (insertError) {
      toast.error(`Approve failed: ${insertError.message}`);
      return false;
    }

    const { error: deleteError } = await supabase
      .from('transactions_staging')
      .delete()
      .in('id', pendingIds)
      .eq('user_id', userId);

    if (deleteError) {
      toast.error(`Cleanup failed: ${deleteError.message}`);
      return false;
    }

    toast.success(
      pendingIds.length === 1
        ? 'Transaction approved'
        : `Approved ${pendingIds.length} transactions`
    );
    return true;
  }, [pendingTransactions, userId]);

  // Approve a single pending (staging) transaction → commits it to the transactions table
  const handleApprove = useCallback(async (pendingId: string) => {
    await approvePendingBatch([pendingId]);
  }, [approvePendingBatch]);

  const handleApproveSmartGroup = useCallback(async () => {
    if (!smartPendingGroup) return;
    const ok = await approvePendingBatch(smartPendingGroup.ids);
    if (ok) {
      setDismissedGroupKeys((prev) => ({ ...prev, [smartPendingGroup.key]: true }));
      setIsGroupEditOpen(false);
    }
  }, [approvePendingBatch, smartPendingGroup]);

  const handleApproveSmartGroupWithCategory = useCallback(async () => {
    if (!smartPendingGroup) return;
    const category = (groupEditCategory || suggestedGroupCategory || 'Entertainment').trim();
    const ok = await approvePendingBatch(smartPendingGroup.ids, category);
    if (ok) {
      setDismissedGroupKeys((prev) => ({ ...prev, [smartPendingGroup.key]: true }));
      setIsGroupEditOpen(false);
    }
  }, [approvePendingBatch, groupEditCategory, smartPendingGroup, suggestedGroupCategory]);

  const handleIgnoreSmartGroup = useCallback(() => {
    if (!smartPendingGroup) return;
    setDismissedGroupKeys((prev) => ({ ...prev, [smartPendingGroup.key]: true }));
    setIsGroupEditOpen(false);
  }, [smartPendingGroup]);

  // Reject a single pending transaction → removes it from staging
  const handleReject = useCallback(async (pendingId: string) => {
    if (!userId) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('transactions_staging')
      .delete()
      .eq('id', pendingId)
      .eq('user_id', userId);

    if (error) {
      toast.error(`Reject failed: ${error.message}`);
      return;
    }
    toast.success('Transaction rejected');
  }, [userId]);

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
    if (isPending && 'data_json' in tx) {
      setSelectedDrawerRow({ kind: 'pending', transaction: tx });
      setDetailDrawerOpen(true);
      return;
    }
    if (!isPending && 'merchant_name' in tx) {
      setSelectedDrawerRow({ kind: 'committed', transaction: tx });
      setDetailDrawerOpen(true);
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
          <div className="grid min-h-[560px] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-100">
                  Transactions Workspace · Tag
                </div>
                <div />
              </div>

              {isStatementView && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
                      Statement View
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {selectedStatementInstitution}
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
              <div className={`mb-3 flex items-center justify-between ${showClassicDiagnostics ? '' : 'hidden'}`}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Transactions workspace</div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    System Status: Optimized
                  </div>
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
              {!isStatementView && showClassicDiagnostics && (
                <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/55 px-3 py-2 text-[11px] text-slate-300">
                  Viewing all statements. Each row now shows a source tag like
                  <span className="mx-1 rounded border border-cyan-400/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200">
                    Statement 1a2b3c4d
                  </span>
                  so you can tell uploads apart quickly.
                </div>
              )}
              <div className={`grid grid-cols-2 gap-2 md:grid-cols-4 ${showClassicDiagnostics ? '' : 'hidden'}`}>
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

              <div className={`mt-3 rounded-lg border border-slate-800 bg-slate-900/55 p-3 ${showClassicDiagnostics ? '' : 'hidden'}`}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    AI Confidence Heatmap
                  </div>
                  <div className="text-[10px] text-slate-500">Click category to train</div>
                </div>
                {categoryConfidenceRows.length === 0 ? (
                  <div className="text-[11px] text-slate-500 py-1">No category confidence data yet.</div>
                ) : (
                  <div className="space-y-1.5">
                    {categoryConfidenceRows.map((row) => {
                      const toneClass =
                        row.scorePct >= 85
                          ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                          : row.scorePct >= 70
                            ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                            : 'text-red-300 border-red-500/30 bg-red-500/10';
                      const barClass =
                        row.scorePct >= 85
                          ? 'bg-emerald-400'
                          : row.scorePct >= 70
                            ? 'bg-amber-400'
                            : 'bg-red-400';
                      return (
                        <button
                          key={row.category}
                          type="button"
                          onClick={() => focusCategoryTraining(row.category, row.needsTraining)}
                          className="w-full rounded-md border border-slate-800 px-2 py-1.5 text-left hover:bg-slate-800/80 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{row.category}</span>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${toneClass}`}>
                              {row.scorePct >= 50 ? `${row.scorePct}%` : '—'}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full ${barClass}`}
                              style={{ width: `${row.scorePct >= 50 ? Math.max(4, Math.min(100, row.scorePct)) : 0}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                            <span>{row.txCount} tx</span>
                            <span>{row.needsTraining ? 'Needs training' : 'Healthy'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`mt-3 grid grid-cols-1 gap-2 md:grid-cols-3 ${showClassicDiagnostics ? '' : 'hidden'}`}>
                <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Rule Opportunities</div>
                    <div className="text-[10px] text-slate-500">
                      Active rules: {activeRuleCount ?? '—'}
                    </div>
                  </div>
                  {ruleSuggestionChips.length === 0 ? (
                    <div className="text-[11px] text-slate-500">No repeated merchant patterns yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5">
                      {ruleSuggestionChips.map((chip) => (
                        <div
                          key={`${chip.merchant}-${chip.category}`}
                          className="flex items-center gap-1.5 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => focusRuleOpportunity(chip.merchant)}
                            className="min-w-0 flex-1 text-left"
                            title={`Focus ${chip.merchant}`}
                          >
                            <div className="truncate text-[11px] font-medium text-violet-100">
                              Rule: {chip.merchant} -&gt; {chip.category}?
                            </div>
                            <div className="text-[10px] text-violet-200/70">{chip.count} matching tx</div>
                          </button>
                          <button
                            type="button"
                            disabled={isRuleCreateSaving === chip.merchant}
                            onClick={() => { void handleCreateRuleFromChip(chip.merchant, chip.category); }}
                            className="rounded border border-violet-300/40 px-1.5 py-0.5 text-[10px] font-semibold text-violet-100 hover:bg-violet-500/25 disabled:opacity-60"
                            title="Create rule"
                          >
                            {isRuleCreateSaving === chip.merchant ? '…' : '+'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Uncertain Queue</div>
                  <div className="text-2xl font-semibold text-amber-300">{uncertainQueue.uncertain}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    of {uncertainQueue.total} pending ({uncertainQueue.pct}%)
                  </div>
                  <button
                    type="button"
                    onClick={focusUncertainQueue}
                    className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-500/20 transition-colors"
                  >
                    Review uncertain
                  </button>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recent Events</div>
                  <div className="space-y-1.5 font-mono text-[10px]">
                    {importScopedCount > 0 ? (
                      <div className="text-emerald-300">{"✅"} Import loaded · {importScopedCount} records</div>
                    ) : null}
                    {recentLearningRows
                      .filter((row) => row.value > 0)
                      .slice(0, 3)
                      .map((row) => (
                        <div key={row.label} className="text-slate-300">
                          {"✦"} {row.value} {row.label}
                        </div>
                      ))}
                    {ruleSuggestionChips.length > 0 ? (
                      <div className="text-violet-300">{"🧠"} {ruleSuggestionChips.length} rule opportunities detected</div>
                    ) : null}
                    {importScopedCount === 0 && recentLearningRows.every((row) => row.value === 0) ? (
                      <div className="text-slate-500">System idle · no recent pipeline events</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className={`grid min-h-0 grid-cols-1 gap-4 ${showWowPreview ? '' : 'xl:grid-cols-[290px_minmax(0,1fr)]'}`}>
              <div className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900 overflow-hidden xl:order-2">
              {!showWowPreview && (
                <>
              <div className="border-b border-slate-800 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-100">Transactions</div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {pendingCount > 0 && (
                      <button
                        type="button"
                        onClick={() => { void handleCategorizeWithTagAI(); }}
                        disabled={isTagRunning}
                        className="flex items-center gap-1.5 rounded-md border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {isTagRunning ? (
                          <>
                            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                            Categorizing…
                          </>
                        ) : (
                          <>✦ Tag AI ({pendingCount})</>
                        )}
                      </button>
                    )}
                    <span className="rounded-md border border-slate-700 px-2 py-1">
                      {urlFilteredCommitted.length} transaction{urlFilteredCommitted.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))}
                      className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:border-violet-500/40 hover:text-violet-300 transition-colors"
                    >
                      Sort {sortOrder === 'newest' ? '↓ newest' : '↑ oldest'}
                    </button>
                    <span className="rounded-md border border-slate-700 px-2 py-1 opacity-40 cursor-default select-none">Filters</span>
                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (importIdFilter) params.set('importId', importIdFilter);
                        params.set('handoff', 'transactions_to_tag');
                        const qs = params.toString();
                        navigate(`/dashboard/smart-categories${qs ? `?${qs}` : ''}`);
                      }}
                      className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:border-violet-500/50 hover:text-violet-300 transition-colors"
                    >
                      Smart Categories ↗
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-b border-slate-800 bg-slate-900/85 px-3 py-2">
                <MonthNavigator
                  imports={importListLoading ? [] : importList}
                  currentImportId={importIdFilter || null}
                  onSelect={handleSelectMonthInTable}
                />
              </div>

              <div className="border-b border-slate-800 p-4 flex-shrink-0">
                <SemanticSearch
                  allTransactions={allTransactions}
                  onResults={setSearchResults}
                />
              </div>
              {deviceImportNotice && (
                <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                  <div className="min-w-0">
                    <div className="truncate">
                      New statement available: <span className="font-semibold">{deviceImportNotice.docName}</span>
                    </div>
                    <div className="text-[11px] text-emerald-200/85">
                      Added this session ({deviceImportNotice.label}). Open it here?
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectMonth(deviceImportNotice.id);
                        setDeviceImportNotice(null);
                      }}
                      className="rounded-md border border-emerald-300/45 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/25 transition-colors"
                    >
                      Open statement
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceImportNotice(null)}
                      className="rounded-md border border-emerald-300/25 px-2 py-1 text-[11px] text-emerald-200/90 hover:bg-emerald-500/15 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              {isStatementView && (
                <div className="mx-4 mt-3 rounded-lg border border-violet-500/35 bg-violet-500/10 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-violet-100">
                      Prime recap is pinned here while you review this statement.
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsStatementReviewModalOpen(true)}
                        className="shrink-0 rounded-md border border-amber-300/45 px-2 py-1 text-[11px] text-amber-100 hover:bg-amber-400/20 transition-colors"
                      >
                        Open Statement + Tag
                      </button>
                      <button
                        type="button"
                        onClick={openPrimeFromTransactions}
                        className="shrink-0 rounded-md border border-violet-300/45 px-2 py-1 text-[11px] text-violet-100 hover:bg-violet-400/20 transition-colors"
                      >
                        Open Prime chat here
                      </button>
                    </div>
                  </div>
                  <details className="mt-2 rounded-md border border-violet-400/20 bg-slate-950/40 p-2">
                    <summary className="cursor-pointer text-[11px] text-violet-200/90">
                      View latest Prime summary
                    </summary>
                    <div className="mt-2">
                      {primeRecapLoading ? (
                        <div className="text-[11px] text-slate-300">Loading recap...</div>
                      ) : primeRecapError ? (
                        <div className="text-[11px] text-amber-200">{primeRecapError}</div>
                      ) : (
                        <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap text-[11px] leading-5 text-slate-200">
                          {primeRecapSummary}
                        </pre>
                      )}
                    </div>
                  </details>
                </div>
              )}
              <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                <div className="min-w-0">
                  <div className="truncate">
                    AI scope lock: <span className="font-semibold">{aiScopeLockLabel}</span> ({aiScopeLockCount} rows)
                  </div>
                  <div className="text-[11px] text-cyan-200/85">
                    Tag and Prime transaction commands use this scope.
                  </div>
                </div>
                {isStatementView ? (
                  <button
                    type="button"
                    onClick={clearImportFilter}
                    className="shrink-0 rounded-md border border-cyan-300/40 px-2 py-1 text-[11px] text-cyan-100 hover:bg-cyan-400/20 transition-colors"
                  >
                    Switch to all
                  </button>
                ) : (
                  <span className="shrink-0 rounded-md border border-cyan-300/30 px-2 py-1 text-[11px] text-cyan-200/80">
                    Lock by selecting a statement
                  </span>
                )}
              </div>
              {showWowPreview && (
                <div className="mx-4 mt-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Statements</div>
                  <MonthNavigator
                    imports={importListLoading ? [] : importList}
                    currentImportId={importIdFilter || null}
                    onSelect={handleSelectMonthInTable}
                  />
                </div>
              )}

              {importIdFilter && (
                <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                  <div className="min-w-0 truncate">
                    Showing <span className="font-semibold">{selectedStatementInstitution}</span> ({importScopedCount} records)
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
              {categoryFilter && (
                <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
                  <div className="min-w-0 truncate">
                    Category: <span className="font-semibold">{categoryFilter}</span>
                    {' '}({urlFilteredCommitted.length} records)
                  </div>
                  <button
                    type="button"
                    onClick={clearCategoryFilter}
                    className="shrink-0 rounded-md border border-violet-300/40 px-2 py-1 text-[11px] text-violet-100 hover:bg-violet-400/20 transition-colors"
                  >
                    Clear filter
                  </button>
                </div>
              )}
              {focusFilter && (
                <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                  <div className="min-w-0 truncate">
                    Focused on <span className="font-semibold">{focusFilter}</span>
                    {' '}({urlFilteredCommitted.length + urlFilteredPending.length} matches)
                  </div>
                  <button
                    type="button"
                    onClick={clearFocusFilter}
                    className="shrink-0 rounded-md border border-cyan-300/40 px-2 py-1 text-[11px] text-cyan-100 hover:bg-cyan-400/20 transition-colors"
                  >
                    Clear focus
                  </button>
                </div>
              )}
              {highImpactMode && (
                <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  <div className="min-w-0 truncate">
                    Fast-Track mode: highlighting high-impact transactions from Prime summary.
                  </div>
                  <button
                    type="button"
                    onClick={clearFocusFilter}
                    className="shrink-0 rounded-md border border-amber-300/40 px-2 py-1 text-[11px] text-amber-100 hover:bg-amber-400/20 transition-colors"
                  >
                    Exit fast-track
                  </button>
                </div>
              )}
              {statusFilter === 'uncategorized' && (
                <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  <div className="min-w-0 truncate">
                    Showing <span className="font-semibold">uncategorized</span> transactions
                    {' '}({urlFilteredCommitted.length} records)
                  </div>
                  <button
                    type="button"
                    onClick={clearStatusFilter}
                    className="shrink-0 rounded-md border border-amber-300/40 px-2 py-1 text-[11px] text-amber-100 hover:bg-amber-400/20 transition-colors"
                  >
                    Clear filter
                  </button>
                </div>
              )}
              {showCommittedNotLinkableNote && (
                <div className="mx-4 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  Committed transactions can't be linked to this import in this environment yet. Showing pending only.
                </div>
              )}

              {smartPendingGroup && (
                <div className="mx-4 mt-3 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-3">
                  <div className="text-sm font-semibold text-violet-100">
                    Prime found {smartPendingGroup.ids.length} identical transactions
                  </div>
                  <div className="mt-1 text-xs text-violet-200/90">
                    {smartPendingGroup.label} · {formatMoney(smartPendingGroup.amount)} each
                  </div>
                  <div className="mt-1 text-xs text-violet-200/70">
                    Suggested category: <span className="font-medium text-violet-100">{suggestedGroupCategory}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { void handleApproveSmartGroup(); }}
                      className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/25 transition-colors"
                    >
                      Approve all
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsGroupEditOpen((v) => !v)}
                      className="rounded-md border border-slate-600 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      {isGroupEditOpen ? 'Close edit' : 'Edit group'}
                    </button>
                    <button
                      type="button"
                      onClick={handleIgnoreSmartGroup}
                      className="rounded-md border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      Ignore
                    </button>
                  </div>

                  {isGroupEditOpen && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={groupEditCategory}
                        onChange={(e) => setGroupEditCategory(e.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
                      >
                        {(categoryList.length > 0 ? categoryList : ['Entertainment', 'Subscriptions', 'Other']).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => { void handleApproveSmartGroupWithCategory(); }}
                        className="rounded-md border border-violet-400/40 bg-violet-500/20 px-2.5 py-1 text-[11px] font-medium text-violet-100 hover:bg-violet-500/30 transition-colors"
                      >
                        Apply + approve all
                      </button>
                    </div>
                  )}
                </div>
              )}

              <BulkActionsBar
                selectedCount={selectedIds.size}
                onAction={handleBulkAction}
                onClearSelection={handleClearSelection}
              />
                </>
              )}

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
                ) : showWowPreview ? (
                  <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/60">
                      <div className="border-b border-slate-800 p-2">
                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-700 bg-slate-950/70 p-2">
                          <div className="flex-1 min-w-[220px] rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-400">
                            Search: "Amazon over $10 last statement"
                          </div>
                          <span className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300">Merchant</span>
                          <span className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300">Amount</span>
                          <span className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300">Date</span>
                          <span className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300">Category</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                        <div ref={previewScopeRef} className="min-w-0">
                          <button
                            type="button"
                            onClick={handleViewingScopeClick}
                            className={`rounded-md border px-2 py-0.5 text-[10px] transition-all hover:border-cyan-300/70 hover:text-cyan-100 ${
                              highlightViewingScope
                                ? 'border-cyan-300/80 bg-cyan-500/25 text-cyan-100 shadow-[0_0_0_1px_rgba(103,232,249,0.4)]'
                                : 'border-slate-700 bg-slate-900/70 text-slate-300'
                            }`}
                            title="Show all statements in the transactions table"
                          >
                            {viewingScopeChipLabel}
                          </button>
                          {viewingScopeMetaLabel ? (
                            <div className="mt-1 text-[10px] text-slate-500">{viewingScopeMetaLabel} · {syncLabel}</div>
                          ) : (
                            <div className="mt-1 text-[10px] text-slate-500">{syncLabel}</div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pages</span>
                          {wowPageButtons.map((entry, idx) =>
                            entry === '…' ? (
                              <span key={`page-gap-${idx}`} className="px-1.5 text-[11px] text-slate-500">
                                …
                              </span>
                            ) : (
                              <button
                                key={`page-btn-${entry}`}
                                type="button"
                                onClick={() => setWowPage(entry)}
                                className={`min-w-[28px] rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                  wowPage === entry
                                    ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                                }`}
                              >
                                {entry}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="grid grid-cols-[28px_92px_minmax(0,1fr)_104px] gap-2 border-b border-slate-800 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          <div />
                          <div>Date</div>
                          <div>Merchant</div>
                          <div className="text-right">Amount</div>
                        </div>
                        {wowVisibleRows.length === 0 ? (
                          <div className="px-3 py-4 text-xs text-slate-500">No rows yet for this scope.</div>
                        ) : (
                          <>
                            <div ref={wowRowsScrollRef} className="h-[520px] overflow-y-auto">
                              {wowPagedRows.map((tx) => (
                                <button
                                  key={`wow-${tx.id}`}
                                  type="button"
                                  onClick={() => {
                                    const committed = urlFilteredCommitted.find((row) => row.id === tx.id);
                                    if (committed) handleTransactionClick(committed, false);
                                  }}
                                  className="grid w-full grid-cols-[28px_92px_minmax(0,1fr)_104px] gap-2 border-b border-slate-800/70 px-3 py-2 text-left text-[12px] hover:bg-slate-900/70"
                                >
                                  <label
                                    className="flex items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={wowSelectedIds.has(tx.id)}
                                      onChange={(e) => {
                                        setWowSelectedIds((prev) => {
                                          const next = new Set(prev);
                                          if (e.target.checked) next.add(tx.id);
                                          else next.delete(tx.id);
                                          return next;
                                        });
                                      }}
                                      className="h-3.5 w-3.5 accent-cyan-400"
                                    />
                                  </label>
                                  <div className="text-slate-400">{formatDate(tx.posted_at)}</div>
                                  <div className="min-w-0">
                                    <div className="truncate text-slate-100">{tx.merchant_name || 'Unknown merchant'}</div>
                                    <div className="truncate text-[10px] text-slate-400">{tx.category || 'Uncategorized'}</div>
                                  </div>
                                  <div className={`truncate text-right font-semibold ${tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {tx.amount < 0 ? '-' : '+'}{formatMoney(Math.abs(Number(tx.amount || 0)))}
                                  </div>
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-800 px-3 py-2 text-[10px] text-slate-400">
                              <div>
                                Showing {Math.min((wowPage - 1) * wowPageSize + 1, wowVisibleRows.length)}-
                                {Math.min(wowPage * wowPageSize, wowVisibleRows.length)} of {wowVisibleRows.length}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setWowPage((p) => Math.max(1, p - 1))}
                                  disabled={wowPage <= 1}
                                  className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-200 disabled:opacity-40"
                                >
                                  Prev
                                </button>
                                <span className="text-[10px] text-slate-300">
                                  Page {wowPage} / {wowTotalPages}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setWowPage((p) => Math.min(wowTotalPages, p + 1))}
                                  disabled={wowPage >= wowTotalPages}
                                  className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-200 disabled:opacity-40"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/80 shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_12px_40px_rgba(2,6,23,0.55)]">
                      <div className="border-b border-slate-800 px-3 py-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">Tag Queue + Copilot</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">One AI action rail, no extra chat threads.</div>
                      </div>
                      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                        <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-2.5">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Statement Queue</div>
                            <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">5 max</span>
                          </div>
                          <div className="space-y-1.5">
                            {statementQueueItems.length === 0 ? (
                              <div className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-500">
                                No statements in queue yet.
                              </div>
                            ) : (
                              statementQueueItems.map((item) => (
                                <button
                                  key={`queue-${item.id}`}
                                  type="button"
                                  onClick={() => handleSelectMonthInTable(item.id)}
                                  className={`w-full rounded border px-2 py-1.5 text-left transition-all ${
                                    importIdFilter === item.id
                                      ? 'border-cyan-400/50 bg-cyan-500/15'
                                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900'
                                  }`}
                                  title={item.statementLabel}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 truncate text-[11px] font-medium text-slate-100">{item.displayName}</div>
                                    <span
                                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${
                                        item.isFailed
                                          ? 'border-rose-500/35 bg-rose-500/10 text-rose-200'
                                          : item.isDone
                                            ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                                            : item.isReady
                                              ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200'
                                              : 'border-amber-500/35 bg-amber-500/10 text-amber-200'
                                      }`}
                                    >
                                      {item.statusLabel}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                    <span>{item.total} tx</span>
                                    <span>{item.label}</span>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-2.5">
                          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Copilot Actions</div>
                          <div className="grid grid-cols-1 gap-1.5">
                            <button
                              type="button"
                              onClick={() => { void handleCategorizeWithTagAI(); }}
                              disabled={isTagRunning || pendingCount <= 0}
                              className="rounded border border-violet-400/35 bg-violet-500/10 px-2 py-1.5 text-left text-[11px] text-violet-100 transition-colors hover:bg-violet-500/20 disabled:opacity-50"
                            >
                              {isTagRunning ? 'Running Tag AI categorization…' : 'Apply high-confidence categories'}
                            </button>
                            <button
                              type="button"
                              onClick={focusUncertainQueue}
                              className="rounded border border-amber-400/30 bg-amber-500/10 px-2 py-1.5 text-left text-[11px] text-amber-100 hover:bg-amber-500/20 transition-colors"
                            >
                              Review uncertain transactions
                            </button>
                            <button
                              type="button"
                              onClick={openPrimeFromTransactions}
                              className="rounded border border-cyan-400/30 bg-cyan-500/10 px-2 py-1.5 text-left text-[11px] text-cyan-100 hover:bg-cyan-500/20 transition-colors"
                            >
                              Ask Prime for this scope
                            </button>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-2.5">
                          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Scope Snapshot</div>
                          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                            <div className="rounded border border-slate-800 bg-slate-950/60 px-1.5 py-1 text-center">
                              <div className="text-slate-500">Rows</div>
                              <div className="font-semibold text-slate-100">{aiScopeLockCount}</div>
                            </div>
                            <div className="rounded border border-slate-800 bg-slate-950/60 px-1.5 py-1 text-center">
                              <div className="text-slate-500">Uncat</div>
                              <div className="font-semibold text-amber-300">{uncategorizedCount}</div>
                            </div>
                            <div className="rounded border border-slate-800 bg-slate-950/60 px-1.5 py-1 text-center">
                              <div className="text-slate-500">Rules</div>
                              <div className="font-semibold text-violet-300">{ruleSuggestionChips.length}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (latestStatementId) handleSelectMonthInTable(latestStatementId);
                            }}
                            disabled={!latestStatementId}
                            className="mt-2 w-full rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
                          >
                            Review latest statement
                          </button>
                        </div>
                      </div>
                      <div className="border-t border-slate-800 px-3 py-2 text-[10px] text-slate-500">
                        Completed statements rise to the top automatically as status updates land.
                      </div>
                    </div>
                  </div>
                ) : (
                  <TransactionList
                    transactions={urlFilteredCommitted}
                    pendingTransactions={urlFilteredPending}
                    filters={filters}
                    onTransactionClick={handleTransactionClick}
                    onApprove={(id) => { void handleApprove(id); }}
                    onReject={(id) => { void handleReject(id); }}
                    categories={categoryList.length > 0 ? categoryList : undefined}
                    onCategoryChange={handleCategoryChange}
                    sortOrder={sortOrder}
                    showRowActions={false}
                    highlightTransactionIds={activeHighlightIds}
                  />
                )}
              </div>
              </div>

              {!showWowPreview && (
              <div className="hidden xl:flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900 overflow-hidden xl:order-1">
              <div className="border-b border-slate-800 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Spending Breakdown</div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div ref={spendingBreakdownRef} className="space-y-2 p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Income</span>
                    <span className="font-semibold text-emerald-400">{formatMoney(statementHeaderSummary.income)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Spending</span>
                    <span className="font-semibold text-red-400">{formatMoney(statementHeaderSummary.spending)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Net</span>
                    <span className={`font-semibold ${statementHeaderSummary.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {statementHeaderSummary.net >= 0 ? '+' : ''}{formatMoney(statementHeaderSummary.net)}
                    </span>
                  </div>

                  <div className="h-px bg-slate-800 my-1" />

                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Categories</div>

                  {categoryBreakdown.length === 0 ? (
                    <div className="text-[11px] text-slate-500 py-1">
                      {isStatementView ? 'No expense data' : 'Select a statement to see breakdown'}
                    </div>
                  ) : (
                    categoryBreakdown.map(([cat, amount]) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryDrilldown(cat);
                          setCategoryDrawerOpen(true);
                        }}
                        className={`w-full rounded-md px-1.5 py-1 text-left transition-colors ${
                          focusFilter && cat.toLowerCase() === focusFilter.toLowerCase()
                            ? 'bg-cyan-500/15 ring-1 ring-cyan-400/40'
                            : 'hover:bg-slate-800/70'
                        }`}
                        title={`View ${cat} transactions`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-slate-300">{cat}</span>
                          <span className="flex-shrink-0 font-medium text-slate-100">{formatMoney(amount)}</span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-cyan-500/60"
                            style={{ width: `${categoryBreakdown.length > 0 ? Math.max(4, Math.round((amount / categoryBreakdown[0][1]) * 100)) : 0}%` }}
                          />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              </div>
              )}
            </div>
          </div>
        }
      />

      {categoryDrawerOpen && selectedCategoryDrilldown && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => {
              setCategoryDrawerOpen(false);
              setMoveEditorTxId(null);
              setSelectedCategoryDrawerTxId(null);
              setSelectedCategoryDrawerReceiptUrl(null);
            }}
          />
          <aside className="absolute inset-y-0 right-0 w-full max-w-xl border-l border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-800 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="min-w-0 truncate text-sm font-semibold text-slate-100">
                      {selectedCategoryDrilldown} transactions
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {categoryDrawerTransactions.length} transaction{categoryDrawerTransactions.length === 1 ? '' : 's'} · {formatMoney(categoryDrawerTotal)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryDrawerOpen(false);
                      setMoveEditorTxId(null);
                      setSelectedCategoryDrawerTxId(null);
                      setSelectedCategoryDrawerReceiptUrl(null);
                    }}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[110px_minmax(180px,1fr)_100px] gap-2 border-b border-slate-800 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <div>Date</div>
                <div>Merchant</div>
                <div className="text-right">Amount</div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {categoryDrawerTransactions.length === 0 ? (
                  <div className="p-4 text-sm text-slate-400">No transactions found for this category.</div>
                ) : (
                  categoryDrawerTransactions.map((tx) => (
                    <div key={tx.id} className="border-b border-slate-800/70 px-4 py-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setSelectedCategoryDrawerTxId(tx.id);
                          setSelectedCategoryDrawerReceiptUrl(null);
                          setIsCategoryDrawerReceiptLoading(true);
                          try {
                            const url = await loadCategoryDrawerReceipt(tx);
                            setSelectedCategoryDrawerReceiptUrl(url);
                          } finally {
                            setIsCategoryDrawerReceiptLoading(false);
                          }
                        }}
                        className="grid w-full grid-cols-[110px_minmax(180px,1fr)_100px] gap-2 text-left hover:bg-slate-900 transition-colors rounded"
                      >
                        <div className="text-xs text-slate-400">{formatDate(tx.posted_at)}</div>
                        <div className="min-w-0 truncate text-sm text-slate-100">{tx.merchant_name || 'Unknown merchant'}</div>
                        <div className={`text-right text-sm font-medium ${tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {tx.amount < 0 ? '-' : '+'}{formatMoney(Math.abs(tx.amount))}
                        </div>
                      </button>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMoveEditorTxId(tx.id);
                            setMoveEditorCategory(tx.category || 'Uncategorized');
                          }}
                          className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 transition-colors"
                        >
                          Move
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDrawerRow({ kind: 'committed', transaction: tx });
                            setDetailDrawerOpen(true);
                          }}
                          className="rounded-md border border-cyan-600/40 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/15 transition-colors"
                        >
                          Open details
                        </button>
                      </div>

                      {moveEditorTxId === tx.id && (
                        <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 p-2">
                          <select
                            value={moveEditorCategory}
                            onChange={(e) => setMoveEditorCategory(e.target.value)}
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
                          >
                            {categoryChoices.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => { void handleQuickMoveCategory(tx, moveEditorCategory || 'Uncategorized'); }}
                            disabled={isMoveSaving}
                            className="rounded-md border border-violet-500/40 bg-violet-500/15 px-2 py-1 text-[11px] text-violet-100 hover:bg-violet-500/25 disabled:opacity-60"
                          >
                            {isMoveSaving ? 'Saving…' : 'Apply'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMoveEditorTxId(null);
                              setMoveEditorCategory('');
                            }}
                            className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {selectedCategoryDrawerTxId === tx.id && (
                        <div className="mt-2 rounded-md border border-slate-700 bg-slate-900/70 p-2">
                          <div className="mb-1 text-[11px] text-slate-400">Receipt preview</div>
                          {isCategoryDrawerReceiptLoading ? (
                            <div className="text-[11px] text-slate-500">Loading receipt...</div>
                          ) : selectedCategoryDrawerReceiptUrl ? (
                            <img
                              src={selectedCategoryDrawerReceiptUrl}
                              alt="Receipt preview"
                              className="max-h-32 w-full rounded border border-slate-700 object-cover"
                            />
                          ) : (
                            <div className="text-[11px] text-slate-500">No receipt linked for this transaction.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

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

      <TransactionInsightDrawer
        open={detailDrawerOpen}
        row={selectedDrawerRow}
        allCommittedTransactions={urlFilteredCommitted}
        onClose={() => setDetailDrawerOpen(false)}
        onApprovePending={async (pendingId) => {
          await handleApprove(pendingId);
          setDetailDrawerOpen(false);
        }}
        onRejectPending={async (pendingId) => {
          await handleReject(pendingId);
          setDetailDrawerOpen(false);
        }}
        onEditCommitted={(tx) => {
          setSelectedTransaction(tx);
          setIsSplitModalOpen(true);
        }}
      />
      {isDiagnosticsPanelOpen && typeof document !== 'undefined' &&
        createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998] bg-slate-950/88 backdrop-blur-[18px]"
            onClick={() => {
              setIsDiagnosticsPanelOpen(false);
            }}
            aria-hidden
          />
          <aside className="fixed bottom-4 right-4 top-4 z-[9999] w-[min(96vw,560px)] overflow-hidden rounded-2xl border border-cyan-400/25 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(34,211,238,0.14),rgba(2,6,23,0.97)_55%)] shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_0_40px_rgba(34,211,238,0.22),0_0_80px_rgba(59,130,246,0.14)]">
            <div className="h-full w-full overflow-hidden flex flex-col bg-slate-950/92">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-100">Portfolio Control Center</div>
                <div className="text-[10px] text-slate-400">Live diagnostics and assistant desk for this workspace</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDiagnosticsPanelOpen(false);
                }}
                className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="border-b border-slate-800 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    selectStatementFromPanel(null);
                  }}
                  className="rounded border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-left hover:bg-slate-800 transition-colors"
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Statements</div>
                  <div className="font-semibold text-slate-100">{statementCount}</div>
                  <div className="mt-0.5 truncate text-[10px] text-slate-400">{latestStatementLabel}</div>
                </button>
                <button
                  type="button"
                  onClick={openPrimeBriefingFromPanel}
                  className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-left hover:bg-amber-500/15 transition-colors"
                >
                  <div className="text-[10px] uppercase tracking-wide text-amber-200/80">Unclassified statements</div>
                  <div className="font-semibold text-amber-300">{unclassifiedStatementCount}</div>
                  <div className="mt-0.5 text-[10px] text-amber-200/80">Open Prime review briefing</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleReviewClick();
                  }}
                  className="rounded border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-left hover:bg-slate-800 transition-colors"
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Pending queue</div>
                  <div className="font-semibold text-amber-300">{uncertainQueue.uncertain}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">Jump to review area</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    focusUncategorizedTransactions();
                  }}
                  className="rounded border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-left hover:bg-slate-800 transition-colors"
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Uncategorized transactions</div>
                  <div className="font-semibold text-slate-100">{uncategorizedCount}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">Filter table now</div>
                </button>
              </div>
              <div className="mt-2 text-[10px] text-slate-400">
                Scope: <span className="text-slate-200">{isStatementView ? selectedStatementInstitution : 'All statements'}</span> · Active rules: <span className="text-slate-200">{activeRuleCount ?? '—'}</span>
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => selectStatementFromPanel(null)}
                  className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-500/20 transition-colors"
                >
                  Open statement pages in main table
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/65 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200">Tag Action Center</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={focusUncategorizedTransactions}
                    className="rounded border border-slate-700 bg-slate-950/70 px-2 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <div className="font-semibold text-slate-100">Focus Uncategorized</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">{uncategorizedCount} rows need category</div>
                  </button>
                  <button
                    type="button"
                    onClick={focusUncertainQueue}
                    className="rounded border border-slate-700 bg-slate-950/70 px-2 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <div className="font-semibold text-amber-200">Open Review Queue</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">{uncertainQueue.uncertain} uncertain pending</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleCategorizeWithTagAI(); }}
                    disabled={isTagRunning}
                    className="rounded border border-violet-500/40 bg-violet-500/10 px-2 py-2 text-left text-xs text-violet-100 hover:bg-violet-500/20 disabled:opacity-60 transition-colors"
                  >
                    <div className="font-semibold">{isTagRunning ? 'Tag is categorizing…' : 'Run Tag Auto-Categorize'}</div>
                    <div className="mt-0.5 text-[10px] text-violet-200/80">Apply best-fit categories in batch</div>
                  </button>
                  <button
                    type="button"
                    onClick={openPrimeFromTransactions}
                    className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-2 text-left text-xs text-cyan-100 hover:bg-cyan-500/20 transition-colors"
                  >
                    <div className="font-semibold">Open Prime Full Chat</div>
                    <div className="mt-0.5 text-[10px] text-cyan-200/80">Use full conversation panel for deeper review</div>
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/65 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Rule Suggestions</div>
                  <div className="text-[10px] text-slate-500">{ruleSuggestionChips.length} found</div>
                </div>
                {ruleSuggestionChips.length === 0 ? (
                  <div className="rounded border border-slate-800 bg-slate-950/60 px-2 py-2 text-[11px] text-slate-500">
                    No repeated merchant patterns yet.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {ruleSuggestionChips.slice(0, 5).map((chip) => (
                      <div key={`diag-rule-${chip.merchant}-${chip.category}`} className="rounded border border-slate-800 bg-slate-950/60 p-2">
                        <div className="text-[11px] font-medium text-slate-100 truncate">{chip.merchant} → {chip.category}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">{chip.count} matching transactions</div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => focusRuleOpportunity(chip.merchant)}
                            className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            disabled={isRuleCreateSaving === chip.merchant}
                            onClick={() => { void handleCreateRuleFromChip(chip.merchant, chip.category); }}
                            className="rounded border border-violet-400/40 bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-100 hover:bg-violet-500/25 disabled:opacity-60"
                          >
                            {isRuleCreateSaving === chip.merchant ? 'Saving…' : 'Apply rule'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/65 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Statement Scope</div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => selectStatementFromPanel(null)}
                    className={`w-full rounded border px-2 py-1.5 text-left text-[11px] transition-colors ${
                      !importIdFilter
                        ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                        : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    All statements
                  </button>
                  {importList.slice(0, 4).map((imp) => (
                    <button
                      key={`diag-scope-${imp.id}`}
                      type="button"
                      onClick={() => selectStatementFromPanel(imp.id)}
                      className={`w-full rounded border px-2 py-1.5 text-left text-[11px] transition-colors ${
                        importIdFilter === imp.id
                          ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                          : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:bg-slate-800'
                      }`}
                      title={imp.statementLabel}
                    >
                      <div className="truncate">{imp.statementLabel}</div>
                      <div className="text-[10px] text-slate-500">{imp.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/65 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Recent Activity</div>
                <div className="space-y-1 text-[10px] text-slate-400">
                  {recentLearningRows
                    .filter((row) => row.value > 0)
                    .slice(0, 4)
                    .map((row) => (
                      <div key={`diag-recent-${row.label}`} className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1">
                        {row.value} {row.label}
                      </div>
                    ))}
                  {recentLearningRows.every((row) => row.value === 0) && (
                    <div className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1 text-slate-500">
                      No recent tag activity yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          </aside>
        </>,
        document.body
      )}
      {isStatementReviewModalOpen && isStatementView && (
        <div className="fixed inset-0 z-[80] bg-black/70 p-3 md:p-5">
          <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-100">
                  Statement Review - {selectedStatementInstitution}
                </div>
                <div className="text-xs text-slate-400">
                  Scope locked to this statement ({importScopedCount} records). Tag on the right can apply changes for this scope.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatementReviewModalOpen(false)}
                className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]">
              <div className="min-h-0 overflow-hidden border-b border-slate-800 lg:border-b-0 lg:border-r lg:border-slate-800">
                <div className="grid grid-cols-2 gap-2 border-b border-slate-800 px-4 py-3 text-xs md:grid-cols-4">
                  <div className="rounded border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-slate-300">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Rows</div>
                    <div className="font-semibold text-slate-100">{statementReviewRows.length}</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-slate-300">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Committed</div>
                    <div className="font-semibold text-slate-100">{scopedTransactions.length}</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-slate-300">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Pending</div>
                    <div className="font-semibold text-amber-300">{scopedPendingTransactions.length}</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-slate-300">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Uncategorized</div>
                    <div className="font-semibold text-slate-100">{statementHeaderSummary.uncategorized}</div>
                  </div>
                </div>
                <div className="h-full overflow-auto px-4 pb-4 pt-3">
                  {statementReviewRows.length === 0 ? (
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
                      No transactions found for this statement yet.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/90 text-slate-300">
                          <tr>
                            <th className="px-3 py-2 font-medium">Date</th>
                            <th className="px-3 py-2 font-medium">Merchant</th>
                            <th className="px-3 py-2 font-medium">Amount</th>
                            <th className="px-3 py-2 font-medium">Category</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                          {statementReviewRows.map((row) => (
                            <tr key={`${row.source}:${row.id}`} className="hover:bg-slate-900/70">
                              <td className="px-3 py-2 text-slate-300">{formatDate(row.postedAt)}</td>
                              <td className="px-3 py-2 text-slate-200">{row.merchant}</td>
                              <td
                                className={`px-3 py-2 font-medium ${
                                  row.amount < 0 ? 'text-rose-300' : 'text-emerald-300'
                                }`}
                              >
                                {formatMoney(row.amount)}
                              </td>
                              <td className="px-3 py-2 text-slate-300">{row.category || 'Uncategorized'}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                                    row.source === 'pending'
                                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                                  }`}
                                >
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              <div className="min-h-0 overflow-hidden">
                <UnifiedAssistantChat
                  mode="inline"
                  renderMode="page"
                  disableRuntime={false}
                  isOpen
                  compact
                  showTypingIndicator
                  initialEmployeeSlug="tag-ai"
                  context={{
                    page: 'transactions',
                    scope: 'statement',
                    importId: importIdFilter,
                    statementLabel: selectedStatementInstitution,
                    recordCount: statementReviewRows.length,
                  }}
                  initialQuestion={`Review ${selectedStatementInstitution} and help me clean up categories for this statement only.`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


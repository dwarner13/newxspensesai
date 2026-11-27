/**
 * useTransactions Hook
 * 
 * Fetches all committed transactions with real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { CommittedTransaction } from '../types/transactions';
import { pagedSelectAll, type PagedQuery, type PagedSelectResult } from '../shared/paged-select';

export interface UseTransactionsResult {
  transactions: CommittedTransaction[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  /**
   * TX-PAGING (owner 2026-11-26: no silent transaction limits). True only when every matching
   * row was read (paged until an empty page). False on a truncated read (over the safety
   * ceiling) or before the first read. Screens must not present an incomplete list or export
   * as complete.
   */
  isComplete: boolean;
  /** Rows exist beyond the read ceiling (PAGED_SELECT_MAX_ROWS). */
  isTruncated: boolean;
  refetch: () => Promise<void>;
}

export const TRANSACTION_LIST_COLUMNS = [
  'id', 'user_id', 'posted_at', 'merchant_name', 'merchant', 'description', 'amount',
  'category', 'subcategory', 'subcategory_source', 'category_source', 'date', 'type',
  'import_id', 'document_id', 'created_at', 'updated_at',
].join(',');

/**
 * TX-PAGING: complete paged read of the user's committed transactions, optionally narrowed to a
 * date range (on `date`) and/or imports. Same rules as the shared engine helper: total order,
 * stop only on an empty page, truncation probed at the ceiling. Used by useTransactions and by
 * scoped exports when the whole-account read is over the ceiling.
 */
export async function readTransactionsPaged(scope: {
  userId: string;
  importIds?: string[];
  startDate?: string;
  endDate?: string;
}): Promise<PagedSelectResult<CommittedTransaction>> {
  const supabase = getSupabase();
  if (!supabase) {
    return { rows: [], rowsFetched: 0, pagesFetched: 0, complete: false, truncated: false, duplicatesSkipped: 0, error: 'Supabase client not available' };
  }
  const makeQuery = (): PagedQuery => {
    let q = supabase
      .from('transactions')
      .select(TRANSACTION_LIST_COLUMNS)
      .eq('user_id', scope.userId);
    if (scope.importIds && scope.importIds.length === 1) q = q.eq('import_id', scope.importIds[0]);
    else if (scope.importIds && scope.importIds.length > 1) q = q.in('import_id', scope.importIds);
    if (scope.startDate) q = q.gte('date', scope.startDate);
    if (scope.endDate) q = q.lte('date', scope.endDate);
    return q.order('posted_at', { ascending: false }).order('id', { ascending: false }) as unknown as PagedQuery;
  };
  return pagedSelectAll<CommittedTransaction>(makeQuery);
}

const TRANSACTIONS_CACHE_TTL_MS = 90 * 1000;
const MAX_CACHE_ROWS = 5000;
const MAX_CACHE_CHARS = 1_500_000;

export function useTransactions(options?: {
  importId?: string | null;
}): UseTransactionsResult {
  const { userId } = useAuth();
  const [transactions, setTransactions] = useState<CommittedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isComplete, setIsComplete] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const hasRenderedDataRef = useRef(false);
  const fetchInFlightRef = useRef<Promise<void> | null>(null);
  const lastFetchAtRef = useRef(0);
  const realtimeRefetchTimerRef = useRef<number | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    if (fetchInFlightRef.current) {
      return fetchInFlightRef.current;
    }
    const hasRenderedData = hasRenderedDataRef.current;
    const now = Date.now();
    if (hasRenderedData && now - lastFetchAtRef.current < 1200) {
      return;
    }

    const run = (async () => {
    if (!hasRenderedData) {
      setIsLoading(true);
    }
    setIsError(false);
    setErrorMessage(undefined);

    try {
      // TX-PAGING: a complete, paged read (shared engine helper, FST-1). The old single request
      // with .limit(5000) silently dropped older rows, and the hosted API cap (1,000) could cut it
      // further. Pages advance by rows actually returned and stop only on an empty page; a total
      // order (posted_at, then id) keeps pages stable.
      const read = await readTransactionsPaged({ userId, ...(options?.importId ? { importIds: [options.importId] } : {}) });
      const data = read.rows;
      const error = read.error ? { message: read.error, code: undefined as string | undefined } : null;

      if (error) {
        // Handle schema errors gracefully (table might not exist)
        if (error.message?.includes('does not exist') ||
            (error.message?.includes('relation') && error.message?.includes('does not exist'))) {
          // Table doesn't exist - return empty array
          setTransactions([]);
          setIsComplete(true);
          setIsTruncated(false);
          hasRenderedDataRef.current = true;
          setIsError(false);
          return;
        }
        throw error;
      }

      const nextData = (data as CommittedTransaction[]) || [];
      setTransactions(nextData);
      setIsComplete(read.complete);
      setIsTruncated(read.truncated);
      hasRenderedDataRef.current = true;
      if (typeof window !== 'undefined') {
        const cacheKey = `xspenses:transactions-cache:${userId}:${options?.importId || 'all'}`;
        // Avoid expensive stringify/storage on very large datasets.
        if (read.complete && nextData.length <= MAX_CACHE_ROWS) {
          const payload = JSON.stringify({
            ts: Date.now(),
            complete: true,
            data: nextData,
          });
          if (payload.length <= MAX_CACHE_CHARS) {
            window.sessionStorage.setItem(cacheKey, payload);
          } else {
            window.sessionStorage.removeItem(cacheKey);
          }
        } else {
          window.sessionStorage.removeItem(cacheKey);
        }
      }
      setIsError(false);
    } catch (error: any) {
      console.error('[useTransactions] Error fetching transactions:', error);
      setIsError(true);
      setErrorMessage(error.message || 'Failed to load transactions');
    } finally {
      lastFetchAtRef.current = Date.now();
      if (!hasRenderedData) {
        setIsLoading(false);
      }
    }
    })();

    fetchInFlightRef.current = run.finally(() => {
      fetchInFlightRef.current = null;
    });
    return fetchInFlightRef.current;
  }, [userId, options?.importId]);

  // Fast cache hydration for smoother route transitions.
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(`xspenses:transactions-cache:${userId}:${options?.importId || 'all'}`);
      if (!raw) return;
      if (raw.length > MAX_CACHE_CHARS) return;
      const parsed = JSON.parse(raw) as { ts?: number; complete?: boolean; data?: CommittedTransaction[] };
      if (!parsed?.ts || !Array.isArray(parsed?.data) || parsed.complete !== true) return;
      if (Date.now() - parsed.ts > TRANSACTIONS_CACHE_TTL_MS) return;
      setTransactions(parsed.data);
      setIsComplete(true);
      setIsTruncated(false);
      hasRenderedDataRef.current = true;
      setIsLoading(false);
    } catch {
      // Ignore cache parse errors.
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel('transactions-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useTransactions] Real-time update:', payload.eventType);
          if (realtimeRefetchTimerRef.current !== null) {
            window.clearTimeout(realtimeRefetchTimerRef.current);
          }
          realtimeRefetchTimerRef.current = window.setTimeout(() => {
            realtimeRefetchTimerRef.current = null;
            void fetchTransactions();
          }, 450);
        }
      )
      .subscribe();

    return () => {
      if (realtimeRefetchTimerRef.current !== null) {
        window.clearTimeout(realtimeRefetchTimerRef.current);
        realtimeRefetchTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [userId, fetchTransactions]);

  return {
    transactions,
    isLoading,
    isError,
    errorMessage,
    isComplete,
    isTruncated,
    refetch: fetchTransactions,
  };
}

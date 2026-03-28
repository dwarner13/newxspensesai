/**
 * useTransactions Hook
 * 
 * Fetches all committed transactions with real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { CommittedTransaction } from '../types/transactions';

export interface UseTransactionsResult {
  transactions: CommittedTransaction[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  refetch: () => Promise<void>;
}

const TRANSACTIONS_CACHE_TTL_MS = 90 * 1000;
const MAX_CACHE_ROWS = 2000;
const MAX_CACHE_CHARS = 1_500_000;

export function useTransactions(options?: {
  importId?: string | null;
}): UseTransactionsResult {
  const { userId } = useAuth();
  const [transactions, setTransactions] = useState<CommittedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
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
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // Simplified query without nested joins to avoid 400 errors
      // If relationships are needed, fetch them separately
      let query = supabase
        .from('transactions')
        .select(
          [
            'id',
            'user_id',
            'posted_at',
            'merchant_name',
            'merchant',
            'description',
            'amount',
            'category',
            'subcategory',
            'subcategory_source',
            'category_source',
            'type',
            'import_id',
            'document_id',
            'created_at',
            'updated_at',
          ].join(',')
        )
        .eq('user_id', userId)
        .order('posted_at', { ascending: false });

      if (options?.importId) {
        query = query.eq('import_id', options.importId);
      }

      const { data, error } = await query;

      if (error) {
        // Handle schema errors gracefully (table might not exist)
        if (error.code === 'PGRST116' || 
            error.code === '42P01' ||
            error.message?.includes('does not exist') ||
            (error.message?.includes('relation') && error.message?.includes('does not exist'))) {
          // Table doesn't exist - return empty array
          setTransactions([]);
          hasRenderedDataRef.current = true;
          setIsError(false);
          return;
        }
        throw error;
      }

      const nextData = (data as CommittedTransaction[]) || [];
      setTransactions(nextData);
      hasRenderedDataRef.current = true;
      if (typeof window !== 'undefined') {
        const cacheKey = `xspenses:transactions-cache:${userId}:${options?.importId || 'all'}`;
        // Avoid expensive stringify/storage on very large datasets.
        if (nextData.length <= MAX_CACHE_ROWS) {
          const payload = JSON.stringify({
            ts: Date.now(),
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
      const parsed = JSON.parse(raw) as { ts?: number; data?: CommittedTransaction[] };
      if (!parsed?.ts || !Array.isArray(parsed?.data)) return;
      if (Date.now() - parsed.ts > TRANSACTIONS_CACHE_TTL_MS) return;
      setTransactions(parsed.data);
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
    refetch: fetchTransactions,
  };
}

/**
 * usePendingTransactions Hook
 * 
 * Fetches transactions_staging with confidence scoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calculateConfidence } from '../lib/confidenceScoring';
import { checkForDuplicates } from '../lib/duplicateDetection';
import type { PendingTransaction, NormalizedTransaction } from '../types/transactions';

export interface UsePendingTransactionsResult {
  pendingTransactions: PendingTransaction[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  refetch: () => Promise<void>;
}

const PENDING_TRANSACTIONS_CACHE_TTL_MS = 90 * 1000;
const MAX_PENDING_CACHE_ROWS = 1200;
const MAX_PENDING_CACHE_CHARS = 900_000;

export function usePendingTransactions(options?: {
  importId?: string | null;
  includeDuplicateChecks?: boolean;
}): UsePendingTransactionsResult {
  const { userId } = useAuth();
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const hasRenderedDataRef = useRef(false);
  const fetchInFlightRef = useRef<Promise<void> | null>(null);
  const lastFetchAtRef = useRef(0);
  const realtimeRefetchTimerRef = useRef<number | null>(null);
  const scopedImportId = String(options?.importId || '').trim();
  const includeDuplicateChecks = options?.includeDuplicateChecks === true;
  const cacheKey = `xspenses:pending-transactions-cache:${userId}:${scopedImportId || 'all'}`;

  const fetchPendingTransactions = useCallback(async () => {
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

      // Fetch staging transactions
      let stagingQuery = supabase
        .from('transactions_staging')
        .select(`
          id,
          import_id,
          parsed_at,
          data_json,
          tag_category,
          tag_subcategory,
          tag_confidence,
          tag_status,
          tag_rule_source,
          import:imports!inner(
            id,
            status,
            document:user_documents!inner(
              id,
              original_name,
              storage_path
            )
          )
        `)
        .eq('user_id', userId)
        .order('parsed_at', { ascending: false });
      if (scopedImportId) {
        stagingQuery = stagingQuery.eq('import_id', scopedImportId);
      }
      const { data: stagingData, error: stagingError } = await stagingQuery;

      if (stagingError) {
        throw stagingError;
      }

      if (!stagingData) {
        setPendingTransactions([]);
        hasRenderedDataRef.current = true;
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              ts: Date.now(),
              data: [],
            })
          );
        }
        setIsLoading(false);
        return;
      }

      // Process each staging transaction
      const processed: PendingTransaction[] = await Promise.all(
        stagingData.map(async (staging) => {
          const dataJson = staging.data_json as NormalizedTransaction;
          const ocrText = '';

          // Calculate confidence scores
          const confidence = calculateConfidence(dataJson, ocrText);

          // Duplicate detection is expensive (N network calls for N rows).
          // Keep it opt-in so initial Transactions load feels immediate.
          const duplicates = includeDuplicateChecks
            ? await checkForDuplicates(dataJson, userId)
            : [];

          const raw = staging as Record<string, unknown>;
          return {
            id: staging.id,
            data_json: dataJson,
            import_id: staging.import_id,
            parsed_at: staging.parsed_at,
            confidence,
            needsReview: confidence.overall < 0.75,
            possibleDuplicate: duplicates.length > 0
              ? {
                  transactionId: duplicates[0].transactionId,
                  similarity: duplicates[0].similarity,
                }
              : undefined,
            tag_category: (raw.tag_category as string | null) ?? null,
            tag_subcategory: (raw.tag_subcategory as string | null) ?? null,
            tag_confidence: (raw.tag_confidence as number | null) ?? null,
            tag_status: (raw.tag_status as string | null) ?? null,
            tag_rule_source: (raw.tag_rule_source as string | null) ?? null,
          };
        })
      );

      setPendingTransactions(processed);
      hasRenderedDataRef.current = true;
      if (typeof window !== 'undefined') {
        if (processed.length <= MAX_PENDING_CACHE_ROWS) {
          const payload = JSON.stringify({
            ts: Date.now(),
            data: processed,
          });
          if (payload.length <= MAX_PENDING_CACHE_CHARS) {
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
      console.error('[usePendingTransactions] Error fetching pending transactions:', error);
      setIsError(true);
      setErrorMessage(error.message || 'Failed to load pending transactions');
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
  }, [userId, scopedImportId, cacheKey, includeDuplicateChecks]);

  // Fast cache hydration for smoother route transitions.
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(cacheKey);
      if (!raw) return;
      if (raw.length > MAX_PENDING_CACHE_CHARS) return;
      const parsed = JSON.parse(raw) as { ts?: number; data?: PendingTransaction[] };
      if (!parsed?.ts || !Array.isArray(parsed?.data)) return;
      if (Date.now() - parsed.ts > PENDING_TRANSACTIONS_CACHE_TTL_MS) return;
      setPendingTransactions(parsed.data);
      hasRenderedDataRef.current = true;
      setIsLoading(false);
    } catch {
      // Ignore cache parse errors.
    }
  }, [userId, cacheKey]);

  // Initial fetch
  useEffect(() => {
    fetchPendingTransactions();
  }, [fetchPendingTransactions]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel('pending-transactions-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions_staging',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[usePendingTransactions] Real-time update:', payload.eventType);
          if (realtimeRefetchTimerRef.current !== null) {
            window.clearTimeout(realtimeRefetchTimerRef.current);
          }
          realtimeRefetchTimerRef.current = window.setTimeout(() => {
            realtimeRefetchTimerRef.current = null;
            void fetchPendingTransactions();
          }, 450);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'imports',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // If import status changed to 'parsed', refetch
          if (payload.new.status === 'parsed') {
            if (realtimeRefetchTimerRef.current !== null) {
              window.clearTimeout(realtimeRefetchTimerRef.current);
            }
            realtimeRefetchTimerRef.current = window.setTimeout(() => {
              realtimeRefetchTimerRef.current = null;
              void fetchPendingTransactions();
            }, 450);
          }
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
  }, [userId, fetchPendingTransactions]);

  return {
    pendingTransactions,
    isLoading,
    isError,
    errorMessage,
    refetch: fetchPendingTransactions,
  };
}










/**
 * usePendingTransactions Hook
 * 
 * Fetches transactions_staging with confidence scoring
 */

import { useState, useEffect, useCallback } from 'react';
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

export function usePendingTransactions(): UsePendingTransactionsResult {
  const { userId } = useAuth();
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const fetchPendingTransactions = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setErrorMessage(undefined);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // Fetch staging transactions
      const { data: stagingData, error: stagingError } = await supabase
        .from('transactions_staging')
        .select(`
          *,
          import:imports!inner(
            id,
            status,
            document:user_documents!inner(
              id,
              original_name,
              storage_path,
              ocr_text
            )
          )
        `)
        .eq('user_id', userId)
        .order('parsed_at', { ascending: false });

      if (stagingError) {
        throw stagingError;
      }

      if (!stagingData) {
        setPendingTransactions([]);
        setIsLoading(false);
        return;
      }

      // Process each staging transaction
      const processed: PendingTransaction[] = await Promise.all(
        stagingData.map(async (staging) => {
          const dataJson = staging.data_json as NormalizedTransaction;
          const ocrText = (staging.import as any)?.document?.ocr_text || '';

          // Calculate confidence scores
          const confidence = calculateConfidence(dataJson, ocrText);

          // Check for duplicates
          const duplicates = await checkForDuplicates(dataJson, userId);

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
          };
        })
      );

      setPendingTransactions(processed);
      setIsError(false);
    } catch (error: any) {
      console.error('[usePendingTransactions] Error fetching pending transactions:', error);
      setIsError(true);
      setErrorMessage(error.message || 'Failed to load pending transactions');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

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
          fetchPendingTransactions();
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
            fetchPendingTransactions();
          }
        }
      )
      .subscribe();

    return () => {
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










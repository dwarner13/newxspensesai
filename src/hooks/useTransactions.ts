/**
 * useTransactions Hook
 * 
 * Fetches all committed transactions with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
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

export function useTransactions(): UseTransactionsResult {
  const { userId } = useAuth();
  const [transactions, setTransactions] = useState<CommittedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const fetchTransactions = useCallback(async () => {
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

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          import:imports(
            id,
            status,
            document:user_documents(
              id,
              original_name,
              storage_path
            )
          )
        `)
        .eq('user_id', userId)
        .order('posted_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTransactions((data as CommittedTransaction[]) || []);
      setIsError(false);
    } catch (error: any) {
      console.error('[useTransactions] Error fetching transactions:', error);
      setIsError(true);
      setErrorMessage(error.message || 'Failed to load transactions');
    } finally {
      setIsLoading(false);
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
          // Refetch on any change
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
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

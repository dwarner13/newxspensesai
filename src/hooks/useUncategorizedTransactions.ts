/**
 * useUncategorizedTransactions
 *
 * Fetches committed transactions that are uncategorized (null or 'Uncategorized').
 * Used by UncategorizedReviewQueue on the Smart Categories page.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UncategorizedTx {
  id: string;
  posted_at: string | null;
  date: string | null;
  merchant_name: string | null;
  merchant: string | null;
  amount: number;
  import_id: string | null;
}

interface UseUncategorizedResult {
  transactions: UncategorizedTx[];
  totalCount: number;
  isLoading: boolean;
  refresh: () => void;
}

const PAGE_SIZE = 5;

export function useUncategorizedTransactions(): UseUncategorizedResult {
  const { userId } = useAuth();
  const [transactions, setTransactions] = useState<UncategorizedTx[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);

      // Count total uncategorized
      const { count } = await supabase!
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .or('category.is.null,category.eq.Uncategorized');

      if (!cancelled) setTotalCount(count ?? 0);

      // Fetch first page
      const { data } = await supabase!
        .from('transactions')
        .select('id, posted_at, date, merchant_name, merchant, amount, import_id')
        .eq('user_id', userId!)
        .or('category.is.null,category.eq.Uncategorized')
        .order('posted_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (!cancelled) {
        setTransactions((data as UncategorizedTx[]) || []);
        setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  return { transactions, totalCount, isLoading, refresh };
}

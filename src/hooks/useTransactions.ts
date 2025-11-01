/**
 * useTransactions Hook
 *
 * Manages paginated transaction fetching with cursor-based pagination.
 *
 * Features:
 * - Cursor-based pagination (no offset gaps)
 * - Filters: days, confidence, uncategorized, search
 * - Automatic loading state
 * - Error handling with user-friendly messages
 * - Deduplication logic
 *
 * @example
 * const { transactions, nextCursor, isLoading, hasMore, error, loadMore } = useTransactions({
 *   days: 30,
 *   pageSize: 50,
 *   minConfidence: 0.7
 * });
 *
 * // Render transactions
 * transactions.forEach(t => console.log(t.merchant_name, t.confidence));
 *
 * // Load next page
 * if (hasMore) {
 *   loadMore();
 * }
 */

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface TransactionItem {
  id: string;
  user_id: string;
  merchant_name: string;
  merchant_norm: string | null;
  amount: number;
  posted_at: string;
  memo: string | null;
  category_id: string | null;
  category_name: string | null;
  source: "rule" | "ai" | "default" | null;
  confidence: number | null;
}

export interface UseTransactionsOptions {
  days?: number; // 1-180, default 30
  pageSize?: number; // 1-200, default 50
  minConfidence?: number | null; // 0-1
  onlyUncategorized?: boolean;
  q?: string; // merchant search
  autoLoad?: boolean; // load on mount, default true
}

export interface UseTransactionsResult {
  transactions: TransactionItem[];
  nextCursor: string | null;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  reset: () => void;
  setFilters: (filters: Partial<UseTransactionsOptions>) => void;
}

export function useTransactions(options: UseTransactionsOptions = {}): UseTransactionsResult {
  const { userId } = useAuth();
  const {
    days = 30,
    pageSize = 50,
    minConfidence = null,
    onlyUncategorized = false,
    q = "",
    autoLoad = true,
  } = options;

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);

  // Fetch transactions
  const fetchTransactions = useCallback(
    async (cursor?: string | null) => {
      if (!userId) {
        setError("Not authenticated");
        return;
      }

      if (isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const resp = await fetch("/.netlify/functions/tx-list-latest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify({
            days,
            pageSize,
            cursor: cursor ?? null,
            minConfidence,
            onlyUncategorized,
            q: q || undefined,
          }),
        }).then((r) => r.json());

        if (!resp.ok) {
          throw new Error(resp.error || "Failed to fetch transactions");
        }

        const newTxns = resp.data || [];

        // On first load, set all; on subsequent, append
        if (!cursor) {
          setTransactions(newTxns);
        } else {
          setTransactions((prev) => {
            // Dedupe by ID
            const ids = new Set(prev.map((t) => t.id));
            const toAdd = newTxns.filter((t: TransactionItem) => !ids.has(t.id));
            return [...prev, ...toAdd];
          });
        }

        setNextCursor(resp.nextCursor || null);
        setHasMore(!!resp.nextCursor);
      } catch (err: any) {
        setError(err?.message || "Failed to fetch transactions");
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, days, pageSize, minConfidence, onlyUncategorized, q, isLoading]
  );

  // Load more
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !nextCursor) return;
    setCurrentCursor(nextCursor);
    await fetchTransactions(nextCursor);
  }, [isLoading, hasMore, nextCursor, fetchTransactions]);

  // Reset
  const reset = useCallback(() => {
    setTransactions([]);
    setNextCursor(null);
    setCurrentCursor(null);
    setError(null);
    setHasMore(true);
  }, []);

  // Update filters
  const setFilters = useCallback((newFilters: Partial<UseTransactionsOptions>) => {
    reset();
    // NOTE: Caller should re-invoke hook with new options
    // This is a reminder that filters require hook re-initialization
  }, [reset]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && userId && !transactions.length) {
      fetchTransactions();
    }
  }, [userId, autoLoad, fetchTransactions, transactions.length]);

  return {
    transactions,
    nextCursor,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset,
    setFilters,
  };
}







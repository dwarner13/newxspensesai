/**
 * useSmartCategoriesStats
 *
 * Fetches real Tag / Smart Categories stats from Supabase for the current user.
 * All counts are queried independently so a failure in one doesn't block others.
 * Returns null for any stat that cannot be determined; consumers should show "—".
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SmartCategoriesStats {
  /** Transactions with a real category (not null, not 'Uncategorized') */
  itemsTagged: number | null;
  /**
   * AI adoption rate: transactions auto-categorized (category_source IN
   * 'ai','learned','rule') ÷ total categorized × 100.
   * null when data is insufficient to compute.
   */
  autoTaggedPct: number | null;
  /** Count of distinct non-null, non-'Uncategorized' category values */
  categoryCount: number | null;
  /** Auto-categorized transactions with updated_at >= today (local midnight) */
  taggedToday: number | null;
  /** Transactions where category IS NULL or = 'Uncategorized' */
  uncategorizedCount: number | null;
  /** Row count of category_rules table; 0 if table absent */
  activeRulesCount: number | null;
  isLoading: boolean;
}

const AUTO_SOURCES = ['ai', 'learned', 'rule'];

export function useSmartCategoriesStats(): SmartCategoriesStats {
  const { userId } = useAuth();

  const [itemsTagged, setItemsTagged] = useState<number | null>(null);
  const [autoTaggedPct, setAutoTaggedPct] = useState<number | null>(null);
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [taggedToday, setTaggedToday] = useState<number | null>(null);
  const [uncategorizedCount, setUncategorizedCount] = useState<number | null>(null);
  const [activeRulesCount, setActiveRulesCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Local midnight for "today" filter
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    await Promise.allSettled([
      // 1. Items tagged (category present and meaningful)
      (async () => {
        const { count, error } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('category', 'is', null)
          .neq('category', 'Uncategorized');
        if (!error && count !== null) setItemsTagged(count);
      })(),

      // 2. Distinct categories + auto-tagged % (single select, dedupe in JS)
      (async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('category, category_source')
          .eq('user_id', userId)
          .not('category', 'is', null)
          .neq('category', 'Uncategorized');
        if (error || !data) return;

        const distinctCategories = new Set(data.map((r) => r.category as string));
        setCategoryCount(distinctCategories.size);

        const total = data.length;
        if (total > 0) {
          const autoCount = data.filter((r) =>
            AUTO_SOURCES.includes(String(r.category_source || ''))
          ).length;
          setAutoTaggedPct(Math.round((autoCount / total) * 100));
        }
      })(),

      // 3. Tagged today (auto-categorized since local midnight)
      (async () => {
        const { count, error } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('category_source', AUTO_SOURCES)
          .gte('updated_at', todayStart.toISOString());
        if (!error && count !== null) setTaggedToday(count);
      })(),

      // 4. Uncategorized count
      (async () => {
        // Supabase JS .or() filter for IS NULL | = 'Uncategorized'
        const { count, error } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .or('category.is.null,category.eq.Uncategorized');
        if (!error && count !== null) setUncategorizedCount(count);
      })(),

      // 5. Active rules — gracefully handle missing table
      (async () => {
        try {
          const { count, error } = await supabase
            .from('category_rules')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          // Table missing → error code 42P01 or PGRST116
          if (!error && count !== null) {
            setActiveRulesCount(count);
          } else {
            setActiveRulesCount(0);
          }
        } catch {
          setActiveRulesCount(0);
        }
      })(),
    ]);

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return {
    itemsTagged,
    autoTaggedPct,
    categoryCount,
    taggedToday,
    uncategorizedCount,
    activeRulesCount,
    isLoading,
  };
}

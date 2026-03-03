/**
 * useCategoryRules
 *
 * Reads the current user's category_rules from Supabase, ordered by
 * times_applied DESC (most-used first) then created_at DESC.
 *
 * Returns null arrays gracefully when the table doesn't exist yet.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { CategoryRule } from '../lib/categoryRules';

interface UseCategoryRulesResult {
  rules: CategoryRule[];
  activeCount: number;
  totalTimesApplied: number;
  isLoading: boolean;
  refresh: () => void;
}

export function useCategoryRules(): UseCategoryRulesResult {
  const { userId } = useAuth();
  const [rules, setRules] = useState<CategoryRule[]>([]);
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
      try {
        const { data } = await supabase!
          .from('category_rules')
          .select('*')
          .eq('user_id', userId!)
          .order('times_applied', { ascending: false })
          .order('created_at', { ascending: false });

        if (!cancelled) setRules((data as CategoryRule[]) || []);
      } catch {
        // table may not exist yet — return empty silently
        if (!cancelled) setRules([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  const activeCount = rules.filter((r) => r.is_active).length;
  const totalTimesApplied = rules.reduce((sum, r) => sum + r.times_applied, 0);

  return { rules, activeCount, totalTimesApplied, isLoading, refresh };
}

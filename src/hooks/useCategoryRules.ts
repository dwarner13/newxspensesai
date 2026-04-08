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
import { decodeRuleCategory } from '../lib/categoryRules';
import { deleteRule as deleteRuleFn, updateRule as updateRuleFn } from '../lib/categoryRules';

interface UseCategoryRulesResult {
  rules: CategoryRule[];
  activeCount: number;
  totalTimesApplied: number;
  isLoading: boolean;
  refresh: () => void;
  deleteRule: (ruleId: string) => Promise<void>;
  updateRule: (ruleId: string, patch: Partial<Pick<CategoryRule, 'match_value' | 'category' | 'subcategory' | 'match_type' | 'is_active'>>) => Promise<void>;
}

let categoryRulesTableUnavailable = false;

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
      if (categoryRulesTableUnavailable) {
        if (!cancelled) {
          setRules([]);
          setIsLoading(false);
        }
        return;
      }
      try {
        const { data, error } = await supabase!
          .from('category_rules')
          .select('*')
          .eq('user_id', userId!)
          .order('times_applied', { ascending: false })
          .order('created_at', { ascending: false });
        if (error) {
          const code = String((error as any)?.code || '');
          const msg = String((error as any)?.message || '').toLowerCase();
          if (code === '42P01' || code === '404' || msg.includes('category_rules') || msg.includes('does not exist')) {
            categoryRulesTableUnavailable = true;
          }
          if (!cancelled) setRules([]);
          return;
        }
        if (!cancelled) {
          const decodedRules = ((data as CategoryRule[]) || []).map((rule) => {
            const decoded = decodeRuleCategory(rule.category);
            return {
              ...rule,
              category: decoded.category || rule.category,
              subcategory: decoded.subcategory,
            };
          });
          setRules(decodedRules);
        }
      } catch {
        // table may not exist yet - return empty silently
        categoryRulesTableUnavailable = true;
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

  const deleteRule = async (ruleId: string) => {
    await deleteRuleFn(ruleId);
    refresh();
  };

  const updateRule = async (
    ruleId: string,
    patch: Partial<Pick<CategoryRule, 'match_value' | 'category' | 'subcategory' | 'match_type' | 'is_active'>>
  ) => {
    await updateRuleFn(ruleId, patch);
    refresh();
  };

  const activeCount = rules.filter((rule) => rule.is_active !== false).length;
  const totalTimesApplied = rules.reduce(
    (sum, rule) => sum + Number(rule.times_applied || 0),
    0
  );

  return { rules, activeCount, totalTimesApplied, isLoading, refresh, deleteRule, updateRule };
}

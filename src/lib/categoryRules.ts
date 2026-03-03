/**
 * categoryRules — client-side CRUD helpers for the category_rules table.
 *
 * Kept framework-free (no hooks) so these can be called from anywhere:
 * TransactionRow, UncategorizedReviewQueue, CategoryRulesModal, etc.
 */

import { getSupabase } from './supabase';

export interface CategoryRule {
  id: string;
  user_id: string;
  match_type: 'exact' | 'contains' | 'starts_with' | 'regex';
  match_value: string;
  category: string;
  is_active: boolean;
  times_applied: number;
  created_at: string;
  updated_at: string;
}

// ── Rule matching helpers ────────────────────────────────────────────────────

/** Apply rules (already sorted exact→starts_with→contains→regex) against raw vendor text. */
export function applyRules(text: string, rules: CategoryRule[]): string | null {
  const lower = text.toLowerCase();
  for (const rule of rules) {
    if (!rule.is_active) continue;
    const val = rule.match_value.toLowerCase();
    switch (rule.match_type) {
      case 'exact':
        if (lower === val) return rule.category;
        break;
      case 'starts_with':
        if (lower.startsWith(val)) return rule.category;
        break;
      case 'contains':
        if (lower.includes(val)) return rule.category;
        break;
      case 'regex':
        try {
          if (new RegExp(rule.match_value, 'i').test(text)) return rule.category;
        } catch {
          /* ignore bad regex */
        }
        break;
    }
  }
  return null;
}

// ── CRUD ────────────────────────────────────────────────────────────────────

/**
 * Create or update a category rule. Uses UPSERT on (user_id, match_type, match_value)
 * so clicking "Yes" twice for the same merchant is idempotent.
 */
export async function createCategoryRule(
  userId: string,
  matchValue: string,
  category: string,
  matchType: CategoryRule['match_type'] = 'contains'
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not available' };

  const normalized = matchValue.trim().toUpperCase();
  if (!normalized || !category) return { ok: false, error: 'match_value and category are required' };

  const { error } = await supabase.from('category_rules').upsert(
    {
      user_id: userId,
      match_type: matchType,
      match_value: normalized,
      category,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,match_type,match_value' }
  );

  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Toggle a rule's active state. */
export async function toggleCategoryRule(
  ruleId: string,
  isActive: boolean
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase
    .from('category_rules')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', ruleId);
  return !error;
}

/** Permanently delete a rule. */
export async function deleteCategoryRule(ruleId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from('category_rules').delete().eq('id', ruleId);
  return !error;
}

/** Add a new rule from a simple form (used in CategoryRulesModal). */
export async function addCategoryRule(
  userId: string,
  matchType: CategoryRule['match_type'],
  matchValue: string,
  category: string
): Promise<{ ok: boolean; error?: string }> {
  return createCategoryRule(userId, matchValue, category, matchType);
}

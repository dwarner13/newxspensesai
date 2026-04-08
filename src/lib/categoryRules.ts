/**
 * categoryRules - client-side CRUD helpers for the category_rules table.
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
  subcategory?: string | null;
  is_active: boolean;
  times_applied: number;
  created_at: string;
  updated_at: string;
}

const CATEGORY_SUBCATEGORY_SEPARATOR = '::';

export function encodeRuleCategory(category: string, subcategory?: string | null): string {
  const main = String(category || '').trim();
  const sub = String(subcategory || '').trim();
  if (!sub) return main;
  return `${main}${CATEGORY_SUBCATEGORY_SEPARATOR}${sub}`;
}

export function decodeRuleCategory(encoded: string): { category: string; subcategory: string | null } {
  const raw = String(encoded || '').trim();
  if (!raw) return { category: '', subcategory: null };
  const idx = raw.indexOf(CATEGORY_SUBCATEGORY_SEPARATOR);
  if (idx === -1) return { category: raw, subcategory: null };
  const category = raw.slice(0, idx).trim();
  const subcategory = raw.slice(idx + CATEGORY_SUBCATEGORY_SEPARATOR.length).trim() || null;
  return { category, subcategory };
}

// ── Rule matching helpers ────────────────────────────────────────────────────

/** Apply rules (already sorted exact->starts_with->contains->regex) against raw vendor text. */
export function applyRules(text: string, rules: CategoryRule[]): string | null {
  const lower = text.toLowerCase();
  for (const rule of rules) {
    if (!rule.is_active) continue;
    const decoded = decodeRuleCategory(rule.category);
    const val = rule.match_value.toLowerCase();
    switch (rule.match_type) {
      case 'exact':
        if (lower === val) return decoded.category;
        break;
      case 'starts_with':
        if (lower.startsWith(val)) return decoded.category;
        break;
      case 'contains':
        if (lower.includes(val)) return decoded.category;
        break;
      case 'regex':
        try {
          if (new RegExp(rule.match_value, 'i').test(text)) return decoded.category;
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
  matchType: CategoryRule['match_type'] = 'contains',
  subcategory?: string | null
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
      category: encodeRuleCategory(category, subcategory),
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
  category: string,
  subcategory?: string | null
): Promise<{ ok: boolean; error?: string }> {
  return createCategoryRule(userId, matchValue, category, matchType, subcategory);
}

/** Delete a category rule by id. */
export async function deleteRule(
  ruleId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not available' };

  const { error } = await supabase
    .from('category_rules')
    .delete()
    .eq('id', ruleId);

  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Update match_value, category, match_type, or is_active on an existing rule. */
export async function updateRule(
  ruleId: string,
  patch: Partial<Pick<CategoryRule, 'match_value' | 'category' | 'match_type' | 'is_active' | 'subcategory'>>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase not available' };
  const payload: Record<string, unknown> = { ...patch };
  if (Object.prototype.hasOwnProperty.call(payload, 'subcategory')) {
    delete payload.subcategory;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'category')) {
    const mainCategory = String(patch.category || '').trim();
    payload.category = encodeRuleCategory(mainCategory, patch.subcategory ?? null);
  }

  const { error } = await supabase
    .from('category_rules')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', ruleId);

  return error ? { ok: false, error: error.message } : { ok: true };
}

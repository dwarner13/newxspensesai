/**
 * tag-action - Natural language category change handler for Tag chat.
 *
 * Intents:
 *   preview  -> find matching transactions, return count + samples (no writes)
 *   commit   -> update transactions + create rule + write vendor memory
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { safeLog } from './_shared/safeLog.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function ok(body: object, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}
function err(message: string, status = 400) {
  return { statusCode: status, headers: CORS, body: JSON.stringify({ ok: false, error: message }) };
}

function parseCategoryInput(raw: string): { category: string; subcategory: string | null } {
  const value = String(raw || '').trim();
  if (!value) return { category: 'Other', subcategory: null };
  const separators = ['>', '::', '/'];
  for (const separator of separators) {
    const idx = value.indexOf(separator);
    if (idx !== -1) {
      const category = value.slice(0, idx).trim() || 'Other';
      const subcategory = value.slice(idx + separator.length).trim() || null;
      return { category, subcategory };
    }
  }
  return { category: value, subcategory: null };
}

function encodeRuleCategory(category: string, subcategory: string | null): string {
  const main = String(category || '').trim();
  const sub = String(subcategory || '').trim();
  return sub ? `${main}::${sub}` : main;
}

const CANONICAL_CATEGORIES = [
  'Income',
  'Groceries',
  'Food & Dining',
  'Transportation',
  'Housing',
  'Utilities',
  'Shopping',
  'Subscriptions',
  'Entertainment',
  'Healthcare',
  'Insurance',
  'Education',
  'Travel',
  'Transfers',
  'Bank Fees',
  'Business',
  'Personal Care',
  'Home & Garden',
  'Other',
  'Uncategorized',
] as const;
const CATEGORY_ALIASES: Record<string, string> = {
  dining: 'Food & Dining',
  'food and dining': 'Food & Dining',
  health: 'Healthcare',
  fees: 'Bank Fees',
  'cash & atm': 'Transfers',
  'health & fitness': 'Personal Care',
};
function normalizeCategoryKey(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
function normalizeCanonicalCategory(input: string): string {
  const key = normalizeCategoryKey(input);
  if (!key) return 'Other';
  const direct = CANONICAL_CATEGORIES.find((c) => normalizeCategoryKey(c) === key);
  if (direct) return direct;
  return CATEGORY_ALIASES[key] || 'Other';
}

// ── Intent classifier ────────────────────────────────────────────────────────
// Returns null if message is a question, not an action request
export function classifyTagIntent(message: string): {
  matchValue: string;
  targetCategory: string;
  matchType: 'contains' | 'exact';
} | null {
  const text = message.toLowerCase().trim();

  // Action verbs that signal a write intent
  const actionVerbs = /\b(move|change|set|mark|categorize|recategorize|put|tag|assign|update)\b/i;
  if (!actionVerbs.test(text)) return null;

  // Pattern: "move/change X to Y" or "categorize X as Y"
  const toPattern = /(?:move|change|set|mark|categorize|recategorize|put|tag|assign|update)\s+(?:all\s+)?["']?([^"']+?)["']?\s+(?:to|as)\s+["']?([^"'.,!?]+)["']?/i;
  const match = text.match(toPattern);
  if (!match) return null;

  const matchValue = match[1].trim();
  const targetCategory = match[2].trim();

  if (!matchValue || !targetCategory) return null;

  // Exact match if quoted, contains otherwise
  const isQuoted = /["']/.test(message.slice(message.toLowerCase().indexOf(matchValue) - 1, message.toLowerCase().indexOf(matchValue)));

  return {
    matchValue,
    targetCategory: targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1),
    matchType: isQuoted ? 'exact' : 'contains',
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

  const auth = await verifyAuth(event);
  if (!auth.userId) return err('Unauthorized', 401);
  const userId = auth.userId;
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` } },
    }
  );

  const body = JSON.parse(event.body || '{}');
  const { intent, matchValue, targetCategory, matchType = 'contains', importId } = body;

  if (!intent) return err('Missing intent (preview | commit | save_rule | undo | bulk_apply)');

  // Bulk apply - from background sweep
  if (intent === 'bulk_apply') {
    const { groups } = body;
    if (!Array.isArray(groups)) return err('Missing groups array');
    let total = 0;
    for (const group of groups) {
      if (!Array.isArray(group.ids) || !group.category) continue;
      const updatePayload: Record<string, any> = { category: group.category, category_source: 'tag_rule', updated_at: new Date().toISOString() };
      if (group.subcategory) { updatePayload.subcategory = group.subcategory; updatePayload.subcategory_source = 'tag_rule'; }
      await supabase
        .from('transactions')
        .update(updatePayload)
        .in('id', group.ids)
        .eq('user_id', userId);
      total += group.ids.length;
    }
    return ok({ ok: true, intent: 'bulk_apply', applied: total });
  }

  // Undo intent - doesn't need matchValue/targetCategory
  if (intent === 'undo') {
    const { affectedIds, previousCategory } = body;
    if (!Array.isArray(affectedIds) || !previousCategory) return err('Missing affectedIds or previousCategory');
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ category: previousCategory, category_source: 'user_undo', updated_at: new Date().toISOString() })
        .in('id', affectedIds)
        .eq('user_id', userId);
      if (error) return err(error.message, 500);
      return ok({ ok: true, intent: 'undo', reverted: affectedIds.length });
    } catch (e: any) { return err(e.message, 500); }
  }

  if (!matchValue || !targetCategory) return err('Missing matchValue or targetCategory');
  const parsedTargetRaw = parseCategoryInput(String(targetCategory));
  const parsedTarget = {
    category: normalizeCanonicalCategory(parsedTargetRaw.category),
    subcategory: parsedTargetRaw.subcategory,
  };

  const normalized = matchValue.trim().toUpperCase();

  // ── PREVIEW ────────────────────────────────────────────────────────────────
  if (intent === 'preview') {
    try {
      let query = supabase
        .from('transactions')
        .select('id, merchant_name, amount, posted_at, category')
        .eq('user_id', userId)
        .order('posted_at', { ascending: false })
        .limit(500);

      if (importId) query = query.eq('import_id', importId);

      const { data, error } = await query;
      if (error) return err(error.message, 500);

      const rows = (data || []) as any[];
      const matching = rows.filter((tx) => {
        const haystack = (tx.merchant_name || '').toUpperCase();
        return matchType === 'exact'
          ? haystack === normalized
          : haystack.includes(normalized);
      });

      const samples = matching.slice(0, 5).map((tx) => ({
        id: tx.id,
        merchant_name: tx.merchant_name,
        amount: tx.amount,
        posted_at: tx.posted_at,
        current_category: tx.category || 'Uncategorized',
      }));

      return ok({
        ok: true,
        intent: 'preview',
        matchValue: normalized,
        targetCategory: parsedTarget.category,
        targetSubcategory: parsedTarget.subcategory,
        matchType,
        matchCount: matching.length,
        samples,
        affectedIds: matching.map((tx) => tx.id),
      });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  // ── COMMIT ─────────────────────────────────────────────────────────────────
  if (intent === 'commit') {
    const { affectedIds } = body;
    if (!Array.isArray(affectedIds) || affectedIds.length === 0) {
      return err('Missing affectedIds for commit');
    }

    try {
      // 1. Update transactions table
      const { error: txError } = await supabase
        .from('transactions')
        .update({
          category: parsedTarget.category,
          subcategory: parsedTarget.subcategory,
          category_source: 'tag_chat',
          updated_at: new Date().toISOString(),
        })
        .in('id', affectedIds)
        .eq('user_id', userId);

      if (txError) return err(txError.message, 500);

      // 2. Create/upsert category_rule so future imports use it
      await supabase.from('category_rules').upsert(
        {
          user_id: userId,
          match_type: matchType,
          match_value: normalized,
          category: encodeRuleCategory(parsedTarget.category, parsedTarget.subcategory),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,match_type,match_value' }
      );

      // 3. Write vendor memory so tag-learn picks it up
      await supabase.from('vendor_category_memory').upsert(
        {
          user_id: userId,
          vendor_key: normalized.toLowerCase(),
          category: parsedTarget.category,
          subcategory: parsedTarget.subcategory,
          source: 'tag_chat',
          confidence: 0.95,
          times_confirmed: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,vendor_key' }
      );

      safeLog('tag-action.commit', {
        userId,
        matchValue: normalized,
        targetCategory: parsedTarget.category,
        targetSubcategory: parsedTarget.subcategory,
        matchType,
        updatedCount: affectedIds.length,
      });

      return ok({
        ok: true,
        intent: 'commit',
        matchValue: normalized,
        targetCategory: parsedTarget.category,
        targetSubcategory: parsedTarget.subcategory,
        matchType,
        updatedCount: affectedIds.length,
      });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  // ── SAVE_RULE ──────────────────────────────────────────────────────────────
  if (intent === 'save_rule') {
    try {
      const ruleSubcategory = body.targetSubcategory ?? body.subcategory ?? parsedTarget.subcategory ?? null;
      const ruleAmountMin = body.amount_min ?? null;
      const ruleAmountMax = body.amount_max ?? null;
      // Upsert into category_rules - schema uses match_value, NOT merchant_pattern
      const { error: ruleErr } = await supabase.from('category_rules').upsert(
        {
          user_id: userId,
          match_type: matchType,
          match_value: normalized,
          category: parsedTarget.category,
          subcategory: ruleSubcategory,
          ...(ruleAmountMin != null ? { amount_min: ruleAmountMin } : {}),
          ...(ruleAmountMax != null ? { amount_max: ruleAmountMax } : {}),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,match_type,match_value' }
      );
      if (ruleErr) {
        console.error('[tag-action] save_rule upsert failed', ruleErr.message);
        return err(`Could not save rule: ${ruleErr.message}`, 500);
      }

      // Backfill existing committed transactions matching this rule
      let backfillCount = 0;
      try {
        const updatePayload: Record<string, unknown> = {
          category: parsedTarget.category,
          category_source: 'tag_rule',
          updated_at: new Date().toISOString(),
        };
        if (ruleSubcategory) {
          updatePayload.subcategory = ruleSubcategory;
          updatePayload.subcategory_source = 'tag_rule';
        }
        let bq = supabase
          .from('transactions')
          .update(updatePayload)
          .eq('user_id', userId);
        if (matchType === 'exact') {
          bq = bq.eq('merchant_name', normalized);
        } else {
          bq = bq.ilike('merchant_name', `%${normalized}%`);
        }
        if (ruleAmountMin != null) bq = bq.gte('amount', ruleAmountMin);
        if (ruleAmountMax != null) bq = bq.lt('amount', ruleAmountMax);
        const { count } = await bq.select('id', { count: 'exact', head: true });
        backfillCount = count || 0;
      } catch (bfErr: any) {
        console.warn('[tag-action] Backfill error (non-blocking):', bfErr?.message);
      }

      // Also write vendor memory
      await supabase.from('vendor_category_memory').upsert(
        {
          user_id: userId,
          vendor_key: normalized.toLowerCase(),
          category: parsedTarget.category,
          subcategory: parsedTarget.subcategory,
          source: 'user_rule',
          confidence: 1.0,
          times_confirmed: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,vendor_key' }
      );

      safeLog('tag-action.save_rule', { userId, matchValue: normalized, targetCategory: parsedTarget.category, matchType });

      return ok({ ok: true, intent: 'save_rule', rule: { merchant: normalized, category: parsedTarget.category }, backfill_count: backfillCount });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  return err(`Unknown intent: ${intent}`);
};

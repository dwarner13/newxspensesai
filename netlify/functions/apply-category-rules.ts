/**
 * apply-category-rules
 *
 * Applies user-defined category_rules + vendor memory + merchant map
 * to committed transactions. Can scope to a specific import_id or
 * process all uncategorized transactions.
 *
 * POST { import_id?: string, limit?: number }
 * Returns { ok, updated, total, skipped }
 *
 * Called by the frontend after import commit to ensure rules are applied
 * reliably (not fire-and-forget).
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { safeLog } from './_shared/safeLog.js';
import { normalizeMerchant } from './_shared/merchantUtils.js';
import { matchMerchantMap } from './_shared/merchantCategoryMap.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Canonical category normalization
const CANONICAL: Record<string, string> = {
  'food': 'Food & Dining', 'food & drink': 'Food & Dining', 'restaurants': 'Food & Dining',
  'dining': 'Food & Dining', 'groceries': 'Groceries', 'grocery': 'Groceries',
  'transport': 'Transportation', 'auto': 'Transportation', 'gas': 'Transportation',
  'home': 'Housing', 'rent': 'Housing', 'mortgage': 'Housing',
  'bills': 'Utilities', 'utility': 'Utilities', 'phone': 'Utilities',
  'health': 'Healthcare', 'medical': 'Healthcare', 'pharmacy': 'Healthcare',
  'education': 'Education', 'tuition': 'Education',
  'entertainment': 'Entertainment', 'fun': 'Entertainment',
  'clothing': 'Shopping', 'retail': 'Shopping',
  'bank fee': 'Bank Fees', 'bank fees': 'Bank Fees', 'service charge': 'Bank Fees',
  'transfer': 'Transfers', 'transfers': 'Transfers', 'e-transfer': 'Transfers',
  'saving': 'Savings', 'savings': 'Savings',
  'debt': 'Debt Payments', 'loan': 'Debt Payments',
  'insurance': 'Insurance',
  'subscription': 'Subscriptions', 'subscriptions': 'Subscriptions',
  'personal': 'Personal Care', 'personal care': 'Personal Care',
  'business': 'Business', 'office': 'Business',
  'income': 'Income', 'salary': 'Income', 'deposit': 'Income',
  'travel': 'Travel',
};

function normalizeCanonicalCategory(cat: string): string {
  if (!cat) return 'Needs Review';
  const lower = cat.toLowerCase().trim();
  return CANONICAL[lower] || cat.charAt(0).toUpperCase() + cat.slice(1);
}

function normalizeVendorKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Inline rules for common Canadian merchants
const RULES: Array<{ contains: string[]; category: string }> = [
  { contains: ['gordon food', 'gordon foods'], category: 'Income' },
  { contains: ['celtic group'], category: 'Housing' },
  { contains: ['b/m payt', 'b/m pay'], category: 'Housing' },
  { contains: ['td loan'], category: 'Transportation' },
  { contains: ['capital one'], category: 'Transfers' },
  { contains: ['bmo invinc'], category: 'Transfers' },
  { contains: ['easyfinancial', 'national money', 'lenddirect'], category: 'Debt Payments' },
  { contains: ['ind all saving'], category: 'Savings' },
  { contains: ['mobile cheque deposit', 'cheque deposit'], category: 'Income' },
  { contains: ['starbucks', 'tim horton', 'second cup'], category: 'Food & Dining' },
  { contains: ['uber', 'lyft', 'taxi', 'transit', 'presto'], category: 'Transportation' },
  { contains: ['amazon', 'amzn'], category: 'Shopping' },
  { contains: ['insurance', 'assurance', 'allstate', 'intact'], category: 'Insurance' },
  { contains: ['telus', 'rogers', 'bell ', 'hydro', 'internet', 'fido', 'koodo'], category: 'Utilities' },
  { contains: ['netflix', 'spotify', 'disney', 'apple.com', 'youtube', 'crave'], category: 'Subscriptions' },
  { contains: ['walmart', 'costco', 'no frills', 'freshco', 'loblaws', 'metro ', 'food basics', 'sobeys', 'safeway'], category: 'Groceries' },
  { contains: ['shoppers drug', 'rexall', 'pharma', 'london drugs'], category: 'Healthcare' },
  { contains: ['7-eleven', 'circle k', 'shell ', 'petro', 'esso ', 'pioneer'], category: 'Transportation' },
  { contains: ['interac e-transfer', 'e-transfer'], category: 'Transfers' },
];

function applyInlineRules(merchant: string): string | null {
  const lower = merchant.toLowerCase();
  for (const rule of RULES) {
    if (rule.contains.some(k => lower.includes(k))) return normalizeCanonicalCategory(rule.category);
  }
  return null;
}

type DbRule = {
  match_type: string;
  match_value: string;
  category: string;
  subcategory?: string | null;
  min_amount?: number | null;
  max_amount?: number | null;
};

function applyDbRules(
  dbRules: DbRule[],
  merchant: string,
  amount?: number
): { category: string; subcategory: string | null } | null {
  const lower = merchant.toLowerCase();
  for (const amountPass of [true, false]) {
    for (const rule of dbRules) {
      const hasAmountThreshold = rule.min_amount != null || rule.max_amount != null;
      if (amountPass && !hasAmountThreshold) continue;
      if (!amountPass && hasAmountThreshold) continue;

      const val = rule.match_value.toLowerCase();
      const nameMatched =
        (rule.match_type === 'exact' && lower === val) ||
        (rule.match_type === 'starts_with' && lower.startsWith(val)) ||
        (rule.match_type === 'contains' && lower.includes(val)) ||
        (rule.match_type === 'regex' && (() => { try { return new RegExp(rule.match_value, 'i').test(merchant); } catch { return false; } })());
      if (!nameMatched) continue;

      if (hasAmountThreshold && amount !== undefined) {
        const absAmt = Math.abs(amount);
        if (rule.min_amount != null && absAmt < rule.min_amount) continue;
        if (rule.max_amount != null && absAmt >= rule.max_amount) continue;
      } else if (hasAmountThreshold) {
        continue;
      }

      return {
        category: normalizeCanonicalCategory(rule.category),
        subcategory: rule.subcategory || null,
      };
    }
  }
  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: auth.error || 'Unauthorized' }) };
  }
  const userId = auth.userId;
  const supabase = serverSupabase();

  const body = (() => {
    try { return JSON.parse(event.body || '{}') as Record<string, unknown>; }
    catch { return {}; }
  })();

  const importId = typeof body.import_id === 'string' ? body.import_id : null;
  const requestedLimit = Number(body.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(1000, Math.floor(requestedLimit))) : 500;

  safeLog('info', '[apply-category-rules] Starting', { userId, importId, limit });

  // 1. Fetch transactions to process
  let query = supabase
    .from('transactions')
    .select('id, merchant_name, merchant, amount, description, category')
    .eq('user_id', userId)
    .order('posted_at', { ascending: false })
    .limit(limit);

  if (importId) {
    // Scope to specific import — apply to ALL transactions (not just uncategorized)
    // because during import they may all be 'Other' from the default categorizer
    query = query.eq('import_id', importId);
  } else {
    // General cleanup — only uncategorized
    query = query.or('category.is.null,category.eq.Uncategorized,category.eq.Other,category.eq.Needs Review');
  }

  const { data: rows, error } = await query;

  if (error) {
    safeLog('error', '[apply-category-rules] Fetch error', { userId, error: error.message });
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message }) };
  }

  const txs = rows || [];
  if (txs.length === 0) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, updated: 0, total: 0, skipped: 0 }) };
  }

  // 2. Build vendor keys for memory lookup
  const vendorKeys = txs.map(tx =>
    normalizeVendorKey(tx.merchant_name || tx.merchant || tx.description || '')
  );
  const uniqueKeys = [...new Set(vendorKeys.filter(Boolean))];

  // 3. Fetch vendor memory
  const memoryMap = new Map<string, string>();
  if (uniqueKeys.length > 0) {
    const { data: memoryRows } = await supabase
      .from('vendor_category_memory')
      .select('vendor_key, category')
      .eq('user_id', userId)
      .in('vendor_key', uniqueKeys);
    for (const row of memoryRows || []) {
      memoryMap.set(row.vendor_key, row.category);
    }
  }

  // 4. Fetch user-defined DB rules
  let dbRules: DbRule[] = [];
  try {
    const { data: ruleRows } = await supabase
      .from('category_rules')
      .select('match_type, match_value, category, subcategory, min_amount, max_amount')
      .eq('user_id', userId)
      .eq('is_active', true);
    const TYPE_PRIORITY: Record<string, number> = { exact: 0, starts_with: 1, contains: 2, regex: 3 };
    dbRules = ((ruleRows || []) as DbRule[]).sort(
      (a, b) => (TYPE_PRIORITY[a.match_type] ?? 9) - (TYPE_PRIORITY[b.match_type] ?? 9)
    );
  } catch { /* table may not exist yet */ }

  safeLog('info', '[apply-category-rules] Loaded', {
    userId, transactions: txs.length, vendorMemory: memoryMap.size, dbRules: dbRules.length,
  });

  // 5. Apply: vendor memory → DB rules → merchant map → inline rules
  const updates: Array<{ id: string; category: string; subcategory?: string | null; source: string }> = [];
  let skipped = 0;

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    const key = vendorKeys[i];
    const merchant = tx.merchant_name || tx.merchant || tx.description || '';
    const txAmount = Number(tx.amount || 0);
    const currentCat = tx.category || '';

    // Skip if already well-categorized (not Other/Uncategorized/Needs Review/null)
    const needsWork = !currentCat || ['Other', 'Uncategorized', 'Needs Review'].includes(currentCat);
    if (!needsWork && !importId) {
      skipped++;
      continue;
    }

    // Priority 1: Vendor memory
    const memoryCat = key ? memoryMap.get(key) : undefined;
    if (memoryCat) {
      updates.push({ id: tx.id, category: normalizeCanonicalCategory(memoryCat), source: 'learned' });
      continue;
    }

    // Priority 2: User DB rules
    const dbRuleMatch = applyDbRules(dbRules, merchant, txAmount);
    if (dbRuleMatch) {
      updates.push({
        id: tx.id,
        category: normalizeCanonicalCategory(dbRuleMatch.category),
        subcategory: dbRuleMatch.subcategory,
        source: 'tag_rule',
      });
      continue;
    }

    // Priority 3: Merchant map
    const mapMatch = matchMerchantMap(merchant);
    if (mapMatch) {
      updates.push({ id: tx.id, category: mapMatch.category, subcategory: mapMatch.subcategory ?? null, source: 'tag_rule' });
      continue;
    }

    // Priority 4: Inline rules
    const ruleCat = applyInlineRules(merchant);
    if (ruleCat) {
      updates.push({ id: tx.id, category: ruleCat, source: 'tag_rule' });
      continue;
    }

    // No match — mark as Needs Review (better than Other)
    if (needsWork) {
      updates.push({ id: tx.id, category: 'Needs Review', source: 'needs_review' });
    } else {
      skipped++;
    }
  }

  // 6. Batch update
  let updated = 0;
  if (updates.length > 0) {
    const results = await Promise.allSettled(
      updates.map(u => {
        const payload: Record<string, unknown> = {
          category: u.category,
          category_source: u.source,
          updated_at: new Date().toISOString(),
        };
        if (Object.prototype.hasOwnProperty.call(u, 'subcategory')) {
          payload.subcategory = u.subcategory ?? null;
          if (u.subcategory) payload.subcategory_source = u.source;
        }
        return supabase
          .from('transactions')
          .update(payload)
          .eq('id', u.id)
          .eq('user_id', userId);
      })
    );
    updated = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
  }

  safeLog('info', `[apply-category-rules] Done: ${updated}/${txs.length} updated, ${skipped} skipped`, { userId, importId });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, updated, total: txs.length, skipped }),
  };
};

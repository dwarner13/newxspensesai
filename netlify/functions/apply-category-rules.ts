/**
 * apply-category-rules
 *
 * Applies user-defined category_rules + vendor memory + hardcoded overrides
 * + merchant map to committed transactions. Can scope to a specific import_id.
 *
 * POST { import_id?: string, limit?: number }
 * Returns { ok, updated, total, skipped, duplicatesRemoved }
 *
 * IMPORTANT: This function ONLY updates category, category_source, subcategory,
 * subcategory_source, and updated_at. It NEVER changes type, amount, or
 * merchant_name — those fields are owned by the parser.
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

// ─── Hardcoded merchant overrides — these ALWAYS win ────────────────────────
// Match by checking if merchant_name.toUpperCase() includes the key.
// Order matters: more specific keys first (e.g. "POPEYE'S SUPPLEMENTS" before "POPEYES")
const HARDCODED_OVERRIDES: Array<{ key: string; category: string; subcategory?: string }> = [
  { key: "POPEYE'S SUPPLEMENTS", category: 'Healthcare', subcategory: 'Supplements' },
  { key: 'LEWIS MASSAGE', category: 'Personal Care', subcategory: 'Massage' },
  { key: "AD'S MASSAGE", category: 'Personal Care', subcategory: 'Massage' },
  { key: 'SHADIFIED', category: 'Personal Care' },
  { key: 'TULIP GARDEN', category: 'Personal Care' },
  { key: 'BORROWELL', category: 'Bank Fees' },
  { key: 'PREMIUM PLAN', category: 'Bank Fees' },
  { key: 'MOBILE CHEQUE', category: 'Income', subcategory: 'Cheque Deposit' },
  { key: 'INTERAC E-TRANSFER SENT', category: 'Transfers', subcategory: 'e-Transfer' },
  { key: 'INTERAC E-TRANSFER RECEIVED', category: 'Transfers', subcategory: 'e-Transfer' },
  { key: 'INTERAC E-TRANSFER', category: 'Transfers', subcategory: 'e-Transfer' },
  { key: 'NORTHTOWN REGISTRY', category: 'Transportation', subcategory: 'Registration' },
  { key: 'NORTHTOWN', category: 'Transportation' },
  { key: 'CASH MONEY', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { key: 'EASYFINANCIAL', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { key: 'CELTIC GROUP', category: 'Debt Payments' },
  { key: 'TD LOAN', category: 'Debt Payments', subcategory: 'Loan Payment' },
  { key: 'BMO INV', category: 'Transfers' },
  { key: 'B/M PAYT', category: 'Housing', subcategory: 'Mortgage' },
  { key: 'NATIONAL MONEY', category: 'Debt Payments' },
  { key: 'FLEXITI', category: 'Debt Payments', subcategory: 'Credit Card' },
  { key: 'PETRO-CANADA', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'SHELL', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'ESSO', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'KOLLBROOK', category: 'Transportation', subcategory: 'Gas & Fuel' },
  { key: 'SOBEYS', category: 'Groceries' },
  { key: 'SAVE ON FOODS', category: 'Groceries' },
  { key: 'LOBLAWS', category: 'Groceries' },
  { key: 'SAFEWAY', category: 'Groceries' },
  { key: 'COSTCO', category: 'Groceries' },
  { key: 'WALMART', category: 'Shopping' },
  { key: 'POPEYES', category: 'Food & Dining', subcategory: 'Fast Food' },
  { key: 'TIM HORTONS', category: 'Food & Dining', subcategory: 'Coffee' },
  { key: 'CDACARBONREBATE', category: 'Income', subcategory: 'Government Rebate' },
  { key: 'CANADA RIT', category: 'Income', subcategory: 'Tax Refund' },
  { key: 'MANULIFE', category: 'Income', subcategory: 'Insurance' },
  { key: 'GORDON FOOD SER', category: 'Income', subcategory: 'Employment' },
  { key: 'RIVER CREE', category: 'Entertainment', subcategory: 'Gaming' },
  { key: 'BEAR HILLS CASINO', category: 'Entertainment', subcategory: 'Gaming' },
  { key: 'SPECSAVERS', category: 'Healthcare', subcategory: 'Vision' },
  { key: 'RIVERVIEW PH', category: 'Healthcare', subcategory: 'Pharmacy' },
  { key: 'SHOPPERS DRUG', category: 'Healthcare', subcategory: 'Pharmacy' },
  { key: 'LEWIS ESTATES', category: 'Entertainment', subcategory: 'Golf' },
];

function applyHardcodedOverride(merchant: string): { category: string; subcategory: string | null } | null {
  const upper = merchant.toUpperCase();
  for (const override of HARDCODED_OVERRIDES) {
    if (upper.includes(override.key)) {
      return { category: override.category, subcategory: override.subcategory || null };
    }
  }
  return null;
}

// ─── Canonical category normalization ───────────────────────────────────────
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
  'employment income': 'Income',
  'travel': 'Travel',
};

function normalizeCanonicalCategory(cat: string): string {
  if (!cat) return 'Needs Review';
  const lower = cat.toLowerCase().trim();
  return CANONICAL[lower] || cat.charAt(0).toUpperCase() + cat.slice(1);
}

function normalizeVendorKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Inline rules for common Canadian merchants ────────────────────────────
const RULES: Array<{ contains: string[]; category: string }> = [
  { contains: ['gordon food', 'gordon foods'], category: 'Income' },
  { contains: ['celtic group'], category: 'Debt Payments' },
  { contains: ['b/m payt', 'b/m pay'], category: 'Housing' },
  { contains: ['td loan'], category: 'Debt Payments' },
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
  match_type: string; match_value: string; category: string;
  subcategory?: string | null; min_amount?: number | null; max_amount?: number | null;
};

function applyDbRules(
  dbRules: DbRule[], merchant: string, amount?: number
): { category: string; subcategory: string | null } | null {
  const lower = merchant.toLowerCase();
  for (const amountPass of [true, false]) {
    for (const rule of dbRules) {
      const hasAmountThreshold = rule.min_amount != null || rule.max_amount != null;
      if (amountPass && !hasAmountThreshold) continue;
      if (!amountPass && hasAmountThreshold) continue;
      if (!rule.match_value) continue;
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
      } else if (hasAmountThreshold) { continue; }
      return { category: normalizeCanonicalCategory(rule.category), subcategory: rule.subcategory || null };
    }
  }
  return null;
}

// ─── Deduplication helper ──────────────────────────────────────────────────
// Groups by normalized merchant + amount + date. For groups with count > 1,
// keeps the record with the lowest id (first inserted), deletes the rest.
async function deduplicateImport(
  supabase: any, userId: string, importId: string
): Promise<number> {
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, merchant_name, amount, date, posted_at')
    .eq('user_id', userId)
    .eq('import_id', importId)
    .order('id', { ascending: true });

  if (!txs || txs.length < 2) return 0;

  const groups = new Map<string, string[]>();
  for (const tx of txs) {
    // Aggressive normalization: uppercase, strip non-alphanumeric, first 12 chars
    // Catches "7-Eleven" vs "7-ELEVEN STORE #1234" duplicates
    const key = [
      (tx.merchant_name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12),
      String(Math.abs(Number(tx.amount || 0))),
      tx.date || tx.posted_at?.split('T')[0] || '',
    ].join('|');
    const existing = groups.get(key) || [];
    existing.push(tx.id);
    groups.set(key, existing);
  }

  const toDelete: string[] = [];
  for (const [, ids] of groups) {
    if (ids.length > 1) {
      // Keep first (lowest id), delete rest
      toDelete.push(...ids.slice(1));
    }
  }

  if (toDelete.length === 0) return 0;

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .in('id', toDelete);

  if (error) {
    safeLog('error', '[apply-category-rules] Dedup delete error', { userId, error: error.message });
    return 0;
  }

  safeLog('info', `[apply-category-rules] Deduped: removed ${toDelete.length} duplicate transactions`, { userId, importId });
  return toDelete.length;
}

// ─── Handler ───────────────────────────────────────────────────────────────
export const handler: Handler = async (event) => {
  console.log('[apply-category-rules] function invoked', {
    method: event.httpMethod,
    hasBody: !!event.body,
  });
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
  console.log('[apply-category-rules] supabase url:', process.env.SUPABASE_URL?.slice(0,30), 'key prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0,20) ?? process.env.SUPABASE_SERVICE_ROLE?.slice(0,20));

  const body = (() => {
    try { return JSON.parse(event.body || '{}') as Record<string, unknown>; }
    catch { return {}; }
  })();

  const importId = typeof body.import_id === 'string' ? body.import_id : null;
  const requestedLimit = Number(body.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(1000, Math.floor(requestedLimit))) : 500;

  // Diagnostic logging — visible in Netlify function logs
  console.log('[apply-category-rules] CALLED', { userId, importId, limit, timestamp: new Date().toISOString() });
  safeLog('info', '[apply-category-rules] Starting', { userId, importId, limit });

  // ── Step 0: Deduplicate if scoped to an import ──
  let duplicatesRemoved = 0;
  if (importId) {
    duplicatesRemoved = await deduplicateImport(supabase, userId, importId);
  }

  // ── DIAGNOSTIC: Sample any transactions for this user ──
  // Helps determine if the user has ANY transactions visible to the service-role
  // client, regardless of category filter. If this returns 0, the issue is the
  // user_id or table reference. If it returns rows, the issue is the category filter.
  console.log('[apply-category-rules] DEBUG query', {
    userId,
    categoryFilter: ['Other', null, 'Uncategorized', 'Needs Review'],
    table: 'transactions',
  });
  try {
    // Unfiltered count: every transaction this user owns, regardless of category
    const { count: unfilteredCount, error: unfilteredErr } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    console.log('[apply-category-rules] DEBUG unfiltered count', {
      userId,
      unfilteredCount,
      error: unfilteredErr?.message,
      errorCode: (unfilteredErr as any)?.code,
    });

    const { data: debugData, error: debugError, count: debugCount } = await supabase
      .from('transactions')
      .select('id, merchant_name, category, category_source, import_id', { count: 'exact' })
      .eq('user_id', userId)
      .limit(5);
    console.log('[apply-category-rules] DEBUG sample', {
      error: debugError?.message,
      errorCode: (debugError as any)?.code,
      totalCount: debugCount,
      sampleSize: debugData?.length || 0,
      sample: debugData?.map((t: any) => ({
        id: t.id,
        category: t.category,
        category_source: t.category_source,
        import_id: t.import_id,
        merchant: t.merchant_name,
      })),
    });
  } catch (debugErr: any) {
    console.error('[apply-category-rules] DEBUG query threw', debugErr?.message);
  }

  // ── Step 1: Fetch transactions to process (with retry for commit timing race) ──
  // The frontend calls this after runSmartImportPipeline, but commit-import may
  // still be inserting rows. Retry in both modes:
  //   - importId mode: 5 attempts × 2s = 10s
  //   - cleanup mode:  3 attempts × 3s =  9s
  let txs: any[] = [];
  const maxAttempts = importId ? 5 : 3;
  const delayMs = importId ? 2000 : 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let query = supabase
      .from('transactions')
      .select('id, merchant_name, merchant, amount, description, category')
      .eq('user_id', userId)
      .order('posted_at', { ascending: false })
      .limit(limit);

    if (importId) {
      query = query.eq('import_id', importId);
    } else {
      // Catch null, empty string, and case-insensitive 'other' / known placeholders
      query = query.or('category.eq.Other,category.is.null,category.eq.Uncategorized,category.eq.Needs Review,category.eq.');
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('[apply-category-rules] FETCH ERROR', { userId, importId, error: error.message, code: (error as any).code, attempt });
      safeLog('error', '[apply-category-rules] Fetch error', { userId, error: error.message });
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message }) };
    }

    txs = rows || [];
    console.log('[apply-category-rules] FETCHED', { userId, importId, attempt, count: txs.length, sampleIds: txs.slice(0, 3).map((t: any) => t.id) });

    if (txs.length > 0) break;

    if (attempt < maxAttempts) {
      console.log(`[apply-category-rules] No rows yet — waiting ${delayMs}ms before retry ${attempt + 1}/${maxAttempts}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  // Fallback: if scoped to importId but found zero rows, drop the import_id
  // filter and run cleanup mode for the whole user (handles duplicate-hash case
  // where commit lands under a different import_id than the one we were given).
  if (txs.length === 0 && importId) {
    console.warn('[apply-category-rules] importId returned 0 rows — falling back to user-wide cleanup', { userId, importId });
    const { data: fallbackRows, error: fallbackErr } = await supabase
      .from('transactions')
      .select('id, merchant_name, merchant, amount, description, category')
      .eq('user_id', userId)
      .or('category.eq.Other,category.is.null,category.eq.Uncategorized,category.eq.Needs Review,category.eq.')
      .order('posted_at', { ascending: false })
      .limit(limit);
    if (fallbackErr) {
      console.error('[apply-category-rules] FALLBACK FETCH ERROR', { userId, error: fallbackErr.message });
    } else {
      txs = fallbackRows || [];
      console.log('[apply-category-rules] FALLBACK FETCHED', { userId, count: txs.length });
    }
  }

  if (txs.length === 0) {
    console.warn('[apply-category-rules] ZERO ROWS after all retries — commit-import may have failed or importId mismatch', { userId, importId, attempts: maxAttempts });
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, updated: 0, total: 0, skipped: 0, duplicatesRemoved, reason: 'no_rows_after_retries', attempts: maxAttempts }) };
  }

  // ── Step 2: Build vendor keys for memory lookup ──
  const vendorKeys = txs.map(tx =>
    normalizeVendorKey(tx.merchant_name || tx.merchant || tx.description || '')
  );
  const uniqueKeys = [...new Set(vendorKeys.filter(Boolean))];

  // ── Step 3: Fetch vendor memory ──
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

  // ── Step 4: Fetch user-defined DB rules ──
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

  // ── Step 5: Apply rules in priority order ──
  // Priority: hardcoded overrides → vendor memory → DB rules → merchant map → inline rules
  const updates: Array<{ id: string; category: string; subcategory?: string | null; source: string }> = [];
  let skipped = 0;

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    const key = vendorKeys[i];
    const merchant = tx.merchant_name || tx.merchant || tx.description || '';
    const txAmount = Number(tx.amount || 0);
    const currentCat = tx.category || '';
    const needsWork = !currentCat || ['Other', 'Uncategorized', 'Needs Review'].includes(currentCat);

    if (!needsWork && !importId) { skipped++; continue; }

    // Priority 0: Hardcoded overrides (always win)
    const hardcoded = applyHardcodedOverride(merchant);
    if (hardcoded) {
      updates.push({ id: tx.id, category: hardcoded.category, subcategory: hardcoded.subcategory, source: 'hardcoded' });
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
      updates.push({ id: tx.id, category: normalizeCanonicalCategory(dbRuleMatch.category), subcategory: dbRuleMatch.subcategory, source: 'tag_rule' });
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

    // No match — mark as Needs Review
    if (needsWork) {
      updates.push({ id: tx.id, category: 'Needs Review', source: 'needs_review' });
    } else {
      skipped++;
    }
  }

  // ── Step 6: Batch update — ONLY category fields, never type/amount/merchant ──
  console.log('[apply-category-rules] PRE-UPDATE', { userId, importId, txsFetched: txs.length, updatesQueued: updates.length, skipped });

  let updated = 0;
  let updateErrors: string[] = [];
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
        // NEVER include type, amount, or merchant_name — those are parser-owned
        return supabase
          .from('transactions')
          .update(payload)
          .eq('id', u.id)
          .eq('user_id', userId);
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && !r.value.error) {
        updated++;
      } else if (r.status === 'fulfilled' && r.value.error) {
        updateErrors.push(r.value.error.message);
      } else if (r.status === 'rejected') {
        updateErrors.push(String(r.reason));
      }
    }
  }

  console.log('[apply-category-rules] DONE', { userId, importId, txsFetched: txs.length, updated, skipped, duplicatesRemoved, errorCount: updateErrors.length, sampleErrors: updateErrors.slice(0, 3) });
  safeLog('info', `[apply-category-rules] Done: ${updated}/${txs.length} updated, ${skipped} skipped, ${duplicatesRemoved} dupes removed`, { userId, importId });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, updated, total: txs.length, skipped, duplicatesRemoved }),
  };
};

/**
 * tag-categorize-committed
 *
 * Applies rule + vendor-memory categorization to committed (transactions table)
 * rows that are still uncategorized. Called by UncategorizedReviewQueue's
 * "Auto-Tag All" button.
 *
 * Does NOT use AI — rule matching only. Fetches a large batch per call.
 * Returns { ok, updated, total }.
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { safeLog } from './_shared/safeLog.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RULES: Array<{ contains: string[]; category: string }> = [
  { contains: ['starbucks', 'tim horton', 'second cup'], category: 'Food & Dining' },
  { contains: ['uber', 'lyft', 'taxi', 'transit', 'presto'], category: 'Transportation' },
  { contains: ['amazon', 'amzn'], category: 'Shopping' },
  { contains: ['insurance', 'assurance', 'allstate', 'intact'], category: 'Insurance' },
  { contains: ['telus', 'rogers', 'bell ', 'hydro', 'internet', 'fido', 'koodo'], category: 'Utilities' },
  { contains: ['payroll', 'salary', 'direct dep', 'employment'], category: 'Income' },
  { contains: ['transfer', 'e-transfer', 'etransfer', 'interac'], category: 'Transfers' },
  { contains: ['gas', 'petro', 'shell', 'esso', 'fuel', 'husky', 'irving'], category: 'Transportation' },
  { contains: ['walmart', 'costco', 'kroger', 'safeway', 'sobeys', 'superstore', 'loblaws', 'metro ', 'iga ', 'food basics'], category: 'Groceries' },
  { contains: ['mcdonald', 'restaurant', 'cafe', 'doordash', 'ubereats', 'skip the dishes', 'skip dish', 'pizza', 'sushi', 'burger', 'chicken', 'grill', 'pub '], category: 'Food & Dining' },
  { contains: ['best buy', 'apple store', 'ebay', 'staples', 'the source'], category: 'Shopping' },
  { contains: ['netflix', 'spotify', 'disney', 'hulu', 'prime video', 'apple tv', 'crave', 'dazn'], category: 'Subscriptions' },
  { contains: ['rent', 'lease ', 'mortgage', 'condo fee', 'strata'], category: 'Housing' },
  { contains: ['doctor', 'pharmacy', 'hospital', 'medical', 'dental', 'clinic', 'shoppers drug', 'rexall', 'pharma'], category: 'Healthcare' },
  { contains: ['atm', 'cash withdrawal', 'atm withdrawal'], category: 'Transfers' },
  { contains: ['bank fee', 'service fee', 'monthly fee', 'overdraft', 'nsf fee'], category: 'Bank Fees' },
  { contains: ['gym', 'fitness', 'yoga', 'crossfit', 'goodlife', 'ymca', 'anytime fitness'], category: 'Personal Care' },
  { contains: ['school', 'tuition', 'university', 'college', 'course', 'udemy', 'coursera'], category: 'Education' },
  { contains: ['travel', 'hotel', 'airbnb', 'expedia', 'air canada', 'westjet', 'united', 'delta'], category: 'Travel' },
  { contains: ['zara', 'h&m', 'uniqlo', 'gap ', 'old navy', 'winners', 'marshalls', 'reitmans', 'sport chek'], category: 'Shopping' },
  { contains: ['hair design', 'hair salon', 'salon', 'barber', 'patalaro', 'spa ', 'nails', 'wax'], category: 'Personal Care' },
  { contains: ['cursor', 'notion', 'figma', 'github', 'copilot', 'jetbrains', 'vercel'], category: 'Subscriptions' },
  { contains: ['apple.com', 'apple one', 'icloud'], category: 'Subscriptions' },
  { contains: ['home depot', 'home hardware', 'rona', 'lowes', 'canadian tire'], category: 'Home & Garden' },
  { contains: ['balanceprotector', 'balance protector', 'credit protect'], category: 'Bank Fees' },
  { contains: ['primevideo', 'prime video'], category: 'Subscriptions' },
  { contains: ['payment'], category: 'Income' },

];
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

function parseRuleCategory(value: string): { category: string; subcategory: string | null } {
  const raw = String(value || '').trim();
  if (!raw) return { category: 'Other', subcategory: null };
  const delimiter = '::';
  const idx = raw.indexOf(delimiter);
  if (idx === -1) return { category: normalizeCanonicalCategory(raw), subcategory: null };
  const category = normalizeCanonicalCategory(raw.slice(0, idx).trim() || 'Other');
  const subcategory = raw.slice(idx + delimiter.length).trim() || null;
  return { category, subcategory };
}

function normalizeVendorKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyRules(merchant: string): string | null {
  const lower = merchant.toLowerCase();
  for (const rule of RULES) {
    if (rule.contains.some((k) => lower.includes(k))) return normalizeCanonicalCategory(rule.category);
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
    try {
      return JSON.parse(event.body || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  const requestedLimit = Number(body.limit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(1000, Math.floor(requestedLimit)))
    : 300;

  // 1. Fetch uncategorized committed transactions (newest first, large batch)
  const { data: rows, error } = await supabase
    .from('transactions')
    .select('id, merchant_name, merchant')
    .eq('user_id', userId)
    .or('category.is.null,category.eq.Uncategorized,category.eq.Other')
    .order('posted_at', { ascending: false })
    .limit(limit);

  if (error) {
    safeLog('error', '[tag-categorize-committed] Fetch error', { userId, error: error.message });
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message }) };
  }

  const txs = rows || [];
  if (txs.length === 0) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, updated: 0, total: 0 }) };
  }

  // 2. Build vendor keys for memory lookup
  const vendorKeys = txs.map((tx) =>
    normalizeVendorKey(tx.merchant_name || tx.merchant || '')
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

  // 3b. Fetch user-defined DB rules (exact → starts_with → contains → regex priority)
  type DbRule = { match_type: string; match_value: string; category: string };
  let dbRules: DbRule[] = [];
  try {
    const { data: ruleRows } = await supabase
      .from('category_rules')
      .select('match_type, match_value, category')
      .eq('user_id', userId)
      .eq('is_active', true);
    const TYPE_PRIORITY: Record<string, number> = { exact: 0, starts_with: 1, contains: 2, regex: 3 };
    dbRules = ((ruleRows || []) as DbRule[]).sort(
      (a, b) => (TYPE_PRIORITY[a.match_type] ?? 9) - (TYPE_PRIORITY[b.match_type] ?? 9)
    );
  } catch {
    /* table may not exist yet — skip */
  }

  function applyDbRules(merchant: string): { category: string; subcategory: string | null } | null {
    const lower = merchant.toLowerCase();
    for (const rule of dbRules) {
      const val = rule.match_value.toLowerCase();
      if (rule.match_type === 'exact' && lower === val) return parseRuleCategory(rule.category);
      if (rule.match_type === 'starts_with' && lower.startsWith(val)) return parseRuleCategory(rule.category);
      if (rule.match_type === 'contains' && lower.includes(val)) return parseRuleCategory(rule.category);
      if (rule.match_type === 'regex') {
        try { if (new RegExp(rule.match_value, 'i').test(merchant)) return parseRuleCategory(rule.category); } catch {}
      }
    }
    return null;
  }

  // 4. Apply memory → DB rules → inline rules for each tx
  const updates: Array<{ id: string; category: string; subcategory?: string | null; source: string }> = [];
  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    const key = vendorKeys[i];

    const memoryCat = key ? memoryMap.get(key) : undefined;
    if (memoryCat) {
      updates.push({ id: tx.id, category: normalizeCanonicalCategory(memoryCat), source: 'learned' });
      continue;
    }

    const merchant = tx.merchant_name || tx.merchant || '';
    const dbRuleMatch = applyDbRules(merchant);
    if (dbRuleMatch) {
      updates.push({
        id: tx.id,
        category: normalizeCanonicalCategory(dbRuleMatch.category),
        subcategory: dbRuleMatch.subcategory,
        source: 'rule',
      });
      continue;
    }

    const ruleCat = applyRules(merchant);
    if (ruleCat) {
      updates.push({ id: tx.id, category: ruleCat, source: 'rule' });
    }
  }

  // 5. Batch update (parallel, per-row since categories differ)
  let updated = 0;
  if (updates.length > 0) {
    const results = await Promise.allSettled(
      updates.map((u) => {
        const payload: Record<string, unknown> = {
          category: u.category,
          category_source: u.source,
          updated_at: new Date().toISOString(),
        };
        if (Object.prototype.hasOwnProperty.call(u, 'subcategory')) {
          payload.subcategory = u.subcategory ?? null;
        }
        return supabase
          .from('transactions')
          .update(payload)
          .eq('id', u.id)
          .eq('user_id', userId);
      })
    );
    updated = results.filter(
      (r) => r.status === 'fulfilled' && !r.value.error
    ).length;
  }

  safeLog('info', `[tag-categorize-committed] Updated ${updated}/${txs.length}`, { userId });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, updated, total: txs.length }),
  };
};

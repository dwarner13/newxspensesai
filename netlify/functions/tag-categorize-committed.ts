/**
 * tag-categorize-committed
 *
 * Applies rule + vendor-memory categorization to committed (transactions table)
 * rows that are still uncategorized. Called by UncategorizedReviewQueue's
 * "Auto-Tag All" button.
 *
 * Does NOT use AI - rule matching only. Fetches a large batch per call.
 * Returns { ok, updated, total }.
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

const RULES: Array<{ contains: string[]; category: string }> = [
  { contains: ['gordon food ser pay', 'gordon foods pay'], category: 'Income' },
  { contains: ['celtic group'], category: 'Housing' },
  { contains: ['b/m payt', 'b/m pay', 'b/mpayt', 'b/mpay', 'mtg/hyp'], category: 'Housing' },
  { contains: ['td loan'], category: 'Transportation' },
  { contains: ['capital one'], category: 'Transfers' },
  { contains: ['bmo invinc'], category: 'Transfers' },
  { contains: ['easyfinancial', 'national money', 'lenddirect', 'lend direct'], category: 'Debt Payments' },
  { contains: ['ind all saving'], category: 'Savings' },
  { contains: ['mobile cheque deposit', 'cheque deposit'], category: 'Income' },
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
  { contains: ['parking', 'park lot', 'parkade', 'impark', 'indigo park'], category: 'Transportation' },
  { contains: ['bank fee', 'service fee', 'service charge', 'monthly fee', 'overdraft', 'nsf fee', 'foreign currency', 'conversion fee', 'administration fee', 'admin fee', 'account fee'], category: 'Bank Fees' },
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
  // REMOVED: 'payment' was too broad - caught B/M PAYT/PAY MTG/HYP, SCHOLFIELD, etc.

  // Debt & loan payments
  { contains: ['fairstone', 'money mart', 'cash money', 'cash store'], category: 'Debt Payments' },
  // Software & dev tools
  { contains: ['openai', 'chatgpt', 'anthropic', 'claude', 'replit', 'heroku', 'netlify', 'supabase', 'digitalocean', 'aws ', 'cloudflare'], category: 'Subscriptions' },
  // Fitness (specific brands)
  { contains: ['la fitness', 'planet fitness', 'fit4less', 'world gym', 'movati'], category: 'Personal Care' },
  // Meal/diet apps
  { contains: ['unimeal', 'noom', 'myfitnesspal', 'weight watchers', 'ww '], category: 'Subscriptions' },
  // Email & productivity
  { contains: ['fastmail', 'paddle.net', 'protonmail', 'mailchimp', 'sendgrid'], category: 'Subscriptions' },
  // Personal services
  { contains: ['hair cut', 'haircut', 'beauty', 'aesthet', 'lash', 'brow', 'massage', 'chiropr', 'physio', 'osteo'], category: 'Personal Care' },
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
    .select('id, merchant_name, merchant, amount, description, type')
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

  // 3b. Fetch user-defined DB rules (exact -> starts_with -> contains -> regex priority)
  type DbRule = { match_type: string; match_value: string; category: string; subcategory?: string | null; min_amount?: number | null; max_amount?: number | null };
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
  } catch {
    /* table may not exist yet - skip */
  }

  function applyDbRules(merchant: string, amount?: number): { category: string; subcategory: string | null } | null {
    const lower = merchant.toLowerCase();
    // First pass: try amount-specific rules
    // Second pass: try rules with no amount thresholds
    for (const amountPass of [true, false]) {
      for (const rule of dbRules) {
        const hasAmountThreshold = rule.min_amount != null || rule.max_amount != null;
        if (amountPass && !hasAmountThreshold) continue;
        if (!amountPass && hasAmountThreshold) continue;

        const val = rule.match_value.toLowerCase();
        const nameMatched = (rule.match_type === 'exact' && lower === val)
          || (rule.match_type === 'starts_with' && lower.startsWith(val))
          || (rule.match_type === 'contains' && lower.includes(val))
          || (rule.match_type === 'regex' && (() => { try { return new RegExp(rule.match_value, 'i').test(merchant); } catch { return false; } })());
        if (!nameMatched) continue;

        // Check amount threshold if rule has one
        if (hasAmountThreshold && amount !== undefined) {
          const absAmt = Math.abs(amount);
          if (rule.min_amount != null && absAmt < rule.min_amount) continue;
          if (rule.max_amount != null && absAmt >= rule.max_amount) continue;
        } else if (hasAmountThreshold) {
          continue; // Skip amount rules when no amount provided
        }

        if (rule.subcategory) return { category: normalizeCanonicalCategory(rule.category), subcategory: rule.subcategory };
        return parseRuleCategory(rule.category);
      }
    }
    return null;
  }

  // 4. Apply memory -> DB rules -> inline rules for each tx
  const updates: Array<{ id: string; category: string; subcategory?: string | null; source: string }> = [];
  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    const key = vendorKeys[i];

    const memoryCat = key ? memoryMap.get(key) : undefined;
    if (memoryCat) {
      updates.push({ id: tx.id, category: normalizeCanonicalCategory(memoryCat), source: 'learned' });
      continue;
    }

    const merchant = tx.merchant_name || tx.merchant || tx.description || '';
    const txAmount = Number(tx.amount || 0);
    const dbRuleMatch = applyDbRules(merchant, txAmount);
    if (dbRuleMatch) {
      updates.push({
        id: tx.id,
        category: normalizeCanonicalCategory(dbRuleMatch.category),
        subcategory: dbRuleMatch.subcategory,
        source: 'tag_rule',
      });
      continue;
    }

    // Comprehensive merchant map (with subcategories)
    const mapMatch = matchMerchantMap(merchant);
    if (mapMatch) {
      updates.push({ id: tx.id, category: mapMatch.category, subcategory: mapMatch.subcategory ?? null, source: 'tag_rule' });
      continue;
    }

    const ruleCat = applyRules(merchant);
    if (ruleCat) {
      updates.push({ id: tx.id, category: ruleCat, source: 'tag_rule' });
      continue;
    }

    // Nothing matched - mark as "Needs Review" instead of leaving as Other/Uncategorized
    updates.push({ id: tx.id, category: 'Needs Review', source: 'needs_review' });
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
          if (u.subcategory) payload.subcategory_source = u.source;
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

  // Second pass: reclassify any remaining "Other" using merchant map
  let reclassified = 0;
  let typeEnforced = 0;
  try {
    const { data: otherTxs } = await supabase
      .from('transactions')
      .select('id, merchant_name, description')
      .eq('user_id', userId)
      .eq('category', 'Other')
      .limit(500);
    if (otherTxs && otherTxs.length > 0) {
      for (const tx of otherTxs) {
        const mapMatch = matchMerchantMap(tx.merchant_name || tx.description || '');
        if (mapMatch) {
          const payload: Record<string, unknown> = {
            category: mapMatch.category,
            category_source: 'tag_rule',
            updated_at: new Date().toISOString(),
          };
          if (mapMatch.subcategory) {
            payload.subcategory = mapMatch.subcategory;
            payload.subcategory_source = 'tag_rule';
          }
          await supabase.from('transactions').update(payload).eq('id', tx.id).eq('user_id', userId);
          reclassified++;
        } else {
          await supabase.from('transactions').update({
            category: 'Needs Review', category_source: 'needs_review', updated_at: new Date().toISOString(),
          }).eq('id', tx.id).eq('user_id', userId);
        }
      }
      if (reclassified > 0) safeLog('info', `[tag-categorize-committed] Reclassified ${reclassified} Other -> real categories`, { userId });
    }
  } catch { /* non-blocking */ }

  // Third pass: known-expense merchant correction
  // Targeted fix for delta-cascade false positives where commit-import.ts
  // sets type=income for positive deltas on known expense merchants.
  // These merchants can NEVER be income — always purchases.
  const KNOWN_EXPENSE_MERCHANTS = [
    /golfzon/i,
    /golf\s*traders/i,
    /canada\s*golf\s*card/i,
    /lonespruce/i,
    /longshotz/i,
    /montgomery\s*glen/i,
    /sanpiper/i,
    /mac.?s\s*conv/i,
    /beijing\s*house/i,
    /blackjacks/i,
    /\ba&w\b/i,
    /mr\s*sub/i,
    /wing\s*snob/i,
    /o.?massage/i,
    /nakhon/i,
    /rona\+/i,
    /eclipse\s*restaurant/i,
    /kosmos\s*restaurant/i,
    /ufo\s*pizza/i,
    /saratoga\s*restaurant/i,
    /coliseum\s*pizza/i,
    /smittys/i,
    /obyrnes/i,
    /burger\s*king/i,
    /dairy\s*queen/i,
    /popeyes/i,
    /krispykreme/i,
    /habaneros/i,
    /lewis\s*massage/i,
    /shadified/i,
    /shoppers\s*drug/i,
    /sobeys/i,
    /save\s*on\s*foods/i,
    /safeway/i,
    /loblaws/i,
    /costco/i,
    /walmart/i,
    /canadian\s*tire/i,
    /winners/i,
    /petro.canada/i,
    /shell\s*c/i,
    /esso/i,
    /kollbrook/i,
    /northstar\s*hyundai/i,
    /northtown\s*registry/i,
    /bear\s*hills\s*casino/i,
    /river\s*cree/i,
    /castledowns\s*bingo/i,
    /borrowell/i,
    /ncube\s*and\s*landry/i,
    /golf\s*traders/i,
  ];
  try {
    const knownExpenseFixes = txs.filter(tx =>
      tx.type === 'income' &&
      KNOWN_EXPENSE_MERCHANTS.some(re => re.test(tx.merchant_name || ''))
    );
    if (knownExpenseFixes.length > 0) {
      safeLog('info', `[tag-categorize-committed] Correcting ${knownExpenseFixes.length} known-expense merchants falsely set as income`, { userId });
      for (const tx of knownExpenseFixes) {
        await supabase.from('transactions').update({
          type: 'expense',
          amount: Math.abs(tx.amount) * -1,
          updated_at: new Date().toISOString(),
        }).eq('id', tx.id).eq('user_id', userId);
        typeEnforced++;
      }
    }
  } catch { /* non-blocking */ }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, updated, reclassified, typeEnforced, total: txs.length }),
  };
};

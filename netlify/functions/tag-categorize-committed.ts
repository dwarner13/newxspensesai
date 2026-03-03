/**
 * tag-categorize-committed
 *
 * Applies rule + vendor-memory categorization to committed (transactions table)
 * rows that are still uncategorized. Called by UncategorizedReviewQueue's
 * "Auto-Tag All" button.
 *
 * Does NOT use AI — rule matching only. Fetches up to 50 rows per call.
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
  { contains: ['starbucks', 'tim horton', 'second cup'], category: 'Dining' },
  { contains: ['uber', 'lyft', 'taxi', 'transit', 'presto'], category: 'Transportation' },
  { contains: ['amazon', 'amzn'], category: 'Shopping' },
  { contains: ['insurance', 'assurance', 'allstate', 'intact'], category: 'Insurance' },
  { contains: ['telus', 'rogers', 'bell ', 'hydro', 'internet', 'fido', 'koodo'], category: 'Utilities' },
  { contains: ['payroll', 'salary', 'direct dep', 'employment'], category: 'Income' },
  { contains: ['transfer', 'e-transfer', 'etransfer', 'interac'], category: 'Transfers' },
  { contains: ['gas', 'petro', 'shell', 'esso', 'fuel', 'husky', 'irving'], category: 'Transportation' },
  { contains: ['walmart', 'costco', 'kroger', 'safeway', 'sobeys', 'superstore', 'loblaws', 'metro ', 'iga ', 'food basics'], category: 'Groceries' },
  { contains: ['mcdonald', 'restaurant', 'cafe', 'doordash', 'ubereats', 'skip the dishes', 'skip dish', 'pizza', 'sushi', 'burger', 'chicken', 'grill', 'pub '], category: 'Dining' },
  { contains: ['best buy', 'apple store', 'ebay', 'staples', 'the source'], category: 'Shopping' },
  { contains: ['netflix', 'spotify', 'disney', 'hulu', 'prime video', 'apple tv', 'crave', 'dazn'], category: 'Entertainment' },
  { contains: ['rent', 'lease ', 'mortgage', 'condo fee', 'strata'], category: 'Housing' },
  { contains: ['doctor', 'pharmacy', 'hospital', 'medical', 'dental', 'clinic', 'shoppers drug', 'rexall', 'pharma'], category: 'Healthcare' },
  { contains: ['atm', 'cash withdrawal', 'atm withdrawal'], category: 'Cash & ATM' },
  { contains: ['bank fee', 'service fee', 'monthly fee', 'overdraft', 'nsf fee'], category: 'Bank Fees' },
  { contains: ['gym', 'fitness', 'yoga', 'crossfit', 'goodlife', 'ymca', 'anytime fitness'], category: 'Health & Fitness' },
  { contains: ['school', 'tuition', 'university', 'college', 'course', 'udemy', 'coursera'], category: 'Education' },
  { contains: ['travel', 'hotel', 'airbnb', 'expedia', 'air canada', 'westjet', 'united', 'delta'], category: 'Travel' },
  { contains: ['zara', 'h&m', 'uniqlo', 'gap ', 'old navy', 'winners', 'marshalls', 'reitmans', 'sport chek'], category: 'Shopping' },
];

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
    if (rule.contains.some((k) => lower.includes(k))) return rule.category;
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

  // 1. Fetch uncategorized committed transactions (newest first, up to 50)
  const { data: rows, error } = await supabase
    .from('transactions')
    .select('id, merchant_name, merchant')
    .eq('user_id', userId)
    .or('category.is.null,category.eq.Uncategorized')
    .order('posted_at', { ascending: false })
    .limit(50);

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

  // 4. Apply memory → rules for each tx
  const updates: Array<{ id: string; category: string; source: string }> = [];
  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    const key = vendorKeys[i];

    const memoryCat = key ? memoryMap.get(key) : undefined;
    if (memoryCat) {
      updates.push({ id: tx.id, category: memoryCat, source: 'learned' });
      continue;
    }

    const merchant = tx.merchant_name || tx.merchant || '';
    const ruleCat = applyRules(merchant);
    if (ruleCat) {
      updates.push({ id: tx.id, category: ruleCat, source: 'rule' });
    }
  }

  // 5. Batch update (parallel, per-row since categories differ)
  let updated = 0;
  if (updates.length > 0) {
    const results = await Promise.allSettled(
      updates.map((u) =>
        supabase
          .from('transactions')
          .update({
            category: u.category,
            category_source: u.source,
            updated_at: new Date().toISOString(),
          })
          .eq('id', u.id)
          .eq('user_id', userId)
      )
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

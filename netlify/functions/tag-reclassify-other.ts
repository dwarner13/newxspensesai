/**
 * tag-reclassify-other — Backfill "Other" transactions using merchant map + rules.
 *
 * SQL migration (run manually in Supabase):
 * UPDATE transactions
 * SET category = 'Needs Review', category_source = 'needs_review'
 * WHERE user_id = '938a2e17-0e49-45ff-bb98-810db46e5e65'
 *   AND category = 'Other';
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { normalizeMerchant } from './_shared/merchantUtils.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MERCHANT_CATEGORY_MAP: Record<string, { category: string; subcategory?: string }> = {
  "a&w": { category: "Food & Dining", subcategory: "Fast Food" },
  "burger king": { category: "Food & Dining", subcategory: "Fast Food" },
  "dairy queen": { category: "Food & Dining", subcategory: "Fast Food" },
  "booster juice": { category: "Food & Dining", subcategory: "Drinks & Juice" },
  "beijing house": { category: "Food & Dining", subcategory: "Restaurants" },
  "black jacks roadhouse": { category: "Food & Dining", subcategory: "Restaurants" },
  "coliseum pizza": { category: "Food & Dining", subcategory: "Restaurants" },
  "audrey's kitchen": { category: "Food & Dining", subcategory: "Restaurants" },
  "7 eleven": { category: "Transportation", subcategory: "Gas & Fuel" },
  "7-eleven": { category: "Transportation", subcategory: "Gas & Fuel" },
  "can co petroleum": { category: "Transportation", subcategory: "Gas & Fuel" },
  "air-serv": { category: "Transportation", subcategory: "Vehicle Services" },
  "canadian tire": { category: "Shopping", subcategory: "Auto & Hardware" },
  "ad's massage": { category: "Personal Care", subcategory: "Massage & Wellness" },
  "calling wood chiro": { category: "Healthcare", subcategory: "Chiropractic" },
  "shadified": { category: "Personal Care", subcategory: "Hair & Beauty" },
  "castle downs bingo": { category: "Entertainment", subcategory: "Gaming & Lottery" },
  "bear hills casino": { category: "Entertainment", subcategory: "Gaming & Lottery" },
  "cda carbon rebate": { category: "Income", subcategory: "Government Rebate" },
  "canada rit": { category: "Income", subcategory: "Tax Refund" },
  "bmo": { category: "Bank Fees", subcategory: "Banking" },
  "capital one": { category: "Debt Payments", subcategory: "Credit Card" },
  "borrowell": { category: "Bank Fees", subcategory: "Credit Services" },
  "cash money": { category: "Bank Fees", subcategory: "Loans" },
  "aiprm": { category: "Subscriptions", subcategory: "Software & AI" },
  "celtic group": { category: "Subscriptions", subcategory: "Software & AI" },
  "abm": { category: "Transfers", subcategory: "ATM Withdrawal" },
  "b/m payt": { category: "Transfers", subcategory: "Bill Payment" },
  "interac": { category: "Transfers", subcategory: "e-Transfer" },
};

function matchMerchantMap(merchantName: string): { category: string; subcategory?: string } | null {
  const normalized = normalizeMerchant(merchantName);
  for (const [pattern, result] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (normalized.includes(pattern)) return result;
  }
  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const sb = serverSupabase();

  const { data: otherTxs } = await sb
    .from('transactions')
    .select('id, merchant_name, amount')
    .eq('user_id', auth.userId)
    .eq('category', 'Other')
    .limit(1000);

  let reclassified = 0;
  let needsReview = 0;

  for (const tx of otherTxs ?? []) {
    const match = matchMerchantMap(tx.merchant_name || '');
    if (match) {
      await sb.from('transactions').update({
        category: match.category,
        subcategory: match.subcategory ?? null,
        category_source: 'tag_rule',
        updated_at: new Date().toISOString(),
      }).eq('id', tx.id).eq('user_id', auth.userId);
      reclassified++;
    } else {
      await sb.from('transactions').update({
        category: 'Needs Review',
        category_source: 'needs_review',
        updated_at: new Date().toISOString(),
      }).eq('id', tx.id).eq('user_id', auth.userId);
      needsReview++;
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, reclassified, needs_review: needsReview, total: (otherTxs ?? []).length }),
  };
};

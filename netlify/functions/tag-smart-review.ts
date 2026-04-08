/**
 * tag-smart-review - Scans committed transactions for known categorization errors.
 * Returns a list of issues with suggested fixes, grouped by merchant.
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { randomUUID } from 'crypto';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ok = (body: any) => ({ statusCode: 200, headers, body: JSON.stringify(body) });
const err = (msg: string, status = 400) => ({ statusCode: status, headers, body: JSON.stringify({ ok: false, error: msg }) });

interface Tx { id: string; merchant_name: string; category: string; amount: number; posted_at: string }
interface Issue {
  id: string; merchant: string; currentCategory: string;
  suggestedCategory: string; suggestedSubcategory: string | null;
  reason: string; transactionIds: string[]; count: number;
  totalAmount: number; samples: { merchant_name: string; amount: number; posted_at: string }[];
}

function ilike(val: string, pattern: string): boolean {
  const re = new RegExp('^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
  return re.test(val);
}

interface Rule {
  merchantPatterns: string[];
  categoryFilter?: string;
  suggestedCategory: string;
  suggestedSubcategory: string | null;
  reason: string;
}

const RULES: Rule[] = [
  { merchantPatterns: ['%GORDON FOOD%'], suggestedCategory: 'Income', suggestedSubcategory: 'Employment Income', reason: 'Looks like your employer - should be Employment Income' },
  { merchantPatterns: ['%TD LOAN%', '%NATIONAL MONEY%'], categoryFilter: 'Business Income', suggestedCategory: 'Debt Payments', suggestedSubcategory: 'Loan Payment', reason: 'Loan payment - should be Debt Payments' },
  { merchantPatterns: ['%EASY FINANCIAL%', '%FLEXITI%', '%CASH MONEY%'], categoryFilter: 'Business Income', suggestedCategory: 'Debt Payments', suggestedSubcategory: 'Credit Payment', reason: 'Finance company - should be Debt Payments' },
  { merchantPatterns: ['%SOBEYS%', '%SAFEWAY%', '%SAVE ON%'], categoryFilter: 'Business Income', suggestedCategory: 'Groceries', suggestedSubcategory: null, reason: 'Grocery store - should be Groceries' },
  { merchantPatterns: ['%PETRO%', '%SHELL%', '%ESSO%'], categoryFilter: 'Business Income', suggestedCategory: 'Transportation', suggestedSubcategory: 'Gas & Fuel', reason: 'Gas station - should be Transportation' },
  { merchantPatterns: ['%SHOPPERS%', '%REXALL%', '%LONDON DRUG%'], categoryFilter: 'Business Income', suggestedCategory: 'Personal Care', suggestedSubcategory: 'Pharmacy', reason: 'Pharmacy - should be Personal Care' },
  { merchantPatterns: ['%MASSAGE%'], categoryFilter: 'Business Income', suggestedCategory: 'Personal Care', suggestedSubcategory: 'Massage Therapy', reason: 'Massage therapy - should be Personal Care' },
  { merchantPatterns: ['%SALON%', '%SPA%'], categoryFilter: 'Business Income', suggestedCategory: 'Personal Care', suggestedSubcategory: 'Hair & Nails', reason: 'Salon/spa - should be Personal Care' },
  { merchantPatterns: ['%7-ELEVEN%'], categoryFilter: 'Transfers', suggestedCategory: 'Food & Dining', suggestedSubcategory: 'Convenience Store', reason: 'Convenience store categorized as Transfers - should be Food & Dining' },
];

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return err('Unauthorized', 401);

  const userId = auth.userId;
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` } },
    }
  );

  try {
    const { data: txs, error: fetchErr } = await sb
      .from('transactions')
      .select('id, merchant_name, category, amount, posted_at')
      .eq('user_id', userId)
      .limit(2000);

    if (fetchErr) return err(fetchErr.message, 500);
    const allTxs = (txs || []) as Tx[];
    const issues: Issue[] = [];
    const usedIds = new Set<string>();

    // Apply pattern-based rules
    for (const rule of RULES) {
      const matching = allTxs.filter(tx => {
        if (usedIds.has(tx.id)) return false;
        const merchant = tx.merchant_name || '';
        const matchesMerchant = rule.merchantPatterns.some(p => ilike(merchant, p));
        if (!matchesMerchant) return false;
        if (rule.categoryFilter) return tx.category === rule.categoryFilter;
        // Rule 1 (GORDON FOOD): match if NOT already correct
        return tx.category !== rule.suggestedCategory;
      });

      if (matching.length === 0) continue;

      // Group by merchant
      const groups = new Map<string, Tx[]>();
      for (const tx of matching) {
        const key = (tx.merchant_name || 'Unknown').toUpperCase().trim();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(tx);
      }

      for (const [merchant, txGroup] of groups) {
        const ids = txGroup.map(t => t.id);
        ids.forEach(id => usedIds.add(id));
        issues.push({
          id: randomUUID(),
          merchant: txGroup[0].merchant_name || merchant,
          currentCategory: txGroup[0].category || 'Unknown',
          suggestedCategory: rule.suggestedCategory,
          suggestedSubcategory: rule.suggestedSubcategory,
          reason: rule.reason,
          transactionIds: ids,
          count: ids.length,
          totalAmount: txGroup.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0),
          samples: txGroup.slice(0, 3).map(t => ({ merchant_name: t.merchant_name, amount: Number(t.amount), posted_at: t.posted_at })),
        });
      }
    }

    // RULE 10 - Inconsistent merchant categorization
    const merchantGroups = new Map<string, Tx[]>();
    for (const tx of allTxs) {
      if (usedIds.has(tx.id)) continue;
      const key = (tx.merchant_name || '').toUpperCase().trim();
      if (!key) continue;
      if (!merchantGroups.has(key)) merchantGroups.set(key, []);
      merchantGroups.get(key)!.push(tx);
    }

    for (const [key, group] of merchantGroups) {
      if (group.length < 4) continue;
      const catCounts = new Map<string, number>();
      for (const tx of group) {
        const cat = tx.category || 'Uncategorized';
        catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
      }
      if (catCounts.size < 2) continue;

      const sorted = [...catCounts.entries()].sort((a, b) => b[1] - a[1]);
      const [dominant, dominantCount] = sorted[0];
      const dominantPct = dominantCount / group.length;
      if (dominantPct < 0.7) continue;

      for (let i = 1; i < sorted.length; i++) {
        const [minCat, minCount] = sorted[i];
        if (minCount < 3) continue;
        const minorityTxs = group.filter(t => (t.category || 'Uncategorized') === minCat);
        const ids = minorityTxs.map(t => t.id);
        ids.forEach(id => usedIds.add(id));
        issues.push({
          id: randomUUID(),
          merchant: minorityTxs[0].merchant_name || key,
          currentCategory: minCat,
          suggestedCategory: dominant,
          suggestedSubcategory: null,
          reason: `Inconsistent - most transactions for this merchant are ${dominant}`,
          transactionIds: ids,
          count: ids.length,
          totalAmount: minorityTxs.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0),
          samples: minorityTxs.slice(0, 3).map(t => ({ merchant_name: t.merchant_name, amount: Number(t.amount), posted_at: t.posted_at })),
        });
      }
    }

    // RULE 11 - Duplicate transaction detection
    // Group by date + normalized merchant + amount - flag groups with > 1 record
    const dupGroups = new Map<string, Tx[]>();
    for (const tx of allTxs) {
      const dateStr = (tx.posted_at || '').split('T')[0] || '';
      const merchNorm = (tx.merchant_name || '').toUpperCase().trim();
      const amt = String(Math.abs(Number(tx.amount || 0)));
      const key = `${dateStr}|${merchNorm}|${amt}`;
      if (!dupGroups.has(key)) dupGroups.set(key, []);
      dupGroups.get(key)!.push(tx);
    }

    for (const [key, group] of dupGroups) {
      if (group.length <= 1) continue;
      const [date, merchant, amount] = key.split('|');
      const keepId = group[0].id; // oldest record
      issues.push({
        id: `dup-${keepId}`,
        merchant: group[0].merchant_name || merchant,
        currentCategory: group[0].category || 'Unknown',
        suggestedCategory: group[0].category || 'Unknown',
        suggestedSubcategory: null,
        reason: `${group.length} identical transactions on ${date} for $${amount} \u2014 likely a parsing duplicate`,
        transactionIds: group.map(t => t.id),
        count: group.length,
        totalAmount: parseFloat(amount) * group.length,
        samples: group.slice(0, 3).map(t => ({ merchant_name: t.merchant_name, amount: Number(t.amount), posted_at: t.posted_at })),
      });
    }

    return ok({
      ok: true,
      totalScanned: allTxs.length,
      issues: issues.sort((a, b) => b.count - a.count),
      issueCount: issues.length,
      totalAffected: issues.reduce((s, i) => s + i.count, 0),
    });
  } catch (e: any) {
    console.error('[tag-smart-review] Error:', e.message);
    return err(e.message, 500);
  }
};

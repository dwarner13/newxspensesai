import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { normalizeMerchant } from './_shared/merchantUtils.js';
import { pagedSelectAll, type PagedQuery } from '../../src/shared/paged-select';
import { NEEDS_CATEGORY_OR_FILTER } from '../../src/shared/needs-category-rule';
import { classifyCashFlow } from '../../src/shared/financial-taxonomy';

/**
 * AI Architecture HQ pre-staging finding (launch blocker), fixed 2026-11-26 under the owner's unified
 * financial engine GO: every count here comes from a COMPLETE paged read (it was one 500-row /
 * 1,000-row capped read, silently short on large accounts), the review set uses the ONE owner-approved rule
 * (needs-category-rule; it also counted "Other"), and amounts come from the engine by direction (it
 * added |amount|, so refunds counted as charges). If a read is incomplete it is said (complete:false)
 * and no short count is returned; an error is an error, never an empty inbox.
 */
type InboxRow = { id: string; merchant_name: string | null; amount: number | null; type: string | null; category: string | null; subcategory: string | null; date: string | null };

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const userId = auth.userId;
  const sb = serverSupabase();

  try {
    // 1. Unresolved — transactions needing review (the ONE rule), grouped by merchant, complete read.
    const review = await pagedSelectAll<InboxRow>(() => sb
      .from('transactions')
      .select('id, merchant_name, amount, type, category, subcategory, date')
      .eq('user_id', userId)
      .or(NEEDS_CATEGORY_OR_FILTER)
      .order('date', { ascending: true })
      .order('id', { ascending: true }) as unknown as PagedQuery);
    if (review.error) {
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'inbox_unavailable', retryable: true }) };
    }
    const unresolvedComplete = review.complete && !review.truncated;
    type Group = { merchant_name: string; transaction_count: number; total_amount: number; inflow_amount: number; sample_id: string; outCents: number; inCents: number };
    const map: Record<string, Group> = {};
    for (const tx of review.rows) {
      const key = normalizeMerchant(tx.merchant_name ?? "") || 'unknown';
      if (!map[key]) map[key] = { merchant_name: tx.merchant_name || 'Unknown', transaction_count: 0, total_amount: 0, inflow_amount: 0, sample_id: tx.id, outCents: 0, inCents: 0 };
      const g = map[key];
      g.transaction_count++;
      const c = classifyCashFlow(tx);
      if (c.amountCents !== null && c.direction === 'outflow') g.outCents += Math.abs(c.amountCents);
      else if (c.amountCents !== null && c.direction === 'inflow') g.inCents += Math.abs(c.amountCents);
    }
    // total_amount = money GOING OUT for that merchant (engine direction); money coming back (refunds,
    // credits) is inflow_amount — never added in.
    const unresolved = unresolvedComplete
      ? Object.values(map)
        .map(({ outCents, inCents, ...g }) => ({ ...g, total_amount: outCents / 100, inflow_amount: inCents / 100 }))
        .sort((a, b) => b.transaction_count - a.transaction_count || a.merchant_name.localeCompare(b.merchant_name))
      : [];

    // 2. Resolved - recent rules
    let resolved: any[] = [];
    try {
      const { data: rules } = await sb
        .from('category_rules')
        .select('match_value, category, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      resolved = (rules ?? []).map((r: any) => ({
        merchant_pattern: r.match_value,
        category: r.category,
        created_at: r.created_at,
      }));
    } catch { /* table may not exist */ }

    // 3. Imports - recent with tx counts
    const { data: imps } = await sb
      .from('imports')
      .select('id, file_url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const imports = await Promise.all((imps ?? []).map(async imp => {
      const { count } = await sb
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('import_id', imp.id);
      return {
        id: imp.id,
        filename: String(imp.file_url || '').split('/').pop() || 'Statement',
        created_at: imp.created_at,
        total_count: count ?? 0,
      };
    }));

    // 4. Recurring rule suggestions — merchants seen 3+ times with a consistent category and no rule.
    // Counts and consistency come from a COMPLETE read (it was an unordered 1,000-row sample);
    // incomplete → no suggestions (rule_suggestions_complete:false), never a guess from part of the data.
    let ruleSuggestions: Array<{ merchant_name: string; category: string; count: number; consistency: number }> = [];
    let ruleSuggestionsComplete = false;
    const frequent = await pagedSelectAll<{ id: string; merchant_name: string | null; category: string | null }>(() => sb
      .from('transactions')
      .select('id, merchant_name, category')
      .eq('user_id', userId)
      .not('category', 'is', null)
      .not('category', 'ilike', 'needs review')
      .not('category', 'ilike', 'uncategorized')
      .not('category', 'eq', '')
      .not('category', 'eq', 'Other')
      .order('id', { ascending: true }) as unknown as PagedQuery);
    if (!frequent.error && frequent.complete && !frequent.truncated) {
      ruleSuggestionsComplete = true;
      const merchantGroups: Record<string, { display: string; cats: Record<string, number> }> = {};
      for (const tx of frequent.rows) {
        const key = normalizeMerchant(tx.merchant_name ?? "");
        if (!key || !tx.category) continue;
        if (!merchantGroups[key]) merchantGroups[key] = { display: tx.merchant_name || key, cats: {} };
        merchantGroups[key].cats[tx.category] = (merchantGroups[key].cats[tx.category] || 0) + 1;
      }
      const rulePatterns = new Set((resolved ?? []).map((r: { merchant_pattern?: string }) => normalizeMerchant(r.merchant_pattern || '')));
      for (const [normalized, group] of Object.entries(merchantGroups)) {
        const total = Object.values(group.cats).reduce((sum, n) => sum + n, 0);
        if (total < 3) continue;
        const topCat = Object.entries(group.cats).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
        const consistency = topCat[1] / total;
        if (consistency >= 0.8 && !rulePatterns.has(normalized)) {
          ruleSuggestions.push({ merchant_name: group.display, category: topCat[0], count: total, consistency: Math.round(consistency * 100) });
        }
      }
      ruleSuggestions.sort((a, b) => b.count - a.count || a.merchant_name.localeCompare(b.merchant_name));
      ruleSuggestions = ruleSuggestions.slice(0, 10);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        unresolved,
        // True only when every transaction needing review was read; when false, unresolved is empty and
        // the counts below are null (never a short number).
        unresolved_complete: unresolvedComplete,
        unresolved_transaction_count: unresolvedComplete ? review.rows.length : null,
        resolved,
        imports,
        rule_suggestions: ruleSuggestions,
        rule_suggestions_complete: ruleSuggestionsComplete,
        // Number of merchants with transactions needing review (null when the read was incomplete).
        badge_count: unresolvedComplete ? unresolved.length : null,
      }),
    };
  } catch (err: any) {
    console.error('[tag-inbox] Error:', err?.message);
    // Never an empty 200 that looks like "nothing to review".
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'inbox_unavailable', retryable: true }) };
  }
};

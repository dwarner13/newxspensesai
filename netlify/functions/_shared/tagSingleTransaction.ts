/**
 * T-LIVE-02 — ONE verified transaction, proposed then confirmed (Tag HQ).
 *
 * Shared by tag-action (typed "change this to …" from the panel) and tag-copilot (Tag's
 * update_single_transaction tool), so both produce the same server-written proposal and the same
 * signed 'proposed' receipt. Nothing here writes a transaction: the change happens only in
 * tag-action commit_single, after the customer's explicit "yes" binds to this proposal.
 *
 * Ownership: the transaction is read with id AND user_id; anything else is "not found".
 * Category: resolveCategoryRequest — exact, closest-with-disclosure, or ask (never a silent "Other").
 * No merchant names or amounts are logged here.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveCategoryRequest, TAG_CATEGORIES } from './tagCategories.js';

export const TAG_SINGLE_ACTION = 'recategorize_single_transaction';
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface OwnedTx {
  id: string; merchant_name: string | null; amount: unknown; posted_at: string | null; date: string | null;
  category: string | null; subcategory: string | null;
}

/** The transaction, ONLY if it belongs to this user (server-side ownership check). */
export async function loadOwnedTransaction(supabase: SupabaseClient, userId: string, transactionId: string): Promise<OwnedTx | null> {
  if (!UUID_RE.test(transactionId)) return null;
  const { data, error } = await supabase
    .from('transactions')
    .select('id, merchant_name, amount, posted_at, date, category, subcategory')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('lookup_failed');
  return (data as OwnedTx | null) ?? null;
}

const money = (v: unknown) => `$${Math.abs(Number(v || 0)).toFixed(2)}`;
export const catLabel = (c: string | null, sub: string | null) => (sub ? `${c || 'Uncategorized'} / ${sub}` : (c || 'Uncategorized'));

export function singleProposalText(
  tx: OwnedTx,
  target: { category: string; subcategory: string | null; closestTo?: string | null },
): string {
  const merchant = tx.merchant_name || 'this';
  const date = String(tx.posted_at || tx.date || '').slice(0, 10);
  const note = target.closestTo ? `There's no "${target.closestTo}" category — the closest is **${target.category}**.\n\n` : '';
  const clearsSub = !!tx.subcategory && !target.subcategory && target.category !== tx.category
    ? ` Its subcategory (${tx.subcategory}) will be cleared.` : '';
  return `${note}Change this **${merchant}** transaction (${money(tx.amount)}${date ? ` on ${date}` : ''}) from **${catLabel(tx.category, tx.subcategory)}** to **${catLabel(target.category, target.subcategory)}**?`
    + `${clearsSub} Only this one transaction changes — no rule is saved and no other transactions are touched. Say yes to confirm.`;
}

export type SingleProposalOutcome =
  | {
    state: 'proposed';
    subject: { transactionId: string; targetCategory: string; targetSubcategory: string | null };
    reply: string;
    resolution: 'exact' | 'closest';
  }
  | {
    state: 'failed';
    reason: 'not_found' | 'not_focused' | 'category_ambiguous' | 'category_unknown' | 'already_in_category' | 'preview_error';
    reply: string;
    candidates?: string[];
  };

/**
 * Build Tag's proposal for one owned transaction. Read-only. The caller stores `reply` with a
 * receipt { action: TAG_SINGLE_ACTION, state, subject | reason } through the conversation platform.
 */
export async function buildSingleProposal(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
  targetPhrase: string,
): Promise<SingleProposalOutcome> {
  let tx: OwnedTx | null;
  try {
    tx = await loadOwnedTransaction(supabase, userId, transactionId);
  } catch {
    return { state: 'failed', reason: 'preview_error', reply: 'Something went wrong checking that transaction, so nothing has changed. Try again?' };
  }
  if (!tx) return { state: 'failed', reason: 'not_found', reply: "I can't find that transaction in your account, so nothing has changed." };
  const res = resolveCategoryRequest(targetPhrase);
  if (res.status === 'ambiguous') {
    return {
      state: 'failed', reason: 'category_ambiguous', candidates: res.candidates,
      reply: `"${res.requested}" could mean ${res.candidates.map(c => `**${c}**`).join(' or ')}. Which one should this **${tx.merchant_name || ''}** transaction go in?`,
    };
  }
  if (res.status === 'unknown') {
    return {
      state: 'failed', reason: 'category_unknown',
      reply: `I don't have a "${res.requested}" category. Which of these fits best: ${TAG_CATEGORIES.filter(c => c !== 'Income' && c !== 'Transfers').join(', ')}?`,
    };
  }
  if (res.category === (tx.category || '') && (res.subcategory ?? null) === null) {
    return { state: 'failed', reason: 'already_in_category', reply: `This **${tx.merchant_name || ''}** transaction is already in **${res.category}**, so there's nothing to change.` };
  }
  return {
    state: 'proposed',
    subject: { transactionId: tx.id, targetCategory: res.category, targetSubcategory: res.subcategory },
    reply: singleProposalText(tx, { category: res.category, subcategory: res.subcategory, closestTo: res.status === 'closest' ? res.requested : null }),
    resolution: res.status,
  };
}

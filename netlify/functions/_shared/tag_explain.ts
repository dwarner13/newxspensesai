/**
 * Tag Explanation Helper — enhanced with merchant history + anomaly detection
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchMerchantScopeRows, merchantRowGroupKey, type MerchantScopeClient } from '../../../src/shared/merchant-scope-rows';
import { classifyCashFlow } from '../../../src/shared/financial-taxonomy';
import { merchantGroupingKey } from './merchantNormalize';
import { VERIFIED_CUSTOMER_SOURCES, isProtectedSource } from '../../../src/shared/tag-status';
import { exactMerchantCorrections } from './tag-learning';
export { exactMerchantCorrections };

export type TagExplanationResult = {
  category: string | null;
  categorySource: 'manual' | 'learned' | 'ai' | 'rule' | 'unknown';
  /** Legacy numeric value. Uncalibrated - never show it as a measured probability. */
  confidence: number | null;
  /** 'stored' = recorded by the categorizer; 'estimated' = derived here from merchant history; 'none'. */
  confidenceSource: 'stored' | 'estimated' | 'none';
  /** Qualitative level for display (owner direction 2026-11-23: no uncalibrated percentages). */
  confidenceLevel: 'high' | 'medium' | 'low' | null;
  /** True when the merchant history could not be read completely (counts and amounts are a minimum: "at least"). */
  merchantSeenCapped: boolean;
  /** Display-only "Issuer •••• 1234" from the transaction's own import (last 4 only). Never logged or sent to AI. */
  accountLabel: string | null;
  learnedCount: number;
  lastLearnedAt?: string | null;
  message: string;
  // Enhanced fields
  merchantSeenCount: number;
  /**
   * Unified engine (owner GO 2026-11-26): SPENDING only (classifyCashFlow), exact merchant, refunds
   * excluded. null when the history read was incomplete (Financial Evidence Trust): never 0, which a
   * caller could show as "$0 spent".
   */
  merchantTotalSpent: number | null;
  /** Average of the spending transactions above; null when incomplete. */
  merchantAvgAmount: number | null;
  /** Refunds at this merchant (money back), never netted into spending; null when incomplete. */
  merchantRefundTotal: number | null;
  isAmountAnomaly: boolean;
  anomalyRatio: number;
  proactiveInsights: string[];
};

/** "Issuer •••• 1234". Only the last 4 digits are ever kept; anything else is dropped. */
export function formatAccountLabel(issuer: unknown, last4: unknown): string | null {
  const digits = typeof last4 === 'string' || typeof last4 === 'number' ? String(last4).replace(/\D/g, '').slice(-4) : '';
  const name = typeof issuer === 'string' ? issuer.replace(/\d{5,}/g, '').trim().slice(0, 40) : '';
  if (digits.length === 4 && name) return `${name} •••• ${digits}`;
  if (digits.length === 4) return `•••• ${digits}`;
  return name || null;
}

export async function explainTransactionCategory(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string
): Promise<TagExplanationResult> {
  const empty: TagExplanationResult = {
    category: null, categorySource: 'unknown', confidence: null, confidenceSource: 'none', confidenceLevel: null, merchantSeenCapped: false, accountLabel: null,
    learnedCount: 0, lastLearnedAt: null, message: '',
    merchantSeenCount: 0, merchantTotalSpent: null, merchantAvgAmount: null, merchantRefundTotal: null,
    isAmountAnomaly: false, anomalyRatio: 1, proactiveInsights: [],
  };

  try {
    // 1. Fetch the transaction
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('id, category, subcategory, category_source, confidence, merchant_name, merchant, description, amount, type, posted_at, user_id, import_id')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (txErr || !tx) return { ...empty, message: "I could not find this transaction." };

    const merchant = tx.merchant_name || tx.merchant || '';
    const category = tx.category;
    const amount = Math.abs(Number(tx.amount || 0));
    const categorySourceFromDb = tx.category_source;

    // 2. Merchant history (unified financial engine, owner GO 2026-11-26; AI Architecture HQ verdict
    // REFACTOR). Same engine merchant path as Tag's financial context: a complete, paged read
    // (fetchMerchantScopeRows), narrowed to the EXACT merchant group (never "%name%", which matched other
    // merchants). Money uses classifyCashFlow: spending only; refunds separate. If the read is not
    // complete, figures are a minimum ("at least"), never a full total.
    const merchantKey = merchant.trim() ? merchantGroupingKey(merchant) : '';
    let merchantTxs: Array<{ id: string; amount?: unknown; category?: string | null; subcategory?: string | null; type?: string | null }> = [];
    let merchantSeenCapped = false;
    if (merchantKey) {
      const fetched = await fetchMerchantScopeRows(supabase as unknown as MerchantScopeClient, userId, { merchantQuery: merchant.trim() }, ['subcategory']);
      if (fetched.error) merchantSeenCapped = true;
      merchantSeenCapped = merchantSeenCapped || fetched.truncated;
      merchantTxs = fetched.rows
        .filter(r => r.id !== transactionId && merchantRowGroupKey(r) === merchantKey)
        .map(r => ({ id: String(r.id), amount: r.amount, category: r.category ?? null, subcategory: (r.subcategory as string | null | undefined) ?? null, type: r.type ?? null }));
    }
    const merchantSeenCount = merchantTxs.length;
    const seenLabel = merchantSeenCapped ? `at least ${merchantSeenCount}` : `${merchantSeenCount}`;
    let spendCents = 0; let spendCount = 0; let refundCents = 0;
    for (const t of merchantTxs) {
      const c = classifyCashFlow(t);
      if (c.excluded !== null || c.amountCents === null) continue;
      if (c.purpose === 'spending') { spendCents += Math.abs(c.amountCents); spendCount++; }
      else if (c.purpose === 'refund') refundCents += Math.abs(c.amountCents);
    }
    // Financial Evidence Trust (owner approval 2026-11-27): a figure is evidence only from a COMPLETE
    // retrieval. On an incomplete read no money figure is returned or shown — not even a labelled
    // minimum ("at least $X"), which a customer can read as the amount.
    const merchantTotalSpent: number | null = merchantSeenCapped ? null : spendCents / 100;
    const merchantRefundTotal: number | null = merchantSeenCapped ? null : refundCents / 100;
    const merchantAvgAmount: number | null = merchantSeenCapped ? null : spendCount > 0 ? spendCents / 100 / spendCount : 0;
    // Anomaly hint only for a SPENDING transaction compared with >= 3 prior spending transactions here.
    const thisTx = classifyCashFlow({ type: (tx as { type?: string | null }).type ?? null, category: tx.category, subcategory: (tx as { subcategory?: string | null }).subcategory ?? null, amount: tx.amount });
    const thisIsSpending = thisTx.purpose === 'spending' && thisTx.excluded === null;
    const anomalyRatio = thisIsSpending && merchantAvgAmount !== null && merchantAvgAmount > 0 ? amount / merchantAvgAmount : 1;
    // No "Nx your usual spend" from a partial history (the average would be from part of the data).
    const isAmountAnomaly = !merchantSeenCapped && thisIsSpending && spendCount >= 3 && anomalyRatio > 2.0;

    // Most common past category for this merchant
    const catCounts: Record<string, number> = {};
    merchantTxs?.forEach(t => { if (t.category) catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
    const dominantCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const dominantCatCount = dominantCat ? catCounts[dominantCat] : 0;

    // 3. Feedback history
    let learnedCount = 0;
    let lastLearnedAt: string | null = null;
    if (merchant.trim()) {
      const { rows: feedback } = await exactMerchantCorrections(supabase, userId, merchant);
      learnedCount = feedback.length;
      lastLearnedAt = feedback?.[0]?.created_at || null;
    }

    // 4. Determine source
    let categorySource: TagExplanationResult['categorySource'] = 'unknown';
    if (categorySourceFromDb === 'learned' || learnedCount >= 2) categorySource = 'learned';
    else if (categorySourceFromDb === 'ai') categorySource = 'ai';
    else if (categorySourceFromDb === 'rule' || categorySourceFromDb === 'rules') categorySource = 'rule';
    else if (typeof categorySourceFromDb === 'string' && VERIFIED_CUSTOMER_SOURCES.has(categorySourceFromDb.trim().toLowerCase())) categorySource = 'manual';
    // Round-2 item 4: protected labels of unverified origin (manual, user_chat, tag_chat, …) stay
    // protected but are never described as the customer's own choice.
    const protectedUnverified = categorySource === 'unknown' && isProtectedSource(categorySourceFromDb);

    // 5. Confidence — enrich from merchant history
    let confidence = tx.confidence != null ? Number(tx.confidence) : null;
    let confidenceSource: TagExplanationResult['confidenceSource'] = confidence !== null && confidence !== 0 ? 'stored' : 'none';
    if (confidence === null || confidence === 0) {
      confidenceSource = 'estimated';
      if (merchantSeenCount >= 10 && dominantCatCount / merchantSeenCount >= 0.8) confidence = 0.95;
      else if (merchantSeenCount >= 5 && dominantCatCount / merchantSeenCount >= 0.7) confidence = 0.85;
      else if (merchantSeenCount >= 3) confidence = 0.70;
      else if (merchantSeenCount >= 1) confidence = 0.55;
      else if (categorySource === 'rule') confidence = 0.75;
      else confidence = 0.30;
    }

    // Qualitative level only (both stored and estimated values are uncalibrated).
    const confidenceLevel: TagExplanationResult['confidenceLevel'] =
      confidence === null ? null : confidence >= 0.85 ? 'high' : confidence >= 0.6 ? 'medium' : 'low';

    // Account label (display-only): owner-scoped lookup of the transaction's own import.
    let accountLabel: string | null = null;
    const importId = (tx as { import_id?: unknown }).import_id;
    if (typeof importId === 'string' && importId) {
      try {
        const { data: imp } = await supabase
          .from('imports')
          .select('statement_breakdown_json')
          .eq('id', importId)
          .eq('user_id', userId)
          .maybeSingle();
        const meta = (imp as { statement_breakdown_json?: { statement_meta?: { issuer?: unknown; account_last4?: unknown } } } | null)
          ?.statement_breakdown_json?.statement_meta;
        accountLabel = formatAccountLabel(meta?.issuer, meta?.account_last4);
      } catch {
        accountLabel = null;
      }
    }

    // 6. Build primary message
    let message = '';
    if (protectedUnverified) {
      message = `This category is protected, so I won't change it automatically. I can't confirm who set it — tell me if it's wrong and I'll fix this one.`;
    } else if (categorySource === 'manual') {
      message = `You set this category yourself${learnedCount > 1 ? ` — and you have corrected this merchant ${learnedCount} times` : ''}. I am locked in.`;
    } else if (categorySource === 'learned' && learnedCount >= 2) {
      message = `I learned from your ${learnedCount} past corrections and always tag ${merchant || 'this merchant'} as ${category}.`;
    } else if (merchantSeenCount >= 5 && dominantCat === category) {
      message = `I have seen ${merchant || 'this merchant'} ${seenLabel} times — most of those were ${category}, so this is a strong match with your history.`;
    } else if (merchantSeenCount >= 2) {
      message = `I have seen ${merchant || 'this merchant'} ${seenLabel} times before. Based on that history I tagged this as ${category}.`;
    } else if (categorySource === 'rule') {
      message = `The merchant name matched my ${category} rules. First time I have seen this one — tell me if I am wrong.`;
    } else {
      message = `First time I have seen this merchant. I made my best guess — correct me and I will remember it.`;
    }

    // 7. Proactive insights — Tag volunteers these unprompted
    const proactiveInsights: string[] = [];

    if (isAmountAnomaly && merchantAvgAmount !== null) {
      proactiveInsights.push(`⚠️ This amount ($${amount.toFixed(2)}) is ${anomalyRatio.toFixed(1)}x your usual spend here (avg $${merchantAvgAmount.toFixed(2)}). Worth a second look.`);
    }

    if (merchantSeenCount >= 3 && dominantCat && dominantCat !== category) {
      proactiveInsights.push(`🔄 You usually tag ${merchant} as ${dominantCat} (${dominantCatCount}/${merchantSeenCount} times). This one is ${category} - is that right?`);
    }

    if (merchantSeenCount === 0 && !category) {
      // C4 direction: merchant learning needs explicit consent (default off) - never promise automatic application.
      proactiveInsights.push(`✨ New merchant. Tell me what category fits. If you want, I can remember it for future ${merchant} transactions — only when you ask me to.`);
    }

    if (merchantSeenCapped && merchantKey) {
      proactiveInsights.push(`📊 I couldn't read all of your transactions at ${merchant}, so I can't give a spending figure for it right now.`);
    } else if (merchantSeenCount >= 5 && spendCount > 0 && merchantTotalSpent !== null && merchantRefundTotal !== null) {
      const refunds = merchantRefundTotal > 0 ? ` You also got $${merchantRefundTotal.toFixed(2)} back in refunds there (not counted as spending).` : '';
      proactiveInsights.push(`📊 Across your imported transactions, you've spent $${merchantTotalSpent.toFixed(2)} at ${merchant} in ${spendCount} purchase${spendCount === 1 ? '' : 's'}.${refunds}`);
    }

    return {
      category, categorySource, confidence, confidenceSource, confidenceLevel, merchantSeenCapped, accountLabel, learnedCount, lastLearnedAt,
      message, merchantSeenCount, merchantTotalSpent, merchantAvgAmount, merchantRefundTotal,
      isAmountAnomaly, anomalyRatio, proactiveInsights,
    };

  } catch (e) {
    return { ...empty, message: "I encountered an error explaining this transaction." };
  }
}

export type TagMerchantInsight = {
  merchant: string;
  topCategory: string | null;
  totalCorrections: number;
  lastCorrectedAt?: string | null;
};

export async function getMerchantCategoryInsight(
  supabase: SupabaseClient,
  userId: string,
  merchant: string
): Promise<TagMerchantInsight> {
  try {
    if (!merchant?.trim()) return { merchant, topCategory: null, totalCorrections: 0 };
    const { rows: feedback } = await exactMerchantCorrections(supabase, userId, merchant);
    if (!feedback.length) return { merchant, topCategory: null, totalCorrections: 0 };
    const counts: Record<string, number> = {};
    feedback.forEach(f => { if (f.new_category) counts[f.new_category] = (counts[f.new_category] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { merchant, topCategory: top, totalCorrections: feedback.length, lastCorrectedAt: feedback[0]?.created_at };
  } catch {
    return { merchant, topCategory: null, totalCorrections: 0 };
  }
}

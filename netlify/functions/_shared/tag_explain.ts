/**
 * Tag Explanation Helper — enhanced with merchant history + anomaly detection
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type TagExplanationResult = {
  category: string | null;
  categorySource: 'manual' | 'learned' | 'ai' | 'rule' | 'unknown';
  /** Legacy numeric value. Uncalibrated - never show it as a measured probability. */
  confidence: number | null;
  /** 'stored' = recorded by the categorizer; 'estimated' = derived here from merchant history; 'none'. */
  confidenceSource: 'stored' | 'estimated' | 'none';
  /** Qualitative level for display (owner direction 2026-11-23: no uncalibrated percentages). */
  confidenceLevel: 'high' | 'medium' | 'low' | null;
  /** True when merchantSeenCount hit the 100-row cap (show as "100+"). */
  merchantSeenCapped: boolean;
  learnedCount: number;
  lastLearnedAt?: string | null;
  message: string;
  // Enhanced fields
  merchantSeenCount: number;
  merchantTotalSpent: number;
  merchantAvgAmount: number;
  isAmountAnomaly: boolean;
  anomalyRatio: number;
  proactiveInsights: string[];
};

export async function explainTransactionCategory(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string
): Promise<TagExplanationResult> {
  const empty: TagExplanationResult = {
    category: null, categorySource: 'unknown', confidence: null, confidenceSource: 'none', confidenceLevel: null, merchantSeenCapped: false,
    learnedCount: 0, lastLearnedAt: null, message: '',
    merchantSeenCount: 0, merchantTotalSpent: 0, merchantAvgAmount: 0,
    isAmountAnomaly: false, anomalyRatio: 1, proactiveInsights: [],
  };

  try {
    // 1. Fetch the transaction
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('id, category, category_source, confidence, merchant_name, merchant, description, amount, posted_at, user_id')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (txErr || !tx) return { ...empty, message: "I could not find this transaction." };

    const merchant = tx.merchant_name || tx.merchant || '';
    const category = tx.category;
    const amount = Math.abs(Number(tx.amount || 0));
    const categorySourceFromDb = tx.category_source;

    // 2. Merchant history — all transactions from this merchant
    const { data: merchantTxs } = await supabase
      .from('transactions')
      .select('amount, category, posted_at')
      .eq('user_id', userId)
      .ilike('merchant_name', `%${merchant.toLowerCase().trim()}%`)
      .neq('id', transactionId)
      .order('posted_at', { ascending: false })
      .limit(100);

    const merchantSeenCount = merchantTxs?.length || 0;
    // Approximate: substring merchant match, capped at 100 rows.
    const merchantSeenCapped = merchantSeenCount >= 100;
    const seenLabel = merchantSeenCapped ? '100+' : `about ${merchantSeenCount}`;
    const merchantTotalSpent = merchantTxs?.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0) || 0;
    const merchantAvgAmount = merchantSeenCount > 0 ? merchantTotalSpent / merchantSeenCount : 0;
    const anomalyRatio = merchantAvgAmount > 0 ? amount / merchantAvgAmount : 1;
    const isAmountAnomaly = merchantSeenCount >= 3 && anomalyRatio > 2.0;

    // Most common past category for this merchant
    const catCounts: Record<string, number> = {};
    merchantTxs?.forEach(t => { if (t.category) catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
    const dominantCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const dominantCatCount = dominantCat ? catCounts[dominantCat] : 0;

    // 3. Feedback history
    let learnedCount = 0;
    let lastLearnedAt: string | null = null;
    if (merchant.trim()) {
      const { data: feedback } = await supabase
        .from('tag_category_feedback')
        .select('new_category, created_at')
        .eq('user_id', userId)
        .ilike('merchant', `%${merchant.trim()}%`)
        .order('created_at', { ascending: false });
      learnedCount = feedback?.length || 0;
      lastLearnedAt = feedback?.[0]?.created_at || null;
    }

    // 4. Determine source
    let categorySource: TagExplanationResult['categorySource'] = 'unknown';
    if (categorySourceFromDb === 'learned' || learnedCount >= 2) categorySource = 'learned';
    else if (categorySourceFromDb === 'ai') categorySource = 'ai';
    else if (categorySourceFromDb === 'rule' || categorySourceFromDb === 'rules') categorySource = 'rule';
    else if (categorySourceFromDb === 'manual' || categorySourceFromDb === 'user' || categorySourceFromDb === 'user_chat') categorySource = 'manual';

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

    // 6. Build primary message
    let message = '';
    if (categorySource === 'manual') {
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

    if (isAmountAnomaly) {
      proactiveInsights.push(`⚠️ This amount ($${amount.toFixed(2)}) is ${anomalyRatio.toFixed(1)}x your usual spend here (avg $${merchantAvgAmount.toFixed(2)}). Worth a second look.`);
    }

    if (merchantSeenCount >= 3 && dominantCat && dominantCat !== category) {
      proactiveInsights.push(`🔄 You usually tag ${merchant} as ${dominantCat} (${dominantCatCount}/${merchantSeenCount} times). This one is ${category} - is that right?`);
    }

    if (merchantSeenCount === 0 && !category) {
      // C4 direction: merchant learning needs explicit consent (default off) - never promise automatic application.
      proactiveInsights.push(`✨ New merchant. Tell me what category fits. If you want, I can remember it for future ${merchant} transactions — only when you ask me to.`);
    }

    if (merchantSeenCount >= 5) {
      proactiveInsights.push(`📊 You have spent about ${merchantTotalSpent.toFixed(2)} at ${merchant} across ${seenLabel} transactions${merchantSeenCapped ? ' (only the most recent 100 are counted)' : ''}.`);
    }

    return {
      category, categorySource, confidence, confidenceSource, confidenceLevel, merchantSeenCapped, learnedCount, lastLearnedAt,
      message, merchantSeenCount, merchantTotalSpent, merchantAvgAmount,
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
    const { data: feedback } = await supabase
      .from('tag_category_feedback')
      .select('new_category, created_at')
      .eq('user_id', userId)
      .ilike('merchant', `%${merchant.trim()}%`)
      .order('created_at', { ascending: false });
    if (!feedback?.length) return { merchant, topCategory: null, totalCorrections: 0 };
    const counts: Record<string, number> = {};
    feedback.forEach(f => { if (f.new_category) counts[f.new_category] = (counts[f.new_category] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { merchant, topCategory: top, totalCorrections: feedback.length, lastCorrectedAt: feedback[0]?.created_at };
  } catch {
    return { merchant, topCategory: null, totalCorrections: 0 };
  }
}

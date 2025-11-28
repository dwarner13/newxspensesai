/**
 * Categorization Analytics Endpoint
 *
 * Provides Crystal with comprehensive categorization KPIs:
 * - Confidence distribution histogram
 * - Top confusing merchants (low avg confidence)
 * - Rule effectiveness (hit rate, priority impact)
 * - Auto-categorization rate
 * - Daily trend data
 *
 * @example
 * POST /.netlify/functions/analytics-categorization
 * {
 *   "period": "month",  // day, week, month, all
 *   "limit": 10         // top merchants/rules to return
 * }
 *
 * Response:
 * {
 *   "confidence_histogram": { "0-20": 5, "20-40": 12, ... },
 *   "avg_confidence": 82.5,
 *   "top_confusing_merchants": [{ merchant, avg_conf, count }],
 *   "rule_effectiveness": [{ pattern, hit_count, auto_rate, priority }],
 *   "auto_rate_percent": 94.2,
 *   "total_transactions": 500,
 *   "auto_categorized": 471,
 *   "manual_corrections": 23,
 *   "period_label": "Last 30 days"
 * }
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================

const Input = z.object({
  period: z.enum(["day", "week", "month", "all"]).default("month"),
  limit: z.number().int().min(1).max(50).default(10),
});

type Input = z.infer<typeof Input>;

interface ConfidenceHistogram {
  [bucket: string]: number; // e.g., "0-20": 5, "20-40": 12
}

interface ConfusingMerchant {
  merchant_name: string;
  avg_confidence: number;
  transaction_count: number;
  last_seen: string;
}

interface RuleEffective {
  pattern: string;
  hit_count: number;
  auto_rate: number; // 0-100
  priority: number;
  created_at: string;
}

interface AnalyticsResponse {
  ok: boolean;
  confidence_histogram: ConfidenceHistogram;
  avg_confidence: number;
  top_confusing_merchants: ConfusingMerchant[];
  rule_effectiveness: RuleEffective[];
  auto_rate_percent: number;
  total_transactions: number;
  auto_categorized: number;
  manual_corrections: number;
  period_label: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getPeriodDays(period: string): number {
  const map: Record<string, number> = {
    day: 1,
    week: 7,
    month: 30,
    all: 365,
  };
  return map[period] || 30;
}

function getPeriodLabel(period: string): string {
  const map: Record<string, string> = {
    day: "Last 24 hours",
    week: "Last 7 days",
    month: "Last 30 days",
    all: "All time",
  };
  return map[period] || "Last 30 days";
}

/**
 * Generate confidence buckets (0-20%, 20-40%, etc.)
 * Returns counts per bucket for a given set of values
 */
function buildHistogram(confidences: (number | null)[]): ConfidenceHistogram {
  const buckets: Record<string, number> = {
    "0-20": 0,
    "20-40": 0,
    "40-60": 0,
    "60-80": 0,
    "80-100": 0,
  };

  for (const conf of confidences) {
    if (conf === null || conf === undefined) continue;
    const pct = Math.round(conf * 100);
    if (pct < 20) buckets["0-20"]++;
    else if (pct < 40) buckets["20-40"]++;
    else if (pct < 60) buckets["40-60"]++;
    else if (pct < 80) buckets["60-80"]++;
    else buckets["80-100"]++;
  }

  return buckets;
}

// ============================================================================
// HANDLER
// ============================================================================

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const user_id = event.headers["x-user-id"] as string | undefined;
    if (!user_id) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    // Parse input
    const parsed = Input.safeParse(JSON.parse(event.body ?? "{}"));
    if (!parsed.success) {
      return { statusCode: 400, body: JSON.stringify(parsed.error.flatten()) };
    }
    const { period, limit } = parsed.data;

    const { supabase } = serverSupabase();

    const periodDays = getPeriodDays(period);
    const sinceIso = new Date(Date.now() - periodDays * 86400000).toISOString();

    // ========== FETCH TRANSACTIONS & BUILD HISTOGRAM ==========
    const { data: txns, error: e1 } = await supabase
      .from("transactions")
      .select("id, merchant_name, category, category_confidence, posted_at")
      .eq("user_id", user_id)
      .gte("posted_at", sinceIso);

    if (e1) throw new Error(e1.message);

    const txnList = txns ?? [];
    const totalTxns = txnList.length;
    const categorized = txnList.filter((t: any) => t.category !== null).length;
    const uncategorized = totalTxns - categorized;

    // Confidence histogram
    const confidences = txnList.map((t: any) => t.category_confidence);
    const histogram = buildHistogram(confidences);

    // Average confidence (only for categorized)
    const avgConf =
      categorized > 0
        ? confidences.filter((c) => c !== null).reduce((a, b) => a + b, 0) / categorized
        : 0;

    // Auto-categorization rate (estimate: where confidence >= 0.7)
    const autoCategorized = txnList.filter(
      (t: any) => t.category && t.category_confidence >= 0.7
    ).length;
    const autoRate = totalTxns > 0 ? (autoCategorized / totalTxns) * 100 : 0;

    // ========== TOP CONFUSING MERCHANTS ==========
    const merchantConfidence: Record<string, { total: number; count: number; last: string }> =
      {};
    for (const t of txnList) {
      const m = t.merchant_name || "unknown";
      if (!merchantConfidence[m]) {
        merchantConfidence[m] = { total: 0, count: 0, last: t.posted_at };
      }
      if (t.category_confidence) {
        merchantConfidence[m].total += t.category_confidence;
        merchantConfidence[m].count++;
      }
      if (t.posted_at > merchantConfidence[m].last) {
        merchantConfidence[m].last = t.posted_at;
      }
    }

    const topConfusing = Object.entries(merchantConfidence)
      .map(([name, stats]) => ({
        merchant_name: name,
        avg_confidence: stats.count > 0 ? (stats.total / stats.count) * 100 : 0,
        transaction_count: txnList.filter((t: any) => t.merchant_name === name).length,
        last_seen: stats.last,
      }))
      .sort((a, b) => a.avg_confidence - b.avg_confidence)
      .slice(0, limit);

    // ========== RULE EFFECTIVENESS ==========
    const { data: rules, error: e2 } = await supabase
      .from("category_rules")
      .select("id, pattern, priority, created_at")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(limit);

    if (e2) throw new Error(e2.message);

    const ruleEff: RuleEffective[] = [];
    for (const rule of rules ?? []) {
      // Count how many txns match this rule's pattern (simple substring match)
      const matchCount = txnList.filter((t: any) =>
        t.merchant_name.toLowerCase().includes(rule.pattern.toLowerCase())
      ).length;

      ruleEff.push({
        pattern: rule.pattern,
        hit_count: matchCount,
        auto_rate: matchCount > 0 ? 100 : 0, // Rules always auto-categorize if they match
        priority: rule.priority,
        created_at: rule.created_at,
      });
    }

    // Sort by hit count desc
    ruleEff.sort((a, b) => b.hit_count - a.hit_count);

    // ========== DAILY METRICS (from metrics_categorization_daily) ==========
    const today = new Date().toISOString().slice(0, 10);
    const { data: dailyMetric, error: e3 } = await supabase
      .from("metrics_categorization_daily")
      .select("total_transactions, auto_categorized, manual_corrections")
      .eq("user_id", user_id)
      .eq("day", today)
      .single();

    // Use today's metrics if available, else estimate from full txns
    const totalMetric = dailyMetric?.total_transactions ?? totalTxns;
    const autoMetric = dailyMetric?.auto_categorized ?? autoCategorized;
    const manualMetric = dailyMetric?.manual_corrections ?? uncategorized;

    const response: AnalyticsResponse = {
      ok: true,
      confidence_histogram: histogram,
      avg_confidence: Math.round(avgConf * 100) / 100,
      top_confusing_merchants: topConfusing,
      rule_effectiveness: ruleEff,
      auto_rate_percent: Math.round(autoRate * 100) / 100,
      total_transactions: totalMetric,
      auto_categorized: autoMetric,
      manual_corrections: manualMetric,
      period_label: getPeriodLabel(period),
    };

    safeLog("analytics-categorization.success", {
      user_id,
      period,
      total_txns: totalTxns,
      avg_conf: Math.round(avgConf * 100) / 100,
      auto_rate: Math.round(autoRate * 100) / 100,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (err: any) {
    safeLog("analytics-categorization.error", { error: err?.message });
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to compute categorization analytics",
      }),
    };
  }
};







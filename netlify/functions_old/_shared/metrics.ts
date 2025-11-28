/**
 * Metrics Tracking for Tag AI Categorization System
 *
 * Tracks:
 * - Daily categorization volume (total, auto, manual)
 * - Confidence scores (average, distribution)
 * - Rule performance (hit rate, priority effectiveness)
 * - User engagement (corrections, learning rate)
 * - System health (errors, timeouts, cache hits)
 *
 * Uses atomic increments via RPC for high-concurrency safety.
 */

import { serverSupabase } from "./supabase";
import { safeLog } from "./safeLog";

// ============================================================================
// DAILY METRICS (Aggregated)
// ============================================================================

export interface CategorizationDailyMetrics {
  user_id: string;
  day: string; // YYYY-MM-DD
  total_transactions: number;
  auto_categorized: number;
  manual_corrections: number;
  avg_confidence: number; // 0-100
  confidence_std_dev?: number;
  uncategorized_count?: number;
  rules_applied?: number;
  aliases_matched?: number;
}

/**
 * Bump daily categorization metrics
 *
 * Atomically increments counters for a given day.
 * Creates record if doesn't exist.
 *
 * @param params - Metric deltas to add
 *
 * @example
 * await bumpCategorizationMetrics({
 *   user_id: "user-123",
 *   total_delta: 10,
 *   auto_delta: 9,
 *   manual_delta: 1,
 *   avg_confidence_sample: 87.5
 * });
 */
export async function bumpCategorizationMetrics(params: {
  user_id: string;
  total_delta?: number;
  auto_delta?: number;
  manual_delta?: number;
  avg_confidence_sample?: number | null;
  uncategorized_delta?: number;
  rules_applied_delta?: number;
  aliases_matched_delta?: number;
}) {
  const {
    user_id,
    total_delta = 0,
    auto_delta = 0,
    manual_delta = 0,
    avg_confidence_sample = null,
    uncategorized_delta = 0,
    rules_applied_delta = 0,
    aliases_matched_delta = 0,
  } = params;

  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const { supabase } = serverSupabase();

    // 1) Ensure record exists
    const { data: existing, error: e1 } = await supabase
      .from("metrics_categorization_daily")
      .select("id")
      .eq("user_id", user_id)
      .eq("day", day)
      .maybeSingle();

    if (!existing) {
      // Insert new record
      const { error: e2 } = await supabase.from("metrics_categorization_daily").insert({
        user_id,
        day,
        total_transactions: total_delta,
        auto_categorized: auto_delta,
        manual_corrections: manual_delta,
        avg_confidence: avg_confidence_sample ?? 0,
        uncategorized_count: uncategorized_delta,
        rules_applied: rules_applied_delta,
        aliases_matched: aliases_matched_delta,
      });

      if (e2) {
        safeLog("metrics.categorization.insert.error", { error: e2.message, user_id, day });
        return;
      }

      safeLog("metrics.categorization.created", {
        user_id,
        day,
        total: total_delta,
        auto: auto_delta,
      });
      return;
    }

    // 2) Increment atomically via RPC
    const { error: e3 } = await supabase.rpc("metrics_categorization_daily_increment", {
      p_user_id: user_id,
      p_day: day,
      p_total_delta: total_delta,
      p_auto_delta: auto_delta,
      p_manual_delta: manual_delta,
      p_conf_sample: avg_confidence_sample,
      p_uncategorized_delta: uncategorized_delta,
      p_rules_applied_delta: rules_applied_delta,
      p_aliases_matched_delta: aliases_matched_delta,
    });

    if (e3) {
      safeLog("metrics.categorization.rpc.error", { error: e3.message, user_id, day });
      // Fallback: update directly (less ideal but functional)
      await supabase
        .from("metrics_categorization_daily")
        .update({
          total_transactions: total_delta,
          auto_categorized: auto_delta,
          manual_corrections: manual_delta,
        })
        .eq("user_id", user_id)
        .eq("day", day);
      return;
    }

    safeLog("metrics.categorization.bumped", {
      user_id,
      day,
      total: total_delta,
      auto: auto_delta,
      manual: manual_delta,
    });
  } catch (err: any) {
    safeLog("metrics.categorization.error", {
      error: err?.message,
      user_id,
    });
  }
}

// ============================================================================
// RULE PERFORMANCE
// ============================================================================

export interface RulePerformanceMetrics {
  user_id: string;
  rule_id: string;
  matches_total: number;
  matches_correct: number;
  confidence_avg: number;
  overridden_count: number; // Times user corrected this rule's decision
}

/**
 * Record rule match (hit or miss)
 *
 * @param params - Rule performance data
 */
export async function recordRuleMatch(params: {
  user_id: string;
  rule_id: string;
  matched: boolean;
  was_correct?: boolean; // true if user didn't override
  confidence?: number;
  timestamp?: Date;
}) {
  const { user_id, rule_id, matched, was_correct = true, confidence = 100, timestamp = new Date() } =
    params;

  try {
    const { supabase } = serverSupabase();

    const { error } = await supabase.from("metrics_rule_performance").insert({
      user_id,
      rule_id,
      matched,
      was_correct,
      confidence,
      timestamp: timestamp.toISOString(),
    });

    if (error) {
      safeLog("metrics.rule.match.error", { error: error.message, rule_id });
    }
  } catch (err: any) {
    safeLog("metrics.rule.match.error", { error: err?.message });
  }
}

// ============================================================================
// SYSTEM HEALTH & PERFORMANCE
// ============================================================================

export interface CategoryMetricsHealth {
  timestamp: string;
  function_name: string;
  duration_ms: number;
  error?: string;
  cache_hit?: boolean;
  row_count?: number;
}

/**
 * Record function performance (latency, errors, cache)
 *
 * @param params - Performance data
 */
export async function recordFunctionPerformance(params: {
  function_name: string;
  duration_ms: number;
  user_id?: string;
  success: boolean;
  error_message?: string;
  cache_hit?: boolean;
  row_count?: number;
}) {
  const {
    function_name,
    duration_ms,
    user_id,
    success,
    error_message,
    cache_hit = false,
    row_count,
  } = params;

  try {
    const { supabase } = serverSupabase();

    // Warn if slow
    if (duration_ms > 1000) {
      safeLog("metrics.function.slow", {
        function: function_name,
        duration_ms,
        user_id,
      });
    }

    const { error } = await supabase.from("metrics_function_performance").insert({
      function_name,
      duration_ms,
      user_id: user_id || null,
      success,
      error_message: error_message || null,
      cache_hit,
      row_count: row_count || null,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      safeLog("metrics.function.log.error", { error: error.message, function: function_name });
    }
  } catch (err: any) {
    // Silently fail to not break caller
    console.error("[metrics] function performance log failed", err?.message);
  }
}

/**
 * Wrapper to automatically track function performance
 *
 * @example
 * const result = await trackFunctionPerformance(
 *   'resolveCategoryId',
 *   () => resolveCategoryId(userId, name),
 *   { user_id: userId }
 * );
 */
export async function trackFunctionPerformance<T>(
  functionName: string,
  fn: () => Promise<T>,
  options?: {
    user_id?: string;
    cache_hit?: boolean;
  }
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    recordFunctionPerformance({
      function_name: functionName,
      duration_ms: duration,
      user_id: options?.user_id,
      success: true,
      cache_hit: options?.cache_hit,
      row_count: Array.isArray(result) ? result.length : undefined,
    }).catch(() => {
      /* silently fail */
    });

    return result;
  } catch (err: any) {
    const duration = Date.now() - startTime;

    recordFunctionPerformance({
      function_name: functionName,
      duration_ms: duration,
      user_id: options?.user_id,
      success: false,
      error_message: err?.message,
    }).catch(() => {
      /* silently fail */
    });

    throw err;
  }
}

// ============================================================================
// USER ENGAGEMENT & LEARNING
// ============================================================================

export interface UserCategorizationEngagement {
  user_id: string;
  total_corrections: number;
  rules_created_count: number;
  categories_created_count: number;
  avg_time_to_correct_ms?: number;
  last_correction_at?: string;
}

/**
 * Record user correction (for learning metrics)
 *
 * @param params - Correction data
 */
export async function recordUserCorrection(params: {
  user_id: string;
  transaction_id: string;
  old_category_id: string | null;
  new_category_id: string | null;
  merchant_name: string;
  confidence_override_pct?: number;
  rule_created?: boolean;
  timestamp?: Date;
}) {
  const {
    user_id,
    transaction_id,
    old_category_id,
    new_category_id,
    merchant_name,
    confidence_override_pct,
    rule_created = false,
    timestamp = new Date(),
  } = params;

  try {
    const { supabase } = serverSupabase();

    const { error } = await supabase.from("metrics_user_corrections").insert({
      user_id,
      transaction_id,
      old_category_id,
      new_category_id,
      merchant_name,
      confidence_override_pct: confidence_override_pct || null,
      rule_created,
      timestamp: timestamp.toISOString(),
    });

    if (error) {
      safeLog("metrics.user.correction.error", { error: error.message, user_id });
      return;
    }

    // Bump daily engagement
    await bumpCategorizationMetrics({
      user_id,
      manual_delta: 1,
      // If user overrode high-confidence suggestion, track it
      ...(confidence_override_pct && confidence_override_pct > 80 ? { rules_applied_delta: 0 } : {}),
    });

    safeLog("metrics.user.correction.recorded", {
      user_id,
      merchant: merchant_name,
      ruleCreated: rule_created,
    });
  } catch (err: any) {
    safeLog("metrics.user.correction.log.error", { error: err?.message });
  }
}

// ============================================================================
// CONFIDENCE ANALYSIS
// ============================================================================

export interface ConfidenceDistribution {
  bucket_0_20: number;
  bucket_20_40: number;
  bucket_40_60: number;
  bucket_60_80: number;
  bucket_80_100: number;
}

/**
 * Get confidence distribution for a user (last N days)
 *
 * @param userId - User UUID
 * @param days - Number of days to analyze (default: 7)
 * @returns Distribution of confidence scores
 */
export async function getConfidenceDistribution(userId: string, days = 7): Promise<ConfidenceDistribution> {
  try {
    const { supabase } = serverSupabase();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase.rpc("get_confidence_distribution", {
      p_user_id: userId,
      p_start_date: startDate.toISOString(),
    });

    if (error) {
      safeLog("metrics.confidence.distribution.error", { error: error.message, userId });
      return {
        bucket_0_20: 0,
        bucket_20_40: 0,
        bucket_40_60: 0,
        bucket_60_80: 0,
        bucket_80_100: 0,
      };
    }

    return data;
  } catch (err: any) {
    safeLog("metrics.confidence.distribution.error", { error: err?.message });
    return {
      bucket_0_20: 0,
      bucket_20_40: 0,
      bucket_40_60: 0,
      bucket_60_80: 0,
      bucket_80_100: 0,
    };
  }
}

/**
 * Estimate user mastery level based on corrections
 *
 * 0 = Never used rules, 100 = Rules always correct
 *
 * @param userId - User UUID
 * @returns Mastery score 0-100
 */
export async function getUserMasteryScore(userId: string): Promise<number> {
  try {
    const { supabase } = serverSupabase();

    const { data, error } = await supabase.rpc("get_user_mastery_score", {
      p_user_id: userId,
    });

    if (error) {
      safeLog("metrics.mastery.error", { error: error.message, userId });
      return 50; // Neutral default
    }

    return Math.min(100, Math.max(0, data || 50));
  } catch (err: any) {
    safeLog("metrics.mastery.error", { error: err?.message });
    return 50;
  }
}

// ============================================================================
// ALERTS & THRESHOLDS
// ============================================================================

export interface MetricsAlert {
  type: "uncategorized_high" | "confidence_low" | "rule_ineffective" | "cache_miss_high";
  severity: "info" | "warning" | "critical";
  user_id: string;
  message: string;
  metrics: Record<string, any>;
  triggered_at: string;
}

/**
 * Check if any alerts should be triggered
 *
 * @param userId - User UUID
 * @returns Array of triggered alerts
 */
export async function checkCategorizationAlerts(userId: string): Promise<MetricsAlert[]> {
  const alerts: MetricsAlert[] = [];
  const today = new Date().toISOString().slice(0, 10);

  try {
    const { supabase } = serverSupabase();

    // 1) Check uncategorized rate
    const { data: daily } = await supabase
      .from("metrics_categorization_daily")
      .select("*")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle();

    if (daily) {
      const uncatRate =
        daily.total_transactions > 0
          ? (daily.uncategorized_count || 0) / daily.total_transactions
          : 0;

      if (uncatRate > 0.2) {
        // >20% uncategorized
        alerts.push({
          type: "uncategorized_high",
          severity: "warning",
          user_id: userId,
          message: `${Math.round(uncatRate * 100)}% of transactions uncategorized today`,
          metrics: { rate: uncatRate, count: daily.uncategorized_count },
          triggered_at: new Date().toISOString(),
        });
      }

      // 2) Check average confidence
      if (daily.avg_confidence < 60) {
        alerts.push({
          type: "confidence_low",
          severity: "info",
          user_id: userId,
          message: `Average category confidence: ${Math.round(daily.avg_confidence)}%`,
          metrics: { avg_confidence: daily.avg_confidence },
          triggered_at: new Date().toISOString(),
        });
      }
    }

    // 3) Check rule performance
    const { data: poorRules } = await supabase.rpc("get_ineffective_rules", {
      p_user_id: userId,
      p_threshold: 0.6, // <60% accuracy
    });

    if (poorRules && poorRules.length > 0) {
      alerts.push({
        type: "rule_ineffective",
        severity: "warning",
        user_id: userId,
        message: `${poorRules.length} rule(s) with <60% accuracy`,
        metrics: { rules: poorRules },
        triggered_at: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    safeLog("metrics.alerts.error", { error: err?.message, userId });
  }

  return alerts;
}

// ============================================================================
// REPORTING & ANALYTICS
// ============================================================================

/**
 * Get categorization metrics for a date range
 *
 * @param userId - User UUID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Aggregated metrics
 */
export async function getCategorizationMetricsRange(
  userId: string,
  startDate: string,
  endDate: string
) {
  try {
    const { supabase } = serverSupabase();

    const { data, error } = await supabase
      .from("metrics_categorization_daily")
      .select("*")
      .eq("user_id", userId)
      .gte("day", startDate)
      .lte("day", endDate)
      .order("day");

    if (error) throw error;

    // Aggregate
    const agg = {
      days: data?.length || 0,
      total_transactions: data?.reduce((s, d) => s + (d.total_transactions || 0), 0) || 0,
      auto_categorized: data?.reduce((s, d) => s + (d.auto_categorized || 0), 0) || 0,
      manual_corrections: data?.reduce((s, d) => s + (d.manual_corrections || 0), 0) || 0,
      avg_confidence: data?.length
        ? data.reduce((s, d) => s + (d.avg_confidence || 0), 0) / data.length
        : 0,
      auto_rate:
        data && data.length > 0
          ? (data.reduce((s, d) => s + (d.auto_categorized || 0), 0) /
              data.reduce((s, d) => s + (d.total_transactions || 0), 0)) *
            100
          : 0,
    };

    return agg;
  } catch (err: any) {
    safeLog("metrics.range.error", { error: err?.message, userId });
    return {
      days: 0,
      total_transactions: 0,
      auto_categorized: 0,
      manual_corrections: 0,
      avg_confidence: 0,
      auto_rate: 0,
    };
  }
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type {
  CategorizationDailyMetrics,
  RulePerformanceMetrics,
  CategoryMetricsHealth,
  UserCategorizationEngagement,
  ConfidenceDistribution,
  MetricsAlert,
};





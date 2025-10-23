/**
 * useMetrics Hook
 *
 * Fetches categorization analytics for Crystal's dashboard.
 *
 * Features:
 * - Caching with TTL (5 minutes)
 * - Period-based queries (day, week, month, all)
 * - Confidence histogram
 * - Top confusing merchants
 * - Rule effectiveness stats
 * - Error handling + retry logic
 *
 * @example
 * const { histogram, topMerchants, rules, autoRate, isLoading, error, refetch } = useMetrics({
 *   period: "month",
 *   limit: 10
 * });
 *
 * // Display histogram
 * Object.entries(histogram).forEach(([bucket, count]) => {
 *   console.log(`${bucket}%: ${count} transactions`);
 * });
 *
 * // Top confusing merchants
 * topMerchants.forEach(m => {
 *   console.log(`${m.merchant_name}: ${m.avg_confidence}% confidence`);
 * });
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface ConfidenceHistogram {
  [bucket: string]: number; // e.g., "0-20": 5, "20-40": 12
}

export interface ConfusingMerchant {
  merchant_name: string;
  avg_confidence: number;
  transaction_count: number;
  last_seen: string;
}

export interface RuleEffectiveness {
  pattern: string;
  hit_count: number;
  auto_rate: number; // 0-100
  priority: number;
  created_at: string;
}

export interface UseMetricsOptions {
  period?: "day" | "week" | "month" | "all";
  limit?: number; // 1-50, default 10
  autoLoad?: boolean; // load on mount, default true
}

export interface UseMetricsResult {
  histogram: ConfidenceHistogram | null;
  avgConfidence: number | null;
  topMerchants: ConfusingMerchant[];
  rules: RuleEffectiveness[];
  autoRate: number | null; // percent
  totalTransactions: number | null;
  autoCategorized: number | null;
  manualCorrections: number | null;
  periodLabel: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Simple in-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const metricsCache = new Map<string, CacheEntry>();

function getCacheKey(period: string, limit: number): string {
  return `metrics:${period}:${limit}`;
}

export function useMetrics(options: UseMetricsOptions = {}): UseMetricsResult {
  const { userId } = useAuth();
  const { period = "month", limit = 10, autoLoad = true } = options;

  const [histogram, setHistogram] = useState<ConfidenceHistogram | null>(null);
  const [avgConfidence, setAvgConfidence] = useState<number | null>(null);
  const [topMerchants, setTopMerchants] = useState<ConfusingMerchant[]>([]);
  const [rules, setRules] = useState<RuleEffectiveness[]>([]);
  const [autoRate, setAutoRate] = useState<number | null>(null);
  const [totalTransactions, setTotalTransactions] = useState<number | null>(null);
  const [autoCategorized, setAutoCategorized] = useState<number | null>(null);
  const [manualCorrections, setManualCorrections] = useState<number | null>(null);
  const [periodLabel, setPeriodLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setError("Not authenticated");
      return;
    }

    if (isLoading) return;

    // Check cache first
    const cacheKey = getCacheKey(period, limit);
    const cached = metricsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const data = cached.data;
      setHistogram(data.histogram);
      setAvgConfidence(data.avgConfidence);
      setTopMerchants(data.topMerchants);
      setRules(data.rules);
      setAutoRate(data.autoRate);
      setTotalTransactions(data.totalTransactions);
      setAutoCategorized(data.autoCategorized);
      setManualCorrections(data.manualCorrections);
      setPeriodLabel(data.periodLabel);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch("/.netlify/functions/analytics-categorization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ period, limit }),
      }).then((r) => r.json());

      if (!resp.ok) {
        throw new Error(resp.error || "Failed to fetch metrics");
      }

      // Cache the response
      const cacheData = {
        histogram: resp.confidence_histogram,
        avgConfidence: resp.avg_confidence,
        topMerchants: resp.top_confusing_merchants,
        rules: resp.rule_effectiveness,
        autoRate: resp.auto_rate_percent,
        totalTransactions: resp.total_transactions,
        autoCategorized: resp.auto_categorized,
        manualCorrections: resp.manual_corrections,
        periodLabel: resp.period_label,
      };

      metricsCache.set(cacheKey, {
        data: cacheData,
        timestamp: Date.now(),
      });

      // Set state
      setHistogram(cacheData.histogram);
      setAvgConfidence(cacheData.avgConfidence);
      setTopMerchants(cacheData.topMerchants);
      setRules(cacheData.rules);
      setAutoRate(cacheData.autoRate);
      setTotalTransactions(cacheData.totalTransactions);
      setAutoCategorized(cacheData.autoCategorized);
      setManualCorrections(cacheData.manualCorrections);
      setPeriodLabel(cacheData.periodLabel);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch metrics");
    } finally {
      setIsLoading(false);
    }
  }, [userId, period, limit, isLoading]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && userId && !histogram) {
      refetch();
    }
  }, [userId, autoLoad, histogram, refetch]);

  return {
    histogram,
    avgConfidence,
    topMerchants,
    rules,
    autoRate,
    totalTransactions,
    autoCategorized,
    manualCorrections,
    periodLabel,
    isLoading,
    error,
    refetch,
  };
}






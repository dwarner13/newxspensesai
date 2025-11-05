/**
 * 📊 Metrics Endpoint (Dev-Only)
 * 
 * GET /metrics
 * - Returns OCR and transaction statistics
 * - Dev-only: Requires METRICS_ENABLED=true
 * - Gracefully handles missing DB (returns zeros + warnings)
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase';

interface MetricsResponse {
  ok: boolean;
  warnings?: string[];
  metrics: {
    ocr: {
      successes_last_7d: number;
      successes_last_30d: number;
      avg_duration_ms: number | null;
    };
    transactions: {
      saved_last_7d: number;
      saved_last_30d: number;
      top_categories: Array<{ category: string; count: number }>;
    };
  };
}

/**
 * Check if metrics endpoint is enabled
 */
function isMetricsEnabled(): boolean {
  return process.env.METRICS_ENABLED === 'true';
}

/**
 * Get date N days ago
 */
function getDateNDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

export const handler: Handler = async (event) => {
  // Only GET supported
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  // ========================================================================
  // DEV-ONLY CHECK
  // ========================================================================
  if (!isMetricsEnabled()) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        ok: false,
        error: 'Metrics endpoint is disabled. Set METRICS_ENABLED=true to enable.',
      }),
    };
  }

  const warnings: string[] = [];
  const response: MetricsResponse = {
    ok: true,
    metrics: {
      ocr: {
        successes_last_7d: 0,
        successes_last_30d: 0,
        avg_duration_ms: null,
      },
      transactions: {
        saved_last_7d: 0,
        saved_last_30d: 0,
        top_categories: [],
      },
    },
  };

  // Check if Supabase is configured
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    warnings.push('Supabase not configured - returning zero metrics');
    response.warnings = warnings;
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  }

  try {
    const sb = admin();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ========================================================================
    // OCR METRICS
    // ========================================================================
    try {
      // Check if guardrail_events table exists and has OCR stage entries
      // OCR successes are logged as guardrail_events with stage='ocr' and blocked=false
      const { data: ocr7d, error: ocr7dError } = await sb
        .from('guardrail_events')
        .select('id', { count: 'exact' })
        .eq('stage', 'ocr')
        .eq('blocked', false)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (ocr7dError) {
        warnings.push(`OCR 7d query failed: ${ocr7dError.message}`);
      } else {
        response.metrics.ocr.successes_last_7d = ocr7d?.length || 0;
      }

      const { data: ocr30d, error: ocr30dError } = await sb
        .from('guardrail_events')
        .select('id', { count: 'exact' })
        .eq('stage', 'ocr')
        .eq('blocked', false)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (ocr30dError) {
        warnings.push(`OCR 30d query failed: ${ocr30dError.message}`);
      } else {
        response.metrics.ocr.successes_last_30d = ocr30d?.length || 0;
      }

      // Average OCR duration (if logged in meta)
      // Note: This assumes duration is stored in meta.duration_ms
      const { data: ocrWithDuration, error: durationError } = await sb
        .from('guardrail_events')
        .select('meta')
        .eq('stage', 'ocr')
        .eq('blocked', false)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('meta->duration_ms', 'is', null);

      if (durationError) {
        warnings.push(`OCR duration query failed: ${durationError.message}`);
      } else if (ocrWithDuration && ocrWithDuration.length > 0) {
        const durations = ocrWithDuration
          .map((entry: any) => entry.meta?.duration_ms)
          .filter((d: any) => typeof d === 'number' && d > 0);

        if (durations.length > 0) {
          const sum = durations.reduce((a: number, b: number) => a + b, 0);
          response.metrics.ocr.avg_duration_ms = Math.round(sum / durations.length);
        }
      }
    } catch (ocrErr: any) {
      warnings.push(`OCR metrics error: ${ocrErr.message}`);
    }

    // ========================================================================
    // TRANSACTION METRICS
    // ========================================================================
    try {
      // Transactions saved in last 7 days
      const { data: tx7d, error: tx7dError } = await sb
        .from('transactions')
        .select('id', { count: 'exact' })
        .gte('created_at', sevenDaysAgo.toISOString());

      if (tx7dError) {
        warnings.push(`Transactions 7d query failed: ${tx7dError.message}`);
      } else {
        response.metrics.transactions.saved_last_7d = tx7d?.length || 0;
      }

      // Transactions saved in last 30 days
      const { data: tx30d, error: tx30dError } = await sb
        .from('transactions')
        .select('id', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (tx30dError) {
        warnings.push(`Transactions 30d query failed: ${tx30dError.message}`);
      } else {
        response.metrics.transactions.saved_last_30d = tx30d?.length || 0;
      }

      // Top categories (last 30 days)
      const { data: topCategories, error: categoriesError } = await sb
        .from('transactions')
        .select('category')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('category', 'is', null);

      if (categoriesError) {
        warnings.push(`Top categories query failed: ${categoriesError.message}`);
      } else if (topCategories && topCategories.length > 0) {
        // Group by category and count
        const categoryCounts: Record<string, number> = {};
        topCategories.forEach((tx: any) => {
          const cat = tx.category || 'Uncategorized';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        // Sort by count descending and take top 10
        response.metrics.transactions.top_categories = Object.entries(categoryCounts)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      }
    } catch (txErr: any) {
      warnings.push(`Transaction metrics error: ${txErr.message}`);
    }

    // Add warnings to response if any
    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (err: any) {
    console.error('[Metrics] Handler error:', err);
    
    warnings.push(`Unexpected error: ${err.message}`);
    response.warnings = warnings;

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  }
};


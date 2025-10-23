/**
 * Tag AI Transaction Categorization History Endpoint
 *
 * Operations:
 * - GET ?transaction_id=... → Get full version history for a transaction
 * - GET ?user_stats=true → Get user's categorization statistics
 * - GET ?recent=N → Get N most recent categorizations
 *
 * Features:
 * - Immutable version history (all changes tracked)
 * - Category change attribution (manual vs AI)
 * - Confidence tracking over time
 * - Correction analytics
 * - Audit trail with timestamps
 * - User-scoped RLS
 *
 * @example
 * GET /.netlify/functions/tag-tx-categ-history?transaction_id=txn-uuid
 * Response: {
 *   ok: true,
 *   history: [
 *     { version: 2, category_id: "...", source: "manual", confidence: 100, reason: "User correction", created_at: "..." },
 *     { version: 1, category_id: "...", source: "ai", confidence: 95, reason: "AI suggestion", created_at: "..." }
 *   ]
 * }
 *
 * GET /.netlify/functions/tag-tx-categ-history?user_stats=true
 * Response: {
 *   ok: true,
 *   stats: {
 *     total_categorizations: 500,
 *     auto_rate: 96.5,
 *     avg_confidence: 87.2,
 *     corrections_made: 23,
 *     rules_created: 8
 *   }
 * }
 *
 * GET /.netlify/functions/tag-tx-categ-history?recent=10
 * Response: { ok: true, recent: [...] }
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";
import { withGuardrails } from "./_shared/guardrails";

// ============================================================================
// SCHEMAS
// ============================================================================

const HistoryQuery = z.object({
  transaction_id: z.string().uuid().optional(),
  user_stats: z.string().optional(), // "true"
  recent: z.coerce.number().int().min(1).max(100).optional(),
  include_details: z.string().optional(), // "true" to join category names
});

type HistoryQuery = z.infer<typeof HistoryQuery>;

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET ?transaction_id=... → Transaction version history
 */
async function handleTransactionHistory(
  userId: string,
  transactionId: string,
  includeDetails: boolean
): Promise<{ statusCode: number; body: string }> {
  try {
    // Validate UUID
    if (!transactionId.match(/^[0-9a-f-]{36}$/i)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Invalid transaction ID",
        }),
      };
    }

    const { supabase } = serverSupabase();

    let queryBuilder = supabase
      .from("transaction_categorizations")
      .select("*, categories(name, slug)")
      .eq("transaction_id", transactionId)
      .eq("user_id", userId)
      .order("version", { ascending: false });

    const { data, error } = await queryBuilder;

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          ok: false,
          error: "Transaction not found or no categorization history",
        }),
      };
    }

    // Format response
    const history = data.map((row: any) => ({
      version: row.version,
      category_id: row.category_id,
      category_name: includeDetails ? row.categories?.name : undefined,
      source: row.source, // rule, ai, manual, default
      confidence: row.confidence, // 0-100
      reason: row.reason, // e.g., "Matched rule pattern"
      created_by: row.created_by, // null = AI, UUID = manual user
      created_at: row.created_at,
    }));

    safeLog("tag-tx-categ-history.transaction.success", {
      userId,
      transactionId,
      versions: history.length,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        transaction_id: transactionId,
        history,
        current_version: history[0].version,
        current_category: history[0].category_id,
      }),
    };
  } catch (err: any) {
    safeLog("tag-tx-categ-history.transaction.error", {
      userId,
      transactionId,
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to fetch transaction history",
      }),
    };
  }
}

/**
 * GET ?user_stats=true → User categorization statistics
 */
async function handleUserStats(userId: string): Promise<{ statusCode: number; body: string }> {
  try {
    const { supabase } = serverSupabase();

    // 1) Total categorizations
    const { data: txnCats, error: txnErr } = await supabase
      .from("transaction_categorizations")
      .select("source, confidence, version")
      .eq("user_id", userId)
      .eq("version", 1); // Latest version only

    if (txnErr) throw txnErr;

    // 2) Correction events
    const { data: corrections, error: corrErr } = await supabase
      .from("correction_events")
      .select("id, from_confidence")
      .eq("user_id", userId);

    if (corrErr) throw corrErr;

    // 3) User rules
    const { data: rules, error: rulesErr } = await supabase
      .from("category_rules")
      .select("id")
      .eq("user_id", userId)
      .eq("source", "user");

    if (rulesErr) throw rulesErr;

    // 4) Calculate stats
    const total = txnCats?.length || 0;
    const auto = txnCats?.filter((c: any) => c.source !== "manual").length || 0;
    const avgConfidence =
      total > 0
        ? Math.round(
            ((txnCats as any[])?.reduce((s: number, c: any) => s + (c.confidence || 0), 0) / total) *
              100
          ) / 100
        : 0;

    const stats = {
      total_categorizations: total,
      auto_categorizations: auto,
      manual_corrections: corrections?.length || 0,
      rules_created: rules?.length || 0,
      auto_rate_percent: total > 0 ? Math.round((auto / total) * 100 * 100) / 100 : 0,
      avg_confidence: avgConfidence,
      avg_confidence_percent: Math.round(avgConfidence * 10) / 10,
    };

    safeLog("tag-tx-categ-history.stats.success", {
      userId,
      stats: {
        total: stats.total_categorizations,
        autoRate: stats.auto_rate_percent,
        avgConfidence: stats.avg_confidence_percent,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        stats,
        period: "all-time",
      }),
    };
  } catch (err: any) {
    safeLog("tag-tx-categ-history.stats.error", {
      userId,
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to fetch user statistics",
      }),
    };
  }
}

/**
 * GET ?recent=N → Recent categorizations
 */
async function handleRecentCategorizations(
  userId: string,
  limit: number,
  includeDetails: boolean
): Promise<{ statusCode: number; body: string }> {
  try {
    const { supabase } = serverSupabase();

    // Get latest version of each transaction (most recent)
    const { data: recent, error } = await supabase.rpc("get_recent_categorizations", {
      p_user_id: userId,
      p_limit: limit,
    });

    if (error) throw error;

    safeLog("tag-tx-categ-history.recent.success", {
      userId,
      limit,
      count: recent?.length || 0,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        recent,
        count: recent?.length || 0,
      }),
    };
  } catch (err: any) {
    // If RPC doesn't exist, use fallback query
    try {
      const { supabase } = serverSupabase();

      const { data: fallback, error: fbErr } = await supabase
        .from("transaction_categorizations")
        .select(
          "transaction_id, category_id, source, confidence, created_at, version, categories(name)"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (fbErr) throw fbErr;

      // Filter to latest version only
      const versionMap = new Map();
      const latest = (fallback || []).filter((row: any) => {
        const key = row.transaction_id;
        if (!versionMap.has(key)) {
          versionMap.set(key, true);
          return true;
        }
        return false;
      });

      safeLog("tag-tx-categ-history.recent.fallback", {
        userId,
        limit,
        count: latest.length,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          recent: latest,
          count: latest.length,
        }),
      };
    } catch (fallbackErr: any) {
      safeLog("tag-tx-categ-history.recent.error", {
        userId,
        error: err?.message,
        fallbackError: fallbackErr?.message,
      });

      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: "Failed to fetch recent categorizations",
        }),
      };
    }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

const handler: Handler = async (event) => {
  // Guardrails
  const guardCheck = await withGuardrails({
    event,
    maxRequestSize: 1024,
    rateLimitPerMin: 120,
    requireAuth: true,
  });

  if (guardCheck.error) {
    return {
      statusCode: guardCheck.status,
      body: JSON.stringify({ ok: false, error: guardCheck.error }),
    };
  }

  const userId = guardCheck.userId;

  try {
    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        body: JSON.stringify({
          ok: false,
          error: "Method not allowed",
        }),
      };
    }

    // Parse query parameters
    const parsed = HistoryQuery.safeParse(event.queryStringParameters || {});

    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Invalid query parameters",
          details: parsed.error.flatten(),
        }),
      };
    }

    const { transaction_id, user_stats, recent, include_details } = parsed.data;
    const includeDetails = include_details === "true";

    // Route to handler
    if (transaction_id) {
      return await handleTransactionHistory(userId, transaction_id, includeDetails);
    }

    if (user_stats === "true") {
      return await handleUserStats(userId);
    }

    if (recent !== undefined) {
      return await handleRecentCategorizations(userId, recent, includeDetails);
    }

    // No query parameters provided
    return {
      statusCode: 400,
      body: JSON.stringify({
        ok: false,
        error: "Please provide one of: transaction_id, user_stats=true, or recent=N",
      }),
    };
  } catch (err: any) {
    safeLog("tag-tx-categ-history.error", {
      userId,
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Internal server error",
      }),
    };
  }
};

export { handler };






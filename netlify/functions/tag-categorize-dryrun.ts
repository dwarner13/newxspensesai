/**
 * Tag AI Categorization Dry-Run Function
 *
 * Preview-only endpoint for categorization suggestions.
 * Does NOT persist anything to database — purely for UI preview.
 *
 * Use cases:
 * 1. SmartImportAI preview before user approves
 * 2. Bulk re-categorization preview
 * 3. Rule testing & validation
 * 4. What-if analysis (test new rules)
 *
 * @example
 * POST /.netlify/functions/tag-categorize-dryrun
 * {
 *   "transactions": [
 *     { "id": "txn-1", "user_id": "user-1", "merchant_name": "AMZN.COM" }
 *   ]
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "preview": [
 *     {
 *       "transaction_id": "txn-1",
 *       "category_id": "cat-uuid",
 *       "category_name": "Shopping",
 *       "source": "rule",
 *       "confidence": 95,
 *       "reason": "Matched rule pattern"
 *     }
 *   ],
 *   "stats": {
 *     "total": 1,
 *     "with_category": 1,
 *     "avg_confidence": 95,
 *     "sources": { "rule": 1, "ai": 0, "default": 0 },
 *     "duration_ms": 120
 *   }
 * }
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";
import { resolveCategoryId } from "./_shared/categories";
import { trackFunctionPerformance } from "./_shared/metrics";
import { withGuardrails } from "./_shared/guardrails";

// ============================================================================
// SCHEMAS
// ============================================================================

const TransactionInput = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  merchant_name: z.string().min(1).max(255),
  amount: z.number().optional(),
  memo: z.string().optional(),
  posted_at: z.string().datetime().optional(),
});

const DryRunRequest = z.object({
  transactions: z.array(TransactionInput).min(1).max(200), // Larger batch allowed for preview
});

type TransactionInput = z.infer<typeof TransactionInput>;
type PreviewResult = {
  transaction_id: string;
  category_id: string | null;
  category_name: string;
  source: "rule" | "ai" | "default";
  confidence: number;
  reason?: string;
};

// ============================================================================
// CATEGORIZATION ENGINE (Placeholder - Replace with Real Logic)
// ============================================================================

/**
 * Hybrid categorization engine (same as tag-categorize)
 */
async function categorizeHybrid(params: {
  user_id: string;
  merchant_name: string;
  amount?: number;
  memo?: string;
  posted_at?: string;
}): Promise<{
  category: string;
  source: "rule" | "ai" | "default";
  confidence: number;
  reason?: string;
}> {
  const { user_id, merchant_name } = params;

  try {
    const { supabase } = serverSupabase();

    // 1) Try rules (ILIKE, regex patterns)
    const { data: ruleMatch, error: ruleErr } = await supabase
      .from("category_rules")
      .select("category_id, priority, match_type")
      .eq("user_id", user_id)
      .or(`user_id.is.null`)
      .order("priority", { ascending: true })
      .limit(1);

    if (!ruleErr && ruleMatch && ruleMatch.length > 0) {
      return {
        category: "Groceries", // TODO: fetch actual category name
        source: "rule",
        confidence: 95,
        reason: "Matched rule pattern",
      };
    }

    // 2) Try aliases
    const { data: aliasMatch } = await supabase
      .from("category_aliases")
      .select("category_id")
      .eq("user_id", user_id)
      .ilike("alias", `%${merchant_name}%`)
      .limit(1)
      .maybeSingle();

    if (aliasMatch) {
      return {
        category: "Shopping",
        source: "rule",
        confidence: 88,
        reason: "Matched alias",
      };
    }

    // 3) AI categorization
    const aiResult = await categorizeViaAI({
      user_id,
      merchant_name,
      amount: params.amount,
      memo: params.memo,
    });

    return aiResult;
  } catch (err: any) {
    safeLog("categorizeHybrid.error", {
      error: err?.message,
      merchant: merchant_name,
    });

    return {
      category: "Uncategorized",
      source: "default",
      confidence: 0,
      reason: "Fallback: categorization failed",
    };
  }
}

/**
 * AI categorization (Crystal or GPT-4 API)
 */
async function categorizeViaAI(params: {
  user_id: string;
  merchant_name: string;
  amount?: number;
  memo?: string;
}): Promise<{
  category: string;
  confidence: number;
  reason?: string;
}> {
  // TODO: Call Crystal 2.0 or OpenAI API
  return {
    category: "Shopping",
    confidence: 75,
    reason: "AI suggestion",
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

const handler: Handler = async (event) => {
  // Guardrails: rate limit, auth, input validation
  const guardCheck = await withGuardrails({
    event,
    maxRequestSize: 1024 * 200, // 200KB (larger for preview batch)
    rateLimitPerMin: 60, // More lenient than production
    requireAuth: true,
  });

  if (guardCheck.error) {
    return {
      statusCode: guardCheck.status,
      body: JSON.stringify({ ok: false, error: guardCheck.error }),
    };
  }

  const startTime = Date.now();

  try {
    // 1) Parse & validate input
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const parsed = DryRunRequest.safeParse(JSON.parse(event.body ?? "{}"));
    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Invalid input",
          details: parsed.error.flatten(),
        }),
      };
    }

    const { transactions } = parsed.data;
    const userId = guardCheck.userId;

    safeLog("tag-categorize-dryrun.start", {
      userId,
      transactionCount: transactions.length,
    });

    // 2) Batch preview (no persistence)
    const preview: PreviewResult[] = [];
    const sources: Record<string, number> = { rule: 0, ai: 0, default: 0 };
    let totalConfidence = 0;

    for (const txn of transactions) {
      try {
        // Run hybrid categorization
        const catResult = await trackFunctionPerformance(
          "categorizeHybrid",
          () =>
            categorizeHybrid({
              user_id: txn.user_id,
              merchant_name: txn.merchant_name,
              amount: txn.amount,
              memo: txn.memo,
              posted_at: txn.posted_at,
            }),
          { user_id: txn.user_id }
        );

        // Resolve category name → ID
        const categoryId = await resolveCategoryId(
          txn.user_id,
          catResult.category,
          "uncategorized"
        );

        // Track for stats
        sources[catResult.source] = (sources[catResult.source] || 0) + 1;
        totalConfidence += catResult.confidence;

        // Add to preview
        preview.push({
          transaction_id: txn.id,
          category_id: categoryId,
          category_name: catResult.category,
          source: catResult.source,
          confidence: Math.round(catResult.confidence),
          reason: catResult.reason,
        });

        safeLog("tag-categorize-dryrun.transaction_preview", {
          userId: txn.user_id,
          transactionId: txn.id,
          categoryName: catResult.category,
          source: catResult.source,
          confidence: Math.round(catResult.confidence),
        });
      } catch (txnErr: any) {
        safeLog("tag-categorize-dryrun.transaction_error", {
          userId: txn.user_id,
          transactionId: txn.id,
          error: txnErr?.message,
        });

        // Add uncategorized fallback
        sources["default"] = (sources["default"] || 0) + 1;
        preview.push({
          transaction_id: txn.id,
          category_id: null,
          category_name: "Uncategorized",
          source: "default",
          confidence: 0,
          reason: "Error during preview",
        });
      }
    }

    // 3) Compute stats
    const duration = Date.now() - startTime;
    const avgConfidence = preview.length > 0 ? totalConfidence / preview.length : 0;

    const stats = {
      total: preview.length,
      with_category: preview.filter((p) => p.category_id).length,
      avg_confidence: Math.round(avgConfidence),
      sources,
      duration_ms: duration,
      preview_only: true, // Flag: nothing persisted
    };

    safeLog("tag-categorize-dryrun.complete", {
      userId,
      transactionCount: transactions.length,
      previewCount: preview.length,
      avgConfidence: Math.round(avgConfidence),
      duration_ms: duration,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        preview,
        stats,
      }),
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;

    safeLog("tag-categorize-dryrun.error", {
      error: err?.message,
      stack: err?.stack?.split("\n")[0],
      duration_ms: duration,
    });

    // Guardrails: never leak PII or stack traces
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Dry-run preview failed",
      }),
    };
  }
};

export { handler };






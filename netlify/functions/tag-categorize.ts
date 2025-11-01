/**
 * Tag AI Categorization Function
 *
 * Orchestrates:
 * 1. Hybrid categorization (rules → AI fallback)
 * 2. Category resolution (name → ID)
 * 3. Immutable version history
 * 4. Model run tracking
 * 5. Metrics aggregation
 * 6. Audit logging
 *
 * Input: Array of transactions
 * Output: Categorization results with confidence
 *
 * @example
 * POST /.netlify/functions/tag-categorize
 * {
 *   "transactions": [
 *     { "id": "txn-1", "user_id": "user-123", "merchant_name": "AMZN.COM", "amount": -42.99 }
 *   ]
 * }
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";
import { resolveCategoryId } from "./_shared/categories";
import { bumpCategorizationMetrics, recordFunctionPerformance, trackFunctionPerformance } from "./_shared/metrics";
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

const CategorizeRequest = z.object({
  transactions: z.array(TransactionInput).min(1).max(100),
});

type TransactionInput = z.infer<typeof TransactionInput>;
type CategorizationResult = {
  transaction_id: string;
  category_id: string | null;
  category_name: string;
  source: "rule" | "ai" | "default";
  confidence: number;
  reason?: string;
  version: number;
};

// ============================================================================
// CATEGORIZATION ENGINE (Placeholder - Replace with Real Logic)
// ============================================================================

/**
 * Hybrid categorization engine
 *
 * Strategy:
 * 1. Check rules first (fast, reliable)
 * 2. If no rule matches, try aliases
 * 3. If still no match, use AI model
 * 4. If all fail, return default (Uncategorized)
 *
 * Real implementation should call your existing:
 * - dbCheckRules()
 * - dbCheckAliases()
 * - callCrystalAI() or OpenAI API
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
  model?: {
    name: string;
    latency_ms?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}> {
  const { user_id, merchant_name } = params;
  const startTime = Date.now();

  try {
    const { supabase } = serverSupabase();

    // 1) Try rules (ILIKE, regex patterns)
    const { data: ruleMatch, error: ruleErr } = await supabase
      .from("category_rules")
      .select("category_id, priority, match_type")
      .eq("user_id", user_id)
      .or(`user_id.is.null`)
      .order("priority", { ascending: true })
      .limit(10);

    if (!ruleErr && ruleMatch && ruleMatch.length > 0) {
      // In real implementation, test each rule pattern
      // For now, return first match
      return {
        category: "Groceries", // TODO: fetch actual category name
        source: "rule",
        confidence: 95,
        reason: "Matched rule pattern",
      };
    }

    // 2) Try aliases (normalized merchant names)
    const { data: aliasMatch, error: aliasErr } = await supabase
      .from("category_aliases")
      .select("category_id")
      .eq("user_id", user_id)
      .ilike("alias", `%${merchant_name}%`)
      .limit(1)
      .maybeSingle();

    if (!aliasErr && aliasMatch) {
      return {
        category: "Shopping",
        source: "rule",
        confidence: 88,
        reason: "Matched alias",
      };
    }

    // 3) AI categorization (Crystal or GPT-4)
    const aiResult = await categorizeViaAI({
      user_id,
      merchant_name,
      amount: params.amount,
      memo: params.memo,
    });

    const latency = Date.now() - startTime;
    safeLog("categorizeHybrid.ai_used", {
      user_id,
      merchant: merchant_name,
      latency_ms: latency,
    });

    return {
      ...aiResult,
      model: {
        name: "gpt-4-turbo",
        latency_ms: latency,
      },
    };
  } catch (err: any) {
    safeLog("categorizeHybrid.error", {
      error: err?.message,
      merchant: merchant_name,
    });

    // Default fallback
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
  // For now, return mock result
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
    maxRequestSize: 1024 * 100, // 100KB
    rateLimitPerMin: 100,
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

    const parsed = CategorizeRequest.safeParse(JSON.parse(event.body ?? "{}"));
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

    safeLog("tag-categorize.start", {
      userId,
      transactionCount: transactions.length,
    });

    // 2) Batch process transactions
    const results: CategorizationResult[] = [];
    const { supabase } = serverSupabase();

    for (const txn of transactions) {
      try {
        // 2a) Run hybrid categorization engine
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

        // 2b) Resolve category name → ID
        const categoryId = await resolveCategoryId(
          txn.user_id,
          catResult.category,
          "uncategorized"
        );

        if (!categoryId) {
          throw new Error(`Failed to resolve category: ${catResult.category}`);
        }

        // 2c) Compute next version (immutable history)
        const { data: verRow, error: verErr } = await supabase
          .from("transaction_categorizations")
          .select("version")
          .eq("transaction_id", txn.id)
          .eq("user_id", txn.user_id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (verErr) throw verErr;
        const nextVersion = (verRow?.version ?? 0) + 1;

        // 2d) Write immutable history row
        const { error: insertErr } = await supabase.from("transaction_categorizations").insert({
          transaction_id: txn.id,
          user_id: txn.user_id,
          category_id: categoryId,
          source: catResult.source,
          confidence: Math.round(catResult.confidence),
          reason: catResult.reason ?? null,
          version: nextVersion,
          created_by: null, // AI (null means automated)
        });

        if (insertErr) throw insertErr;

        // 2e) If AI was used, log model run & AI event
        if (catResult.source === "ai" && catResult.model) {
          const { data: modelRun, error: mrErr } = await supabase
            .from("model_runs")
            .insert({
              user_id: txn.user_id,
              model_name: catResult.model.name,
              latency_ms: catResult.model.latency_ms ?? null,
              input_tokens: catResult.model.input_tokens ?? null,
              output_tokens: catResult.model.output_tokens ?? null,
            })
            .select("id")
            .single();

          if (!mrErr && modelRun) {
            await supabase.from("ai_categorization_events").insert({
              user_id: txn.user_id,
              transaction_id: txn.id,
              model_run_id: modelRun.id,
              suggested_category_id: categoryId,
              confidence: Math.round(catResult.confidence),
              rationale: catResult.reason ?? null,
            });
          }
        }

        // 2f) Bump metrics
        await bumpCategorizationMetrics({
          user_id: txn.user_id,
          total_delta: 1,
          auto_delta: catResult.source !== "manual" ? 1 : 0,
          manual_delta: 0,
          avg_confidence_sample: catResult.confidence,
          rules_applied_delta: catResult.source === "rule" ? 1 : 0,
          aliases_matched_delta: catResult.source === "rule" ? 1 : 0,
        });

        // 2g) Collect result
        results.push({
          transaction_id: txn.id,
          category_id: categoryId,
          category_name: catResult.category,
          source: catResult.source,
          confidence: Math.round(catResult.confidence),
          reason: catResult.reason,
          version: nextVersion,
        });

        safeLog("tag-categorize.transaction_processed", {
          userId: txn.user_id,
          transactionId: txn.id,
          categoryName: catResult.category,
          source: catResult.source,
          confidence: Math.round(catResult.confidence),
        });
      } catch (txnErr: any) {
        safeLog("tag-categorize.transaction_error", {
          userId: txn.user_id,
          transactionId: txn.id,
          error: txnErr?.message,
        });

        // Continue with next transaction (graceful degradation)
        results.push({
          transaction_id: txn.id,
          category_id: null,
          category_name: "Uncategorized",
          source: "default",
          confidence: 0,
          reason: "Error during categorization",
          version: 0,
        });
      }
    }

    // 3) Record overall performance
    const duration = Date.now() - startTime;
    await recordFunctionPerformance({
      function_name: "tag-categorize",
      duration_ms: duration,
      user_id: userId,
      success: true,
      row_count: results.length,
    });

    safeLog("tag-categorize.complete", {
      userId,
      transactionCount: transactions.length,
      resultsCount: results.length,
      duration_ms: duration,
      avgTime_ms: Math.round(duration / transactions.length),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        results,
        stats: {
          total: results.length,
          with_category: results.filter((r) => r.category_id).length,
          avg_confidence: Math.round(
            results.reduce((s, r) => s + r.confidence, 0) / results.length
          ),
          duration_ms: duration,
        },
      }),
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;

    await recordFunctionPerformance({
      function_name: "tag-categorize",
      duration_ms: duration,
      user_id: guardCheck.userId,
      success: false,
      error_message: err?.message,
    });

    safeLog("tag-categorize.error", {
      error: err?.message,
      stack: err?.stack?.split("\n")[0],
    });

    // Guardrails: never leak PII or stack traces
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Categorization service temporarily unavailable",
      }),
    };
  }
};

export { handler };







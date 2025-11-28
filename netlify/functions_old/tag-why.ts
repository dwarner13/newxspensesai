import type { Handler } from "@netlify/functions";
import { supabaseAdmin } from "./_shared/supabase";

/**
 * GET /.netlify/functions/tag-why?transaction_id=<txId>
 * 
 * Explains why a transaction was categorized:
 * - Latest categorization decision (category, source, confidence, reason)
 * - Transaction details (merchant, amount, date, memo)
 * - AI rationale (if categorized by Tag AI)
 * - Actionable suggestions for user correction
 * 
 * Headers:
 *   x-user-id: required (user UUID)
 * 
 * Returns:
 * {
 *   "ok": true,
 *   "explanation": {
 *     "tx": { merchant_name, amount, posted_at, memo },
 *     "latest": { category_id, source, confidence, reason, version, decided_at },
 *     "ai": { confidence, rationale } | null,
 *     "suggestions": [string, ...]
 *   }
 * }
 */
export const handler: Handler = async (event) => {
  try {
    // Only GET allowed
    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: "Method Not Allowed" }),
      };
    }

    // Extract user and transaction ID
    const user_id = event.headers["x-user-id"] as string | undefined;
    const txId = event.queryStringParameters?.transaction_id;

    if (!user_id || !txId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Missing user_id or transaction_id" }),
      };
    }

    // 1. Get latest categorization decision (version history)
    const { data: latest, error: e1 } = await supabaseAdmin
      .from("transaction_categorizations")
      .select("category_id, source, confidence, reason, version, created_at")
      .eq("user_id", user_id)
      .eq("transaction_id", txId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (e1) throw e1;
    if (!latest) {
      return {
        statusCode: 404,
        body: JSON.stringify({ ok: false, error: "No categorization found" }),
      };
    }

    // 2. Get transaction basics (user-visible info only)
    const { data: tx, error: e2 } = await supabaseAdmin
      .from("transactions")
      .select("merchant_name, amount, posted_at, memo")
      .eq("id", txId)
      .eq("user_id", user_id)
      .single();

    if (e2) throw e2;
    if (!tx) {
      return {
        statusCode: 404,
        body: JSON.stringify({ ok: false, error: "Transaction not found" }),
      };
    }

    // 3. If AI was used, get the last AI event's rationale (explanation of why)
    const { data: ai, error: e3 } = await supabaseAdmin
      .from("ai_categorization_events")
      .select("confidence, rationale")
      .eq("user_id", user_id)
      .eq("transaction_id", txId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Ignore AI query error; it's optional enrichment
    if (e3) console.warn("Could not fetch AI rationale:", e3);

    // 4. Build safe, user-friendly explanation
    // (never leak sensitive PII beyond merchant/memo already visible)
    const explanation = {
      tx: {
        merchant_name: tx.merchant_name,
        amount: Number(tx.amount),
        posted_at: tx.posted_at,
        memo: tx.memo ?? null,
      },
      latest: {
        category_id: latest.category_id,
        source: latest.source, // "ai" | "manual" | "rule"
        confidence: Number(latest.confidence),
        reason: latest.reason ?? null, // optional short note from user/system
        version: latest.version,
        decided_at: latest.created_at,
      },
      ai: ai
        ? {
            confidence: Number(ai.confidence),
            rationale: ai.rationale ?? null,
          }
        : null,
      suggestions: [
        "If this is wrong, pick the correct category to teach Tag.",
        "Create a rule if this merchant should always map to a category.",
        "Set a default category in Merchant Profile for repeat mappings.",
      ],
    };

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, explanation }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[tag-why] Error:", msg);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Explain failed" }),
    };
  }
};

/**
 * Tag AI Categorization User Correction Handler
 *
 * Handles user category corrections and learns from them:
 * 1. Records correction event (audit trail)
 * 2. Writes new immutable version
 * 3. Auto-learns: creates/updates merchant profile
 * 4. Optional: creates simple pattern rule
 * 5. Updates metrics (manual_delta)
 *
 * Flow:
 * User sees AI suggestion (75% confidence) → Corrects to different category →
 * Correction recorded → New version written → Rule created if high-confidence
 *
 * @example
 * POST /.netlify/functions/tag-correction
 * {
 *   "transaction_id": "txn-uuid",
 *   "user_id": "user-uuid",
 *   "to_category_id": "cat-entertainment",
 *   "note": "This is entertainment, not shopping"
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "version": 2,
 *   "learned": {
 *     "merchant_profile_created": true,
 *     "rule_created": true,
 *     "rule_id": "rule-uuid"
 *   }
 * }
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";
import { bumpCategorizationMetrics, recordUserCorrection } from "./_shared/metrics";
import { withGuardrails } from "./_shared/guardrails";
import { v4 as uuid } from "uuid";

// ============================================================================
// SCHEMAS
// ============================================================================

const CorrectionRequest = z.object({
  transaction_id: z.string().uuid(),
  user_id: z.string().uuid(),
  to_category_id: z.string().uuid(),
  note: z.string().max(500).optional(),
});

type CorrectionRequest = z.infer<typeof CorrectionRequest>;

type CorrectionResponse = {
  ok: boolean;
  version: number;
  learned?: {
    merchant_profile_created: boolean;
    rule_created: boolean;
    rule_id?: string;
  };
  error?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

// Confidence threshold for auto-rule creation
const AUTO_RULE_CONFIDENCE_MIN = 75; // Only create rule if overriding high-confidence
const AUTO_RULE_PRIORITY = 50; // User rules have priority 50 (lower than system ~100)

// ============================================================================
// MAIN HANDLER
// ============================================================================

const handler: Handler = async (event) => {
  // Guardrails: rate limit, auth, input validation
  const guardCheck = await withGuardrails({
    event,
    maxRequestSize: 1024 * 2, // 2KB
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
      return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
    }

    const parsed = CorrectionRequest.safeParse(JSON.parse(event.body ?? "{}"));
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

    const { transaction_id, user_id, to_category_id, note } = parsed.data;
    const { supabase } = serverSupabase();

    safeLog("tag-correction.start", {
      userId: user_id,
      transactionId: transaction_id,
      toCategoryId: to_category_id,
    });

    // 2) Fetch last version (get old category + confidence)
    const { data: lastVer, error: verErr } = await supabase
      .from("transaction_categorizations")
      .select("version, category_id, confidence, source")
      .eq("transaction_id", transaction_id)
      .eq("user_id", user_id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verErr) throw verErr;

    const fromCategoryId = lastVer?.category_id ?? null;
    const oldConfidence = lastVer?.confidence ?? 0;
    const oldSource = lastVer?.source ?? "default";
    const nextVersion = (lastVer?.version ?? 0) + 1;

    // Check if user is actually changing the category
    if (fromCategoryId === to_category_id) {
      safeLog("tag-correction.no_change", {
        userId: user_id,
        transactionId: transaction_id,
        categoryId: to_category_id,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          version: lastVer?.version ?? 0,
          learned: {
            merchant_profile_created: false,
            rule_created: false,
          },
        }),
      };
    }

    // 3) Record correction event (audit)
    const correctionEventId = uuid();
    const { error: corrErr } = await supabase.from("correction_events").insert({
      id: correctionEventId,
      user_id,
      transaction_id,
      from_category_id: fromCategoryId,
      to_category_id,
      from_source: oldSource,
      from_confidence: oldConfidence,
      note: note ?? null,
      created_by: user_id,
      created_at: new Date().toISOString(),
    });

    if (corrErr) {
      safeLog("tag-correction.correction_event_error", {
        error: corrErr.message,
        userId: user_id,
        transactionId: transaction_id,
      });
      throw corrErr;
    }

    // 4) Write new immutable version (manual)
    const { error: verInsErr } = await supabase
      .from("transaction_categorizations")
      .insert({
        transaction_id,
        user_id,
        category_id: to_category_id,
        source: "manual",
        confidence: 100, // User is 100% sure
        reason: `User correction: ${oldSource} → manual${note ? ` (${note})` : ""}`,
        version: nextVersion,
        created_by: user_id,
      });

    if (verInsErr) throw verInsErr;

    // 5) Record metrics
    await recordUserCorrection({
      user_id,
      transaction_id,
      old_category_id: fromCategoryId,
      new_category_id: to_category_id,
      merchant_name: "", // Will fetch below if needed
      confidence_override_pct: oldConfidence,
      rule_created: false, // Will set to true if rule created
    });

    await bumpCategorizationMetrics({
      user_id,
      total_delta: 1,
      auto_delta: 0,
      manual_delta: 1,
      avg_confidence_sample: 100, // User correction is 100% confident
    });

    // 6) Fetch transaction details for learning
    const { data: txn, error: txErr } = await supabase
      .from("transactions")
      .select("merchant_name, vendor_raw, description")
      .eq("id", transaction_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (txErr) {
      safeLog("tag-correction.transaction_fetch_error", {
        error: txErr.message,
        transactionId: transaction_id,
      });
      // Continue without learning - not fatal
    }

    const merchantName = txn?.merchant_name || txn?.vendor_raw || "";
    let learnedRuleId: string | undefined;

    // 7) Auto-learn: Create merchant profile
    if (merchantName && txn) {
      const { error: mpErr } = await supabase
        .from("merchant_profiles")
        .upsert(
          {
            user_id,
            merchant_name: merchantName,
            default_category_id: to_category_id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,merchant_name" }
        );

      if (mpErr) {
        safeLog("tag-correction.merchant_profile_error", {
          error: mpErr.message,
          userId: user_id,
          merchant: merchantName,
        });
      }

      // 8) Auto-create rule if overriding high-confidence suggestion
      if (oldConfidence >= AUTO_RULE_CONFIDENCE_MIN && oldSource === "ai") {
        try {
          learnedRuleId = uuid();

          const { error: ruleErr } = await supabase
            .from("category_rules")
            .insert({
              id: learnedRuleId,
              user_id,
              merchant_pattern: `%${merchantName}%`, // Simple contains pattern
              category_id: to_category_id,
              priority: AUTO_RULE_PRIORITY,
              match_type: "ilike",
              source: "user", // User-created rule from correction
              confidence: oldConfidence, // Inherit from AI suggestion
              created_at: new Date().toISOString(),
            });

          if (ruleErr) {
            safeLog("tag-correction.rule_creation_error", {
              error: ruleErr.message,
              userId: user_id,
              merchant: merchantName,
            });
            learnedRuleId = undefined; // Failed to create
          } else {
            safeLog("tag-correction.rule_created", {
              userId: user_id,
              ruleId: learnedRuleId,
              merchant: merchantName,
              pattern: `%${merchantName}%`,
              categoryId: to_category_id,
              confidence: oldConfidence,
            });
          }
        } catch (ruleErr: any) {
          safeLog("tag-correction.rule_creation_exception", {
            error: ruleErr?.message,
            userId: user_id,
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    safeLog("tag-correction.complete", {
      userId: user_id,
      transactionId: transaction_id,
      version: nextVersion,
      ruleCreated: !!learnedRuleId,
      duration_ms: duration,
    });

    const response: CorrectionResponse = {
      ok: true,
      version: nextVersion,
      learned: {
        merchant_profile_created: !!merchantName,
        rule_created: !!learnedRuleId,
        rule_id: learnedRuleId,
      },
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;

    safeLog("tag-correction.error", {
      error: err?.message,
      stack: err?.stack?.split("\n")[0],
      duration_ms: duration,
    });

    // Guardrails: never leak PII or stack traces
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Correction failed",
      }),
    };
  }
};

export { handler };







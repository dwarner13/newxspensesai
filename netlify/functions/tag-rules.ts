/**
 * Tag AI Category Rules Management Endpoint
 *
 * Operations:
 * - GET  / → List all rules (user + system)
 * - POST / → Create new rule
 * - PATCH /{id} → Update rule (priority, pattern, category)
 * - DELETE /{id} → Delete rule
 *
 * Features:
 * - Pattern-based matching (ILIKE, regex)
 * - Priority system (lower = evaluate first)
 * - User + system rules
 * - Full CRUD with validation
 * - RLS enforcement
 * - Audit logging
 *
 * @example
 * GET /.netlify/functions/tag-rules?sort=priority
 * Response: { ok: true, rules: [...] }
 *
 * POST /.netlify/functions/tag-rules
 * {
 *   "merchant_pattern": "%AMAZON%",
 *   "category_id": "cat-uuid",
 *   "priority": 50,
 *   "match_type": "ilike"
 * }
 * Response: { ok: true, rule: {...} }
 *
 * PATCH /.netlify/functions/tag-rules/rule-uuid
 * {
 *   "priority": 40,
 *   "merchant_pattern": "%AMAZON PRIME%"
 * }
 *
 * DELETE /.netlify/functions/tag-rules/rule-uuid
 * Response: { ok: true, deleted: true }
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";
import { withGuardrails } from "./_shared/guardrails";
import { v4 as uuid } from "uuid";

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateRuleRequest = z.object({
  merchant_pattern: z.string().min(1).max(255),
  category_id: z.string().uuid(),
  priority: z.number().int().min(0).max(1000).default(100),
  match_type: z.enum(["ilike", "regex"]).default("ilike"),
});

const UpdateRuleRequest = z.object({
  merchant_pattern: z.string().min(1).max(255).optional(),
  category_id: z.string().uuid().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  match_type: z.enum(["ilike", "regex"]).optional(),
});

const ListRulesQuery = z.object({
  sort: z.enum(["priority", "name", "created_at"]).default("priority"),
  source: z.enum(["user", "system", "all"]).default("all"),
});

type CreateRuleRequest = z.infer<typeof CreateRuleRequest>;
type UpdateRuleRequest = z.infer<typeof UpdateRuleRequest>;
type ListRulesQuery = z.infer<typeof ListRulesQuery>;

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET / → List all rules
 */
async function handleListRules(
  userId: string,
  query?: Record<string, string>
): Promise<{ statusCode: number; body: string }> {
  try {
    const parsed = ListRulesQuery.safeParse(query || {});
    const { sort = "priority", source = "all" } = parsed.success ? parsed.data : {};

    const { supabase } = serverSupabase();

    let queryBuilder = supabase
      .from("category_rules")
      .select("cr.*, c.name as category_name")
      .leftJoin("categories", "cr.category_id", "c.id")
      .eq("cr.is_active", true);

    // Filter by source
    if (source === "user") {
      queryBuilder = queryBuilder.eq("cr.user_id", userId);
    } else if (source === "system") {
      queryBuilder = queryBuilder.is("cr.user_id", null);
    } else {
      // All: show user rules first, then system
      queryBuilder = queryBuilder.or(`cr.user_id.is.null,cr.user_id.eq.${userId}`);
    }

    // Sort
    const sortColumn = sort === "created_at" ? "created_at" : sort;
    queryBuilder = queryBuilder.order(sortColumn, { ascending: sort === "created_at" });

    const { data, error } = await queryBuilder;

    if (error) throw error;

    safeLog("tag-rules.list.success", {
      userId,
      count: data?.length || 0,
      sort,
      source,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        rules: data || [],
        count: data?.length || 0,
      }),
    };
  } catch (err: any) {
    safeLog("tag-rules.list.error", {
      userId,
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to fetch rules",
      }),
    };
  }
}

/**
 * POST / → Create new rule
 */
async function handleCreateRule(
  userId: string,
  body: string
): Promise<{ statusCode: number; body: string }> {
  try {
    const parsed = CreateRuleRequest.safeParse(JSON.parse(body || "{}"));

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

    const { merchant_pattern, category_id, priority, match_type } = parsed.data;
    const { supabase } = serverSupabase();

    // 1) Validate category exists
    const { data: cat, error: catErr } = await supabase
      .from("categories")
      .select("id")
      .eq("id", category_id)
      .eq("is_active", true)
      .maybeSingle();

    if (catErr || !cat) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Category not found",
        }),
      };
    }

    // 2) Validate regex pattern if needed
    if (match_type === "regex") {
      try {
        new RegExp(merchant_pattern);
      } catch (e: any) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: `Invalid regex pattern: ${e.message}`,
          }),
        };
      }
    }

    // 3) Check if similar rule exists
    const { data: existing, error: existErr } = await supabase
      .from("category_rules")
      .select("id")
      .eq("user_id", userId)
      .eq("merchant_pattern", merchant_pattern)
      .maybeSingle();

    if (existErr) throw existErr;

    if (existing) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          ok: false,
          error: `Rule with pattern "${merchant_pattern}" already exists`,
        }),
      };
    }

    // 4) Create rule
    const ruleId = uuid();
    const { data: newRule, error: createErr } = await supabase
      .from("category_rules")
      .insert({
        id: ruleId,
        user_id: userId,
        merchant_pattern,
        category_id,
        priority,
        match_type,
        source: "user",
        is_active: true,
      })
      .select("*")
      .single();

    if (createErr) throw createErr;

    safeLog("tag-rules.create.success", {
      userId,
      ruleId,
      pattern: merchant_pattern,
      categoryId: category_id,
      priority,
    });

    return {
      statusCode: 201,
      body: JSON.stringify({
        ok: true,
        rule: newRule,
      }),
    };
  } catch (err: any) {
    safeLog("tag-rules.create.error", {
      userId,
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to create rule",
      }),
    };
  }
}

/**
 * PATCH /{id} → Update rule
 */
async function handleUpdateRule(
  userId: string,
  ruleId: string,
  body: string
): Promise<{ statusCode: number; body: string }> {
  try {
    // Validate UUID
    if (!ruleId.match(/^[0-9a-f-]{36}$/i)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Invalid rule ID",
        }),
      };
    }

    const parsed = UpdateRuleRequest.safeParse(JSON.parse(body || "{}"));

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

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "No updates provided",
        }),
      };
    }

    const { supabase } = serverSupabase();

    // 1) Verify ownership
    const { data: rule, error: checkErr } = await supabase
      .from("category_rules")
      .select("id, user_id, merchant_pattern")
      .eq("id", ruleId)
      .maybeSingle();

    if (checkErr || !rule) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          ok: false,
          error: "Rule not found",
        }),
      };
    }

    if (rule.user_id !== userId) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          ok: false,
          error: "Not authorized to update this rule",
        }),
      };
    }

    // 2) Validate category if updating
    if (updates.category_id) {
      const { data: cat, error: catErr } = await supabase
        .from("categories")
        .select("id")
        .eq("id", updates.category_id)
        .eq("is_active", true)
        .maybeSingle();

      if (catErr || !cat) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: "Category not found",
          }),
        };
      }
    }

    // 3) Validate regex pattern if updating
    if (updates.match_type === "regex" && updates.merchant_pattern) {
      try {
        new RegExp(updates.merchant_pattern);
      } catch (e: any) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: `Invalid regex pattern: ${e.message}`,
          }),
        };
      }
    }

    // 4) Update rule
    const { data: updated, error: updateErr } = await supabase
      .from("category_rules")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    safeLog("tag-rules.update.success", {
      userId,
      ruleId,
      updates: Object.keys(updates),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        rule: updated,
      }),
    };
  } catch (err: any) {
    safeLog("tag-rules.update.error", {
      userId,
      ruleId,
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to update rule",
      }),
    };
  }
}

/**
 * DELETE /{id} → Delete rule
 */
async function handleDeleteRule(
  userId: string,
  ruleId: string
): Promise<{ statusCode: number; body: string }> {
  try {
    // Validate UUID
    if (!ruleId.match(/^[0-9a-f-]{36}$/i)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Invalid rule ID",
        }),
      };
    }

    const { supabase } = serverSupabase();

    // 1) Verify ownership
    const { data: rule, error: checkErr } = await supabase
      .from("category_rules")
      .select("id, user_id, merchant_pattern, is_active")
      .eq("id", ruleId)
      .maybeSingle();

    if (checkErr || !rule) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          ok: false,
          error: "Rule not found",
        }),
      };
    }

    if (rule.user_id !== userId) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          ok: false,
          error: "Not authorized to delete this rule",
        }),
      };
    }

    // 2) Soft delete (mark inactive)
    const { error: delErr } = await supabase
      .from("category_rules")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .eq("user_id", userId);

    if (delErr) throw delErr;

    safeLog("tag-rules.delete.success", {
      userId,
      ruleId,
      pattern: rule.merchant_pattern,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        deleted: true,
        pattern: rule.merchant_pattern,
      }),
    };
  } catch (err: any) {
    safeLog("tag-rules.delete.error", {
      userId,
      ruleId,
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to delete rule",
      }),
    };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

const handler: Handler = async (event) => {
  // Guardrails
  const guardCheck = await withGuardrails({
    event,
    maxRequestSize: 1024 * 2, // 2KB
    rateLimitPerMin: 60,
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
    // Parse path to extract operation
    const path = event.path || "";
    const pathSegments = path
      .split("/")
      .filter((s) => s && s !== ".netlify" && s !== "functions" && s !== "tag-rules");

    const ruleId = pathSegments[0]; // PATCH/DELETE /{id}

    // Route to handler
    if (event.httpMethod === "GET") {
      return await handleListRules(userId, event.queryStringParameters || undefined);
    }

    if (event.httpMethod === "POST") {
      return await handleCreateRule(userId, event.body || "");
    }

    if (event.httpMethod === "PATCH") {
      if (!ruleId) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: "Rule ID required for PATCH",
          }),
        };
      }
      return await handleUpdateRule(userId, ruleId, event.body || "");
    }

    if (event.httpMethod === "DELETE") {
      if (!ruleId) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: "Rule ID required for DELETE",
          }),
        };
      }
      return await handleDeleteRule(userId, ruleId);
    }

    // Unsupported method
    return {
      statusCode: 405,
      body: JSON.stringify({
        ok: false,
        error: "Method not allowed",
      }),
    };
  } catch (err: any) {
    safeLog("tag-rules.error", {
      userId,
      method: event.httpMethod,
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







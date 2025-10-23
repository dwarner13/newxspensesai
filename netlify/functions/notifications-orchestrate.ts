/**
 * POST /netlify/functions/notifications-orchestrate
 *
 * Orchestrate (delegate) actionable notifications to Prime.
 *
 * Groups notifications by context and creates a summary message
 * to Prime for decision/action.
 *
 * Body:
 *   - items: Notification[] (array of notifications to delegate)
 *
 * Headers:
 *   - Authorization: "Bearer <access_token>" (Supabase session token)
 *   - Content-Type: "application/json"
 *
 * Response:
 * {
 *   "ok": true,
 *   "orchestrated": number,
 *   "delegations": string[] (employee keys, usually ["prime-boss"]),
 *   "summary": string (summary message sent to Prime)
 * }
 *
 * @example
 * POST with {
 *   "items": [
 *     { "id": "n1", "employee": "crystal-analytics", "priority": "warning", "title": "Budget Alert", ... },
 *     { "id": "n2", "employee": "tag-categorizer", "priority": "critical", "title": "Errors", ... }
 *   ]
 * }
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { safeLog } from "./_shared/safeLog";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const NotificationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  employee: z.string(),
  priority: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  href: z.string().nullable(),
  payload: z.record(z.unknown()).nullable(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

const RequestBody = z.object({
  items: z.array(NotificationSchema).min(1),
});

type RequestBody = z.infer<typeof RequestBody>;
type Notification = z.infer<typeof NotificationSchema>;

interface OrchestrateResponse {
  ok: boolean;
  orchestrated?: number;
  delegations?: string[];
  summary?: string;
  error?: string;
}

// ============================================================================
// HELPER: Extract user_id from bearer token
// ============================================================================

async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || "",
      process.env.VITE_SUPABASE_ANON_KEY || ""
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user?.id) {
      return null;
    }

    return user.id;
  } catch (err) {
    return null;
  }
}

// ============================================================================
// HELPER: Build orchestration summary
// ============================================================================

function buildOrchestrationSummary(items: Notification[]): string {
  // Group by priority
  const byCriticality = {
    critical: items.filter((n) => n.priority === "critical"),
    warning: items.filter((n) => n.priority === "warning"),
    info: items.filter((n) => n.priority === "info"),
    success: items.filter((n) => n.priority === "success"),
  };

  // Group by employee
  const byEmployee: Record<string, Notification[]> = {};
  items.forEach((n) => {
    if (!byEmployee[n.employee]) {
      byEmployee[n.employee] = [];
    }
    byEmployee[n.employee].push(n);
  });

  let summary = "📋 **Orchestrated Notification Summary**\n\n";

  if (byCriticality.critical.length > 0) {
    summary += `🚨 **Critical (${byCriticality.critical.length})**\n`;
    byCriticality.critical.forEach((n) => {
      summary += `  • ${n.title}${n.description ? ": " + n.description : ""}\n`;
    });
    summary += "\n";
  }

  if (byCriticality.warning.length > 0) {
    summary += `⚠️ **Warnings (${byCriticality.warning.length})**\n`;
    byCriticality.warning.forEach((n) => {
      summary += `  • ${n.title}${n.description ? ": " + n.description : ""}\n`;
    });
    summary += "\n";
  }

  if (Object.keys(byEmployee).length > 0) {
    summary += `👥 **By Employee**\n`;
    Object.entries(byEmployee).forEach(([emp, notes]) => {
      summary += `  • ${emp}: ${notes.length} notification${notes.length > 1 ? "s" : ""}\n`;
    });
  }

  return summary;
}

// ============================================================================
// HANDLER
// ============================================================================

export const handler: Handler = async (event) => {
  try {
    // Verify method
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: "Method Not Allowed" }),
      };
    }

    // Extract and verify bearer token
    const authHeader = event.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: "Missing authorization token" }),
      };
    }

    const user_id = await getUserIdFromToken(token);
    if (!user_id) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: "Invalid token" }),
      };
    }

    // Parse body
    const body = JSON.parse(event.body || "{}");
    const parsed = RequestBody.safeParse(body);

    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Invalid request body",
          details: parsed.error.flatten(),
        }),
      };
    }

    const { items } = parsed.data;

    // Verify all items belong to this user
    const unauthorized = items.filter((n) => n.user_id !== user_id);
    if (unauthorized.length > 0) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          ok: false,
          error: "Unauthorized: some notifications do not belong to this user",
        }),
      };
    }

    // Build summary
    const summary = buildOrchestrationSummary(items);

    // Initialize Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    );

    // Create a handoff/delegation record (optional, for audit trail)
    // This could integrate with Prime's inbox or a delegation table
    const handoffPayload = {
      user_id,
      from_employee: "system",
      to_employee: "prime-boss",
      message: summary,
      notification_ids: items.map((n) => n.id),
      metadata: {
        total_items: items.length,
        by_priority: {
          critical: items.filter((n) => n.priority === "critical").length,
          warning: items.filter((n) => n.priority === "warning").length,
          info: items.filter((n) => n.priority === "info").length,
          success: items.filter((n) => n.priority === "success").length,
        },
        by_employee: items.reduce(
          (acc, n) => {
            acc[n.employee] = (acc[n.employee] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      created_at: new Date().toISOString(),
    };

    // Insert handoff record (if table exists)
    try {
      const { error: handoffError } = await supabase
        .from("chat_handoffs")
        .insert([handoffPayload]);

      if (handoffError) {
        safeLog("notifications-orchestrate.handoff_insert_warning", {
          error: handoffError.message,
          user_id,
        });
      }
    } catch (err: any) {
      safeLog("notifications-orchestrate.handoff_insert_error", {
        error: err?.message,
        user_id,
      });
    }

    safeLog("notifications-orchestrate.success", {
      user_id,
      orchestrated: items.length,
      delegations: ["prime-boss"],
    });

    const response: OrchestrateResponse = {
      ok: true,
      orchestrated: items.length,
      delegations: ["prime-boss"],
      summary,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (err: any) {
    safeLog("notifications-orchestrate.error", {
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to orchestrate notifications",
      }),
    };
  }
};






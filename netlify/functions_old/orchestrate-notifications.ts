/**
 * Orchestrate Notifications to Prime
 * 
 * POST /.netlify/functions/orchestrate-notifications
 * 
 * Batch-sends multiple notifications to Prime as a single summarized instruction.
 * Prime will delegate to appropriate specialists (Byte, Crystal, Tag, etc.) and report results.
 * 
 * Body:
 * {
 *   items: [
 *     { id: string, employee_slug: string, title: string, payload?: any },
 *     ...
 *   ]
 * }
 * 
 * Returns:
 * { ok: true, handoffId: string, itemsProcessed: number }
 * 
 * Authentication: Bearer token in Authorization header (uses RLS)
 */

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const NETLIFY_URL = process.env.URL || "";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const NotificationItemSchema = z.object({
  id: z.string().uuid(),
  employee_slug: z.string().min(1),
  title: z.string().min(1),
  payload: z.any().optional(),
});

const RequestBodySchema = z.object({
  items: z.array(NotificationItemSchema).min(1),
});

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const handler: Handler = async (event) => {
  try {
    // Only POST allowed
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method not allowed",
      };
    }

    // Extract access token
    const accessToken = event.headers.authorization?.replace("Bearer ", "");
    if (!accessToken) {
      return {
        statusCode: 401,
        body: "Missing Authorization bearer token",
      };
    }

    // Create Supabase client with user's token (RLS enforced)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    // Verify user is authenticated
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      return {
        statusCode: 401,
        body: "Unauthenticated",
      };
    }

    // Parse and validate request body
    const body = RequestBodySchema.parse(
      event.body ? JSON.parse(event.body) : {}
    );

    if (body.items.length === 0) {
      return {
        statusCode: 400,
        body: "items array cannot be empty",
      };
    }

    // 1) Build summary of all items for Prime
    const employeeLabel: Record<string, string> = {
      "byte-docs": "Byte",
      "crystal-analytics": "Crystal",
      "tag-ai": "Tag",
      "prime-boss": "Prime",
      "ledger-tax": "Ledger",
      "goalie-agent": "Goalie",
    };

    const summary = body.items
      .map((item) => {
        const label = employeeLabel[item.employee_slug] || item.employee_slug;
        const payloadStr = item.payload
          ? ` (${JSON.stringify(item.payload)})`
          : "";
        return `• [${label}] ${item.title}${payloadStr}`;
      })
      .join("\n");

    console.log("[orchestrate-notifications] Batch items:", {
      userId,
      itemCount: body.items.length,
      summary,
    });

    // 2) Send to Prime via chat endpoint
    const chatUrl = `${NETLIFY_URL}/.netlify/functions/chat`;
    const chatRes = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content:
              `Prime, I have a batch of ${body.items.length} task(s) that need your attention. ` +
              `Please handle them autonomously, delegating to Byte, Crystal, Tag, Ledger, or Goalie as appropriate, ` +
              `and report a summary of actions taken:\n\n${summary}`,
          },
        ],
        employeeSlug: "prime-boss", // Explicitly route to Prime
      }),
    });

    if (!chatRes.ok) {
      const errText = await chatRes.text();
      console.error("[orchestrate-notifications] Chat endpoint failed:", {
        status: chatRes.status,
        error: errText,
      });
      throw new Error(`Chat endpoint returned ${chatRes.status}: ${errText}`);
    }

    const chatData = await chatRes.json();
    const handoffId = chatData.id || chatData.messageId || "unknown";

    // 3) Mark all notifications as read (best-effort, RLS enforced)
    const notificationIds = body.items.map((i) => i.id);
    await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .in("id", notificationIds)
      .catch((err) => {
        console.warn("[orchestrate-notifications] Failed to mark as read:", err);
        // Non-fatal
      });

    // 4) Log audit trail (best-effort, RLS enforced)
    await supabase
      .from("notification_actions")
      .insert({
        notification_id: notificationIds[0],
        action_type: "batch_orchestrated_to_prime",
        action_data: {
          count: notificationIds.length,
          handoffId,
          itemIds: notificationIds,
        },
      })
      .catch((err) => {
        console.warn("[orchestrate-notifications] Failed to log action:", err);
        // Non-fatal
      });

    console.log("[orchestrate-notifications] Success:", {
      userId,
      itemCount: body.items.length,
      handoffId,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        handoffId,
        itemsProcessed: body.items.length,
      }),
    };
  } catch (err: any) {
    console.error("[orchestrate-notifications] Error:", err);
    return {
      statusCode: err?.status || 500,
      body: err?.message ?? "Server error",
    };
  }
};







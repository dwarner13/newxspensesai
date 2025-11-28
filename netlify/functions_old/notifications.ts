/**
 * Notifications API endpoints (Netlify Functions)
 *
 * GET /.netlify/functions/notifications
 *   Fetch user's notifications (pageable, filterable)
 *   Query: ?page=1&limit=50&unreadOnly=false
 *   Returns: { items: [], pagination: { page, limit, total, pages } }
 *
 * POST /.netlify/functions/notifications/read
 *   Mark single or all notifications as read
 *   Body: { id?: string } or { all: true }
 *   Returns: { ok: true }
 *
 * POST /.netlify/functions/notifications/have-prime-handle
 *   Send notifications to Prime for orchestration
 *   Body: { notificationIds: [uuid, ...] }
 *   Returns: { ok: true, handoffId, marked_read }
 *
 * All endpoints use RLS: Pass user's JWT access token in Authorization header
 * RLS automatically enforces user_id = auth.uid()
 */

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const GetQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default("1"),
  limit: z.string().regex(/^\d+$/).optional().default("50"),
  unreadOnly: z.string().regex(/^(true|false)$/).optional().default("false"),
});

const MarkReadBodySchema = z.object({
  id: z.string().uuid().optional(),
  all: z.boolean().optional(),
});

const HavePrimeHandleBodySchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1),
});

// ============================================================================
// GET HANDLER
// ============================================================================

async function handleGetNotifications(
  event: any,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const query = GetQuerySchema.parse(event.queryStringParameters || {});
    const page = parseInt(query.page);
    const limit = parseInt(query.limit);
    const unreadOnly = query.unreadOnly === "true";
    const offset = (page - 1) * limit;

    // Build query — RLS auto-filters by user_id = auth.uid()
    let q = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (unreadOnly) {
      q = q.eq("read", false);
    }

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      }),
    };
  } catch (err: any) {
    console.error("[notifications.get]", err);
    return {
      statusCode: err?.status || 400,
      body: err?.message || "Failed to fetch notifications",
    };
  }
}

// ============================================================================
// POST HANDLERS
// ============================================================================

async function handleMarkRead(
  event: any,
  supabase: ReturnType<typeof createClient>,
  userIdText: string
) {
  try {
    const body = MarkReadBodySchema.parse(
      event.body ? JSON.parse(event.body) : {}
    );

    if (body.all) {
      // Mark all unread as read for this user (RLS enforced)
      const { error } = await supabase.rpc("mark_all_notifications_read", {
        p_user_id: userIdText,
      });

      if (error) throw error;
    } else if (body.id) {
      // Mark single as read (RLS enforced)
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", body.id);

      if (error) throw error;
    } else {
      return {
        statusCode: 400,
        body: "Provide { id } or { all: true }",
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err: any) {
    console.error("[notifications.mark-read]", err);
    return {
      statusCode: err?.status || 500,
      body: err?.message ?? "Server error",
    };
  }
}

async function handleHavePrimeHandle(
  event: any,
  supabase: ReturnType<typeof createClient>,
  accessToken: string
) {
  try {
    const body = HavePrimeHandleBodySchema.parse(
      event.body ? JSON.parse(event.body) : {}
    );

    // 1) Fetch notifications for this user (RLS enforced)
    const { data: notifications, error: fetchErr } = await supabase
      .from("notifications")
      .select("*")
      .in("id", body.notificationIds);

    if (fetchErr) throw fetchErr;

    if (!notifications || notifications.length === 0) {
      return {
        statusCode: 404,
        body: "No notifications found",
      };
    }

    // 2) Build summary for Prime
    const employeeLabel: Record<string, string> = {
      "byte-docs": "Byte",
      "crystal-analytics": "Crystal",
      "tag-ai": "Tag",
      "prime-boss": "Prime",
      "ledger-tax": "Ledger",
      "goalie-agent": "Goalie",
    };

    const summary = notifications
      .map(
        (n: any) =>
          `• [${employeeLabel[n.employee_slug] || n.employee_slug}] ${n.title}`
      )
      .join("\n");

    // 3) Send to Prime via chat endpoint
    const chatRes = await fetch(
      `${process.env.VITE_CHAT_FUNCTION_PATH || "/.netlify/functions/chat"}`,
      {
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
                `Prime, I have some notifications I need your help with. ` +
                `Please review and take appropriate action if needed:\n\n${summary}`,
            },
          ],
        }),
      }
    );

    if (!chatRes.ok) {
      throw new Error(`Chat endpoint returned ${chatRes.status}`);
    }

    const chatData = await chatRes.json();

    // 4) Mark notifications as read (RLS enforced)
    await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .in("id", body.notificationIds)
      .catch(() => {
        // Non-fatal if mark fails
      });

    // 5) Log action for audit trail (RLS enforced)
    await supabase
      .from("notification_actions")
      .insert({
        notification_id: body.notificationIds[0],
        action_type: "orchestrated_to_prime",
        action_data: {
          count: body.notificationIds.length,
          chatHandoffId: chatData.handoffId,
        },
      })
      .catch(() => {
        // Non-fatal if audit log fails
      });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        handoffId: chatData.handoffId,
        marked_read: body.notificationIds.length,
      }),
    };
  } catch (err: any) {
    console.error("[notifications.have-prime-handle]", err);
    return {
      statusCode: err?.status || 500,
      body: err?.message ?? "Server error",
    };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: "",
    };
  }

  // Extract access token from Authorization header
  const accessToken = event.headers.authorization?.replace("Bearer ", "");

  if (!accessToken) {
    return {
      statusCode: 401,
      body: "Missing Authorization bearer token",
    };
  }

  // Create Supabase client with user's access token
  // RLS policies will automatically enforce user_id = auth.uid()
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  // Verify user is authenticated
  try {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user?.id) {
      return {
        statusCode: 401,
        body: "Invalid or expired token",
      };
    }
  } catch (e: any) {
    return {
      statusCode: 401,
      body: e.message ?? "Auth failed",
    };
  }

  // Route handlers
  if (event.httpMethod === "GET") {
    return handleGetNotifications(event, supabase);
  }

  if (event.httpMethod === "POST") {
    const path = event.path || "";

    if (path.includes("/read")) {
      return handleMarkRead(event, supabase, authData.user!.id);
    }

    if (path.includes("/have-prime-handle")) {
      return handleHavePrimeHandle(event, supabase, accessToken);
    }

    return {
      statusCode: 404,
      body: "Unknown POST endpoint",
    };
  }

  return {
    statusCode: 405,
    body: "Method not allowed",
  };
};

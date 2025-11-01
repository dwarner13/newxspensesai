/**
 * POST /netlify/functions/notifications-read
 *
 * Mark notifications as read.
 *
 * Body:
 *   - id?: string (mark single notification as read)
 *   - all?: boolean (mark all notifications as read for user)
 *
 * Headers:
 *   - Authorization: "Bearer <access_token>" (Supabase session token)
 *   - Content-Type: "application/json"
 *
 * Response:
 * {
 *   "ok": true,
 *   "updated": number (count of notifications marked as read)
 * }
 *
 * @example
 * // Mark single as read
 * POST with { "id": "notif-123" }
 *
 * // Mark all as read
 * POST with { "all": true }
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { safeLog } from "./_shared/safeLog";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const RequestBody = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

type RequestBody = z.infer<typeof RequestBody>;

interface MarkReadResponse {
  ok: boolean;
  updated?: number;
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

    const { id, all } = parsed.data;

    // Validate: must provide either id or all
    if (!id && !all) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Must provide either 'id' or 'all: true'",
        }),
      };
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    );

    const now = new Date().toISOString();
    let updated = 0;

    if (all) {
      // Mark all unread notifications as read for this user
      const { error, count } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("user_id", user_id)
        .is("read_at", null); // Only unread

      if (error) {
        safeLog("notifications-read.mark_all_error", {
          error: error.message,
          user_id,
        });
        throw new Error(error.message);
      }

      updated = count || 0;

      safeLog("notifications-read.mark_all_success", {
        user_id,
        updated,
      });
    } else if (id) {
      // Mark specific notification as read
      // First, verify it belongs to this user
      const { data: notification, error: fetchError } = await supabase
        .from("notifications")
        .select("user_id")
        .eq("id", id)
        .single();

      if (fetchError || !notification) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            ok: false,
            error: "Notification not found",
          }),
        };
      }

      if (notification.user_id !== user_id) {
        return {
          statusCode: 403,
          body: JSON.stringify({
            ok: false,
            error: "Unauthorized",
          }),
        };
      }

      // Update it
      const { error, count } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", id);

      if (error) {
        safeLog("notifications-read.mark_one_error", {
          error: error.message,
          user_id,
          id,
        });
        throw new Error(error.message);
      }

      updated = count || 0;

      safeLog("notifications-read.mark_one_success", {
        user_id,
        id,
        updated,
      });
    }

    const response: MarkReadResponse = {
      ok: true,
      updated,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (err: any) {
    safeLog("notifications-read.error", {
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to mark notifications as read",
      }),
    };
  }
};







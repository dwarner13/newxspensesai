/**
 * GET /netlify/functions/notifications-get
 *
 * Fetch notifications for authenticated user with optional filtering.
 *
 * Query Parameters:
 *   - employee?: string (e.g., "prime-boss", "crystal-analytics")
 *   - priority?: string (e.g., "critical", "warning", "info", "success")
 *   - read?: "true" | "false" (true=read only, false=unread only)
 *   - limit?: number (default 50, max 200)
 *   - offset?: number (default 0)
 *
 * Headers:
 *   - Authorization: "Bearer <access_token>" (Supabase session token)
 *
 * Response:
 * {
 *   "ok": true,
 *   "items": [Notification[], ...],
 *   "unreadCount": number,
 *   "total": number
 * }
 *
 * @example
 * GET /.netlify/functions/notifications-get?employee=crystal-analytics&read=false&limit=20
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { safeLog } from "./_shared/safeLog";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const QueryParams = z.object({
  employee: z.string().optional(),
  priority: z.enum(["success", "info", "warning", "critical"]).optional(),
  read: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      return v === "true";
    }),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

type QueryParams = z.infer<typeof QueryParams>;

interface Notification {
  id: string;
  user_id: string;
  employee: string;
  priority: string;
  title: string;
  description: string | null;
  href: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationsResponse {
  ok: boolean;
  items?: Notification[];
  unreadCount?: number;
  total?: number;
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
    if (event.httpMethod !== "GET") {
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

    // Parse query parameters
    const queryObject = Object.fromEntries(
      new URL(`http://localhost${event.rawUrl}`).searchParams.entries()
    );

    const parsed = QueryParams.safeParse(queryObject);
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

    const { employee, priority, read, limit, offset } = parsed.data;

    // Initialize Supabase with service role for RLS bypass (optional, or use token)
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    );

    // Build query
    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    // Apply filters
    if (employee) {
      query = query.eq("employee", employee);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    if (read === true) {
      // Read only: read_at is not null
      query = query.not("read_at", "is", null);
    } else if (read === false) {
      // Unread only: read_at is null
      query = query.is("read_at", null);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data, count, error } = await query;

    if (error) {
      safeLog("notifications-get.query_error", {
        error: error.message,
        user_id,
      });
      throw new Error(error.message);
    }

    // Count unread
    const unreadQuery = supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id)
      .is("read_at", null);

    const { count: unreadCount, error: unreadError } = await unreadQuery;

    if (unreadError) {
      safeLog("notifications-get.unread_count_error", {
        error: unreadError.message,
        user_id,
      });
    }

    const response: NotificationsResponse = {
      ok: true,
      items: (data || []) as Notification[],
      unreadCount: unreadCount || 0,
      total: count || 0,
    };

    safeLog("notifications-get.success", {
      user_id,
      count: data?.length || 0,
      total: count,
      unreadCount: unreadCount || 0,
      filters: { employee, priority, read },
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (err: any) {
    safeLog("notifications-get.error", {
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to fetch notifications",
      }),
    };
  }
};







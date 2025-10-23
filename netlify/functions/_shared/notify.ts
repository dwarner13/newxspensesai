/**
 * Server-side notification helper for Netlify functions
 *
 * Usage in Netlify functions:
 * import { notify } from "./_shared/notify";
 *
 * await notify({
 *   userId: user.id,
 *   employee: "crystal-analytics",
 *   priority: "action",
 *   title: "Analysis complete",
 *   description: "Your import is ready for review",
 *   href: "/smart-import",
 *   payload: { importId },
 * });
 */

import { serverSupabase } from "./supabase";
import { safeLog } from "./safeLog";

export type NotifyPriority = "info" | "warning" | "action" | "urgent";

export type NotifyEmployeeSlug =
  | "byte-docs"
  | "crystal-analytics"
  | "tag-ai"
  | "prime-boss"
  | "ledger-tax"
  | "goalie-agent";

export interface ServerNotifyOptions {
  userId: string;
  employee: NotifyEmployeeSlug;
  priority: NotifyPriority;
  title: string;
  description?: string;
  href?: string;
  payload?: Record<string, any>;
}

export interface NotifyResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Server-side notify using service role key
 * Does NOT enforce RLS (server function has full access)
 * Returns notification ID if successful
 */
export async function notify(
  opts: ServerNotifyOptions
): Promise<NotifyResult> {
  try {
    // Validate required fields
    if (!opts.userId || !opts.employee || !opts.priority || !opts.title) {
      safeLog("notify.validation-error", {
        missing: Object.keys(opts).filter(
          (k) => !opts[k as keyof ServerNotifyOptions]
        ),
      });
      return {
        ok: false,
        error: "Missing required fields (userId, employee, priority, title)",
      };
    }

    const { supabase } = serverSupabase();

    // Insert notification (service role key = full access, no RLS)
    const { data, error } = await supabase.from("notifications").insert({
      user_id: opts.userId,
      employee_slug: opts.employee,
      priority: opts.priority,
      title: opts.title,
      description: opts.description || null,
      href: opts.href || null,
      payload: opts.payload || null,
      read: false,
    });

    if (error) {
      safeLog("notify.insert-error", {
        employee: opts.employee,
        title: opts.title,
        error: error.message,
      });
      return { ok: false, error: error.message };
    }

    const id = data?.[0]?.id;
    safeLog("notify.success", {
      employee: opts.employee,
      title: opts.title,
      id,
    });

    return { ok: true, id };
  } catch (err: any) {
    safeLog("notify.error", {
      error: err?.message,
      employee: opts.employee,
    });
    return { ok: false, error: err?.message ?? "Unknown error" };
  }
}

/**
 * Batch send notifications from server
 */
export async function notifyBatch(
  items: ServerNotifyOptions[]
): Promise<NotifyResult> {
  try {
    if (!items.length) {
      return { ok: false, error: "No items to notify" };
    }

    const { supabase } = serverSupabase();

    const records = items.map((opts) => ({
      user_id: opts.userId,
      employee_slug: opts.employee,
      priority: opts.priority,
      title: opts.title,
      description: opts.description || null,
      href: opts.href || null,
      payload: opts.payload || null,
      read: false,
    }));

    const { data, error } = await supabase
      .from("notifications")
      .insert(records);

    if (error) {
      safeLog("notifyBatch.error", { count: items.length, error: error.message });
      return { ok: false, error: error.message };
    }

    safeLog("notifyBatch.success", { count: items.length });
    return { ok: true };
  } catch (err: any) {
    safeLog("notifyBatch.error", { error: err?.message });
    return { ok: false, error: err?.message ?? "Unknown error" };
  }
}


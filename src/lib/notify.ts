/**
 * Client-Side Notification Helper
 *
 * High-level API for creating notifications from the client.
 * Automatically handles user ID, timestamps, and Supabase RLS.
 *
 * Features:
 * - Type-safe notification creation
 * - Auto-user-id from auth context
 * - Optional deep linking (href)
 * - Priority levels (success, info, warning, critical)
 * - Employee tagging (prime-boss, crystal-analytics, byte-docs, etc.)
 * - Metadata payload for complex data
 * - Automatic timestamp
 * - Error logging + retry
 *
 * @example
 * import { notify } from "@/lib/notify";
 *
 * // Crystal insight notification
 * await notify({
 *   employee: "crystal-analytics",
 *   priority: "info",
 *   title: "Spending Spike",
 *   description: "Dining up 28% WoW",
 *   href: "/analytics?insight=spike-dining",
 *   payload: { category: "Dining", delta: 0.28 }
 * });
 *
 * // Prime task completion
 * await notify({
 *   employee: "prime-boss",
 *   priority: "success",
 *   title: "Maintenance Complete",
 *   description: "Rules sync and index refresh finished."
 * });
 */

import { useAuth } from "@/contexts/AuthContext";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Notification Priority Levels
 *
 * - "success" — Task completed successfully (green badge)
 * - "info" — Informational message (blue badge)
 * - "warning" — Warning or alert (yellow badge)
 * - "critical" — Urgent action required (red badge)
 */
export type NotificationPriority = "success" | "info" | "warning" | "critical";

export type EmployeeKey =
  | "prime-boss"
  | "crystal-analytics"
  | "byte-docs"
  | "tag-categorizer"
  | "ledger-tax"
  | "goalie-agent";

export interface NotifyParams {
  // From client
  employee?: EmployeeKey; // optional, defaults to "prime-boss"
  priority?: NotificationPriority; // optional, defaults to "info"
  title: string; // required, max 255
  description?: string; // optional, max 1000
  href?: string; // optional deep link
  payload?: Record<string, unknown>; // optional metadata
  // Auto-filled by helper
  userId?: string; // auto-filled from auth if not provided
}

export interface NotifyResponse {
  ok: boolean;
  id?: string; // notification ID if success
  error?: string;
}

// ============================================================================
// CLIENT HELPER
// ============================================================================

/**
 * Create a notification from the client
 *
 * Uses Supabase client with RLS; user_id is auto-populated from auth context.
 *
 * @param params - Notification parameters
 * @returns { ok: boolean, id?: string, error?: string }
 *
 * @example
 * const result = await notify({
 *   employee: "crystal-analytics",
 *   priority: "warning",
 *   title: "Budget Alert",
 *   description: "Dining category exceeded monthly budget",
 *   href: "/budgets/dining"
 * });
 *
 * if (result.ok) console.log(`Notification created: ${result.id}`);
 * else console.error(`Failed: ${result.error}`);
 */
export async function notify(params: NotifyParams): Promise<NotifyResponse> {
  try {
    // Validate required fields
    if (!params.title || params.title.trim().length === 0) {
      return { ok: false, error: "title is required" };
    }

    if (params.title.length > 255) {
      return { ok: false, error: "title must be ≤255 characters" };
    }

    if (params.description && params.description.length > 1000) {
      return { ok: false, error: "description must be ≤1000 characters" };
    }

    // Build payload
    const body: Record<string, unknown> = {
      employee: params.employee || "prime-boss",
      priority: params.priority || "info",
      title: params.title.trim(),
      description: params.description?.trim() || null,
      href: params.href || null,
      payload: params.payload || null,
      read_at: null, // new notification is unread
      created_at: new Date().toISOString(),
    };

    // If userId provided, include it; otherwise let RLS handle it
    if (params.userId) {
      body.user_id = params.userId;
    }

    // Call endpoint (uses Supabase client with RLS)
    const resp = await fetch("/.netlify/functions/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Don't include auth token here; browser will auto-attach via Supabase client
      },
      body: JSON.stringify(body),
    }).then((r) => r.json());

    if (!resp.ok) {
      console.warn("[notify] API error:", resp.error);
      return { ok: false, error: resp.error || "Unknown error" };
    }

    return { ok: true, id: resp.id };
  } catch (err: any) {
    console.error("[notify] Exception:", err?.message);
    return { ok: false, error: err?.message || "Network error" };
  }
}

// ============================================================================
// REACT HOOK WRAPPER (Optional)
// ============================================================================

/**
 * React hook wrapper for notify()
 *
 * Automatically injects userId from auth context.
 *
 * @example
 * const { notify: sendNotification } = useNotify();
 *
 * const handleAlert = async () => {
 *   const result = await sendNotification({
 *     priority: "critical",
 *     title: "Action Required",
 *     description: "Your monthly budget is approaching limit"
 *   });
 * };
 */
export function useNotify() {
  const { userId } = useAuth();

  const sendNotification = async (params: NotifyParams): Promise<NotifyResponse> => {
    if (!userId) {
      return { ok: false, error: "Not authenticated" };
    }
    return notify({ ...params, userId });
  };

  return {
    notify: sendNotification,
  };
}

// ============================================================================
// BATCH NOTIFY (Server-side helper pattern)
// ============================================================================

/**
 * Batch create notifications (usually called from server functions)
 *
 * For server-side use via netlify/functions/_shared/notify.ts
 * This client version provides type safety for batch patterns.
 *
 * @example
 * // On server (Netlify function):
 * const { notify } = require('./netlify/functions/_shared/notify');
 * await notify({
 *   userId: user_id,
 *   employee: "crystal-analytics",
 *   priority: "info",
 *   title: "Import Complete",
 *   description: `${count} transactions imported`
 * });
 */
export interface BatchNotifyParams extends NotifyParams {
  userId: string; // required for batch
}

export async function notifyBatch(
  notifications: BatchNotifyParams[]
): Promise<NotifyResponse[]> {
  return Promise.all(notifications.map((n) => notify(n)));
}

// ============================================================================
// PRIORITY-BASED HELPERS (Toast-style convenience)
// ============================================================================

/**
 * Success notification (green)
 *
 * @example
 * await notifySuccess("Task Complete", "All rules synced successfully");
 */
export async function notifySuccess(
  title: string,
  description?: string,
  href?: string
): Promise<NotifyResponse> {
  return notify({
    priority: "success",
    title,
    description,
    href,
  });
}

/**
 * Info notification (blue)
 *
 * @example
 * await notifyInfo("New Insight", "Spending patterns detected");
 */
export async function notifyInfo(
  title: string,
  description?: string,
  href?: string
): Promise<NotifyResponse> {
  return notify({
    priority: "info",
    title,
    description,
    href,
  });
}

/**
 * Warning notification (yellow)
 *
 * @example
 * await notifyWarning("Budget Alert", "Dining 80% of monthly limit");
 */
export async function notifyWarning(
  title: string,
  description?: string,
  href?: string
): Promise<NotifyResponse> {
  return notify({
    priority: "warning",
    title,
    description,
    href,
  });
}

/**
 * Critical notification (red)
 *
 * @example
 * await notifyCritical("Action Required", "Payment failed");
 */
export async function notifyCritical(
  title: string,
  description?: string,
  href?: string
): Promise<NotifyResponse> {
  return notify({
    priority: "critical",
    title,
    description,
    href,
  });
}

// ============================================================================
// EMPLOYEE-SCOPED HELPERS
// ============================================================================

/**
 * Notify from Crystal about spending insight
 *
 * @example
 * await notifyCrystal("Spending Spike", "Dining up 28% WoW", {
 *   href: "/analytics?spike=dining",
 *   payload: { category: "Dining", delta: 0.28 }
 * });
 */
export async function notifyCrystal(
  title: string,
  description?: string,
  options?: {
    priority?: NotificationPriority;
    href?: string;
    payload?: Record<string, unknown>;
  }
): Promise<NotifyResponse> {
  return notify({
    employee: "crystal-analytics",
    priority: options?.priority || "info",
    title,
    description,
    href: options?.href,
    payload: options?.payload,
  });
}

/**
 * Notify from Prime about task/delegation/maintenance
 *
 * @example
 * // Task completion
 * await notifyPrime("Maintenance Complete", "Rules sync finished", {
 *   priority: "success"
 * });
 *
 * // Action request
 * await notifyPrime("Review Needed", "Categorization conflicts detected", {
 *   priority: "warning",
 *   href: "/categories?review=true"
 * });
 */
export async function notifyPrime(
  title: string,
  description?: string,
  options?: {
    priority?: NotificationPriority;
    href?: string;
    payload?: Record<string, unknown>;
  }
): Promise<NotifyResponse> {
  return notify({
    employee: "prime-boss",
    priority: options?.priority || "info",
    title,
    description,
    href: options?.href,
    payload: options?.payload,
  });
}

/**
 * Notify from Byte about document processing
 *
 * @example
 * await notifyByte("Statement Parsed", "50 transactions extracted", {
 *   priority: "success",
 *   href: "/imports/latest"
 * });
 */
export async function notifyByte(
  title: string,
  description?: string,
  options?: {
    priority?: NotificationPriority;
    href?: string;
    payload?: Record<string, unknown>;
  }
): Promise<NotifyResponse> {
  return notify({
    employee: "byte-docs",
    priority: options?.priority || "info",
    title,
    description,
    href: options?.href,
    payload: options?.payload,
  });
}

/**
 * Notify from Tag about categorization
 *
 * @example
 * await notifyTag("Categories Updated", "15 new merchant patterns learned", {
 *   priority: "success"
 * });
 */
export async function notifyTag(
  title: string,
  description?: string,
  options?: {
    priority?: NotificationPriority;
    href?: string;
    payload?: Record<string, unknown>;
  }
): Promise<NotifyResponse> {
  return notify({
    employee: "tag-categorizer",
    priority: options?.priority || "info",
    title,
    description,
    href: options?.href,
    payload: options?.payload,
  });
}

/**
 * Notify from Ledger about tax/compliance
 *
 * @example
 * await notifyLedger("Tax Filing Ready", "Q4 report prepared", {
 *   priority: "info",
 *   href: "/tax/reports"
 * });
 */
export async function notifyLedger(
  title: string,
  description?: string,
  options?: {
    priority?: NotificationPriority;
    href?: string;
    payload?: Record<string, unknown>;
  }
): Promise<NotifyResponse> {
  return notify({
    employee: "ledger-tax",
    priority: options?.priority || "info",
    title,
    description,
    href: options?.href,
    payload: options?.payload,
  });
}

/**
 * Notify from Goalie about goal tracking
 *
 * @example
 * await notifyGoalie("Goal Milestone", "Emergency fund reached target!", {
 *   priority: "success",
 *   href: "/goals/emergency-fund"
 * });
 */
export async function notifyGoalie(
  title: string,
  description?: string,
  options?: {
    priority?: NotificationPriority;
    href?: string;
    payload?: Record<string, unknown>;
  }
): Promise<NotifyResponse> {
  return notify({
    employee: "goalie-agent",
    priority: options?.priority || "info",
    title,
    description,
    href: options?.href,
    payload: options?.payload,
  });
}

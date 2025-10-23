/**
 * Client-Side Notifications Management
 *
 * High-level helpers for:
 * - Fetching notifications with filtering
 * - Marking single/all as read
 * - Batch orchestration to Prime/employees
 * - Real-time subscriptions (via event bus)
 *
 * All operations use bearer token auth from session.
 *
 * @example
 * import { useNotifications } from "@/lib/notifications-client";
 *
 * export function NotificationCenter() {
 *   const { notifications, unreadCount, markRead, markAllRead, orchestrate } = useNotifications();
 *
 *   return (
 *     <div>
 *       <h2>Notifications ({unreadCount})</h2>
 *       {notifications.map(n => (
 *         <div key={n.id} onClick={() => markRead(n.id)}>
 *           {n.title}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

// ============================================================================
// TYPES
// ============================================================================

export type NotificationPriority = "success" | "info" | "warning" | "critical";
export type EmployeeKey =
  | "prime-boss"
  | "crystal-analytics"
  | "byte-docs"
  | "tag-categorizer"
  | "ledger-tax"
  | "goalie-agent";

export interface Notification {
  id: string;
  user_id: string;
  employee: EmployeeKey;
  priority: NotificationPriority;
  title: string;
  description: string | null;
  href: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null; // ISO timestamp if read, null if unread
  created_at: string;
}

export interface NotificationFilter {
  employee?: EmployeeKey;
  priority?: NotificationPriority;
  read?: boolean; // true = read only, false = unread only, undefined = all
  limit?: number; // default 50
  offset?: number; // default 0
}

export interface FetchResponse {
  ok: boolean;
  items?: Notification[];
  unreadCount?: number;
  error?: string;
}

export interface MarkReadResponse {
  ok: boolean;
  updated?: number;
  error?: string;
}

export interface OrchestrateResponse {
  ok: boolean;
  orchestrated?: number;
  delegations?: string[]; // employee keys that were delegated to
  error?: string;
}

// ============================================================================
// HELPERS (Non-hook, for server functions)
// ============================================================================

/**
 * Fetch notifications from client (requires auth)
 *
 * @param token - Bearer token from session
 * @param filter - Optional filter params
 */
export async function fetchNotifications(
  token: string,
  filter?: NotificationFilter
): Promise<FetchResponse> {
  try {
    const params = new URLSearchParams();
    if (filter?.employee) params.append("employee", filter.employee);
    if (filter?.priority) params.append("priority", filter.priority);
    if (filter?.read !== undefined) params.append("read", String(filter.read));
    if (filter?.limit) params.append("limit", String(filter.limit));
    if (filter?.offset) params.append("offset", String(filter.offset));

    const url = new URL("/.netlify/functions/notifications-get", window.location.origin);
    url.search = params.toString();

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((r) => r.json());

    if (!res.ok) {
      console.warn("[fetchNotifications] API error:", res.error);
      return { ok: false, error: res.error || "Unknown error" };
    }

    return { ok: true, items: res.items || [], unreadCount: res.unreadCount || 0 };
  } catch (err: any) {
    console.error("[fetchNotifications] Exception:", err?.message);
    return { ok: false, error: err?.message || "Network error" };
  }
}

/**
 * Mark single notification as read
 *
 * @param token - Bearer token from session
 * @param id - Notification ID
 */
export async function markNotificationRead(
  token: string,
  id: string
): Promise<MarkReadResponse> {
  try {
    const res = await fetch("/.netlify/functions/notifications-read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    }).then((r) => r.json());

    if (!res.ok) {
      console.warn("[markNotificationRead] API error:", res.error);
      return { ok: false, error: res.error || "Unknown error" };
    }

    return { ok: true, updated: 1 };
  } catch (err: any) {
    console.error("[markNotificationRead] Exception:", err?.message);
    return { ok: false, error: err?.message || "Network error" };
  }
}

/**
 * Mark all notifications as read
 *
 * @param token - Bearer token from session
 */
export async function markAllNotificationsRead(token: string): Promise<MarkReadResponse> {
  try {
    const res = await fetch("/.netlify/functions/notifications-read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ all: true }),
    }).then((r) => r.json());

    if (!res.ok) {
      console.warn("[markAllNotificationsRead] API error:", res.error);
      return { ok: false, error: res.error || "Unknown error" };
    }

    return { ok: true, updated: res.updated || 0 };
  } catch (err: any) {
    console.error("[markAllNotificationsRead] Exception:", err?.message);
    return { ok: false, error: err?.message || "Network error" };
  }
}

/**
 * Orchestrate actionable notifications to Prime/employees
 *
 * Groups notifications by context and delegates to Prime with full metadata.
 *
 * @param token - Bearer token from session
 * @param items - Notifications to orchestrate
 *
 * @example
 * const actionable = notifications.filter(n => n.priority === "critical" || n.priority === "warning");
 * await orchestrateNotifications(token, actionable);
 */
export async function orchestrateNotifications(
  token: string,
  items: Notification[]
): Promise<OrchestrateResponse> {
  try {
    if (!items.length) {
      return { ok: false, error: "No items to orchestrate" };
    }

    const res = await fetch("/.netlify/functions/notifications-orchestrate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
    }).then((r) => r.json());

    if (!res.ok) {
      console.warn("[orchestrateNotifications] API error:", res.error);
      return { ok: false, error: res.error || "Unknown error" };
    }

    return {
      ok: true,
      orchestrated: res.orchestrated || items.length,
      delegations: res.delegations || [],
    };
  } catch (err: any) {
    console.error("[orchestrateNotifications] Exception:", err?.message);
    return { ok: false, error: err?.message || "Network error" };
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

export interface UseNotificationsOptions {
  autoLoad?: boolean; // default true
  pollInterval?: number; // default 30s
  limit?: number; // default 50
}

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markRead: (id: string) => Promise<MarkReadResponse>;
  markAllRead: () => Promise<MarkReadResponse>;
  orchestrate: (items: Notification[]) => Promise<OrchestrateResponse>;
  refresh: () => Promise<void>;
}

/**
 * React hook for managing notifications
 *
 * Auto-fetches on mount, polls for new notifications, and provides
 * convenience methods for marking read and orchestrating.
 *
 * @example
 * const {
 *   notifications,
 *   unreadCount,
 *   markRead,
 *   markAllRead,
 *   orchestrate,
 *   refresh
 * } = useNotifications({ pollInterval: 30000 });
 *
 * // Render notifications
 * notifications.forEach(n => console.log(n.title));
 *
 * // Mark one as read
 * await markRead(notifications[0].id);
 *
 * // Mark all as read
 * await markAllRead();
 *
 * // Orchestrate critical items
 * const critical = notifications.filter(n => n.priority === "critical");
 * await orchestrate(critical);
 */
export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsResult {
  const { user, session } = useAuth();
  const { autoLoad = true, pollInterval = 30000, limit = 50 } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const refresh = useCallback(async () => {
    if (!session?.access_token) {
      setError("Not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await fetchNotifications(session.access_token, { limit });

    if (result.ok) {
      setNotifications(result.items || []);
      setUnreadCount(result.unreadCount || 0);
    } else {
      setError(result.error || "Failed to fetch notifications");
    }

    setIsLoading(false);
  }, [session?.access_token, limit]);

  // Mark single as read
  const markRead = useCallback(
    async (id: string): Promise<MarkReadResponse> => {
      if (!session?.access_token) {
        return { ok: false, error: "Not authenticated" };
      }

      const result = await markNotificationRead(session.access_token, id);

      if (result.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      return result;
    },
    [session?.access_token]
  );

  // Mark all as read
  const markAllRead = useCallback(async (): Promise<MarkReadResponse> => {
    if (!session?.access_token) {
      return { ok: false, error: "Not authenticated" };
    }

    const result = await markAllNotificationsRead(session.access_token);

    if (result.ok) {
      // Update local state
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: now }))
      );
      setUnreadCount(0);
    }

    return result;
  }, [session?.access_token]);

  // Orchestrate notifications
  const orchestrate = useCallback(
    async (items: Notification[]): Promise<OrchestrateResponse> => {
      if (!session?.access_token) {
        return { ok: false, error: "Not authenticated" };
      }

      return orchestrateNotifications(session.access_token, items);
    },
    [session?.access_token]
  );

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && session?.access_token) {
      refresh();
    }
  }, [autoLoad, session?.access_token, refresh]);

  // Poll for new notifications
  useEffect(() => {
    if (!session?.access_token || pollInterval <= 0) return;

    const interval = setInterval(() => {
      refresh();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [session?.access_token, pollInterval, refresh]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markRead,
    markAllRead,
    orchestrate,
    refresh,
  };
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook to get only unread notifications
 */
export function useUnreadNotifications(
  options: UseNotificationsOptions = {}
): Notification[] {
  const { notifications } = useNotifications(options);
  return notifications.filter((n) => !n.read_at);
}

/**
 * Hook to get notifications by priority
 */
export function useNotificationsByPriority(
  priority: NotificationPriority,
  options: UseNotificationsOptions = {}
): Notification[] {
  const { notifications } = useNotifications(options);
  return notifications.filter((n) => n.priority === priority);
}

/**
 * Hook to get notifications by employee
 */
export function useNotificationsByEmployee(
  employee: EmployeeKey,
  options: UseNotificationsOptions = {}
): Notification[] {
  const { notifications } = useNotifications(options);
  return notifications.filter((n) => n.employee === employee);
}

/**
 * Hook to get actionable notifications (critical or warning)
 */
export function useActionableNotifications(
  options: UseNotificationsOptions = {}
): Notification[] {
  const { notifications } = useNotifications(options);
  return notifications.filter((n) => n.priority === "critical" || n.priority === "warning");
}





